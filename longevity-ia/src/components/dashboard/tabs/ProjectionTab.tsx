'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { AIAnalysis } from '@/types'
import { TrendingUp, Clock, FlaskConical, HeartPulse, Activity, AlertTriangle } from 'lucide-react'
import { getUrgencyColor, getUrgencyLabel } from '@/lib/utils'

interface ProjectionTabProps {
  analysis: AIAnalysis
}

export function ProjectionTab({ analysis }: ProjectionTabProps) {
  const { projectionData, protocol, projectionFactors } = analysis
  const [hoveredYear, setHoveredYear] = useState<number | null>(null)

  const urgencyGroups = {
    immediate: protocol.filter(p => p.urgency === 'immediate'),
    high: protocol.filter(p => p.urgency === 'high'),
    medium: protocol.filter(p => p.urgency === 'medium'),
    low: protocol.filter(p => p.urgency === 'low'),
  }

  const hoveredData = hoveredYear
    ? projectionData.find(p => p.year === hoveredYear)
    : null

  const renderDot = (props: Record<string, unknown>, color: string) => {
    const cx = props.cx as number | undefined
    const cy = props.cy as number | undefined
    const payload = props.payload as { year: number } | undefined

    if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
      return <g key="empty" />
    }

    const isHovered = hoveredYear === payload.year
    return (
      <circle
        key={`dot-${color}-${payload.year}`}
        cx={cx}
        cy={cy}
        r={isHovered ? 8 : 5}
        fill={isHovered ? color : `${color}88`}
        stroke={color}
        strokeWidth={isHovered ? 3 : 1.5}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHoveredYear(payload.year)}
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Gráfica de proyección ── */}
      {projectionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={18} className="text-accent" />
              Proyección de Salud a 10 Años
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Pasa el cursor sobre cualquier punto para ver los biomarcadores y padecimientos proyectados en ese año
            </p>
          </CardHeader>
          <CardContent>
            <div onMouseLeave={() => setHoveredYear(null)}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projectionData} margin={{ top: 10, right: 20, bottom: 5, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2d4a" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'DM Mono' }}
                    tickFormatter={(v) => `Año ${v}`}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'DM Mono' }}
                    tickFormatter={(v) => `${v}`}
                    label={{
                      value: 'Score de Salud',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 4,
                      style: { fill: '#475569', fontSize: 10, fontFamily: 'Space Grotesk, sans-serif' },
                    }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0a1628', border: '1px solid #1a2d4a', borderRadius: 8 }}
                    labelFormatter={(v) => `Año ${v}`}
                    formatter={(value: number, name: string) => [
                      <span key={name} className="font-mono">{value.toFixed(1)}</span>,
                      name === 'withIntervention' ? 'Con Protocolo' : 'Sin Intervención',
                    ]}
                  />
                  <Legend
                    formatter={(value) => value === 'withIntervention' ? 'Con Protocolo' : 'Sin Intervención'}
                  />
                  <ReferenceLine y={65} stroke="#f5a623" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Line
                    type="monotone"
                    dataKey="withoutIntervention"
                    stroke="#ff4d6d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={(props) => renderDot(props as Record<string, unknown>, '#ff4d6d')}
                    activeDot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="withIntervention"
                    stroke="#00e5a0"
                    strokeWidth={2.5}
                    dot={(props) => renderDot(props as Record<string, unknown>, '#00e5a0')}
                    activeDot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Panel de intersección — aparece al hacer hover */}
            {hoveredData?.yearRisk && (
              <div className="mt-5 rounded-xl border border-warning/30 bg-[#f5a62308] animate-slide-up overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-warning/20 bg-[#f5a62312]">
                  <AlertTriangle size={15} className="text-warning shrink-0" />
                  <span className="text-sm font-semibold text-warning">
                    Año {hoveredData.year} — {hoveredData.yearRisk.urgencyNote}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
                  {/* Biomarcadores */}
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <FlaskConical size={13} className="text-info" />
                      <span className="text-xs font-semibold text-info uppercase tracking-wider">
                        Biomarcadores en riesgo
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {hoveredData.yearRisk.biomarkers.map((b, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2 items-start">
                          <span className="text-info mt-0.5 shrink-0">→</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Padecimientos */}
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <HeartPulse size={13} className="text-danger" />
                      <span className="text-xs font-semibold text-danger uppercase tracking-wider">
                        Padecimientos potenciales sin tratamiento
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {hoveredData.yearRisk.conditions.map((c, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2 items-start">
                          <span className="text-danger mt-0.5 shrink-0">→</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Estado vacío del panel cuando no hay hover */}
            {!hoveredData && (
              <div className="mt-5 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Selecciona un punto de la gráfica para ver los biomarcadores y padecimientos proyectados en ese año
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Factores de proyección con justificante médica ── */}
      {projectionFactors && projectionFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity size={18} className="text-accent" />
              Factores que Determinan la Trayectoria de Salud
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Biomarcadores clave del paciente y la evidencia médica que explica la divergencia entre ambas trayectorias
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectionFactors.map((factor, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-muted/40 overflow-hidden"
                >
                  {/* Encabezado del factor */}
                  <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/60">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{factor.factor}</h4>
                      <div className="flex flex-wrap gap-3 mt-1.5">
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">
                          Actual: {factor.currentValue}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                          Óptimo: {factor.optimalValue}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 mt-1">
                      Factor #{i + 1}
                    </span>
                  </div>

                  {/* Justificante médica */}
                  <div className="px-4 py-3 border-b border-border/60 bg-[#38bdf808]">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="text-info font-semibold">Evidencia médica: </span>
                      {factor.medicalJustification}
                    </p>
                  </div>

                  {/* Columnas: sin protocolo vs con protocolo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-danger shrink-0" />
                        <span className="text-xs font-semibold text-danger">Sin intervención</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{factor.withoutProtocol}</p>
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                        <span className="text-xs font-semibold text-accent">Con protocolo</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{factor.withProtocol}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Timeline de acciones por urgencia ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} className="text-info" />
            Timeline de Acciones por Urgencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {(['immediate', 'high', 'medium', 'low'] as const).map((urgency) => {
              const items = urgencyGroups[urgency]
              if (items.length === 0) return null

              return (
                <div key={urgency}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getUrgencyColor(urgency) }}
                    />
                    <h4 className="text-sm font-semibold" style={{ color: getUrgencyColor(urgency) }}>
                      {getUrgencyLabel(urgency)} — {items.length} intervención{items.length > 1 ? 'es' : ''}
                    </h4>
                  </div>
                  <div className="pl-5 border-l-2 space-y-2" style={{ borderColor: `${getUrgencyColor(urgency)}40` }}>
                    {items.map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted border border-border">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-mono text-muted-foreground">{item.category}</span>
                            <p className="text-sm font-semibold text-foreground">{item.molecule}</p>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground shrink-0">{item.dose}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
