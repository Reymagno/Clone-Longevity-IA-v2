'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { LogIn } from 'lucide-react'
import Link from 'next/link'
import { LogoIcon } from '@/components/ui/logo-icon'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  function set(field: 'email' | 'password', value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error('Email y contrasena son requeridos')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (error) throw error
      router.push('/patients')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient with drift */}
      <div className="absolute top-[-30%] left-[-20%] w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[100px] pointer-events-none orb-drift-1" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[400px] h-[400px] rounded-full bg-info/[0.03] blur-[80px] pointer-events-none orb-drift-2" />

      <div className="w-full max-w-sm relative animate-scale-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <LogoIcon size={56} className="mb-4" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Longevity IA</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Medicina de longevidad con IA</p>
          <p className="text-[10px] text-muted-foreground/40 mt-2">Derechos reservados - Longevity Clinic SA de CV</p>
        </div>

        {/* Card */}
        <div className="card-medical p-7">
          <h2 className="text-lg font-semibold text-foreground mb-6 text-center">Iniciar sesion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electronico"
              type="email"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
            />
            <Input
              label="Contrasena"
              type="password"
              placeholder="Tu contrasena"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              <LogIn size={16} />
              Entrar
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/40 text-center">
            <p className="text-sm text-muted-foreground">
              No tienes cuenta?{' '}
              <Link href="/#planes" className="text-accent font-medium hover:underline">
                Registrate aqui
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
          Tus datos estan protegidos con cifrado de extremo a extremo
        </p>
      </div>
    </div>
  )
}
