export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'

/**
 * POST /api/prescriptions/sign
 * Stores a signed prescription CDA + metadata.
 * The actual signature is generated client-side (private key never leaves browser).
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
      prescriptionId,
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
      verificationCode,
      rfc,
    } = body as Record<string, string>

    if (!prescriptionId || !cdaXml || !cadenaOriginal || !digestSha256 || !signatureBase64 || !verificationCode) {
      return NextResponse.json({ error: 'Datos de firma incompletos' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Store CDA XML in storage
    const cdaPath = `prescriptions/${user.id}/${prescriptionId}.xml`
    const { error: uploadError } = await admin.storage
      .from('clinical-documents')
      .upload(cdaPath, cdaXml, { contentType: 'application/xml', upsert: true })

    if (uploadError) {
      console.error('[sign] CDA upload error:', uploadError.message)
      return NextResponse.json({ error: 'Error al almacenar CDA' }, { status: 500 })
    }

    // Store/update certificate record
    const { data: existingCert } = await admin
      .from('medico_certificates')
      .select('id')
      .eq('medico_user_id', user.id)
      .eq('serial_number', certificateSerial)
      .maybeSingle()

    let certificateId = existingCert?.id

    if (!certificateId) {
      const { data: newCert, error: certError } = await admin
        .from('medico_certificates')
        .insert({
          medico_user_id: user.id,
          certificate_pem: certificatePem ?? '',
          serial_number: certificateSerial ?? '',
          issuer: certificateIssuer ?? '',
          valid_from: certificateValidFrom ?? new Date().toISOString(),
          valid_to: certificateValidTo ?? new Date(Date.now() + 4 * 365 * 86400000).toISOString(),
          subject_name: certificateSubject ?? '',
          rfc: rfc ?? null,
          is_active: true,
        })
        .select('id')
        .single()

      if (certError) {
        console.error('[sign] Certificate insert error:', certError.message)
      }
      certificateId = newCert?.id
    }

    // Store signed prescription record
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/verify/${verificationCode}`

    const { data: signedRx, error: signError } = await admin
      .from('signed_prescriptions')
      .insert({
        prescription_id: prescriptionId,
        medico_user_id: user.id,
        patient_id: patientId ?? null,
        certificate_id: certificateId ?? null,
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
      console.error('[sign] Signed prescription insert error:', signError.message)
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
      patientId: patientId ?? undefined,
      details: { verificationCode, certificateSerial },
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
