'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Building2, Hash, Copy, Stethoscope, Users, BarChart2,
  Mail, AlertTriangle, BotMessageSquare, UserPlus, UserCog,
  Settings, Phone, FileText, Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Clinica, Medico, ClinicStats, Patient } from '@/types'
import { ResumenTab } from './tabs/ResumenTab'
import { MedicosTab } from './tabs/MedicosTab'
import { PacientesTab } from './tabs/PacientesTab'
import { EstadisticasTab } from './tabs/EstadisticasTab'
import { InvitacionesTab } from './tabs/InvitacionesTab'
import { AgentChat } from '@/components/chat/AgentChat'

// ── Tab config ──────────────────────────────────────────────────────

type TabKey = 'resumen' | 'medicos' | 'pacientes' | 'estadisticas' | 'invitaciones' | 'agente'

const TABS: { key: TabKey; label: string; icon: typeof Building2; isAgent?: boolean }[] = [
  { key: 'resumen',       label: 'Resumen',       icon: BarChart2 },
  { key: 'medicos',       label: 'Medicos',        icon: Stethoscope },
  { key: 'pacientes',     label: 'Pacientes',      icon: Users },
  { key: 'estadisticas',  label: 'Estadisticas',   icon: Activity },
  { key: 'invitaciones',  label: 'Invitaciones',   icon: Mail },
  { key: 'agente',        label: 'Asistente IA',   icon: BotMessageSquare, isAgent: true },
]

// ── Component ───────────────────────────────────────────────────────

