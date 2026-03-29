'use client'

import { useState, useEffect } from 'react'
import type { Patient, LabResult, ParsedData, AIAnalysis, BiomarkerValue } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { getStatusColor, formatDateShort, formatDateFull } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import {
  GitCompareArrows, TrendingUp, TrendingDown, Minus,
  Heart, Layers, Droplets, FlaskConical, Activity,
  Shield, Zap, Sun, Calendar, ArrowRight,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

interface ResultSummary {
  id: string
  result_date: string
}

interface CompareTabProps {
  patient: Patient
  currentResult: LabResult
  allResults: ResultSummary[]
}

interface BiomarkerTrend {
  key: string
  label: string
  category: string
  values: { date: string; value: number | null; status: string | null }[]
  unit: string
  direction: 'up' | 'down' | 'stable' | 'unknown'
  improved: boolean | null
}

// ─── Helpers ────────────────────────────────────────────────────

function extractBiomarker(parsed: ParsedData | null, category: string, key: string): BiomarkerValue | null {
  if (!parsed) return null
  const section = (parsed as unknown as Record<string, unknown>)[category] as Record<string, unknown> | null | undefined
  if (!section) return null
  const bm = section[key] as BiomarkerValue | null | undefined
  return bm ?? null
}

const BIOMARKER_DEFS: { key: string; label: string; category: string; unit: string; lowerIsBetter: boolean }[] = [
  // Lipids
  { key: 'totalCholesterol', label: 'Colesterol Total', category: 'lipids', unit: 'mg/dL', lowerIsBetter: true },
  { key: 'ldl', label: 'LDL', category: 'lipids', unit: 'mg/dL', lowerIsBetter: true },
  { key: 'hdl', label: 'HDL', category: 'lipids', unit: 'mg/dL', lowerIsBetter: false },
  { key: 'triglycerides', label: 'Triglicéridos', category: 'lipids', unit: 'mg/dL', lowerIsBetter: true },
  // Metabolic
  { key: 'glucose', label: 'Glucosa', category: 'metabolic', unit: 'mg/dL', lowerIsBetter: true },
  { key: 'creatinine', label: 'Creatinina', category: 'metabolic', unit: 'mg/dL', lowerIsBetter: true },
  { key: 'gfr', label: 'TFG', category: 'metabolic', unit: 'mL/min', lowerIsBetter: false },
  { key: 'uricAcid', label: 'Ácido Úrico', category: 'metabolic', unit: 'mg/dL', lowerIsBetter: true },
  // Liver
  { key: 'ast', label: 'AST', category: 'liver', unit: 'U/L', lowerIsBetter: true },
  { key: 'alt', label: 'ALT', category: 'liver', unit: 'U/L', lowerIsBetter: true },
  { key: 'ggt', label: 'GGT', category: 'liver', unit: 'U/L', lowerIsBetter: true },
  { key: 'albumin', label: 'Albúmina', category: 'liver', unit: 'g/dL', lowerIsBetter: false },
  // Hematology
  { key: 'hemoglobin', label: 'Hemoglobina', category: 'hematology', unit: 'g/dL', lowerIsBetter: false },
  { key: 'platelets', label: 'Plaquetas', category: 'hematology', unit: 'x10³/µL', lowerIsBetter: false },
  { key: 'wbc', label: 'Leucocitos', category: 'hematology', unit: 'x10³/µL', lowerIsBetter: false },
  // Vitamins
  { key: 'vitaminD', label: 'Vitamina D', category: 'vitamins', unit: 'ng/mL', lowerIsBetter: false },
  { key: 'vitaminB12', label: 'Vitamina B12', category: 'vitamins', unit: 'pg/mL', lowerIsBetter: false },
  { key: 'ferritin', label: 'Ferritina', category: 'vitamins', unit: 'ng/mL', lowerIsBetter: false },
  // Hormones
  { key: 'tsh', label: 'TSH', category: 'hormones', unit: 'mIU/L', lowerIsBetter: false },
  { key: 'hba1c', label: 'HbA1c', category: 'hormones', unit: '%', lowerIsBetter: true },
  // Inflammation
  { key: 'crp', label: 'PCR', category: 'inflammation', unit: 'mg/L', lowerIsBetter: true },
  { key: 'homocysteine', label: 'Homocisteína', category: 'inflammation', unit: 'µmol/L', lowerIsBetter: true },
]

const CATEGORY_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  lipids:       { label: 'Lípidos',       Icon: Heart,       color: '#ff6b8a' },
  metabolic:    { label: 'Metabólico',    Icon: FlaskConical, color: '#34d399' },
  liver:        { label: 'Hígado',        Icon: Layers,      color: '#fbbf24' },
  hematology:   { label: 'Hematología',   Icon: Activity,    color: '#f472b6' },
  vitamins:     { label: 'Vitaminas',     Icon: Sun,         color: '#facc15' },
  hormones:     { label: 'Hormonas',      Icon: Droplets,    color: '#60a5fa' },
  inflammation: { label: 'Inflamación',   Icon: Zap,         color: '#fb923c' },
}

