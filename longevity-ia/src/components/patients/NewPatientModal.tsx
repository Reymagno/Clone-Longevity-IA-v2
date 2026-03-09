'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { generatePatientCode } from '@/lib/supabase/queries'

interface NewPatientModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

export function NewPatientModal({ isOpen, onClose, onCreated }: NewPatientModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    notes: '',
  })

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.age) {
      toast.error('Nombre y edad son requeridos')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autorizado')

      const code = await generatePatientCode()

      const { data, error } = await supabase
        .from('patients')
        .insert({
          name: form.name,
          code,
          age: parseInt(form.age),
          gender: form.gender,
          weight: form.weight ? parseFloat(form.weight) : null,
          height: form.height ? parseFloat(form.height) : null,
          notes: form.notes || null,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      toast.success(`Paciente ${data.name} creado con código ${data.code}`)
      onClose()
      onCreated?.()
      router.push(`/patients/${data.id}/upload`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-medical w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Nuevo Paciente</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Nombre completo *"
            placeholder="Ej. Juan García López"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Edad *"
              type="number"
              min="1"
              max="120"
              placeholder="35"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              required
            />
            <Select
              label="Género *"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[
                { value: 'male', label: 'Masculino' },
                { value: 'female', label: 'Femenino' },
                { value: 'other', label: 'Otro' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Peso (kg)"
              type="number"
              step="0.1"
              placeholder="70"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
            <Input
              label="Talla (cm)"
              type="number"
              step="0.1"
              placeholder="170"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground/80">Notas</label>
            <textarea
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors resize-none h-20"
              placeholder="Condiciones previas, medicamentos actuales..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Crear Paciente
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
