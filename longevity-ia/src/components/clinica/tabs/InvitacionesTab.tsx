'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, XCircle, Clock, Stethoscope, Mail, Calendar, UserCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ClinicaMedicoLink } from '@/types'

interface InvitacionesTabProps {
  onRefresh: () => void
}

export function InvitacionesTab({ onRefresh }: InvitacionesTabProps) {
  const [invitations, setInvitations] = useState<ClinicaMedicoLink[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/clinica/invitations')
      if (res.ok) {
        const data = await res.json()
        setInvitations(data.invitations ?? [])
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  async function handleAction(invitationId: string, action: 'accept' | 'reject') {
    setProcessingId(invitationId)
    try {
      const res = await fetch('/api/clinica/invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId, action }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al procesar invitacion')
      }

      toast.success(action === 'accept' ? 'Medico aceptado exitosamente' : 'Solicitud rechazada')
      loadInvitations()
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar invitacion')
    } finally {
      setProcessingId(null)
    }
  }

  const pending = invitations.filter(i => i.status === 'pending')
  const active = invitations.filter(i => i.status === 'active')

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card-medical p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 shimmer rounded" />
                <div className="h-3 w-24 shimmer rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending invitations */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">Solicitudes Pendientes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Medicos que han solicitado vincularse a tu clinica
        </p>

        {pending.length === 0 ? (
          <div className="card-medical p-8 text-center">
            <Clock size={28} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sin solicitudes pendientes</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Los medicos pueden vincular usando tu codigo de clinica
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(inv => (
              <div
                key={inv.id}
                className="card-medical p-4 border-l-2 border-l-amber-400/60"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <Stethoscope size={18} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {inv.medico_name ?? 'Medico'}
                    </p>
                    {inv.medico_specialty && (
                      <p className="text-xs text-muted-foreground">{inv.medico_specialty}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/70">
                      {inv.medico_email && (
                        <span className="flex items-center gap-1">
                          <Mail size={10} /> {inv.medico_email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={10} /> {formatDate(inv.invited_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAction(inv.id, 'accept')}
                      loading={processingId === inv.id}
                      className="bg-accent hover:bg-accent/90"
                    >
                      <Check size={14} />
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(inv.id, 'reject')}
                      loading={processingId === inv.id}
                      className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                    >
                      <XCircle size={14} />
                      Rechazar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active medicos */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">Medicos Vinculados</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {active.length} medico{active.length !== 1 ? 's' : ''} activo{active.length !== 1 ? 's' : ''}
        </p>

        {active.length === 0 ? (
          <div className="card-medical p-8 text-center">
            <UserCheck size={28} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sin medicos vinculados aun</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(inv => (
              <div
                key={inv.id}
                className="card-medical p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
                  <Check size={16} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {inv.medico_name ?? 'Medico'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inv.medico_specialty ? `${inv.medico_specialty} · ` : ''}
                    {inv.medico_email ?? ''}
                  </p>
                </div>
                {inv.confirmed_at && (
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                    Desde {formatDate(inv.confirmed_at)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
