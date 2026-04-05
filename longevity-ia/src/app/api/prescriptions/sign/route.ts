export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'

// SECURITY: Generar verification code server-side con CSPRNG
function generateServerVerificationCode(): string {
  const { randomBytes } = require('crypto') as typeof import('crypto')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  let code = 'RX-'
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length]
  }
  return code
}

// Validation limits
const MAX_CDA_SIZE = 500 * 1024  // 500KB
const MAX_FIELD_LEN = 500
const MAX_SIG_LEN = 2048
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEX_RE = /^[0-9a-f]+$/i
const B64_RE = /^[A-Za-z0-9+/=]+$/

/**
 * POST /api/prescriptions/sign
 * Stores a signed prescription CDA + metadata.
 * SECURITY: Generates verification code server-side, validates all inputs,
 * verifies digest integrity, checks certificate validity.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const role = user.app_metadata?.role ?? user.user_metadata?.role
    if (role !== 'medico') return NextResponse.json({ error: 'Solo médicos pueden firmar' }, { status: 403 })

    // Rate limit: max 10 firmas por minuto
    const rl = rateLimit(`sign:${user.id}`, 10, 60_000)
    if (!rl.allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

    const body = await request.json()
    const {
      patientId,
      cdaXml,
      cadenaOriginal,
      digestSha256,
      signatureBase64,
      certificateSerial,
      certificateSubject,
      certificateIssuer,
      certificateValidFrom,
      certificateValidTo,
      certificatePem,
      rfc,
    } = body as Record<string, string>

    // ── Input validation ──────────────────────────────────────
    if (!cdaXml || !cadenaOriginal || !digestSha256 || !signatureBase64) {
      return NextResponse.json({ error: 'Datos de firma incompletos' }, { status: 400 })
    }

    if (cdaXml.length > MAX_CDA_SIZE) {
      return NextResponse.json({ error: 'CDA XML excede el tamaño máximo' }, { status: 400 })
    }
    if (signatureBase64.length > MAX_SIG_LEN || !B64_RE.test(signatureBase64)) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
    }
    if (digestSha256.length !== 64 || !HEX_RE.test(digestSha256)) {
      return NextResponse.json({ error: 'Hash SHA-256 inválido' }, { status: 400 })
    }
    if (patientId && !UUID_RE.test(patientId)) {
      return NextResponse.json({ error: 'ID de paciente inválido' }, { status: 400 })
    }

    // Truncate text fields to max length
    const safeCertSerial = (certificateSerial ?? '').slice(0, MAX_FIELD_LEN)
    const safeCertSubject = (certificateSubject ?? '').slice(0, MAX_FIELD_LEN)
    const safeCertIssuer = (certificateIssuer ?? '').slice(0, MAX_FIELD_LEN)
    const safeRfc = rfc ? rfc.slice(0, 20) : null

    // ── Server-side digest verification ───────────────────────
    const serverDigest = createHash('sha256').update(cadenaOriginal).digest('hex')
    if (serverDigest !== digestSha256) {
      return NextResponse.json({ error: 'El hash no coincide con la cadena original' }, { status: 400 })
    }

    // ── Certificate validity check ────────────────────────────
    if (certificateValidFrom && certificateValidTo) {
      const now = new Date()
      const from = new Date(certificateValidFrom)
      const to = new Date(certificateValidTo)
      if (now < from || now > to) {
        return NextResponse.json({ error: 'El certificado no está vigente' }, { status: 400 })
      }
    }

    // ── Generate verification code SERVER-SIDE (CSPRNG) ───────
    const verificationCode = generateServerVerificationCode()
    const prescriptionId = require('crypto').randomUUID() as string

    const admin = getSupabaseAdmin()

    // ── Store CDA XML (path uses server-generated UUID) ───────
    const cdaPath = `prescriptions/${user.id}/${prescriptionId}.xml`
    const { error: uploadError } = await admin.storage
      .from('clinical-documents')
      .upload(cdaPath, cdaXml, { contentType: 'application/xml', upsert: false })

    if (uploadError) {
      console.error('[sign] CDA upload error:', uploadError.message)
      return NextResponse.json({ error: 'Error al almacenar documento' }, { status: 500 })
    }

    // ── Certificate upsert ────────────────────────────────────
    let certificateId: string | null = null
    if (safeCertSerial) {
      const { data: cert } = await admin
        .from('medico_certificates')
        .upsert({
          medico_user_id: user.id,
          serial_number: safeCertSerial,
          certificate_pem: (certificatePem ?? '').slice(0, 10000),
          issuer: safeCertIssuer,
          valid_from: certificateValidFrom ?? new Date().toISOString(),
          valid_to: certificateValidTo ?? new Date(Date.now() + 4 * 365 * 86400000).toISOString(),
          subject_name: safeCertSubject,
          rfc: safeRfc,
          is_active: true,
        }, { onConflict: 'medico_user_id,serial_number', ignoreDuplicates: false })
        .select('id')
        .single()

      certificateId = cert?.id ?? null
    }

    // ── Store signed prescription ─────────────────────────────
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/verify/${verificationCode}`

    const { data: signedRx, error: signError } = await admin
      .from('signed_prescriptions')
      .insert({
        prescription_id: prescriptionId,
        medico_user_id: user.id,
        patient_id: patientId || null,
        certificate_id: certificateId,
        pdf_hash_sha256: digestSha256,
        signature_pkcs7: signatureBase64,
        signed_pdf_path: cdaPath,
        verification_code: verificationCode,
        qr_url: verifyUrl,
        signed_at: new Date().toISOString(),
      })
      .select('id, verification_code, qr_url')
      .single()

    if (signError) {
      console.error('[sign] Insert error:', signError.message)
      return NextResponse.json({ error: 'Error al registrar firma' }, { status: 500 })
    }

    // Audit
    logAudit({
      userId: user.id,
      email: user.email ?? undefined,
      role: 'medico',
      action: 'sign_prescription',
      resourceType: 'prescription',
      resourceId: signedRx.id,
      patientId: patientId || undefined,
      details: { verificationCode, certificateSerial: safeCertSerial },
    }, request)

    return NextResponse.json({
      success: true,
      signedPrescriptionId: signedRx.id,
      verificationCode: signedRx.verification_code,
      verifyUrl: signedRx.qr_url,
    })
  } catch (err) {
    console.error('[sign] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Error al procesar firma' }, { status: 500 })
  }
}
