'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Camera, Loader2, User, Stethoscope, FileText, Mail, Shield, Copy, Check, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { toast } from 'sonner'
import { MFASetup } from '@/components/auth/MFASetup'

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
  const [codeCopied, setCodeCopied] = useState(false)
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

  // Copy medico code to clipboard
  async function handleCopyCode() {
    if (!profile?.code) return
    try {
      await navigator.clipboard.writeText(profile.code)
      setCodeCopied(true)
      toast.success('Codigo copiado al portapapeles')
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar el codigo')
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
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl animate-scale-in">
        {/* Header */}
        <div
          className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/60 backdrop-blur-sm rounded-t-2xl ${profile?.role !== 'medico' && profile?.role !== 'paciente' ? 'bg-card/95' : ''}`}
          style={
            profile?.role === 'medico'
              ? { background: 'linear-gradient(135deg, #0E1A30 0%, #0A1729 100%)' }
              : profile?.role === 'paciente'
                ? { background: 'linear-gradient(135deg, #0A1F1A 0%, #0A1729 100%)' }
                : undefined
          }
        >
          <div>
            <h2 className={`text-lg font-bold ${profile?.role === 'medico' || profile?.role === 'paciente' ? 'text-white' : 'text-foreground'}`}>Mi Perfil</h2>
            {profile?.role === 'medico' && (
              <p className="text-xs text-blue-300/70 mt-0.5">Portal Medico Profesional</p>
            )}
            {profile?.role === 'paciente' && (
              <p className="text-xs text-emerald-300/70 mt-0.5">Tu bienestar, nuestra prioridad</p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              profile?.role === 'medico'
                ? 'text-blue-300/60 hover:text-white hover:bg-white/10'
                : profile?.role === 'paciente'
                  ? 'text-emerald-300/60 hover:text-white hover:bg-white/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
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
                {profile.role === 'medico' ? (
                  <div className="rounded-full p-[3px]" style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), #38bdf8)' }}>
                    <UserAvatar
                      avatarUrl={profile.avatar_url}
                      name={displayName}
                      size={96}
                      className="ring-2 ring-card"
                    />
                  </div>
                ) : profile.role === 'paciente' ? (
                  <UserAvatar
                    avatarUrl={profile.avatar_url}
                    name={displayName}
                    size={96}
                    className="ring-2 ring-accent/30"
                  />
                ) : (
                  <UserAvatar
                    avatarUrl={profile.avatar_url}
                    name={displayName}
                    size={80}
                    className="ring-2 ring-border/40"
                  />
                )}
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
              {profile.role === 'medico' ? (
                <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent border border-accent/20">
                  <Stethoscope size={12} />
                  {profile.specialty || 'Medico'}
                </span>
              ) : profile.role === 'paciente' ? (
                <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent border border-accent/20">
                  <Heart size={12} />
                  Paciente Longevity
                </span>
              ) : (
                <span className="mt-2 px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">
                  {profile.role}
                </span>
              )}
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
                  {/* Professional identity card (read-only) */}
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Identificacion Profesional</h3>
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-accent shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Nombre completo</p>
                        <p className="text-sm font-semibold text-foreground">{profile.full_name || '---'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Stethoscope size={16} className="text-accent shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Especialidad</p>
                        <p className="text-sm font-medium text-foreground">{profile.specialty || '---'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-accent shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Correo electronico</p>
                        <p className="text-sm text-foreground">{displayEmail || '---'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-accent shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Cedula profesional</p>
                        <p className="text-sm font-medium text-foreground">{profile.license_number || '---'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Prominent medico code card */}
                  {profile.code && (
                    <div className="rounded-xl border border-accent/30 p-4 text-center" style={{ background: 'linear-gradient(135deg, hsl(var(--accent) / 0.08), hsl(var(--accent) / 0.04))' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Codigo de Medico</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-xl font-mono font-bold text-accent tracking-widest">
                          {profile.code}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                          aria-label="Copiar codigo de medico"
                        >
                          {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">Comparte este codigo con tus pacientes</p>
                    </div>
                  )}

                  {/* Editable form fields with icons */}
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                        <User size={14} className="text-accent" />
                        Nombre completo
                      </label>
                      <Input
                        value={form.full_name ?? ''}
                        onChange={e => set('full_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                        <Stethoscope size={14} className="text-accent" />
                        Especialidad medica
                      </label>
                      <Select
                        value={form.specialty ?? ''}
                        onChange={e => set('specialty', e.target.value)}
                        options={SPECIALTY_OPTIONS}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                        <FileText size={14} className="text-accent" />
                        Cedula profesional
                      </label>
                      <Input
                        value={form.license_number ?? ''}
                        onChange={e => set('license_number', e.target.value)}
                      />
                    </div>
                  </div>
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

            {/* Security section */}
            <div className="px-6 pt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10">
                  <Shield size={14} className="text-accent" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Seguridad</h3>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            </div>

            {/* MFA Setup */}
            <div className="px-6 pb-2">
              <MFASetup />
            </div>

            {/* Footer */}
            <div
              className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-5 border-t border-border/60 bg-card/95 backdrop-blur-sm rounded-b-2xl"
              style={profile.role === 'medico' ? { borderImage: 'linear-gradient(90deg, transparent, hsl(var(--border) / 0.6), transparent) 1' } : undefined}
            >
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
