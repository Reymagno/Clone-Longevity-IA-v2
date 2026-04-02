'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Building2, Hash, Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { Clinica, Medico, ClinicStats, Patient } from '@/types'
import { ResumenTab } from './tabs/ResumenTab'
import { MedicosTab } from './tabs/MedicosTab'
import { PacientesTab } from './tabs/PacientesTab'
import { EstadisticasTab } from './tabs/EstadisticasTab'
import { InvitacionesTab } from './tabs/InvitacionesTab'

type TabKey = 'resumen' | 'medicos' | 'pacientes' | 'estadisticas' | 'invitaciones'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'medicos', label: 'Medicos' },
  { key: 'pacientes', label: 'Pacientes' },
  { key: 'estadisticas', label: 'Estadisticas' },
  { key: 'invitaciones', label: 'Invitaciones' },
]

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
        setStats(data)
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

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadClinica(), loadStats(), loadMedicos(), loadPatients()])
    setLoading(false)
  }, [loadClinica, loadStats, loadMedicos, loadPatients])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleRefreshMedicos = useCallback(() => {
    loadMedicos()
    loadStats()
  }, [loadMedicos, loadStats])

  const handleRefreshPatients = useCallback(() => {
    loadPatients()
    loadStats()
  }, [loadPatients, loadStats])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="card-medical p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl shimmer" />
            <div className="space-y-2">
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header card */}
      <div className="card-medical p-6 border-t-2 border-t-amber-400/60">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
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
        {clinica && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/40">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground block">RFC</span>
              {clinica.rfc}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground block">Contacto</span>
              {clinica.contact_email}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground block">Telefono</span>
              {clinica.phone}
            </div>
          </div>
        )}
        {clinica?.code && (
          <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Hash size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Codigo de Clinica</p>
              <p className="text-sm font-bold text-foreground tracking-wider">{clinica.code}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(clinica.code!); toast.success('Codigo copiado') }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/40 transition-colors"
            >
              <Copy size={12} /> Copiar
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border/40">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              activeTab === tab.key
                ? 'text-amber-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
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
    </div>
  )
}
