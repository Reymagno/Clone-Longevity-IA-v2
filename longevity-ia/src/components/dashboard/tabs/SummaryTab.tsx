'use client'

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import type { AIAnalysis, ProtocolItem } from '@/types'
import { getScoreColor, getScoreLabel } from '@/lib/utils'
import {
  Activity, Brain, Heart, ShieldCheck,
  Zap, Layers, Droplets, Shield, Flame, Sun,
  TrendingUp, TrendingDown, Minus,
  ArrowRight, Pill, Leaf, Dumbbell, FlaskConical, Sparkles,
  type LucideIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// METADATA Y HELPERS
// ─────────────────────────────────────────────────────────────────

interface SystemMeta {
  name: string
  subtitle: string
  icon: LucideIcon
  iconColor: string
}

const SYSTEM_META: Record<string, SystemMeta> = {
  cardiovascular: { name: 'Corazón',     subtitle: 'Colesterol y circulación', icon: Heart,    iconColor: 'text-rose-400'   },
  metabolic:      { name: 'Glucosa',     subtitle: 'Azúcar y energía',         icon: Zap,      iconColor: 'text-yellow-400' },
  hepatic:        { name: 'Hígado',      subtitle: 'Detox y metabolismo',      icon: Layers,   iconColor: 'text-amber-400'  },
  renal:          { name: 'Riñones',     subtitle: 'Filtración y limpieza',    icon: Droplets, iconColor: 'text-sky-400'    },
  immune:         { name: 'Inmunidad',   subtitle: 'Defensas del cuerpo',      icon: Shield,   iconColor: 'text-violet-400' },
  hematologic:    { name: 'Sangre',      subtitle: 'Células y oxigenación',    icon: Activity, iconColor: 'text-pink-400'   },
  inflammatory:   { name: 'Inflamación', subtitle: 'Envejecimiento celular',   icon: Flame,    iconColor: 'text-orange-400' },
  vitamins:       { name: 'Vitaminas',   subtitle: 'Nutrientes esenciales',    icon: Sun,      iconColor: 'text-yellow-300' },
}

function scoreInterpretation(score: number): string {
  if (score >= 85) return 'Tu cuerpo funciona de manera óptima. Estás en el 15 % superior de salud metabólica.'
  if (score >= 65) return 'Tu salud está en buen estado. Hay algunas áreas con oportunidad de mejora.'
  if (score >= 40) return 'Hay señales de alerta que conviene atender con tu médico próximamente.'
  return 'Tus resultados requieren atención médica prioritaria. Consulta a tu médico.'
}

function bioAgeText(ageDiff: number, bioAge: number): { headline: string; sub: string } {
  if (ageDiff < -2) return {
    headline: `${Math.abs(ageDiff)} años más joven`,
    sub: `Tu cuerpo funciona como el de alguien de ${bioAge} años`,
  }
  if (ageDiff > 2) return {
    headline: `${ageDiff} años mayor`,
    sub: `Tu cuerpo muestra desgaste de alguien de ${bioAge} años`,
  }
  return {
    headline: 'En equilibrio',
    sub: 'Tu edad biológica coincide con tu edad cronológica',
  }
}

// ─────────────────────────────────────────────────────────────────
// CATEGORÍAS DE RECOMENDACIONES
// ─────────────────────────────────────────────────────────────────

interface CategoryDef {
  id: string
  label: string
  color: string
  Icon: LucideIcon
  keywords: string[]
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    id: 'supplement',
    label: 'Suplementación',
    keywords: ['suplemento', 'suplementac', 'supplement', 'vitamina', 'mineral', 'omega', 'proteína'],
    color: '#a78bfa',
    Icon: Pill,
  },
  {
    id: 'pharma',
    label: 'Farmacológico',
    keywords: ['farmacol', 'medicament', 'fármaco', 'medicina', 'farmacéutico', 'rx', 'drug'],
    color: '#f87171',
    Icon: FlaskConical,
  },
  {
    id: 'diet',
    label: 'Dieta & Nutrición',
    keywords: ['dieta', 'nutrici', 'alimentac', 'nutri', 'alimentar', 'comida', 'alimento'],
    color: '#4ade80',
    Icon: Leaf,
  },
  {
    id: 'lifestyle',
    label: 'Estilo de Vida',
    keywords: ['estilo', 'ejercicio', 'actividad', 'lifestyle', 'deporte', 'sueño', 'sleep', 'movimiento', 'físico'],
    color: '#38bdf8',
    Icon: Dumbbell,
  },
  {
    id: 'psych',
    label: 'Psicología & Bienestar Mental',
    keywords: ['psicolog', 'mental', 'estrés', 'stress', 'mindful', 'emocional', 'cognitiv', 'meditac', 'respirac'],
    color: '#fb923c',
    Icon: Brain,
  },
]

