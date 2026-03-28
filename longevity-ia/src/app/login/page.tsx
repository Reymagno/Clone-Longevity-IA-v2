'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Dna, LogIn, UserPlus } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
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
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        router.push('/patients')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        toast.success('Cuenta creada. Revisa tu correo para confirmar y luego inicia sesion.')
        setMode('login')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute top-[-30%] left-[-20%] w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[400px] h-[400px] rounded-full bg-info/[0.03] blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm relative animate-scale-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4 shadow-accent animate-float">
            <Dna size={26} className="text-background" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Longevity IA</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Medicina de longevidad con IA</p>
        </div>

        {/* Card */}
        <div className="card-medical p-7">
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-card text-foreground shadow-sm shadow-black/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-card text-foreground shadow-sm shadow-black/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electronico"
              type="email"
              placeholder="doctor@clinica.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
            />
            <Input
              label="Contrasena"
              type="password"
              placeholder="Minimo 6 caracteres"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              {mode === 'login' ? (
                <><LogIn size={16} /> Entrar</>
              ) : (
                <><UserPlus size={16} /> Crear cuenta</>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
          Tus datos estan protegidos con cifrado de extremo a extremo
        </p>
      </div>
    </div>
  )
}
