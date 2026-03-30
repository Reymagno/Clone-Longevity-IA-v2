'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  X, Stethoscope, UserPlus, Check, Clock, Trash2, Copy, Hash,
} from 'lucide-react'

interface MedicoLink {
  id: string
  medico_email: string
  medico_name?: string
  status: 'pending' | 'active' | 'revoked'
  invited_at: string
  confirmed_at: string | null
}

interface MedicoLinksPanelProps {
  patientId: string
  patientCode?: string
  onClose: () => void
}

export function MedicoLinksPanel({ patientId, patientCode, onClose }: MedicoLinksPanelProps) {
  const [links, setLinks] = useState<MedicoLink[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [inviting, setInviting] = useState(false)

  async function loadLinks() {
    const { data } = await supabase
      .from('patient_medico_links')
      .select('*')
      .eq('patient_id', patientId)
      .neq('status', 'revoked')
      .order('invited_at', { ascending: false })

    setLinks((data as MedicoLink[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadLinks() }, [patientId])

  function handleCopyCode() {
    if (!patientCode) return
    navigator.clipboard.writeText(patientCode)
    toast.success('Codigo copiado')
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { toast.error('Ingresa el codigo del medico'); return }

    setInviting(true)
    try {
      // Look up medico by code
      const { data: medico } = await supabase
        .from('medicos')
        .select('user_id, email, full_name')
        .eq('code', trimmed)
        .maybeSingle()

      if (!medico) {
        toast.error('No se encontro un medico con ese codigo. Verifica que el codigo sea correcto.')
        return
      }

      // Check if link already exists
      const existing = links.find(l => l.medico_email === medico.email)
      if (existing) {
        toast.error('Ya existe una invitacion para este medico')
        return
      }

      const { error } = await supabase.from('patient_medico_links').insert({
        patient_id: patientId,
        medico_user_id: medico.user_id,
        medico_email: medico.email,
        status: 'pending',
      })

      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          toast.error('Ya existe una invitacion para este medico')
        } else {
          throw error
        }
        return
      }

      toast.success(`Invitacion enviada al Dr. ${medico.full_name}`)
      setCode('')
      loadLinks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al invitar medico')
    } finally {
      setInviting(false)
    }
  }

  async function handleRevoke(linkId: string) {
    const { error } = await supabase
      .from('patient_medico_links')
      .update({ status: 'revoked' })
      .eq('id', linkId)

    if (error) {
      toast.error('Error al revocar acceso')
    } else {
      toast.success('Acceso revocado')
      loadLinks()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card/95 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-accent" />
            <h2 className="text-lg font-bold text-foreground">Mis Medicos</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mi código de paciente */}
          {patientCode && (
            <div className="p-4 rounded-xl border border-gold-300/20 bg-gold-300/5">
              <p className="text-xs font-medium text-muted-foreground mb-2">Tu codigo de paciente</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/50">
                  <Hash size={14} className="text-gold-200 shrink-0" />
                  <span className="text-sm font-mono font-bold text-gold-100 tracking-wide">{patientCode}</span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted/40 border border-border/50 text-muted-foreground hover:text-gold-200 hover:border-gold-300/30 transition-colors"
                  title="Copiar codigo"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                Comparte este codigo con tu medico para que te encuentre
              </p>
            </div>
          )}

          {/* Invite form — by code */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Conecta con tu medico usando su codigo unico. Pidele su codigo al medico.
            </p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                placeholder="MED-XXXXXX"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="flex-1 font-mono tracking-wide"
              />
              <Button type="submit" loading={inviting} size="sm" className="shrink-0">
                <UserPlus size={14} />
                Conectar
              </Button>
            </form>
          </div>

          {/* Links list */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Medicos vinculados
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-14 shimmer rounded-xl" />
                ))}
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-8">
                <Stethoscope size={24} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin medicos vinculados</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Ingresa el codigo de tu medico para conectar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {links.map(link => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        link.status === 'active'
                          ? 'bg-accent/15 border border-accent/25'
                          : 'bg-warning/15 border border-warning/25'
                      }`}
                    >
                      {link.status === 'active'
                        ? <Check size={14} className="text-accent" />
                        : <Clock size={14} className="text-warning" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{link.medico_email}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {link.status === 'active' ? 'Acceso activo' : 'Pendiente de confirmar'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevoke(link.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                      title="Revocar acceso"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
