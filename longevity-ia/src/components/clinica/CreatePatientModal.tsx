'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Medico } from '@/types'

interface CreatePatientModalProps {
  isOpen: boolean
  onClose: () => void
  medicos: Medico[]
  onCreated?: () => void
}

export function CreatePatientModal({ isOpen, onClose, medicos, onCreated }: CreatePatientModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    notes: '',
    medico_user_id: '',
  })

  if (!isOpen) return null

  const medicoOptions = [
    { value: '', label: 'Sin asignar' },
    ...medicos.map((m) => ({ value: m.user_id, label: m.full_name })),
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.age) {
      toast.error('Nombre y edad son requeridos')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/clinica/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          age: parseInt(form.age),
          gender: form.gender,
          weight: form.weight ? parseFloat(form.weight) : null,
          height: form.height ? parseFloat(form.height) : null,
          notes: form.notes || null,
          medico_user_id: form.medico_user_id || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear paciente')
      }

      const data = await res.json()
      toast.success(`Paciente ${data.patient?.name ?? form.name} creado exitosamente`)
      setForm({ name: '', age: '', gender: 'male', weight: '', height: '', notes: '', medico_user_id: '' })
      onCreated?.()
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
            placeholder="Ej. Juan Garcia Lopez"
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
              label="Genero *"
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

          <Select
            label="Medico asignado"
            value={form.medico_user_id}
            onChange={(e) => setForm({ ...form, medico_user_id: e.target.value })}
            options={medicoOptions}
          />

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
            <Button
              type="submit"
              loading={loading}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-background"
            >
              Crear Paciente
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
