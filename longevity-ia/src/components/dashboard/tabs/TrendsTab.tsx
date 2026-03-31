'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { computeTrends, type TrendsSummary, type BiomarkerTrend, type AnalysisSnapshot } from '@/lib/longevity-trends'
import { MethodologyFooter } from '../MethodologyFooter'
import { formatDateShort } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  Activity, Clock, Target, ChevronDown, ChevronRight,
  Heart, FlaskConical, Droplets, Shield, Zap, Sun, BarChart2,
} from 'lucide-react'

interface ResultSummary {
  id: string
  result_date: string
}

interface TrendsTabProps {
  patient: { id: string; name: string; age: number }
  allResults: ResultSummary[]
}

const SYSTEM_ICONS: Record<string, typeof Heart> = {
  cardiovascular: Heart,
  metabolic: FlaskConical,
  renal: Droplets,
  hepatic: Activity,
  hematologic: Zap,
  immune: Shield,
  inflammatory: AlertTriangle,
  vitamins: Sun,
  hormonal: BarChart2,
}

const SYSTEM_COLORS: Record<string, string> = {
  cardiovascular: '#ff4d6d',
  metabolic: '#f5a623',
  renal: '#38bdf8',
  hepatic: '#a78bfa',
  hematologic: '#34d399',
  immune: '#60a5fa',
  inflammatory: '#fb923c',
  vitamins: '#fbbf24',
  hormonal: '#c084fc',
}

