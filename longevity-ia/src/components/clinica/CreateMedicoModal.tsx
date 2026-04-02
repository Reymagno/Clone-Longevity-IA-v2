'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'

interface CreateMedicoModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

const SPECIALTY_OPTIONS = [
  { value: 'Medicina General', label: 'Medicina General' },
  { value: 'Cardiologia', label: 'Cardiologia' },
  { value: 'Endocrinologia', label: 'Endocrinologia' },
  { value: 'Medicina Interna', label: 'Medicina Interna' },
  { value: 'Geriatria', label: 'Geriatria' },
  { value: 'Medicina Deportiva', label: 'Medicina Deportiva' },
  { value: 'Nutriologia', label: 'Nutriologia' },
  { value: 'Otra', label: 'Otra' },
]

export function CreateMedicoModal({ isOpen, onClose, onCreated }: CreateMedicoModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    specialty: 'Medicina General',
    license_number: '',
  })

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) {
      toast.error('Nombre, email y contrasena son requeridos')
      return
    }
    if (form.password.length < 6) {
      toast.error('La contrasena debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/clinica/medicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear medico')
      }

      const data = await res.json()
      toast.success(`Medico ${data.medico?.full_name ?? form.full_name} creado exitosamente`)
      setForm({ full_name: '', email: '', password: '', specialty: 'Medicina General', license_number: '' })
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
          <h2 className="text-xl font-semibold text-foreground">Nuevo Medico</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Nombre completo *"
            placeholder="Ej. Dr. Juan Garcia Lopez"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />

          <Input
            label="Email *"
            type="email"
            placeholder="doctor@clinica.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <Input
            label="Contrasena *"
            type="password"
            placeholder="Minimo 6 caracteres"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <Select
            label="Especialidad *"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            options={SPECIALTY_OPTIONS}
          />

          <Input
            label="Cedula profesional"
            placeholder="Ej. 12345678"
            value={form.license_number}
            onChange={(e) => setForm({ ...form, license_number: e.target.value })}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-background"
            >
              Crear Medico
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
