'use client'

import { useEffect, useState } from 'react'
import { Crown, AlertCircle, Clock, XCircle } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  active:   { label: 'Activo',    color: 'text-accent bg-accent/10 border-accent/20',    icon: Crown },
  trialing: { label: 'Trial',     color: 'text-info bg-info/10 border-info/20',           icon: Clock },
  past_due: { label: 'Por vencer', color: 'text-warning bg-warning/10 border-warning/20', icon: AlertCircle },
  canceled: { label: 'Cancelado', color: 'text-danger bg-danger/10 border-danger/20',     icon: XCircle },
  unpaid:   { label: 'Impago',    color: 'text-danger bg-danger/10 border-danger/20',     icon: XCircle },
  none:     { label: 'Sin plan',  color: 'text-muted-foreground bg-muted/20 border-border/40', icon: AlertCircle },
}

export function SubscriptionBadge() {
  const [status, setStatus] = useState<string>('none')
  const [tier, setTier] = useState<string>('')

  useEffect(() => {
    fetch('/api/subscription')
      .then(res => res.json())
      .then(data => {
        setStatus(data.status ?? 'none')
        setTier(data.planTier ?? '')
      })
      .catch(() => setStatus('none'))
  }, [])

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.none
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-medium ${config.color}`}>
      <Icon size={11} />
      <span>{config.label}</span>
      {tier && <span className="opacity-60">({tier.replace(/_/g, ' ')})</span>}
    </div>
  )
}
