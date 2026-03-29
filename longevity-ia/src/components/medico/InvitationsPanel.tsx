'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  X, Bell, Check, XCircle, User, Calendar,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Invitation {
  id: string
  patient_id: string
  patient_name: string
  patient_code: string
  patient_age: number | null
  medico_email: string
  status: string
  invited_at: string
}

interface InvitationsPanelProps {
  onClose: () => void
  onAccepted?: () => void
}

export function InvitationsPanel({ onClose, onAccepted }: InvitationsPanelProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  async function loadInvitations() {
    try {
      const res = await fetch('/api/medico/invitations')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setInvitations(data)
    } catch {
      toast.error('Error al cargar invitaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInvitations() }, [])

  async function handleAction(linkId: string, action: 'accept' | 'reject') {
    setActing(linkId)
    try {
      const res = await fetch('/api/medico/invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, action }),
      })
      if (!res.ok) throw new Error()

      if (action === 'accept') {
        toast.success('Invitacion aceptada. Ahora puedes ver los analisis del paciente.')
        onAccepted?.()
      } else {
        toast.success('Invitacion rechazada')
      }
      loadInvitations()
    } catch {
      toast.error('Error al procesar la invitacion')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card/95 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-accent" />
            <h2 className="text-lg font-bold text-foreground">Invitaciones Pendientes</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 shimmer rounded-xl" />)}
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-10">
              <Bell size={28} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Sin invitaciones pendientes</p>
              <p className="text-xs text-muted-foreground">
                Cuando un paciente te invite, aparecera aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map(inv => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-accent/20 bg-accent/5"
                >
                  {/* Patient info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
                      <User size={18} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{inv.patient_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {inv.patient_code}
                        {inv.patient_age ? ` · ${inv.patient_age} anos` : ''}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">
                    <Calendar size={10} className="inline mr-1" />
                    Invitacion recibida el {formatDate(inv.invited_at)}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(inv.id, 'accept')}
                      loading={acting === inv.id}
                      className="flex-1"
                    >
                      <Check size={14} />
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(inv.id, 'reject')}
                      disabled={acting === inv.id}
                      className="flex-1"
                    >
                      <XCircle size={14} />
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
