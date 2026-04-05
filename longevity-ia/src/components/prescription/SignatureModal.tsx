'use client'

import { useState, useRef } from 'react'
import { X, Upload, Shield, FileKey, FileCheck, Loader2, CheckCircle2, AlertTriangle, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface SignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSigned: (result: {
    signatureBase64: string
    digestHex: string
    certificate: {
      serialNumber: string
      subject: string
      issuer: string
      validFrom: string
      validTo: string
      rfc: string | null
      pemBase64: string
    }
  }) => void
  cadenaOriginal: string
}

type Step = 'upload' | 'signing' | 'done' | 'error'

export function SignatureModal({ isOpen, onClose, onSigned, cadenaOriginal }: SignatureModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [cerFile, setCerFile] = useState<File | null>(null)
  const [keyFile, setKeyFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [signing, setSigning] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [certInfo, setCertInfo] = useState<{ subject: string; issuer: string; validTo: string } | null>(null)

  const cerInputRef = useRef<HTMLInputElement>(null)
  const keyInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  function handleCerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.cer') && !file.name.endsWith('.pem') && !file.name.endsWith('.crt')) {
      toast.error('Selecciona un archivo de certificado (.cer, .pem, .crt)')
      return
    }
    setCerFile(file)

    // Parse certificate to show info
    import('@/lib/crypto/client-signer').then(({ parseCertificate }) => {
      parseCertificate(file).then(info => {
        setCertInfo({ subject: info.subject, issuer: info.issuer, validTo: info.validTo })
      }).catch(() => {
        setCertInfo(null)
      })
    })
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.key') && !file.name.endsWith('.pem')) {
      toast.error('Selecciona un archivo de llave privada (.key, .pem)')
      return
    }
    setKeyFile(file)
  }

  async function handleSign() {
    if (!cerFile || !keyFile || !password) {
      toast.error('Todos los campos son requeridos')
      return
    }

    setSigning(true)
    setStep('signing')
    setErrorMsg('')

    try {
      const { parseCertificate, signCadenaOriginal } = await import('@/lib/crypto/client-signer')

      // Parse certificate
      const certData = await parseCertificate(cerFile)

      // Check validity
      const now = new Date()
      if (new Date(certData.validTo) < now) {
        throw new Error('El certificado ha expirado')
      }

      // Sign
      const { signatureBase64, digestHex } = await signCadenaOriginal(
        cadenaOriginal, keyFile, password,
      )

      setStep('done')

      // Callback with result
      onSigned({
        signatureBase64,
        digestHex,
        certificate: certData,
      })

      toast.success('Prescripcion firmada electronicamente')

      // Auto-close after short delay
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      setStep('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error al firmar')
      toast.error('Error al firmar la prescripcion')
    } finally {
      setSigning(false)
    }
  }

  function handleReset() {
    setStep('upload')
    setCerFile(null)
    setKeyFile(null)
    setPassword('')
    setErrorMsg('')
    setCertInfo(null)
    if (cerInputRef.current) cerInputRef.current.value = ''
    if (keyInputRef.current) keyInputRef.current.value = ''
  }

  const canSign = cerFile && keyFile && password.length >= 1

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-border/30"
          style={{ background: 'linear-gradient(135deg, #064E3B 0%, #0A1729 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Shield size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Firma Electronica Avanzada</p>
              <p className="text-[10px] text-emerald-300/60">La llave privada nunca sale de tu navegador</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {step === 'signing' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={40} className="text-accent animate-spin mb-4" />
              <p className="text-sm font-semibold text-foreground">Firmando prescripcion...</p>
              <p className="text-xs text-muted-foreground mt-1">Generando firma digital con tu certificado</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-foreground">Prescripcion Firmada</p>
              <p className="text-xs text-muted-foreground mt-1">La firma electronica se aplico correctamente</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 rounded-full bg-red-500/15 border-2 border-red-500/30 flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
              <p className="text-sm font-bold text-foreground">Error al Firmar</p>
              <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
              <button
                onClick={handleReset}
                className="mt-4 px-4 py-2 text-xs font-medium bg-muted/40 border border-border/50 rounded-lg hover:bg-muted/60 transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {step === 'upload' && (
            <>
              {/* Certificate file */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                  <FileCheck size={13} className="text-accent" />
                  Certificado (.cer)
                </label>
                <button
                  type="button"
                  onClick={() => cerInputRef.current?.click()}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                    cerFile
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-border/50 bg-muted/20 hover:border-accent/30 hover:bg-muted/30'
                  }`}
                >
                  <Upload size={16} className={cerFile ? 'text-emerald-400' : 'text-muted-foreground'} />
                  <span className="text-xs text-foreground truncate">
                    {cerFile ? cerFile.name : 'Seleccionar archivo de certificado...'}
                  </span>
                </button>
                <input
                  ref={cerInputRef}
                  type="file"
                  accept=".cer,.pem,.crt"
                  onChange={handleCerChange}
                  className="hidden"
                />
                {certInfo && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/30 text-[10px] text-muted-foreground space-y-0.5">
                    <p><span className="font-semibold">Titular:</span> {certInfo.subject}</p>
                    <p><span className="font-semibold">Emisor:</span> {certInfo.issuer}</p>
                    <p><span className="font-semibold">Vigencia hasta:</span> {new Date(certInfo.validTo).toLocaleDateString('es-MX')}</p>
                  </div>
                )}
              </div>

              {/* Private key file */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                  <FileKey size={13} className="text-amber-400" />
                  Llave privada (.key)
                </label>
                <button
                  type="button"
                  onClick={() => keyInputRef.current?.click()}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                    keyFile
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-border/50 bg-muted/20 hover:border-accent/30 hover:bg-muted/30'
                  }`}
                >
                  <Upload size={16} className={keyFile ? 'text-amber-400' : 'text-muted-foreground'} />
                  <span className="text-xs text-foreground truncate">
                    {keyFile ? keyFile.name : 'Seleccionar llave privada...'}
                  </span>
                </button>
                <input
                  ref={keyInputRef}
                  type="file"
                  accept=".key,.pem"
                  onChange={handleKeyChange}
                  className="hidden"
                />
              </div>

              {/* Password */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                  <Lock size={13} className="text-blue-400" />
                  Contrasena de la llave privada
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contrasena de tu llave privada"
                  className="w-full bg-muted/20 border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>

              {/* Security notice */}
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <Shield size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Tu llave privada se procesa unicamente en tu navegador y nunca se envia al servidor.
                  Solo la firma resultante y el certificado publico se almacenan.
                </p>
              </div>

              {/* Sign button */}
              <button
                onClick={handleSign}
                disabled={!canSign || signing}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold rounded-xl bg-accent text-background hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/20"
              >
                <Shield size={16} />
                Firmar Prescripcion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