const DIRECTION_CONFIG = {
  improving: { icon: TrendingUp, label: 'Mejorando', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  worsening: { icon: TrendingDown, label: 'Empeorando', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  stable: { icon: Minus, label: 'Estable', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  unknown: { icon: Minus, label: 'Sin datos', color: 'text-muted-foreground', bg: 'bg-muted/20 border-border/30' },
}

export function TrendsTab({ patient, allResults }: TrendsTabProps) {
  const [loading, setLoading] = useState(true)
  const [trends, setTrends] = useState<TrendsSummary | null>(null)
  const [systemScoreHistory, setSystemScoreHistory] = useState<Record<string, { date: string; score: number }[]>>({})
  const [expandedBiomarker, setExpandedBiomarker] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'biomarkers' | 'systems' | 'velocity'>('overview')

  useEffect(() => {
    loadTrends()
  }, [patient.id])

  async function loadTrends() {
    setLoading(true)
    try {
      // Fetch all results with parsed_data and ai_analysis
      const { data: results } = await supabase
        .from('lab_results')
        .select('id, result_date, parsed_data, ai_analysis')
        .eq('patient_id', patient.id)
        .not('parsed_data', 'is', null)
        .order('result_date', { ascending: true })

      if (!results || results.length < 2) {
        setTrends(null)
        setLoading(false)
        return
      }

      const snapshots: AnalysisSnapshot[] = results.map(r => ({
        id: r.id,
        result_date: r.result_date,
        parsed_data: r.parsed_data as Record<string, unknown> | null,
        ai_analysis: r.ai_analysis as { overallScore?: number; systemScores?: Record<string, number> } | null,
      }))

      const computed = computeTrends(snapshots)
      setTrends(computed)

      // Extract system score history from all analyses
      const systemHistory: Record<string, { date: string; score: number }[]> = {}
      const systemKeys = ['cardiovascular', 'metabolic', 'hepatic', 'renal', 'immune', 'hematologic', 'inflammatory', 'vitamins']

      for (const r of results) {
        const ai = r.ai_analysis as { systemScores?: Record<string, number> } | null
        if (!ai?.systemScores) continue
        for (const key of systemKeys) {
          if (ai.systemScores[key] != null) {
            if (!systemHistory[key]) systemHistory[key] = []
            systemHistory[key].push({ date: r.result_date, score: ai.systemScores[key] })
          }
        }
      }
      setSystemScoreHistory(systemHistory)
    } catch (e) {
      console.error('Error loading trends:', e)
    } finally {
      setLoading(false)
    }
  }

  // Velocity alerts - biomarkers heading toward danger
  const velocityAlerts = useMemo(() => {
    if (!trends) return []
    return [...trends.worsening, ...trends.improving]
      .filter(t => t.projectedMonthsToDanger != null || t.projectedMonthsToOptimal != null)
      .sort((a, b) => (a.projectedMonthsToDanger ?? 999) - (b.projectedMonthsToDanger ?? 999))
  }, [trends])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 shimmer rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 shimmer rounded-xl" />
          <div className="h-24 shimmer rounded-xl" />
          <div className="h-24 shimmer rounded-xl" />
        </div>
        <div className="h-64 shimmer rounded-xl" />
      </div>
    )
  }

  if (!trends) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center">
          <TrendingUp size={28} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-foreground font-semibold mb-1">Se necesitan al menos 2 analisis</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Para ver tendencias longitudinales, {patient.name} necesita tener al menos 2 estudios de laboratorio analizados.
          </p>
        </div>
      </div>
    )
  }

  const SECTIONS = [
    { id: 'overview' as const, label: 'Resumen', icon: BarChart2 },
    { id: 'biomarkers' as const, label: 'Biomarcadores', icon: Activity },
    { id: 'systems' as const, label: 'Scores por Sistema', icon: Heart },
    { id: 'velocity' as const, label: 'Velocidad de Cambio', icon: Clock },
  ]

  const overallTrendConfig = DIRECTION_CONFIG[trends.overallTrend === 'mixed' ? 'stable' : trends.overallTrend]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Tendencias Longitudinales</h2>
          <p className="text-xs text-muted-foreground">
            {trends.totalAnalyses} analisis | {formatDateShort(trends.dateRange.from)} — {formatDateShort(trends.dateRange.to)}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${overallTrendConfig.bg}`}>
          <overallTrendConfig.icon size={14} className={overallTrendConfig.color} />
          <span className={`text-xs font-medium ${overallTrendConfig.color}`}>
            Tendencia general: {trends.overallTrend === 'mixed' ? 'Mixta' : overallTrendConfig.label}
          </span>
        </div>
      </div>

      {/* Section navigation */}
      <div className="flex gap-1 bg-muted/20 rounded-lg p-1 border border-border/30">
        {SECTIONS.map(sec => {
          const Icon = sec.icon
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all flex-1 justify-center ${
                activeSection === sec.id
                  ? 'bg-accent text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon size={12} />
              {sec.label}
            </button>
          )
        })}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard
              title="Mejorando"
              count={trends.improving.length}
              color="text-emerald-400"
              bg="bg-emerald-500/5 border-emerald-500/20"
              icon={TrendingUp}
              items={trends.improving.slice(0, 3).map(t => `${t.name} ${t.deltaPct != null ? `${t.deltaPct > 0 ? '+' : ''}${t.deltaPct}%` : ''}`)}
            />
            <SummaryCard
              title="Empeorando"
              count={trends.worsening.length}
              color="text-red-400"
              bg="bg-red-500/5 border-red-500/20"
              icon={TrendingDown}
              items={trends.worsening.slice(0, 3).map(t => `${t.name} ${t.deltaPct != null ? `${t.deltaPct > 0 ? '+' : ''}${t.deltaPct}%` : ''}`)}
            />
            <SummaryCard
              title="Estables"
              count={trends.stable.length}
              color="text-blue-400"
              bg="bg-blue-500/5 border-blue-500/20"
              icon={Minus}
              items={trends.stable.slice(0, 3).map(t => t.name)}
            />
          </div>

          {/* Overall Score Timeline */}
          {trends.scoreTrend.length >= 2 && (
            <div className="bg-card border border-border/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target size={14} className="text-accent" />
                Score General — Linea de Tiempo
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends.scoreTrend.map(s => ({ ...s, date: formatDateShort(s.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <ReferenceLine y={85} stroke="#34d399" strokeDasharray="3 3" label={{ value: 'Optimo', position: 'right', fontSize: 9, fill: '#34d399' }} />
                    <ReferenceLine y={65} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'Normal', position: 'right', fontSize: 9, fill: '#fbbf24' }} />
                    <ReferenceLine y={40} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Atencion', position: 'right', fontSize: 9, fill: '#f87171' }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#c084fc"
                      strokeWidth={2.5}
                      dot={{ fill: '#c084fc', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Score General"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Danger velocity alerts */}
          {velocityAlerts.filter(v => v.projectedMonthsToDanger != null && v.projectedMonthsToDanger < 24).length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} />
                Alertas de Velocidad de Deterioro
              </h3>
              <div className="space-y-2">
                {velocityAlerts
                  .filter(v => v.projectedMonthsToDanger != null && v.projectedMonthsToDanger < 24)
                  .map(v => (
                    <div key={v.key} className="flex items-center gap-3 px-3 py-2 bg-red-500/5 rounded-lg">
                      <TrendingDown size={12} className="text-red-400 shrink-0" />
                      <span className="text-xs text-foreground/80">
                        A este ritmo de deterioro, <strong className="text-red-300">{v.name}</strong> llegara
                        a nivel critico en <strong className="text-red-300">~{v.projectedMonthsToDanger} meses</strong>
                        {v.monthlyRate != null && (
                          <span className="text-muted-foreground"> ({v.monthlyRate > 0 ? '+' : ''}{v.monthlyRate} {v.unit}/mes)</span>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Biomarkers Section */}
      {activeSection === 'biomarkers' && (
        <div className="space-y-3">
          {/* Worsening first, then improving, then stable */}
          {trends.worsening.length > 0 && (
            <BiomarkerGroup
              title="Empeorando"
              items={trends.worsening}
              expanded={expandedBiomarker}
              onToggle={setExpandedBiomarker}
            />
          )}
          {trends.improving.length > 0 && (
            <BiomarkerGroup
              title="Mejorando"
              items={trends.improving}
              expanded={expandedBiomarker}
              onToggle={setExpandedBiomarker}
            />
          )}
          {trends.stable.length > 0 && (
            <BiomarkerGroup
              title="Estables"
              items={trends.stable}
              expanded={expandedBiomarker}
              onToggle={setExpandedBiomarker}
            />
          )}
        </div>
      )}

      {/* System Scores Section */}
      {activeSection === 'systems' && (
        <div className="space-y-4">
          {Object.entries(systemScoreHistory)
            .filter(([, history]) => history.length >= 2)
            .map(([system, history]) => {
              const SystemIcon = SYSTEM_ICONS[system] ?? BarChart2
              const color = SYSTEM_COLORS[system] ?? '#c084fc'
              const first = history[0].score
              const last = history[history.length - 1].score
              const delta = last - first
              const DirIcon = delta > 2 ? TrendingUp : delta < -2 ? TrendingDown : Minus
              const dirColor = delta > 2 ? 'text-emerald-400' : delta < -2 ? 'text-red-400' : 'text-blue-400'

              return (
                <div key={system} className="bg-card border border-border/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <SystemIcon size={14} style={{ color }} />
                      <span className="text-sm font-semibold text-foreground capitalize">{system}</span>
                      <span className="text-[10px] text-muted-foreground">{history.length} analisis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {history.map(h => h.score).join(' → ')}
                      </span>
                      <DirIcon size={12} className={dirColor} />
                      <span className={`text-xs font-medium ${dirColor}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history.map(h => ({ ...h, date: formatDateShort(h.date) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                        />
                        <ReferenceLine y={85} stroke="#34d39955" strokeDasharray="2 4" />
                        <ReferenceLine y={40} stroke="#f8717155" strokeDasharray="2 4" />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke={color}
                          strokeWidth={2}
                          dot={{ fill: color, r: 3 }}
                          name={`Score ${system}`}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}

          {Object.values(systemScoreHistory).every(h => h.length < 2) && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Se necesitan al menos 2 analisis con scores por sistema para mostrar la comparacion.
            </div>
          )}
        </div>
      )}

      {/* Velocity Section */}
      {activeSection === 'velocity' && (
        <div className="space-y-4">
          <div className="bg-card border border-border/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock size={14} className="text-accent" />
              Velocidad de Cambio por Biomarcador
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              Proyecciones basadas en la tasa de cambio mensual observada entre analisis. Estos calculos asumen tendencia lineal constante.
            </p>
            <div className="space-y-2">
              {[...trends.worsening, ...trends.improving, ...trends.stable]
                .filter(t => t.monthlyRate != null && t.monthlyRate !== 0)
                .sort((a, b) => Math.abs(b.monthlyRate ?? 0) - Math.abs(a.monthlyRate ?? 0))
                .map(t => {
                  const isWorsening = t.direction === 'worsening'
                  const DirIcon = DIRECTION_CONFIG[t.direction].icon
                  const dirColor = DIRECTION_CONFIG[t.direction].color

                  return (
                    <div key={t.key} className="flex items-center gap-3 px-3 py-2.5 bg-muted/10 rounded-lg border border-border/20">
                      <DirIcon size={12} className={`${dirColor} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{t.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {t.monthlyRate! > 0 ? '+' : ''}{t.monthlyRate} {t.unit}/mes
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {t.previousValue} → {t.currentValue} {t.unit}
                          {t.snapshots.length > 2 && ` (${t.snapshots.length} mediciones)`}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {isWorsening && t.projectedMonthsToDanger != null && (
                          <div className="text-[10px] text-red-400 font-medium">
                            Critico en ~{t.projectedMonthsToDanger} meses
                          </div>
                        )}
                        {!isWorsening && t.projectedMonthsToOptimal != null && (
                          <div className="text-[10px] text-emerald-400 font-medium">
                            Optimo en ~{t.projectedMonthsToOptimal} meses
                          </div>
                        )}
                        {t.deltaPct != null && (
                          <div className={`text-[10px] ${isWorsening ? 'text-red-400/60' : 'text-emerald-400/60'}`}>
                            {t.deltaPct > 0 ? '+' : ''}{t.deltaPct}% vs anterior
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      <MethodologyFooter type="trends" />
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function SummaryCard({ title, count, color, bg, icon: Icon, items }: {
  title: string
  count: number
  color: string
  bg: string
  icon: typeof TrendingUp
  items: string[]
}) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className={`text-2xl font-bold ${color}`}>{count}</span>
      </div>
      <p className="text-xs font-medium text-foreground mb-1.5">{title}</p>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <p key={i} className="text-[10px] text-muted-foreground truncate">{item}</p>
        ))}
      </div>
    </div>
  )
}

function BiomarkerGroup({ title, items, expanded, onToggle }: {
  title: string
  items: BiomarkerTrend[]
  expanded: string | null
  onToggle: (key: string | null) => void
}) {
  const dirConfig = title === 'Mejorando' ? DIRECTION_CONFIG.improving
    : title === 'Empeorando' ? DIRECTION_CONFIG.worsening
    : DIRECTION_CONFIG.stable

  return (
    <div className="space-y-1.5">
      <h3 className={`text-xs font-semibold ${dirConfig.color} flex items-center gap-1.5 px-1`}>
        <dirConfig.icon size={12} />
        {title} ({items.length})
      </h3>
      {items.map(t => {
        const isExpanded = expanded === t.key
        const DirIcon = DIRECTION_CONFIG[t.direction].icon
        const dirColor = DIRECTION_CONFIG[t.direction].color
        const SysIcon = SYSTEM_ICONS[t.system] ?? BarChart2

        return (
          <div key={t.key} className="bg-card border border-border/30 rounded-lg overflow-hidden">
            <button
              onClick={() => onToggle(isExpanded ? null : t.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/10 transition-colors text-left"
            >
              <SysIcon size={11} className="text-muted-foreground/50 shrink-0" style={{ color: SYSTEM_COLORS[t.system] }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground">{t.name}</span>
                <span className="text-[10px] text-muted-foreground ml-2">
                  {t.previousValue} → {t.currentValue} {t.unit}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {t.deltaPct != null && (
                  <span className={`text-[10px] font-medium ${dirColor}`}>
                    {t.deltaPct > 0 ? '+' : ''}{t.deltaPct}%
                  </span>
                )}
                <DirIcon size={11} className={dirColor} />
                {isExpanded ? <ChevronDown size={10} className="text-muted-foreground" /> : <ChevronRight size={10} className="text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 animate-fade-in">
                {/* Mini chart */}
                {t.snapshots.length >= 2 && (
                  <div className="h-28 mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={t.snapshots.map(s => ({ date: formatDateShort(s.date), value: s.value }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#9ca3af' }} />
                        <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={SYSTEM_COLORS[t.system] ?? '#c084fc'}
                          strokeWidth={2}
                          dot={{ fill: SYSTEM_COLORS[t.system] ?? '#c084fc', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/10 rounded p-1.5">
                    <p className="text-[9px] text-muted-foreground">Cambio/mes</p>
                    <p className="text-[11px] font-medium text-foreground">
                      {t.monthlyRate != null ? `${t.monthlyRate > 0 ? '+' : ''}${t.monthlyRate}` : '—'} {t.unit}
                    </p>
                  </div>
                  <div className="bg-muted/10 rounded p-1.5">
                    <p className="text-[9px] text-muted-foreground">Mediciones</p>
                    <p className="text-[11px] font-medium text-foreground">{t.snapshots.length}</p>
                  </div>
                  <div className="bg-muted/10 rounded p-1.5">
                    <p className="text-[9px] text-muted-foreground">Proyeccion</p>
                    <p className="text-[11px] font-medium text-foreground">
                      {t.projectedMonthsToDanger != null
                        ? <span className="text-red-400">Critico ~{t.projectedMonthsToDanger}m</span>
                        : t.projectedMonthsToOptimal != null
                          ? <span className="text-emerald-400">Optimo ~{t.projectedMonthsToOptimal}m</span>
                          : '—'
                      }
                    </p>
                  </div>
                </div>

                {/* Alert */}
                {t.alert && (
                  <div className={`mt-2 px-2.5 py-1.5 rounded text-[10px] ${
                    t.alert.level === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    <AlertTriangle size={10} className="inline mr-1" />
                    {t.alert.message}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
