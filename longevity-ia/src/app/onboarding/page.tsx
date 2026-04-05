'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { User, LogOut, ClipboardList } from 'lucide-react'
import { LogoIcon } from '@/components/ui/logo-icon'
import { supabase } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Guard: medicos y clinicas no deben crear perfil de paciente
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const role = user.app_metadata?.role ?? user.user_metadata?.role
      if (role === 'medico' || role === 'clinica') {
        router.replace('/patients')
      }
    })
  }, [router])
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
    notes: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.age || !form.gender) {
      toast.error('Nombre, edad y género son requeridos')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          age: parseInt(form.age),
          gender: form.gender,
          weight: form.weight ? parseFloat(form.weight) : null,
          height: form.height ? parseFloat(form.height) : null,
          notes: form.notes || null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string })?.error || `Error ${res.status}`)

      toast.success('Perfil creado correctamente')
      router.replace(`/patients/${data.id}/dashboard`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo + logout */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-between w-full mb-4">
            <div className="w-8" />
            <LogoIcon size={48} />
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
          <h1 className="text-xl font-bold text-foreground">Bienvenido a Longevity IA</h1>
          <p className="text-sm text-muted-foreground mt-1">Completa tu perfil para comenzar tu análisis de salud personalizado</p>
          <p className="text-[9px] text-muted-foreground/40 mt-2">Derechos reservados - Longevity Clinic SA de CV</p>
        </div>

        {/* Card */}
        <div className="card-medical p-6">
          <div className="flex items-center gap-2 mb-2">
            <User size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Tu perfil médico</h2>
          </div>
          <div className="border-b border-border/30 mb-6" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={15} className="text-accent" />
              <h3 className="text-sm font-semibold text-foreground/80">Datos del Paciente</h3>
            </div>
            <Input
              label="Nombre completo *"
              type="text"
              placeholder="Ej. Juan García"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Edad *"
                type="number"
                placeholder="Ej. 38"
                min="1"
                max="120"
                value={form.age}
                onChange={e => set('age', e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground/80">Género *</label>
                <select
                  value={form.gender}
                  onChange={e => set('gender', e.target.value)}
                  required
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors h-10"
                >
                  <option value="">Seleccionar</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Peso (kg)"
                type="number"
                placeholder="Ej. 78"
                min="1"
                value={form.weight}
                onChange={e => set('weight', e.target.value)}
              />
              <Input
                label="Talla (cm)"
                type="number"
                placeholder="Ej. 175"
                min="1"
                value={form.height}
                onChange={e => set('height', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80">Notas adicionales</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Condiciones preexistentes, medicamentos actuales..."
                rows={3}
                className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Crear mi perfil y continuar
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Este perfil se crea una sola vez y queda vinculado a tu cuenta.
        </p>
      </div>
    </div>
  )
}
