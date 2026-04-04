'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Shield, ShieldCheck, Copy } from 'lucide-react'

/**
 * Convierte un data URI SVG a PNG data URI usando Canvas.
 * Supabase retorna el QR como SVG, que muchas apps de autenticación
 * no pueden escanear correctamente por problemas de contraste/resolución.
 */
function svgToPng(svgDataUri: string, size: number = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Failed to load SVG'))
    img.src = svgDataUri
  })
}

export function MFASetup() {
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    async function checkMFA() {
      const { data } = await supabase.auth.mfa.listFactors()
      const totp = data?.totp?.[0]
      if (totp?.status === 'verified') setEnabled(true)
    }
    checkMFA()
  }, [])

  async function startEnroll() {
    setEnrolling(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error) throw error

      // Convertir SVG a PNG para compatibilidad con apps de autenticación
      let qr = data.totp.qr_code
      if (qr.includes('svg')) {
        try { qr = await svgToPng(qr, 400) } catch { /* fallback al SVG original */ }
      }

      setQrCode(qr)
      setSecret(data.totp.secret)
      setFactorId(data.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al configurar MFA')
    } finally {
      setEnrolling(false)
    }
  }

  async function verifyEnroll() {
    if (!factorId || !verifyCode.trim()) return
    setVerifying(true)
    try {
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
      if (!challenge) throw new Error('No se pudo crear challenge')
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      })
      if (error) throw error
      setEnabled(true)
      setQrCode(null)
      setSecret(null)
      toast.success('Autenticacion de dos factores activada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Codigo invalido')
    } finally {
      setVerifying(false)
    }
  }

  async function disableMFA() {
    if (!confirm('Desactivar autenticacion de dos factores?')) return
    const { data } = await supabase.auth.mfa.listFactors()
    const totp = data?.totp?.[0]
    if (totp) {
      await supabase.auth.mfa.unenroll({ factorId: totp.id })
      setEnabled(false)
      toast.success('MFA desactivado')
    }
  }

  if (enabled) {
    return (
      <div className="card-medical p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
          <ShieldCheck size={20} className="text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Autenticacion de dos factores activa</p>
          <p className="text-xs text-muted-foreground">Tu cuenta esta protegida con TOTP</p>
        </div>
        <Button variant="outline" size="sm" onClick={disableMFA} className="text-danger border-danger/30">
          Desactivar
        </Button>
      </div>
    )
  }

  return (
    <div className="card-medical p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-warning/15 border border-warning/25 flex items-center justify-center">
          <Shield size={20} className="text-warning" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Autenticacion de dos factores</p>
          <p className="text-xs text-muted-foreground">Protege tu cuenta con un codigo TOTP</p>
        </div>
      </div>

      {!qrCode ? (
        <Button onClick={startEnroll} loading={enrolling} className="w-full">
          <Shield size={16} />
          Configurar MFA
        </Button>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Escanea el codigo QR con tu app de autenticacion (Google Authenticator, Authy, etc.)
          </p>
          <div className="flex justify-center p-2 bg-white rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="Codigo QR para configurar MFA"
              className="w-52 h-52"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          {secret && (
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <code className="text-xs text-foreground flex-1 break-all">{secret}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(secret); toast.success('Copiado') }}
                aria-label="Copiar clave secreta"
              >
                <Copy size={14} className="text-muted-foreground" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Codigo de 6 digitos"
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
            />
            <Button onClick={verifyEnroll} loading={verifying} disabled={verifyCode.length < 6}>
              Verificar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
