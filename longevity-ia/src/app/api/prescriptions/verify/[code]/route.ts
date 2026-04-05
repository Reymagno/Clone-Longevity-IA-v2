export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/prescriptions/verify/[code]
 * Public endpoint — verifies a signed prescription by verification code.
 * No authentication required (patients, pharmacies can verify).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } },
) {
  try {
    const code = params.code?.trim()
    if (!code || code.length < 4) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: rx } = await admin
      .from('signed_prescriptions')
      .select(`
        id, verification_code, signed_at, revoked, revoked_at, revoked_reason,
        pdf_hash_sha256, qr_url,
        medico_certificates (
          serial_number, issuer, subject_name, valid_from, valid_to, rfc
        )
      `)
      .eq('verification_code', code)
      .single()

    if (!rx) {
      return NextResponse.json({
        verified: false,
        error: 'Prescripción no encontrada',
      }, { status: 404 })
    }

    const certRaw = rx.medico_certificates as unknown
    const cert = (Array.isArray(certRaw) ? certRaw[0] : certRaw) as Record<string, unknown> | null

    const now = new Date()
    const validFrom = cert?.valid_from ? new Date(cert.valid_from as string) : null
    const validTo = cert?.valid_to ? new Date(cert.valid_to as string) : null
    const isCertValid = validFrom && validTo ? (now >= validFrom && now <= validTo) : false

    return NextResponse.json({
      verified: !rx.revoked,
      revoked: rx.revoked,
      revokedAt: rx.revoked_at,
      revokedReason: rx.revoked_reason,
      signedAt: rx.signed_at,
      verificationCode: rx.verification_code,
      documentHash: rx.pdf_hash_sha256,
      certificate: cert ? {
        serialNumber: cert.serial_number,
        issuer: cert.issuer,
        subject: cert.subject_name,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        rfc: cert.rfc,
        isCurrentlyValid: isCertValid,
      } : null,
    })
  } catch (err) {
    console.error('[verify] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Error al verificar' }, { status: 500 })
  }
}
