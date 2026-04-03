'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Shield } from 'lucide-react'
import { LogoIcon } from '@/components/ui/logo-icon'

interface MFAVerifyProps {
  onVerified: () => void
}

export function MFAVerify({ onVerified }: MFAVerifyProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 6) return
    setLoading(true)
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (!totp) throw new Error('No MFA factor found')
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: totp.id })
      if (!challenge) throw new Error('Challenge failed')
      const { error } = await supabase.auth.mfa.verify({
        factorId: totp.id,
        challengeId: challenge.id,
        code: code.trim(),
      })
      if (error) throw error
      onVerified()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Codigo invalido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <LogoIcon size={56} className="mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Verificacion MFA</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Ingresa el codigo de tu app de autenticacion</p>
        </div>
        <div className="card-medical p-7">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Shield size={28} className="text-accent" />
            </div>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Codigo TOTP"
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
            <Button type="submit" loading={loading} disabled={code.length < 6} className="w-full">
              Verificar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
