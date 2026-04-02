'use client'

import { Users, BarChart2, AlertTriangle, Stethoscope } from 'lucide-react'
import type { ClinicStats, Medico, Patient } from '@/types'

interface ResumenTabProps {
  stats: ClinicStats
  medicos: Medico[]
  recentPatients: Patient[]
}

const KPI_CONFIG = [
  {
    key: 'total_patients' as const,
    label: 'Pacientes Activos',
    icon: Users,
    color: 'emerald',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
    textClass: 'text-emerald-400',
    barClass: 'bg-emerald-500',
  },
  {
    key: 'analyses_this_month' as const,
    label: 'Analisis este Mes',
    icon: BarChart2,
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    textClass: 'text-blue-400',
    barClass: 'bg-blue-500',
  },
  {
    key: 'pending_alerts' as const,
    label: 'Alertas Pendientes',
    icon: AlertTriangle,
    color: 'amber',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    textClass: 'text-amber-400',
    barClass: 'bg-amber-500',
  },
  {
    key: 'total_medicos' as const,
    label: 'Medicos del Staff',
    icon: Stethoscope,
    color: 'purple',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/20',
    textClass: 'text-purple-400',
    barClass: 'bg-purple-500',
  },
]

export function ResumenTab({ stats, medicos, recentPatients }: ResumenTabProps) {
  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {KPI_CONFIG.map((kpi) => {
          const Icon = kpi.icon
          const value = stats[kpi.key]
          return (
            <div key={kpi.key} className="card-medical p-5 relative overflow-hidden">
              {/* Left accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${kpi.barClass} rounded-l`} />
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${kpi.bgClass} border ${kpi.borderClass} flex items-center justify-center`}>
                  <Icon size={18} className={kpi.textClass} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      {/* Medicos del Staff */}
      {medicos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Medicos del Staff
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {medicos.slice(0, 5).map((medico) => (
              <div key={medico.id} className="card-medical p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-amber-400">
                    {medico.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{medico.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{medico.specialty}</p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  {medico.patient_count ?? 0} pac.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent patients */}
      {recentPatients.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Pacientes Recientes
            </h3>
          </div>
          <div className="card-medical divide-y divide-border/40">
            {recentPatients.map((patient) => (
              <div key={patient.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-emerald-400">
                    {patient.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{patient.name}</p>
                  <p className="text-xs text-muted-foreground">{patient.code} · {patient.age} anos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
