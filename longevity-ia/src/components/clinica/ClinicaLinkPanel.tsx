'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  X, Building2, Link2, Check, Clock, Hash,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ClinicaLink {
  id: string
  clinica_id: string
  status: 'pending' | 'active' | 'revoked'
  invited_at: string
  confirmed_at: string | null
  clinic_name?: string
}

interface ClinicaLinkPanelProps {
  onClose: () => void
}

export function ClinicaLinkPanel({ onClose }: ClinicaLinkPanelProps) {
  const [links, setLinks] = useState<ClinicaLink[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [linking, setLinking] = useState(false)

  async function loadLinks() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('clinica_medico_links')
        .select('*')
        .eq('medico_user_id', user.id)
        .neq('status', 'revoked')
        .order('invited_at', { ascending: false })

      if (!data || data.length === 0) {
        setLinks([])
        setLoading(false)
        return
      }

      // Enrich with clinic names
      const clinicaIds = data.map(d => d.clinica_id)
      const { data: clinicas } = await supabase
        .from('clinicas')
        .select('id, clinic_name')
        .in('id', clinicaIds)

      const clinicaMap: Record<string, string> = {}
      if (clinicas) {
        clinicas.forEach(c => { clinicaMap[c.id] = c.clinic_name })
      }

      const enriched = data.map(link => ({
        ...link,
        clinic_name: clinicaMap[link.clinica_id] ?? 'Clinica',
      })) as ClinicaLink[]

      setLinks(enriched)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLinks() }, [])

  async function handleLink(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { toast.error('Ingresa el codigo de la clinica'); return }

    setLinking(true)
    try {
      const res = await fetch('/api/clinica/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al vincular')
      }

      toast.success(`Solicitud enviada a ${data.invitation?.clinic_name ?? 'la clinica'}`)
      setCode('')
      loadLinks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al vincular con clinica')
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card/95 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-amber-400" />
            <h2 className="text-lg font-bold text-foreground">Mi Clinica</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Link form */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Ingresa el codigo de la clinica para solicitar vinculacion. Pidele el codigo al administrador de la clinica.
            </p>
            <form onSubmit={handleLink} className="flex gap-2">
              <Input
                placeholder="CLI-XXXXXX"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="flex-1 font-mono tracking-wide"
              />
              <Button type="submit" loading={linking} size="sm" className="shrink-0">
                <Link2 size={14} />
                Vincular
              </Button>
            </form>
          </div>

          {/* Current links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Vinculaciones
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-14 shimmer rounded-xl" />
                ))}
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-8">
                <Building2 size={24} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin clinica vinculada</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Ingresa el codigo de tu clinica para conectar
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
                          : 'bg-amber-500/15 border border-amber-500/25'
                      }`}
                    >
                      {link.status === 'active'
                        ? <Check size={14} className="text-accent" />
                        : <Clock size={14} className="text-amber-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {link.clinic_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {link.status === 'active'
                          ? `Vinculado desde ${link.confirmed_at ? formatDate(link.confirmed_at) : ''}`
                          : 'Pendiente de aprobacion'
                        }
                      </p>
                    </div>
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
