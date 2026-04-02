'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated?: (data: { name: string; avatarUrl: string | null }) => void
}

interface ProfileData {
  role: string
  email?: string
  full_name?: string
  avatar_url?: string | null
  // medico
  specialty?: string
  license_number?: string
  code?: string
  // clinica
  clinic_name?: string
  director_name?: string
  contact_email?: string
  rfc?: string
  phone?: string
  address?: string
}

const SPECIALTY_OPTIONS = [
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
]

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function ProfileModal({ isOpen, onClose, onUpdated }: ProfileModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch profile on open
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetch('/api/profile')
      .then(res => res.json())
      .then((data: ProfileData) => {
        setProfile(data)
        // Populate form with editable fields
        const initial: Record<string, string> = {}
        if (data.role === 'paciente') {
          initial.full_name = data.full_name ?? ''
        } else if (data.role === 'medico') {
          initial.full_name = data.full_name ?? ''
          initial.specialty = data.specialty ?? ''
          initial.license_number = data.license_number ?? ''
        } else if (data.role === 'clinica') {
          initial.clinic_name = data.clinic_name ?? ''
          initial.director_name = data.director_name ?? ''
          initial.rfc = data.rfc ?? ''
          initial.phone = data.phone ?? ''
          initial.address = data.address ?? ''
        }
        setForm(initial)
      })
      .catch(() => toast.error('Error al cargar perfil'))
      .finally(() => setLoading(false))
  }, [isOpen])

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

  // ─── Avatar upload ───────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen es muy grande. Maximo 2 MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imagenes.')
      return
    }

    setUploading(true)
    setUploadProgress(30)

    try {
      const fd = new FormData()
      fd.append('avatar', file)

      setUploadProgress(60)

      const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al subir imagen')

      setUploadProgress(100)
      setProfile(prev => prev ? { ...prev, avatar_url: data.avatar_url } : prev)
      onUpdated?.({
        name: profile?.full_name || profile?.clinic_name || '',
        avatarUrl: data.avatar_url,
      })
      toast.success('Foto actualizada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir la imagen')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Save profile ────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al guardar')

      setProfile(prev => prev ? { ...prev, ...data } : data)
      onUpdated?.({
        name: form.full_name || form.clinic_name || '',
        avatarUrl: profile?.avatar_url ?? null,
      })
      toast.success('Perfil actualizado')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const displayName = profile?.full_name || profile?.clinic_name || profile?.email || ''
  const displayEmail = profile?.email || profile?.contact_email || ''

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card/95 backdrop-blur-sm rounded-t-2xl">
          <h2 className="text-lg font-bold text-foreground">Mi Perfil</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : profile ? (
          <form onSubmit={handleSave}>
            {/* Avatar section */}
            <div className="flex flex-col items-center pt-6 pb-4 border-b border-border/40">
              <div className="relative group">
                <UserAvatar
                  avatarUrl={profile.avatar_url}
                  name={displayName}
                  size={80}
                  className="ring-2 ring-border/40"
                />
                {/* Camera overlay on hover */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Cambiar foto de perfil"
                >
                  {uploading ? (
                    <Loader2 size={20} className="text-white animate-spin" />
                  ) : (
                    <Camera size={20} className="text-white" />
                  )}
                </button>
              </div>

              {/* Upload progress */}
              {uploading && (
                <div className="w-32 mt-3 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-2 text-xs text-accent hover:text-accent/80 font-medium transition-colors disabled:opacity-50"
              >
                {uploading ? 'Subiendo...' : 'Cambiar foto'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                aria-label="Seleccionar imagen de perfil"
              />

              {/* Role badge */}
              <span className="mt-2 px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">
                {profile.role}
              </span>
            </div>

            {/* Form fields */}
            <div className="p-6 space-y-4">
              {profile.role === 'paciente' && (
                <>
                  <Input
                    label="Nombre completo"
                    value={form.full_name ?? ''}
                    onChange={e => set('full_name', e.target.value)}
                  />
                  <Input
                    label="Correo electronico"
                    value={displayEmail}
                    readOnly
                    className="opacity-60 cursor-not-allowed"
                  />
                </>
              )}

              {profile.role === 'medico' && (
                <>
                  <Input
                    label="Nombre completo"
                    value={form.full_name ?? ''}
                    onChange={e => set('full_name', e.target.value)}
                  />
                  <Input
                    label="Correo electronico"
                    value={displayEmail}
                    readOnly
                    className="opacity-60 cursor-not-allowed"
                  />
                  <Select
                    label="Especialidad medica"
                    value={form.specialty ?? ''}
                    onChange={e => set('specialty', e.target.value)}
                    options={SPECIALTY_OPTIONS}
                  />
                  <Input
                    label="Cedula profesional"
                    value={form.license_number ?? ''}
                    onChange={e => set('license_number', e.target.value)}
                  />
                  {profile.code && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-foreground/80">Codigo de medico</span>
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-sm font-mono font-bold text-accent tracking-wide w-fit">
                        {profile.code}
                      </span>
                    </div>
                  )}
                </>
              )}

              {profile.role === 'clinica' && (
                <>
                  <Input
                    label="Nombre de la clinica"
                    value={form.clinic_name ?? ''}
                    onChange={e => set('clinic_name', e.target.value)}
                  />
                  <Input
                    label="Director / Responsable medico"
                    value={form.director_name ?? ''}
                    onChange={e => set('director_name', e.target.value)}
                  />
                  <Input
                    label="Correo electronico"
                    value={displayEmail}
                    readOnly
                    className="opacity-60 cursor-not-allowed"
                  />
                  <Input
                    label="RFC"
                    value={form.rfc ?? ''}
                    onChange={e => set('rfc', e.target.value)}
                  />
                  <Input
                    label="Telefono"
                    type="tel"
                    value={form.phone ?? ''}
                    onChange={e => set('phone', e.target.value)}
                  />
                  <Input
                    label="Direccion"
                    value={form.address ?? ''}
                    onChange={e => set('address', e.target.value)}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border/60 bg-card/95 backdrop-blur-sm rounded-b-2xl">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                Guardar cambios
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
