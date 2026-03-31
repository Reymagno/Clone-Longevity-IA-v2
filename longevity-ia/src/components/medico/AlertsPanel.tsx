'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import {
  X, Bell, BellOff, AlertTriangle, TrendingDown, Activity,
  Heart, Eye, EyeOff, ChevronRight, Clock, Users,
  CheckCheck, Trash2, Filter, BarChart2,
} from 'lucide-react'
import Link from 'next/link'

interface MedicoAlert {
  id: string
  patient_id: string
  result_id: string | null
  alert_type: 'new_analysis' | 'biomarker_danger' | 'biomarker_worsened' | 'wearable_alert' | 'follow_up_due'
  level: 'info' | 'warning' | 'danger' | 'critical'
  title: string
  detail: string | null
  metadata: Record<string, unknown> | null
  read: boolean
  created_at: string
  patient_name?: string
}

interface AlertsPanelProps {
  onClose: () => void
  onAlertRead?: () => void
}

const LEVEL_CONFIG = {
  critical: { bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500', text: 'text-red-400', label: 'Critico' },
  danger: { bg: 'bg-red-500/8 border-red-500/20', dot: 'bg-red-400', text: 'text-red-400', label: 'Peligro' },
  warning: { bg: 'bg-yellow-500/8 border-yellow-500/20', dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Atencion' },
  info: { bg: 'bg-blue-500/8 border-blue-500/20', dot: 'bg-blue-400', text: 'text-blue-400', label: 'Info' },
}

const TYPE_CONFIG = {
  new_analysis: { icon: BarChart2, label: 'Nuevo analisis' },
  biomarker_danger: { icon: AlertTriangle, label: 'Biomarcador critico' },
  biomarker_worsened: { icon: TrendingDown, label: 'Biomarcador empeorado' },
  wearable_alert: { icon: Heart, label: 'Alerta wearable' },
  follow_up_due: { icon: Clock, label: 'Seguimiento pendiente' },
}

export function AlertsPanel({ onClose, onAlertRead }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<MedicoAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all')
  const [acting, setActing] = useState<string | null>(null)
  const [dismissingAll, setDismissingAll] = useState(false)

  useEffect(() => { loadAlerts() }, [])

  async function loadAlerts() {
    setLoading(true)
    try {
      const res = await fetch('/api/medico/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function markAsRead(alertIds: string[]) {
    setActing(alertIds[0])
    try {
      const res = await fetch('/api/medico/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds, action: 'read' }),
      })
      if (res.ok) {
        setAlerts(prev => prev.map(a => alertIds.includes(a.id) ? { ...a, read: true } : a))
        onAlertRead?.()
      }
    } catch { toast.error('Error al marcar como leida') }
    finally { setActing(null) }
  }

  async function dismissAlert(alertIds: string[]) {
    setActing(alertIds[0])
    try {
      const res = await fetch('/api/medico/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds, action: 'dismiss' }),
      })
      if (res.ok) {
        setAlerts(prev => prev.filter(a => !alertIds.includes(a.id)))
        onAlertRead?.()
      }
    } catch { toast.error('Error al descartar') }
    finally { setActing(null) }
  }

  async function dismissAll() {
    setDismissingAll(true)
    try {
      const res = await fetch('/api/medico/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [], action: 'dismiss_all' }),
      })
      if (res.ok) {
        setAlerts([])
        onAlertRead?.()
        toast.success('Todas las alertas descartadas')
      }
    } catch { toast.error('Error al descartar') }
    finally { setDismissingAll(false) }
  }

  async function markAllAsRead() {
    const unreadIds = alerts.filter(a => !a.read).map(a => a.id)
    if (unreadIds.length === 0) return
    try {
      const res = await fetch('/api/medico/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: unreadIds, action: 'read' }),
      })
      if (res.ok) {
        setAlerts(prev => prev.map(a => ({ ...a, read: true })))
        onAlertRead?.()
      }
    } catch { toast.error('Error') }
  }

  // ── Computed data ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = alerts
    if (filter === 'unread') result = result.filter(a => !a.read)
    if (filter === 'critical') result = result.filter(a => a.level === 'critical' || a.level === 'danger')
    return result
  }, [alerts, filter])

  // Weekly summary
  const summary = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = alerts.filter(a => new Date(a.created_at) >= weekAgo)

    // Group by patient
    const patientMap = new Map<string, { name: string; maxLevel: string; count: number }>()
    for (const a of alerts) {
      const existing = patientMap.get(a.patient_id)
      if (!existing) {
        patientMap.set(a.patient_id, { name: a.patient_name ?? 'Paciente', maxLevel: a.level, count: 1 })
      } else {
        existing.count++
        const levels = ['info', 'warning', 'danger', 'critical']
        if (levels.indexOf(a.level) > levels.indexOf(existing.maxLevel)) existing.maxLevel = a.level
      }
    }

    const needAttention = Array.from(patientMap.values()).filter(p => p.maxLevel === 'danger' || p.maxLevel === 'critical').length
    const warning = Array.from(patientMap.values()).filter(p => p.maxLevel === 'warning').length
    const stable = Array.from(patientMap.values()).filter(p => p.maxLevel === 'info').length

    // Priority-sorted patients
    const prioritySorted = Array.from(patientMap.entries()).sort((a, b) => {
      const levels = ['info', 'warning', 'danger', 'critical']
      return levels.indexOf(b[1].maxLevel) - levels.indexOf(a[1].maxLevel)
    })

    return {
      total: alerts.length,
      unread: alerts.filter(a => !a.read).length,
      thisWeekCount: thisWeek.length,
      needAttention,
      warning,
      stable,
      prioritySorted,
    }
  }, [alerts])

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute top-0 right-0 h-full w-full max-w-lg bg-card border-l border-border/60 shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
              <Bell size={16} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Alertas Inteligentes</h2>
              <p className="text-[10px] text-muted-foreground">
                {summary.unread > 0 ? `${summary.unread} sin leer` : 'Todo al dia'}
                {summary.total > 0 && ` · ${summary.total} total`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/30 transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Summary bar */}
        {!loading && alerts.length > 0 && (
          <div className="px-5 py-3 border-b border-border/30 bg-muted/10 shrink-0">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">Resumen semanal</p>
            <div className="flex gap-3">
              {summary.needAttention > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={10} className="text-red-400" />
                  <span className="text-[10px] font-medium text-red-400">{summary.needAttention} requieren atencion</span>
                </div>
              )}
              {summary.warning > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                  <Activity size={10} className="text-yellow-400" />
                  <span className="text-[10px] font-medium text-yellow-400">{summary.warning} en observacion</span>
                </div>
              )}
              {summary.stable > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <Users size={10} className="text-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-400">{summary.stable} estables</span>
                </div>
              )}
            </div>

            {/* Priority patients */}
            {summary.prioritySorted.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {summary.prioritySorted.slice(0, 8).map(([patientId, p]) => {
                  const levelCfg = LEVEL_CONFIG[p.maxLevel as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.info
                  return (
                    <Link
                      key={patientId}
                      href={`/patients/${patientId}/dashboard`}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium border ${levelCfg.bg} ${levelCfg.text} hover:opacity-80 transition-opacity`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${levelCfg.dot}`} />
                      {p.name}
                      {p.count > 1 && <span className="opacity-60">({p.count})</span>}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Filters and actions */}
        {!loading && alerts.length > 0 && (
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/20 shrink-0">
            <div className="flex gap-1">
              {(['all', 'unread', 'critical'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all ${
                    filter === f
                      ? 'bg-accent text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                  }`}
                >
                  {f === 'all' ? `Todas (${alerts.length})` : f === 'unread' ? `Sin leer (${summary.unread})` : 'Criticas'}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                title="Marcar todas como leidas"
              >
                <CheckCheck size={10} />
              </button>
              <button
                onClick={dismissAll}
                disabled={dismissingAll}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                title="Descartar todas"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 shimmer rounded-xl" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-muted/20 border border-border/30 flex items-center justify-center">
                <BellOff size={28} className="text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Sin alertas pendientes</p>
                <p className="text-xs text-muted-foreground">
                  Las alertas aparecen cuando un paciente sube un nuevo analisis, un biomarcador entra en rango critico, o un valor empeora significativamente.
                </p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <Filter size={20} className="text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Sin alertas con este filtro</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {filtered.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  acting={acting === alert.id}
                  onRead={() => markAsRead([alert.id])}
                  onDismiss={() => dismissAlert([alert.id])}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AlertCard sub-component ─────────────────────────────────────

function AlertCard({ alert, acting, onRead, onDismiss }: {
  alert: MedicoAlert
  acting: boolean
  onRead: () => void
  onDismiss: () => void
}) {
  const levelCfg = LEVEL_CONFIG[alert.level] ?? LEVEL_CONFIG.info
  const typeCfg = TYPE_CONFIG[alert.alert_type] ?? TYPE_CONFIG.new_analysis
  const TypeIcon = typeCfg.icon

  return (
    <div className={`rounded-xl border p-3.5 transition-all ${
      alert.read ? 'bg-card border-border/20 opacity-60' : `${levelCfg.bg}`
    } ${acting ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          alert.read ? 'bg-muted/20' : `${levelCfg.bg}`
        }`}>
          <TypeIcon size={14} className={alert.read ? 'text-muted-foreground' : levelCfg.text} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {!alert.read && <span className={`w-1.5 h-1.5 rounded-full ${levelCfg.dot} shrink-0`} />}
            <span className="text-xs font-semibold text-foreground truncate">{alert.title}</span>
          </div>

          {alert.detail && (
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5 line-clamp-2">
              {alert.detail}
            </p>
          )}

          <div className="flex items-center gap-3 text-[9px] text-muted-foreground/60">
            <span>{alert.patient_name ?? 'Paciente'}</span>
            <span>{typeCfg.label}</span>
            <span>{formatDate(alert.created_at)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!alert.read && (
            <button
              onClick={onRead}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
              title="Marcar como leida"
            >
              <Eye size={11} />
            </button>
          )}
          <button
            onClick={onDismiss}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Descartar"
          >
            <X size={11} />
          </button>
          {alert.patient_id && (
            <Link
              href={`/patients/${alert.patient_id}/dashboard${alert.result_id ? `?resultId=${alert.result_id}` : ''}`}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
              title="Ver dashboard"
            >
              <ChevronRight size={11} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