export function ClinicaDashboard() {
  const [clinica, setClinica] = useState<Clinica | null>(null)
  const [stats, setStats] = useState<ClinicStats>({
    total_medicos: 0,
    total_patients: 0,
    analyses_this_month: 0,
    pending_alerts: 0,
  })
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [pendingInvitations, setPendingInvitations] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>('resumen')
  const [loading, setLoading] = useState(true)

  const loadClinica = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clinicas')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) setClinica(data as Clinica)
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/clinica/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats ?? data)
      }
    } catch { /* silent */ }
  }, [])

  const loadMedicos = useCallback(async () => {
    try {
      const res = await fetch('/api/clinica/medicos')
      if (res.ok) {
        const data = await res.json()
        setMedicos(data.medicos ?? data ?? [])
      }
    } catch { /* silent */ }
  }, [])

  const loadPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/clinica/patients')
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients ?? data ?? [])
      }
    } catch { /* silent */ }
  }, [])

  const loadPendingInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/clinica/invitations')
      if (res.ok) {
        const data = await res.json()
        const invitations = data.invitations ?? data ?? []
        setPendingInvitations(invitations.filter((i: { status: string }) => i.status === 'pending').length)
      }
    } catch { /* silent */ }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadClinica(), loadStats(), loadMedicos(), loadPatients(), loadPendingInvitations()])
    setLoading(false)
  }, [loadClinica, loadStats, loadMedicos, loadPatients, loadPendingInvitations])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleRefreshMedicos = useCallback(() => {
    loadMedicos()
    loadStats()
    loadPendingInvitations()
  }, [loadMedicos, loadStats, loadPendingInvitations])

  const handleRefreshPatients = useCallback(() => {
    loadPatients()
    loadStats()
  }, [loadPatients, loadStats])

  // Tab counts for badges
  const tabCounts: Partial<Record<TabKey, number>> = {
    medicos: stats.total_medicos,
    pacientes: stats.total_patients,
    invitaciones: pendingInvitations,
  }

  // ── Loading skeleton ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="card-medical p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl shimmer" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 shimmer rounded" />
              <div className="h-3 w-28 shimmer rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-medical p-5">
              <div className="h-8 w-16 shimmer rounded mb-2" />
              <div className="h-3 w-24 shimmer rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header card: 2 column layout ── */}
      <div className="card-medical p-6 border-t-2 border-t-amber-400/60">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Left: clinic identity */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Building2 size={26} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {clinica?.clinic_name ?? 'Mi Clinica'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {clinica?.director_name ? `Dir. ${clinica.director_name}` : 'Panel de administracion'}
              </p>
            </div>
          </div>

          {/* Right: clinic code (prominent) */}
          {clinica?.code && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <Hash size={14} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Codigo Clinica</p>
                <p className="text-sm font-bold text-amber-400 tracking-widest font-mono">{clinica.code}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(clinica.code!); toast.success('Codigo copiado') }}
                className="ml-2 p-1.5 rounded-lg text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                title="Copiar codigo"
              >
                <Copy size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Contact info row (compact) */}
        {clinica && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-border/40 text-xs text-muted-foreground">
            {clinica.rfc && (
              <span className="flex items-center gap-1.5">
                <FileText size={12} className="text-muted-foreground/60" />
                <span className="text-foreground/80 font-medium">RFC:</span> {clinica.rfc}
              </span>
            )}
            {clinica.contact_email && (
              <span className="flex items-center gap-1.5">
                <Mail size={12} className="text-muted-foreground/60" />
                {clinica.contact_email}
              </span>
            )}
            {clinica.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={12} className="text-muted-foreground/60" />
                {clinica.phone}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Quick actions bar ── */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('medicos')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-amber-500/25 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/40 transition-all"
        >
          <UserPlus size={14} />
          Nuevo Medico
        </button>
        <button
          onClick={() => setActiveTab('pacientes')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all"
        >
          <UserCog size={14} />
          Nuevo Paciente
        </button>
        <button
          onClick={() => setActiveTab('invitaciones')}
          className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-blue-500/25 bg-blue-500/8 text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/40 transition-all"
        >
          <Mail size={14} />
          Invitaciones
          {pendingInvitations > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-danger text-[10px] font-bold text-background">
              {pendingInvitations}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('agente')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-accent/25 bg-accent/8 text-accent hover:bg-accent/15 hover:border-accent/40 transition-all"
        >
          <BotMessageSquare size={14} />
          Asistente IA
        </button>
      </div>

      {/* ── KPIs with hierarchy ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Primary KPI: Medicos (larger) */}
        <div className="card-medical p-5 relative overflow-hidden sm:row-span-1">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Stethoscope size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Medicos</p>
              <p className="text-2xl font-bold text-foreground">{stats.total_medicos}</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((stats.total_medicos / Math.max(stats.total_medicos, 10)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{stats.total_medicos} registrados en tu clinica</p>
        </div>

        {/* Secondary KPI: Pacientes */}
        <div className="card-medical p-5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Users size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pacientes</p>
              <p className="text-2xl font-bold text-foreground">{stats.total_patients}</p>
            </div>
          </div>
        </div>

        {/* Tertiary KPIs: Analyses + Alerts (stacked) */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-4">
          <div className="card-medical p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <BarChart2 size={14} className="text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Analisis / mes</p>
                <p className="text-lg font-bold text-foreground">{stats.analyses_this_month}</p>
              </div>
            </div>
          </div>

          <div className="card-medical p-4 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${stats.pending_alerts > 0 ? 'bg-danger' : 'bg-muted-foreground/30'}`} />
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.pending_alerts > 0
                  ? 'bg-danger/10 border border-danger/20'
                  : 'bg-muted/30 border border-border/40'
              }`}>
                <AlertTriangle size={14} className={stats.pending_alerts > 0 ? 'text-danger' : 'text-muted-foreground'} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Alertas</p>
                <p className={`text-lg font-bold ${stats.pending_alerts > 0 ? 'text-danger' : 'text-foreground'}`}>
                  {stats.pending_alerts}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar with icons and badges ── */}
      <div className="flex overflow-x-auto scrollbar-none -mb-px border-b border-border/40">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const count = tabCounts[tab.key]
          const isActive = activeTab === tab.key
          const hasBadge = tab.key === 'invitaciones' && pendingInvitations > 0

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? tab.isAgent
                    ? 'text-accent border-accent'
                    : 'text-amber-400 border-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={15} className={isActive ? (tab.isAgent ? 'text-accent' : 'text-amber-400') : ''} />
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && !hasBadge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? tab.isAgent ? 'bg-accent/15 text-accent' : 'bg-amber-500/15 text-amber-400'
                    : 'bg-muted/40 text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
              {hasBadge && (
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-danger text-[10px] font-bold text-background">
                  {pendingInvitations}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'resumen' && (
        <ResumenTab stats={stats} medicos={medicos} recentPatients={patients.slice(0, 5)} />
      )}
      {activeTab === 'medicos' && (
        <MedicosTab medicos={medicos} onRefresh={handleRefreshMedicos} />
      )}
      {activeTab === 'pacientes' && (
        <PacientesTab patients={patients} medicos={medicos} onRefresh={handleRefreshPatients} />
      )}
      {activeTab === 'estadisticas' && (
        <EstadisticasTab stats={stats} medicos={medicos} />
      )}
      {activeTab === 'invitaciones' && (
        <InvitacionesTab onRefresh={handleRefreshMedicos} />
      )}
      {activeTab === 'agente' && (
        <div style={{ height: 'calc(100vh - 14rem)' }}>
          <AgentChat role="clinica" />
        </div>
      )}
    </div>
  )
}