function resolveCategory(category: string): CategoryDef {
  const lower = (category ?? '').toLowerCase()
  return CATEGORY_DEFS.find(d => d.keywords.some(k => lower.includes(k))) ?? {
    id: 'other',
    label: category || 'General',
    keywords: [],
    color: '#64748b',
    Icon: Sparkles,
  }
}

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  immediate: { label: 'Inmediata', color: '#ff4d6d' },
  high:      { label: 'Alta',      color: '#f5a623' },
  medium:    { label: 'Media',     color: '#38bdf8' },
  low:       { label: 'Baja',      color: '#00e5a0' },
}

// ─────────────────────────────────────────────────────────────────
// SCORE RING
// ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 148 }: { score: number; size?: number }) {
  const color = getScoreColor(score)
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90" style={{ overflow: 'visible' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a2d4a" strokeWidth="12" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 10px ${color}70)` }}
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────
// RECOMMENDATION CARD
// ─────────────────────────────────────────────────────────────────

function RecommendationCard({
  molecule, dose, mechanism, evidence, clinicalTrial,
  targetBiomarkers, expectedResult, urgency, catColor,
}: {
  molecule: string
  dose: string
  mechanism: string
  evidence: string
  clinicalTrial: string
  targetBiomarkers: string[]
  expectedResult: string
  urgency: string
  catColor: string
}) {
  const urg = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG.medium
  const biomarkers = Array.isArray(targetBiomarkers) ? targetBiomarkers : []

  return (
    <div
      className="rounded-2xl border overflow-hidden bg-card/50"
      style={{ borderColor: `${catColor}25`, borderLeftWidth: 3, borderLeftColor: catColor }}
    >
      {/* Cabecera: molécula + urgencia */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight">{molecule}</p>
          {dose && (
            <p className="text-xs text-muted-foreground mt-1 font-mono leading-relaxed">{dose}</p>
          )}
        </div>
        <span
          className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5"
          style={{ background: `${urg.color}18`, color: urg.color, border: `1px solid ${urg.color}30` }}
        >
          {urg.label}
        </span>
      </div>

      {/* Resultado esperado */}
      {expectedResult && (
        <div className="mx-4 mb-3 flex items-start gap-2 px-3 py-2 rounded-xl"
          style={{ background: `${catColor}0d`, border: `1px solid ${catColor}20` }}
        >
          <ArrowRight size={11} className="shrink-0 mt-0.5" style={{ color: catColor }} />
          <p className="text-[11px] leading-relaxed font-medium" style={{ color: catColor }}>
            {expectedResult}
          </p>
        </div>
      )}

      {/* Mecanismo */}
      {mechanism && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-muted-foreground leading-relaxed">{mechanism}</p>
        </div>
      )}

      {/* Evidencia */}
      {(evidence || clinicalTrial) && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Evidencia científica</p>
          <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
            {evidence}{clinicalTrial ? ` · ${clinicalTrial}` : ''}
          </p>
        </div>
      )}

      {/* Biomarcadores objetivo */}
      {biomarkers.length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {biomarkers.slice(0, 4).map((b, i) => (
            <span
              key={i}
              className="text-[9px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: `${catColor}10`, color: catColor, border: `1px solid ${catColor}20` }}
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

interface SummaryTabProps {
  analysis: AIAnalysis
  patientAge: number
}

export function SummaryTab({ analysis, patientAge }: SummaryTabProps) {
  const ageDiff = patientAge - analysis.longevity_age
  const bioAge  = bioAgeText(ageDiff, analysis.longevity_age)

  const radarData = Object.entries(analysis.systemScores).map(([key, value]) => ({
    subject: SYSTEM_META[key]?.name ?? key,
    score: value,
  }))

  // Agrupar protocolo por categoría
  const protocol = analysis.protocol ?? []
  const grouped = new Map<string, { def: CategoryDef; items: ProtocolItem[] }>()

  for (const item of protocol) {
    const def = resolveCategory(item.category ?? '')
    if (!grouped.has(def.id)) grouped.set(def.id, { def, items: [] })
    grouped.get(def.id)!.items.push(item)
  }

  // Orden predefinido de categorías
  const CAT_ORDER = ['supplement', 'pharma', 'diet', 'lifestyle', 'psych', 'other']
  const sortedGroups: Array<[string, { def: CategoryDef; items: ProtocolItem[] }]> =
    Array.from(grouped.entries()).sort(
      ([a], [b]) => CAT_ORDER.indexOf(a) - CAT_ORDER.indexOf(b)
    )

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div
        className="card-medical p-6 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0d1e38 0%, #0a1628 60%, #0d1e38 100%)' }}
      >
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: getScoreColor(analysis.overallScore), filter: 'blur(60px)' }}
        />

        <div className="relative flex flex-col md:flex-row gap-6 items-center md:items-start">

          {/* Score ring */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative">
              <ScoreRing score={analysis.overallScore} size={148} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-4xl font-mono font-bold leading-none"
                  style={{ color: getScoreColor(analysis.overallScore) }}
                >
                  {analysis.overallScore}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
              </div>
            </div>
            <span
              className="mt-2 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{
                color: getScoreColor(analysis.overallScore),
                background: `${getScoreColor(analysis.overallScore)}18`,
                border: `1px solid ${getScoreColor(analysis.overallScore)}35`,
              }}
            >
              {getScoreLabel(analysis.overallScore)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">Score General</p>
          </div>

          {/* Edad biológica */}
          <div
            className="shrink-0 rounded-2xl border px-6 py-5 flex flex-col items-center md:items-start"
            style={{
              borderColor: ageDiff > 2 ? '#ff4d6d30' : '#00e5a030',
              background:  ageDiff > 2 ? '#ff4d6d08' : '#00e5a008',
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Brain size={13} className="text-info" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Edad Biológica
              </span>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="text-5xl font-mono font-bold text-foreground leading-none">
                {analysis.longevity_age}
              </span>
              <span className="text-sm text-muted-foreground mb-1">años</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              {ageDiff > 2  ? <TrendingUp   size={13} className="text-danger"           />
              : ageDiff < -2 ? <TrendingDown  size={13} className="text-accent"           />
              :                <Minus         size={13} className="text-muted-foreground" />}
              <span
                className="text-xs font-semibold"
                style={{ color: ageDiff > 2 ? '#ff4d6d' : ageDiff < -2 ? '#00e5a0' : '#64748b' }}
              >
                {bioAge.headline}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 max-w-[190px] text-center md:text-left leading-relaxed">
              {bioAge.sub}
            </p>
            <div className="mt-2 text-[10px] text-muted-foreground/60 text-center md:text-left">
              Edad cronológica: <strong className="text-muted-foreground">{patientAge} años</strong>
            </div>
          </div>

          {/* Interpretación + resumen clínico */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="rounded-xl p-4" style={{ background: `${getScoreColor(analysis.overallScore)}0e`, border: `1px solid ${getScoreColor(analysis.overallScore)}25` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: getScoreColor(analysis.overallScore) }}>
                ¿Qué significa tu score?
              </p>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {scoreInterpretation(analysis.overallScore)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                Resumen Clínico
              </p>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {analysis.clinicalSummary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ESCALA VISUAL ─────────────────────────────────────────── */}
      <div className="card-medical px-5 py-4">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">
          ¿Dónde estás en la escala de salud?
        </p>
        <div className="relative h-4 rounded-full overflow-visible"
          style={{ background: 'linear-gradient(to right, #ff4d6d, #f5a623 40%, #38bdf8 65%, #00e5a0)' }}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-background shadow-xl transition-all duration-700 z-10"
            style={{
              left: `${Math.min(Math.max(analysis.overallScore, 2), 98)}%`,
              backgroundColor: getScoreColor(analysis.overallScore),
              boxShadow: `0 0 12px ${getScoreColor(analysis.overallScore)}90`,
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] font-semibold text-red-400">Crítico<br /><span className="font-normal opacity-70">0 – 39</span></span>
          <span className="text-[10px] font-semibold text-amber-400 text-center">Atención<br /><span className="font-normal opacity-70">40 – 64</span></span>
          <span className="text-[10px] font-semibold text-sky-400 text-center">Normal<br /><span className="font-normal opacity-70">65 – 84</span></span>
          <span className="text-[10px] font-semibold text-emerald-400 text-right">Óptimo<br /><span className="font-normal opacity-70">85 – 100</span></span>
        </div>
      </div>

      {/* ── SISTEMAS ─────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <ShieldCheck size={13} className="text-info" />
          Estado de tus sistemas corporales
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(analysis.systemScores).map(([key, value]) => {
            const meta = SYSTEM_META[key]
            if (!meta) return null
            const Icon  = meta.icon
            const color = getScoreColor(value)
            return (
              <div
                key={key}
                className="card-medical p-4 flex flex-col items-center text-center gap-2.5 transition-all duration-200"
                style={{ borderColor: `${color}28` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}15`, border: `1.5px solid ${color}30` }}
                >
                  <Icon size={20} className={meta.iconColor} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">{meta.name}</p>
                  <p className="text-[9px] text-muted-foreground">{meta.subtitle}</p>
                </div>
                <span className="text-2xl font-mono font-bold leading-none" style={{ color }}>
                  {value}
                </span>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
                >
                  {getScoreLabel(value)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RADAR ────────────────────────────────────────────────── */}
      <div className="card-medical p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity size={13} className="text-accent" />
          Mapa Visual de Salud
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#1a2d4a" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'DM Mono' }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#00e5a0"
              fill="#00e5a0"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{ background: '#0a1628', border: '1px solid #1a2d4a', borderRadius: 10, padding: '8px 12px' }}
              labelStyle={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}
              itemStyle={{ color: '#00e5a0', fontFamily: 'DM Mono', fontSize: 12 }}
              formatter={(value: number) => [`${value} pts`, 'Score']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* ── RECOMENDACIONES DE LONGEVIDAD ────────────────────────── */}
      {sortedGroups.length > 0 && (
        <div>
          {/* Encabezado de sección */}
          <div className="card-medical px-5 py-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-accent/10 border border-accent/20">
                <Sparkles size={17} className="text-accent" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Recomendaciones de Longevidad</h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Protocolo personalizado basado en tus biomarcadores actuales y en evidencia científica de medicina regenerativa y longevidad.
                  Cada intervención está vinculada a estudios clínicos publicados.
                </p>
              </div>
            </div>

            {/* Leyenda de urgencia */}
            <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                ¿Qué significa cada nivel de urgencia?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { label: 'Inmediata', color: '#ff4d6d', desc: 'Comienza cuanto antes. Tu biomarcador está en zona crítica.' },
                  { label: 'Alta',      color: '#f5a623', desc: 'Empieza en las próximas semanas. Hay riesgo real si se ignora.' },
                  { label: 'Media',     color: '#38bdf8', desc: 'Planifícalo en 1–3 meses. Mejora progresiva sin urgencia inmediata.' },
                  { label: 'Baja',      color: '#00e5a0', desc: 'Preventivo o de mantenimiento. No hay prisa, pero sí beneficio.' },
                ] as const).map(({ label, color, desc }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <span
                      className="self-start text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
                    >
                      {label}
                    </span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chips de resumen de categorías */}
            <div className="flex flex-wrap gap-2 mt-4">
              {sortedGroups.map(([id, { def, items }]) => {
                const CatIcon = def.Icon
                return (
                  <div
                    key={id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold"
                    style={{ borderColor: `${def.color}30`, background: `${def.color}0a`, color: def.color }}
                  >
                    <CatIcon size={12} />
                    {def.label}
                    <span className="font-mono opacity-70">({items.length})</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Grupos por categoría */}
          <div className="space-y-6">
            {sortedGroups.map(([id, { def, items }]) => {
              const CatIcon = def.Icon
              return (
                <div key={id}>
                  {/* Encabezado de categoría */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${def.color}18`, border: `1px solid ${def.color}30` }}
                    >
                      <CatIcon size={14} style={{ color: def.color }} />
                    </div>
                    <h3 className="text-sm font-bold" style={{ color: def.color }}>
                      {def.label}
                    </h3>
                    <div className="flex-1 h-px" style={{ background: `${def.color}20` }} />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {items.length} intervención{items.length !== 1 ? 'es' : ''}
                    </span>
                  </div>

                  {/* Grid de tarjetas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((item, i) => (
                      <RecommendationCard
                        key={i}
                        molecule={item.molecule ?? ''}
                        dose={item.dose ?? ''}
                        mechanism={item.mechanism ?? ''}
                        evidence={item.evidence ?? ''}
                        clinicalTrial={item.clinicalTrial ?? ''}
                        targetBiomarkers={item.targetBiomarkers ?? []}
                        expectedResult={item.expectedResult ?? ''}
                        urgency={item.urgency ?? 'medium'}
                        catColor={def.color}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Nota de disclaimer */}
          <p className="text-[10px] text-muted-foreground mt-4 px-1 leading-relaxed">
            Estas recomendaciones son orientativas y no sustituyen la consulta médica. Siempre coordina cualquier intervención con un profesional de salud calificado, especialmente en el caso de fármacos o dosis elevadas de suplementos.
          </p>
        </div>
      )}

    </div>
  )
}
