'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { X, UserPlus } from 'lucide-react'
import { generateMedicoCode } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type RoleType = 'paciente' | 'medico' | 'clinica'

interface RegisterModalProps {
  role: RoleType
  isOpen: boolean
  onClose: () => void
}

const ROLE_TITLES: Record<RoleType, string> = {
  paciente: 'Registro de Paciente',
  medico: 'Registro de Medico',
  clinica: 'Registro de Clinica',
}

// ─────────────────────────────────────────────────────────────────
// Shared form fields
// ─────────────────────────────────────────────────────────────────

function PacienteFields({ form, set }: { form: Record<string, string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <Input label="Nombre completo" placeholder="Tu nombre" value={form.full_name ?? ''} onChange={e => set('full_name', e.target.value)} required />
      <Input label="Correo electronico" type="email" placeholder="correo@ejemplo.com" value={form.email ?? ''} onChange={e => set('email', e.target.value)} required />
      <Input label="Contrasena" type="password" placeholder="Minimo 6 caracteres" value={form.password ?? ''} onChange={e => set('password', e.target.value)} required />
    </>
  )
}

function MedicoFields({ form, set }: { form: Record<string, string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <Input label="Nombre de usuario" placeholder="dr.garcia" value={form.username ?? ''} onChange={e => set('username', e.target.value)} required />
      <Input label="Correo electronico" type="email" placeholder="doctor@clinica.com" value={form.email ?? ''} onChange={e => set('email', e.target.value)} required />
      <Input label="Contrasena" type="password" placeholder="Minimo 6 caracteres" value={form.password ?? ''} onChange={e => set('password', e.target.value)} required />
      <Input label="Nombre completo" placeholder="Dr. Juan Garcia Lopez" value={form.full_name ?? ''} onChange={e => set('full_name', e.target.value)} required />
      <Select
        label="Especialidad medica"
        value={form.specialty ?? ''}
        onChange={e => set('specialty', e.target.value)}
        options={[
          { value: '', label: 'Selecciona especialidad' },
          { value: 'Medicina General', label: 'Medicina General' },
          { value: 'Medicina Interna', label: 'Medicina Interna' },
          { value: 'Cardiologia', label: 'Cardiologia' },
          { value: 'Endocrinologia', label: 'Endocrinologia' },
          { value: 'Geriatria', label: 'Geriatria' },
          { value: 'Nutriologia', label: 'Nutriologia' },
          { value: 'Medicina Deportiva', label: 'Medicina Deportiva' },
          { value: 'Medicina Funcional', label: 'Medicina Funcional' },
          { value: 'Medicina Regenerativa', label: 'Medicina Regenerativa' },
          { value: 'Oncologia', label: 'Oncologia' },
          { value: 'Neurologia', label: 'Neurologia' },
          { value: 'Otra', label: 'Otra especialidad' },
        ]}
        required
      />
      <Input label="Cedula profesional" placeholder="12345678" value={form.license_number ?? ''} onChange={e => set('license_number', e.target.value)} required />
    </>
  )
}

function ClinicaFields({ form, set }: { form: Record<string, string>; set: (k: string, v: string) => void }) {
  return (
    <>
      <Input label="Nombre de la clinica" placeholder="Clinica de Longevidad XYZ" value={form.clinic_name ?? ''} onChange={e => set('clinic_name', e.target.value)} required />
      <Input label="RFC" placeholder="ABC1234567X0" value={form.rfc ?? ''} onChange={e => set('rfc', e.target.value)} required />
      <Input label="Correo de contacto" type="email" placeholder="admin@clinica.com" value={form.email ?? ''} onChange={e => set('email', e.target.value)} required />
      <Input label="Contrasena" type="password" placeholder="Minimo 6 caracteres" value={form.password ?? ''} onChange={e => set('password', e.target.value)} required />
      <Input label="Telefono" type="tel" placeholder="+52 55 1234 5678" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} required />
      <Input label="Direccion" placeholder="Av. Reforma 123, CDMX" value={form.address ?? ''} onChange={e => set('address', e.target.value)} required />
      <Input label="Director / Responsable medico" placeholder="Dr. Maria Lopez" value={form.director_name ?? ''} onChange={e => set('director_name', e.target.value)} required />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────

function validate(role: RoleType, form: Record<string, string>): string | null {
  if (!form.email?.includes('@')) return 'Correo electronico invalido'
  if (!form.password || form.password.length < 6) return 'La contrasena debe tener al menos 6 caracteres'

  if (role === 'paciente') {
    if (!form.full_name?.trim()) return 'El nombre es requerido'
  } else if (role === 'medico') {
    if (!form.username?.trim()) return 'El nombre de usuario es requerido'
    if (!form.full_name?.trim()) return 'El nombre completo es requerido'
    if (!form.specialty) return 'La especialidad es requerida'
    if (!form.license_number?.trim()) return 'La cedula profesional es requerida'
  } else if (role === 'clinica') {
    if (!form.clinic_name?.trim()) return 'El nombre de la clinica es requerido'
    if (!form.rfc?.trim()) return 'El RFC es requerido'
    if (!form.phone?.trim()) return 'El telefono es requerido'
    if (!form.address?.trim()) return 'La direccion es requerida'
    if (!form.director_name?.trim()) return 'El nombre del director es requerido'
  }
  return null
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export function RegisterModal({ role, isOpen, onClose }: RegisterModalProps) {
  const router = useRouter()
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Reset form when modal opens/role changes
  useEffect(() => {
    if (isOpen) setForm({})
  }, [isOpen, role])

  const set = useCallback((key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const error = validate(role, form)
    if (error) { toast.error(error); return }

    setLoading(true)
    try {
      // 1. Create auth user with role in metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            role,
            full_name: form.full_name || form.clinic_name || form.username || '',
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('Este correo ya esta registrado. Intenta iniciar sesion.')
        }
        throw signUpError
      }

      const userId = authData.user?.id
      if (!userId) throw new Error('No se pudo crear la cuenta')

      // 2. Save role-specific profile data
      if (role === 'medico') {
        const { error: medicoError } = await supabase.from('medicos').insert({
          user_id: userId,
          code: generateMedicoCode(),
          full_name: form.full_name,
          specialty: form.specialty,
          license_number: form.license_number,
          email: form.email,
        })
        if (medicoError) throw new Error(`Error al guardar perfil medico: ${medicoError.message}`)
      } else if (role === 'clinica') {
        const { error: clinicaError } = await supabase.from('clinicas').insert({
          user_id: userId,
          clinic_name: form.clinic_name,
          rfc: form.rfc,
          contact_email: form.email,
          phone: form.phone,
          address: form.address,
          director_name: form.director_name,
        })
        if (clinicaError) throw new Error(`Error al guardar perfil de clinica: ${clinicaError.message}`)
      }

      toast.success('Cuenta creada. Revisa tu correo para confirmar y luego inicia sesion.')
      onClose()
      router.push('/login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card/95 backdrop-blur-sm rounded-t-2xl">
          <h2 className="text-lg font-bold text-foreground">{ROLE_TITLES[role]}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {role === 'paciente' && <PacienteFields form={form} set={set} />}
          {role === 'medico' && <MedicoFields form={form} set={set} />}
          {role === 'clinica' && <ClinicaFields form={form} set={set} />}

          <Button type="submit" loading={loading} className="w-full mt-4">
            <UserPlus size={16} />
            Crear cuenta
          </Button>

          <p className="text-[10px] text-muted-foreground/50 text-center">
            Al registrarte aceptas los terminos de uso y politica de privacidad
          </p>
        </form>
      </div>
    </div>
  )
}