// ─── Score Comparison Card ──────────────────────────────────────

function ScoreCompareCard({ label, scores }: { label: string; scores: { date: string; value: number }[] }) {
  if (scores.length < 2) return null
  const latest = scores[scores.length - 1]
  const previous = scores[scores.length - 2]
  const diff = latest.value - previous.value
  const improved = diff > 0

  return (
    <div className="card-medical p-4">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-mono font-bold" style={{ color: getStatusColor(latest.value >= 85 ? 'optimal' : latest.value >= 65 ? 'normal' : latest.value >= 40 ? 'warning' : 'danger') }}>
          {latest.value}
        </span>
        <span className="text-xs text-muted-foreground mb-1">/ 100</span>
        <div className={`flex items-center gap-0.5 ml-auto text-xs font-medium ${improved ? 'text-accent' : diff < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
          {improved ? <TrendingUp size={12} /> : diff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          {diff > 0 ? '+' : ''}{diff}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2">
        {scores.map((s, i) => (
          <div key={i} className="flex-1 relative" title={`${formatDateShort(s.date)}: ${s.value}`}>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${s.value}%`, backgroundColor: getStatusColor(s.value >= 85 ? 'optimal' : s.value >= 65 ? 'normal' : s.value >= 40 ? 'warning' : 'danger') }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Trend Row ──────────────────────────────────────────────────

function TrendRow({ trend }: { trend: BiomarkerTrend }) {
  const values = trend.values.filter(v => v.value !== null)
  if (values.length < 2) return null

  const latest = values[values.length - 1]
  const previous = values[values.length - 2]
  const diff = (latest.value ?? 0) - (previous.value ?? 0)
  const pctChange = previous.value ? ((diff / previous.value) * 100).toFixed(1) : '—'

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{trend.label}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{trend.unit}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {values.map((v, i) => (
          <div key={i} className="text-center min-w-[52px]">
            <p className="text-[10px] text-muted-foreground">{formatDateShort(v.date)}</p>
            <p className="font-mono text-sm font-semibold" style={{ color: getStatusColor(v.status) }}>
              {v.value}
            </p>
          </div>
        ))}
        {values.length >= 2 && (
          <div className="text-center min-w-[52px]">
            <p className="text-[10px] text-muted-foreground">Cambio</p>
            <p className={`font-mono text-sm font-semibold ${trend.improved ? 'text-accent' : trend.improved === false ? 'text-danger' : 'text-muted-foreground'}`}>
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
              <span className="text-[9px] ml-0.5">({pctChange}%)</span>
            </p>
          </div>
        )}
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${trend.improved ? 'bg-accent/15 text-accent' : trend.improved === false ? 'bg-danger/15 text-danger' : 'bg-muted text-muted-foreground'}`}>
        {trend.direction === 'up' ? <TrendingUp size={12} /> : trend.direction === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

export function CompareTab({ patient, currentResult, allResults }: CompareTabProps) {
  const [fullResults, setFullResults] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    async function loadResults() {
      if (allResults.length <= 1) {
        setFullResults(currentResult ? [currentResult] : [])
        setLoading(false)
        return
      }

      try {
        const { data } = await supabase
          .from('lab_results')
          .select('*')
          .eq('patient_id', patient.id)
          .not('ai_analysis', 'is', null)
          .order('result_date', { ascending: true })

        setFullResults((data as LabResult[]) ?? [])
      } catch {
        setFullResults(currentResult ? [currentResult] : [])
      } finally {
        setLoading(false)
      }
    }
    loadResults()
  }, [patient.id, allResults.length, currentResult])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">
        Cargando historial de análisis...
      </div>
    )
  }

  if (fullResults.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center">
          <GitCompareArrows size={28} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Se necesitan al menos 2 análisis</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Sube un segundo estudio de laboratorio para comparar la evolución de tus biomarcadores en el tiempo.
        </p>
      </div>
    )
  }

  // ── Build trends ───────────────────────────────────────────────
  const trends: BiomarkerTrend[] = []
  for (const def of BIOMARKER_DEFS) {
    const values = fullResults.map(r => {
      const bm = extractBiomarker(r.parsed_data, def.category, def.key)
      return {
        date: r.result_date,
        value: bm?.value ?? null,
        status: bm?.status ?? null,
      }
    })

    const nonNull = values.filter(v => v.value !== null)
    if (nonNull.length < 1) continue

    let direction: 'up' | 'down' | 'stable' | 'unknown' = 'unknown'
    let improved: boolean | null = null

    if (nonNull.length >= 2) {
      const last = nonNull[nonNull.length - 1].value!
      const prev = nonNull[nonNull.length - 2].value!
      const diff = last - prev
      direction = Math.abs(diff) < 0.01 ? 'stable' : diff > 0 ? 'up' : 'down'
      improved = def.lowerIsBetter ? diff < 0 : diff > 0
      if (Math.abs(diff) < 0.01) improved = null
    }

    trends.push({
      key: def.key,
      label: def.label,
      category: def.category,
      values,
      unit: def.unit,
      direction,
      improved,
    })
  }

  // ── Build score trends ─────────────────────────────────────────
  const scoreTrends: Record<string, { date: string; value: number }[]> = {
    overall: [],
    cardiovascular: [],
    metabolic: [],
    hepatic: [],
  }

  for (const r of fullResults) {
    const a = r.ai_analysis as AIAnalysis | null
    if (!a) continue
    scoreTrends.overall.push({ date: r.result_date, value: a.overallScore })
    if (a.systemScores) {
      scoreTrends.cardiovascular.push({ date: r.result_date, value: a.systemScores.cardiovascular })
      scoreTrends.metabolic.push({ date: r.result_date, value: a.systemScores.metabolic })
      scoreTrends.hepatic.push({ date: r.result_date, value: a.systemScores.hepatic })
    }
  }

  // ── Chart data ────────────────────────────────────────────────
  const chartBiomarkers = selectedCategory === 'all'
    ? trends.filter(t => t.values.some(v => v.value !== null))
    : trends.filter(t => t.category === selectedCategory && t.values.some(v => v.value !== null))

  const filteredTrends = selectedCategory === 'all' ? trends : trends.filter(t => t.category === selectedCategory)

  // Overall score chart data
  const scoreChartData = fullResults.map(r => {
    const a = r.ai_analysis as AIAnalysis | null
    return {
      date: formatDateShort(r.result_date),
      overall: a?.overallScore ?? null,
      longevityAge: a?.longevity_age ?? null,
    }
  })

  const categories = ['all', ...Object.keys(CATEGORY_META)]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <GitCompareArrows size={20} className="text-accent" />
            Evolución en el Tiempo
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fullResults.length} análisis · {formatDateFull(fullResults[0].result_date)}
            {' '}<ArrowRight size={12} className="inline" />{' '}
            {formatDateFull(fullResults[fullResults.length - 1].result_date)}
          </p>
        </div>
      </div>

      {/* Score evolution chart */}
      <div className="card-medical p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Score General y Edad Biológica</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E4A38" />
              <XAxis dataKey="date" tick={{ fill: '#6B6660', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B6660', fontSize: 11 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#0F2A1E', border: '1px solid #1E4A38', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#E2DFD6' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="overall" stroke="#2EAE7B" strokeWidth={2.5} dot={{ r: 4 }} name="Score General" />
              <Line type="monotone" dataKey="longevityAge" stroke="#5BA4C9" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Edad Biológica" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Score comparison cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ScoreCompareCard label="Score General" scores={scoreTrends.overall} />
        <ScoreCompareCard label="Cardiovascular" scores={scoreTrends.cardiovascular} />
        <ScoreCompareCard label="Metabólico" scores={scoreTrends.metabolic} />
        <ScoreCompareCard label="Hepático" scores={scoreTrends.hepatic} />
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat]
          const isAll = cat === 'all'
          const isActive = selectedCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-muted/30 text-muted-foreground border border-border hover:text-foreground hover:border-accent/20'
              }`}
            >
              {isAll ? (
                <>
                  <Activity size={12} />
                  Todos
                </>
              ) : meta ? (
                <>
                  <meta.Icon size={12} />
                  {meta.label}
                </>
              ) : cat}
            </button>
          )
        })}
      </div>

      {/* Biomarker trend chart (first 4 that have data) */}
      {chartBiomarkers.length > 0 && (
        <div className="card-medical p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tendencia de Biomarcadores</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fullResults.map(r => {
                const point: Record<string, unknown> = { date: formatDateShort(r.result_date) }
                for (const t of chartBiomarkers.slice(0, 4)) {
                  const bm = extractBiomarker(r.parsed_data, t.category, t.key)
                  point[t.key] = bm?.value ?? null
                }
                return point
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E4A38" />
                <XAxis dataKey="date" tick={{ fill: '#6B6660', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B6660', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0F2A1E', border: '1px solid #1E4A38', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#E2DFD6' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {chartBiomarkers.slice(0, 4).map((t, i) => {
                  const colors = ['#2EAE7B', '#5BA4C9', '#D4A03A', '#D4536A']
                  return (
                    <Line
                      key={t.key}
                      type="monotone"
                      dataKey={t.key}
                      stroke={colors[i % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={t.label}
                      connectNulls
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Biomarker trends table */}
      <div className="card-medical p-5">
        <h3 className="text-sm font-semibold text-foreground mb-2">Detalle de Biomarcadores</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {filteredTrends.filter(t => t.values.some(v => v.value !== null)).length} biomarcadores con datos
        </p>
        <div>
          {filteredTrends.map(trend => (
            <TrendRow key={trend.key} trend={trend} />
          ))}
          {filteredTrends.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay biomarcadores con datos en esta categoría
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
