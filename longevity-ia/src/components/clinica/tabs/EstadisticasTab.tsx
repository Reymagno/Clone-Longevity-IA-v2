'use client'

import { BarChart2, Users, Stethoscope, AlertTriangle, Activity } from 'lucide-react'
import type { ClinicStats, Medico } from '@/types'

interface EstadisticasTabProps {
  stats: ClinicStats
  medicos: Medico[]
}

export function EstadisticasTab({ stats, medicos }: EstadisticasTabProps) {
  const maxPatientCount = Math.max(1, ...medicos.map((m) => m.patient_count ?? 0))

  return (
    <div className="space-y-8">
      {/* Stats summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-medical p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Users size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pacientes</p>
              <p className="text-xl font-bold text-foreground">{stats.total_patients}</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, stats.total_patients * 2)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Promedio: {medicos.length > 0 ? Math.round(stats.total_patients / medicos.length) : 0} pacientes por medico
          </p>
        </div>

        <div className="card-medical p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <BarChart2 size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Analisis este Mes</p>
              <p className="text-xl font-bold text-foreground">{stats.analyses_this_month}</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, stats.analyses_this_month * 5)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Estudios procesados en el periodo actual
          </p>
        </div>

        <div className="card-medical p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alertas Pendientes</p>
              <p className="text-xl font-bold text-foreground">{stats.pending_alerts}</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, stats.pending_alerts * 10)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Alertas de biomarcadores sin revisar
          </p>
        </div>

        <div className="card-medical p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Activity size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tasa de Actividad</p>
              <p className="text-xl font-bold text-foreground">
                {stats.total_patients > 0
                  ? Math.round((stats.analyses_this_month / stats.total_patients) * 100)
                  : 0}%
              </p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-700"
              style={{
                width: `${stats.total_patients > 0
                  ? Math.min(100, (stats.analyses_this_month / stats.total_patients) * 100)
                  : 0}%`
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pacientes con analisis este mes
          </p>
        </div>
      </div>

      {/* Distribution bar: medicos with patient counts */}
      {medicos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Distribucion de Pacientes por Medico
            </h3>
          </div>
          <div className="card-medical p-5 space-y-4">
            {medicos.map((medico) => {
              const count = medico.patient_count ?? 0
              const pct = maxPatientCount > 0 ? (count / maxPatientCount) * 100 : 0
              return (
                <div key={medico.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium truncate">{medico.full_name}</span>
                    <span className="text-muted-foreground text-xs shrink-0 ml-2">
                      {count} paciente{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
