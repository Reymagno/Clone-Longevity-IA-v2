import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { LogoIcon } from '@/components/ui/logo-icon'
import { CheckCircle2, XCircle, AlertTriangle, Shield, Calendar, User, FileText, Hash } from 'lucide-react'

interface Props {
  params: { code: string }
}

export default async function VerifyPrescriptionPage({ params }: Props) {
  const code = params.code?.trim()

  let verification: Record<string, unknown> | null = null
  let error: string | null = null

  if (code && code.length >= 4) {
    try {
      const admin = getSupabaseAdmin()
      const { data: rx } = await admin
        .from('signed_prescriptions')
        .select(`
          id, verification_code, signed_at, revoked, revoked_at, revoked_reason,
          pdf_hash_sha256,
          medico_certificates (
            serial_number, issuer, subject_name, valid_from, valid_to, rfc
          )
        `)
        .eq('verification_code', code)
        .single()

      if (rx) {
        const certRaw = rx.medico_certificates as unknown
        const cert = (Array.isArray(certRaw) ? certRaw[0] : certRaw) as Record<string, unknown> | null
        const now = new Date()
        const validTo = cert?.valid_to ? new Date(cert.valid_to as string) : null
        const isCertValid = validTo ? now <= validTo : false

        verification = {
          found: true,
          revoked: rx.revoked,
          revokedAt: rx.revoked_at,
          revokedReason: rx.revoked_reason,
          signedAt: rx.signed_at,
          code: rx.verification_code,
          hash: rx.pdf_hash_sha256,
          signer: cert?.subject_name ?? 'No disponible',
          license: cert?.serial_number ?? '',
          issuer: cert?.issuer ?? '',
          validFrom: cert?.valid_from,
          validTo: cert?.valid_to,
          rfc: cert?.rfc,
          certValid: isCertValid,
        }
      }
    } catch {
      error = 'Error al consultar'
    }
  }

  const isValid = Boolean(verification?.found && !verification?.revoked && verification?.certValid)
  const isRevoked = Boolean(verification?.found && verification?.revoked)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <LogoIcon size={36} />
          <div>
            <p className="text-lg font-bold text-foreground">Longevity IA</p>
            <p className="text-xs text-muted-foreground">Verificación de Prescripción</p>
          </div>
        </div>

        <div className="card-medical p-0 overflow-hidden">
          {/* Status banner */}
          <div
            className="px-6 py-5 flex items-center gap-4"
            style={{
              background: isValid ? 'linear-gradient(135deg, #064E3B 0%, #0A1729 100%)'
                : isRevoked ? 'linear-gradient(135deg, #7F1D1D 0%, #0A1729 100%)'
                : 'linear-gradient(135deg, #78350F 0%, #0A1729 100%)',
            }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: isValid ? 'rgba(16,185,129,0.2)' : isRevoked ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                border: `2px solid ${isValid ? 'rgba(16,185,129,0.4)' : isRevoked ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
              }}
            >
              {isValid ? <CheckCircle2 size={24} className="text-emerald-400" />
                : isRevoked ? <XCircle size={24} className="text-red-400" />
                : <AlertTriangle size={24} className="text-amber-400" />}
            </div>
            <div>
              <p className="text-lg font-bold text-white">
                {isValid ? 'Prescripción Verificada'
                  : isRevoked ? 'Prescripción Revocada'
                  : !verification?.found ? 'Prescripción No Encontrada'
                  : 'Certificado Expirado'}
              </p>
              <p className="text-sm text-white/60">
                Código: {code}
              </p>
            </div>
          </div>

          {/* Details */}
          {verification?.found ? (
            <div className="p-6 space-y-4">
              {isRevoked && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                  <p className="text-sm font-semibold text-red-400 mb-1">Motivo de revocación</p>
                  <p className="text-xs text-muted-foreground">{verification.revokedReason as string || 'Sin motivo especificado'}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Revocada el {new Date(verification.revokedAt as string).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <InfoRow icon={<User size={14} />} label="Firmante" value={verification.signer as string} />
                {verification.rfc ? <InfoRow icon={<Hash size={14} />} label="RFC" value={String(verification.rfc)} /> : null}
                <InfoRow icon={<Shield size={14} />} label="Emisor del certificado" value={verification.issuer as string} />
                <InfoRow icon={<FileText size={14} />} label="No. de certificado" value={verification.license as string} />
                <InfoRow icon={<Calendar size={14} />} label="Fecha de firma"
                  value={new Date(verification.signedAt as string).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                />
                <InfoRow icon={<Calendar size={14} />} label="Vigencia del certificado"
                  value={`${new Date(verification.validFrom as string).toLocaleDateString('es-MX')} — ${new Date(verification.validTo as string).toLocaleDateString('es-MX')}`}
                />
              </div>

              {/* Hash */}
              <div className="pt-3 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">Hash SHA-256 del documento</p>
                <p className="text-[11px] font-mono text-muted-foreground break-all">{verification.hash as string}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {error ?? 'No se encontró una prescripción con el código proporcionado.'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2">
                Verifica que el código sea correcto e intenta nuevamente.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
          Longevity IA — Verificación de Firma Electrónica Avanzada<br />
          Este sistema verifica la autenticidad de prescripciones médicas firmadas digitalmente.
        </p>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-accent mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}
