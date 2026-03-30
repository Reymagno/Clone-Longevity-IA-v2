'use client'

import type { AIAnalysis, ParsedData, BiomarkerValue, Patient } from '@/types'
import {
  Heart, Layers, Droplets, FlaskConical, Activity, Shield, Zap, Sun,
  BarChart2, HeartPulse, TrendingUp, ClipboardList, ShieldCheck,
  AlertTriangle, Sparkles, Clock, FileText, Pill, Dumbbell,
  Brain, AlertCircle, CheckCircle2, Info,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, ReferenceLine,
} from 'recharts'
import { getStatusColor, getStatusLabel, getScoreColor, getScoreLabel, getUrgencyColor, getUrgencyLabel } from '@/lib/utils'
import { MethodologyFooter } from '../MethodologyFooter'

// ── Score helpers (compartidos con OrganHealthTab) ───────────────
const STATUS_SCORE: Record<string, number> = {
  optimal: 100, normal: 72, warning: 42, danger: 12,
}
type BmWeight = 'high' | 'medium' | 'low'
interface OrganBm { key: string; label: string; bm: BiomarkerValue | null | undefined; weight: BmWeight }

function calcOrganScore(bms: OrganBm[]): number | null {
  const W = { high: 3, medium: 2, low: 1 }
  let total = 0, sum = 0
  for (const { bm, weight } of bms) {
    if (!bm || bm.value === null || !bm.status) continue
    const s = STATUS_SCORE[bm.status]
    if (s === undefined) continue
    sum += s * W[weight]; total += W[weight]
  }
  return total === 0 ? null : Math.round(sum / total)
}

const scoreColor = getScoreColor
const scoreLabel = getScoreLabel
const statusLabel = getStatusLabel

// ── Definición de órganos (condensada) ──────────────────────────
interface OrganDef {
  id: string; name: string; subtitle: string
  Icon: React.ElementType; iconClassName: string
  getBiomarkers: (d: ParsedData) => OrganBm[]
}
const ORGANS: OrganDef[] = [
  {
    id: 'cardiovascular', name: 'Corazón', subtitle: 'Cardiovascular',
    Icon: Heart, iconClassName: 'text-rose-400',
    getBiomarkers: (d) => [
      { key: 'ldl',              label: 'LDL',            bm: d.lipids?.ldl,              weight: 'high' },
      { key: 'hdl',              label: 'HDL',            bm: d.lipids?.hdl,              weight: 'high' },
      { key: 'atherogenicIndex', label: 'Í. Aterogénico', bm: d.lipids?.atherogenicIndex, weight: 'high' },
      { key: 'crp',              label: 'PCR',            bm: d.inflammation?.crp,        weight: 'high' },
    ],
  },
  {
    id: 'liver', name: 'Hígado', subtitle: 'Función Hepática',
    Icon: Layers, iconClassName: 'text-amber-400',
    getBiomarkers: (d) => [
      { key: 'alt',     label: 'ALT',      bm: d.liver?.alt,     weight: 'high' },
      { key: 'ast',     label: 'AST',      bm: d.liver?.ast,     weight: 'high' },
      { key: 'ggt',     label: 'GGT',      bm: d.liver?.ggt,     weight: 'high' },
      { key: 'albumin', label: 'Albúmina', bm: d.liver?.albumin, weight: 'high' },
    ],
  },
  {
    id: 'kidney', name: 'Riñones', subtitle: 'Función Renal',
    Icon: Droplets, iconClassName: 'text-blue-400',
    getBiomarkers: (d) => [
      { key: 'creatinine', label: 'Creatinina', bm: d.metabolic?.creatinine, weight: 'high' },
      { key: 'gfr',        label: 'TFG',        bm: d.metabolic?.gfr,        weight: 'high' },
      { key: 'urea',       label: 'Urea',       bm: d.metabolic?.urea,       weight: 'medium' },
    ],
  },
  {
    id: 'metabolic', name: 'Metabólico', subtitle: 'Glucosa y Energía',
    Icon: FlaskConical, iconClassName: 'text-emerald-400',
    getBiomarkers: (d) => [
      { key: 'glucose', label: 'Glucosa',  bm: d.metabolic?.glucose, weight: 'high' },
      { key: 'hba1c',   label: 'HbA1c',   bm: d.hormones?.hba1c,    weight: 'high' },
      { key: 'insulin', label: 'Insulina', bm: d.hormones?.insulin,  weight: 'medium' },
    ],
  },
  {
    id: 'hematology', name: 'Hematología', subtitle: 'Sangre y Oxigenación',
    Icon: Activity, iconClassName: 'text-pink-400',
    getBiomarkers: (d) => [
      { key: 'hemoglobin', label: 'Hemoglobina', bm: d.hematology?.hemoglobin, weight: 'high' },
      { key: 'rbc',        label: 'Eritrocitos', bm: d.hematology?.rbc,        weight: 'medium' },
      { key: 'platelets',  label: 'Plaquetas',   bm: d.hematology?.platelets,  weight: 'medium' },
    ],
  },
  {
    id: 'immune', name: 'Inmune', subtitle: 'Defensas',
    Icon: Shield, iconClassName: 'text-violet-400',
    getBiomarkers: (d) => [
      { key: 'wbc',         label: 'Leucocitos',  bm: d.hematology?.wbc,         weight: 'high' },
      { key: 'lymphocytes', label: 'Linfocitos',  bm: d.hematology?.lymphocytes, weight: 'high' },
      { key: 'neutrophils', label: 'Neutrófilos', bm: d.hematology?.neutrophils, weight: 'medium' },
    ],
  },
  {
    id: 'inflammation', name: 'Inflamación', subtitle: 'PCR y Marcadores',
    Icon: Zap, iconClassName: 'text-orange-400',
    getBiomarkers: (d) => [
      { key: 'crp',          label: 'PCR',          bm: d.inflammation?.crp,          weight: 'high' },
      { key: 'homocysteine', label: 'Homocisteína', bm: d.inflammation?.homocysteine, weight: 'high' },
    ],
  },
  {
    id: 'vitamins', name: 'Vitaminas', subtitle: 'Micronutrientes',
    Icon: Sun, iconClassName: 'text-yellow-300',
    getBiomarkers: (d) => [
      { key: 'vitaminD',   label: 'Vit. D',    bm: d.vitamins?.vitaminD,   weight: 'high' },
      { key: 'vitaminB12', label: 'Vit. B12',  bm: d.vitamins?.vitaminB12, weight: 'high' },
      { key: 'ferritin',   label: 'Ferritina', bm: d.vitamins?.ferritin,   weight: 'medium' },
    ],
  },
]

// ── Arc Gauge (tema oscuro — premium) ───────────────────────────
function ArcGauge({ score }: { score: number }) {
  const cx = 130, cy = 110, r = 86, sw = 14
  const safe = Math.max(0, Math.min(score, 100))
  const toXY = (angle: number, rad: number) => ({
    x: +(cx + rad * Math.cos(angle)).toFixed(3),
    y: +(cy + rad * Math.sin(angle)).toFixed(3),
  })
  const BG_START = 150
  const s0 = toXY(BG_START * Math.PI / 180, r)
  const s1 = toXY(30 * Math.PI / 180, r)
  const bgPath = `M ${s0.x} ${s0.y} A ${r} ${r} 0 1 1 ${s1.x} ${s1.y}`
  const fgEndDeg = BG_START + (safe / 100) * 240
  const fgEnd = toXY(fgEndDeg * Math.PI / 180, r)
  const largeArc = safe > 75 ? 1 : 0
  const fgPath = safe === 0 ? '' : `M ${s0.x} ${s0.y} A ${r} ${r} 0 ${largeArc} 1 ${fgEnd.x} ${fgEnd.y}`
  const col = scoreColor(score)
  // Gradient: pick a lighter tint for the end stop
  const colLight = score >= 85 ? '#7fffd4' : score >= 65 ? '#93d5f7' : score >= 40 ? '#ffd07f' : '#ff8fa3'
  const needleRad = fgEndDeg * Math.PI / 180
  // Needle: long line from pivot to arc, with a short tail going back
  const tip  = { x: +(cx + (r - 6)  * Math.cos(needleRad)).toFixed(2), y: +(cy + (r - 6)  * Math.sin(needleRad)).toFixed(2) }
  const tail = { x: +(cx + 18 * Math.cos(needleRad + Math.PI)).toFixed(2), y: +(cy + 18 * Math.sin(needleRad + Math.PI)).toFixed(2) }

  // Tick marks at 25, 50, 75
  const ticks = [25, 50, 75]

  return (
    <svg width="260" height="170" viewBox="0 0 260 170" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="arcGrad" gradientUnits="userSpaceOnUse"
          x1={s0.x} y1={s0.y} x2={fgEnd.x} y2={fgEnd.y}>
          <stop offset="0%" stopColor={col} stopOpacity="0.7" />
          <stop offset="100%" stopColor={colLight} stopOpacity="1" />
        </linearGradient>
        {/* Outer glow blur */}
        <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Needle drop shadow */}
        <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={col} floodOpacity="0.6" />
        </filter>
        {/* Tip glow pulse */}
        <filter id="tipGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Score number glow */}
        <filter id="scoreGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background track */}
      <path d={bgPath} fill="none" stroke="#1e293b" strokeWidth={sw} strokeLinecap="round" />
      {/* Inner track shadow */}
      <path d={bgPath} fill="none" stroke="#0f172a" strokeWidth={sw - 4} strokeLinecap="round" opacity="0.5" />

      {/* Foreground arc — glow layer */}
      {safe > 0 && (
        <path d={fgPath} fill="none" stroke={col} strokeWidth={sw + 4}
          strokeLinecap="round" filter="url(#arcGlow)" opacity="0.25" />
      )}
      {/* Foreground arc — gradient fill */}
      {safe > 0 && (
        <path d={fgPath} fill="none" stroke="url(#arcGrad)" strokeWidth={sw}
          strokeLinecap="round" />
      )}

      {/* Tick marks at 25 / 50 / 75 */}
      {ticks.map(t => {
        const deg = BG_START + (t / 100) * 240
        const rad = deg * Math.PI / 180
        const inner = toXY(rad, r - sw / 2 - 3)
        const outer = toXY(rad, r + sw / 2 + 3)
        return (
          <line key={t}
            x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        )
      })}

      {/* End-cap labels: 0 and 100 */}
      {[{ t: 0, label: '0' }, { t: 100, label: '100' }].map(({ t, label }) => {
        const pos = toXY((BG_START + (t / 100) * 240) * Math.PI / 180, r + sw / 2 + 14)
        return (
          <text key={t} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="#475569" fontFamily="ui-monospace,monospace">
            {label}
          </text>
        )
      })}

      {/* Needle */}
      {safe > 0 && (
        <>
          <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y}
            stroke={col} strokeWidth="2" strokeLinecap="round"
            filter="url(#needleShadow)" opacity="0.9" />
          {/* Glowing tip dot */}
          <circle cx={tip.x} cy={tip.y} r="5" fill={col} filter="url(#tipGlow)" opacity="0.5" />
          <circle cx={tip.x} cy={tip.y} r="3" fill={colLight} />
        </>
      )}

      {/* Pivot hub */}
      <circle cx={cx} cy={cy} r="11" fill="#0f172a" stroke="#1e2d40" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="5.5" fill={col} />

      {/* Score number — glow layer */}
      <text x={cx} y={cy - 22} textAnchor="middle" fill={col}
        fontSize="44" fontWeight="900" fontFamily="ui-monospace,monospace" letterSpacing="-2"
        filter="url(#scoreGlow)" opacity="0.4">
        {score}
      </text>
      {/* Score number — crisp top layer */}
      <text x={cx} y={cy - 22} textAnchor="middle" fill={col}
        fontSize="44" fontWeight="900" fontFamily="ui-monospace,monospace" letterSpacing="-2">
        {score}
      </text>
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#475569"
        fontSize="11" fontFamily="system-ui,sans-serif">
        / 100
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="#6B6660"
        fontSize="8" fontFamily="system-ui,sans-serif" letterSpacing="1.8" fontWeight="600">
        ÍNDICE LONGEVITY
      </text>
    </svg>
  )
}

// ── Fila de biomarcador ──────────────────────────────────────────
function BmRow({ label, bm }: { label: string; bm: BiomarkerValue | null | undefined }) {
  if (!bm || bm.value === null) return null
  const col = getStatusColor(bm.status)
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] text-muted-foreground truncate pr-2">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-mono text-[11px] font-semibold text-foreground">
          {bm.value} <span className="text-muted-foreground font-normal text-[10px]">{bm.unit}</span>
        </span>
        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: `${col}20`, color: col, border: `1px solid ${col}30` }}>
          {statusLabel(bm.status)}
        </span>
      </div>
    </div>
  )
}

// ── Fila de contexto clínico ─────────────────────────────────────
function CtxRow({ icon, color, label, value, alert }: {
  icon: React.ReactNode; color: string; label: string; value: string; alert?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
      style={{
        background: alert ? `${color}08` : 'transparent',
        border: `1px solid ${alert ? color + '25' : 'hsl(var(--border) / 0.5)'}`,
        borderLeft: alert ? `3px solid ${color}` : undefined,
      }}>
      <span className="mt-0.5 shrink-0" style={{ color }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: alert ? color : 'hsl(var(--muted-foreground))' }}>{label}</p>
        <p className="text-xs text-foreground/85 leading-relaxed">{value}</p>
      </div>
    </div>
  )
}

// ── Props ────────────────────────────────────────────────────────
interface SummaryTabProps {
  analysis: AIAnalysis
  patientAge: number
  patientName?: string
  resultDate?: string
  parsedData?: ParsedData | null
  patient?: Patient
}

// ── Extrae puntos clave de la historia clínica para el reporte ───
function extractClinicalContext(patient: Patient | undefined): {
  medications: string | null
  conditions: string | null
  allergies: string | null
  lifestyle: string | null
  risk: string | null
} {
  if (!patient?.clinical_history) return { medications: null, conditions: null, allergies: null, lifestyle: null, risk: null }

  const h = patient.clinical_history as unknown as Record<string, unknown>
  const medHist = h['medical_history'] as Record<string, unknown> | undefined
  const allergiesH = h['allergies'] as Record<string, unknown> | undefined
  const pa = h['physical_activity'] as Record<string, unknown> | undefined
  const sleepH = h['sleep'] as Record<string, unknown> | undefined
  const mhH = h['mental_health'] as Record<string, unknown> | undefined
  const fam = h['family_history'] as Record<string, unknown> | undefined
  const legacy = h['lifestyle'] as Record<string, unknown> | undefined

  const conds = medHist?.['chronic_conditions'] as string[] | undefined
  const famConds = fam?.['conditions'] as string[] | undefined

  const medications = medHist?.['current_medications'] as string | null ?? null
  const conditions = conds?.length ? conds.join(', ') : null
  const allergyMed = allergiesH?.['medication'] as string | null ?? null
  const allergyFood = allergiesH?.['food'] as string | null ?? null
  const allergiesStr = [allergyMed && `Medicamento: ${allergyMed}`, allergyFood && `Alimento: ${allergyFood}`].filter(Boolean).join(' · ') || null

  const exercise = pa?.['type'] as string | null ?? legacy?.['exercise'] as string | null ?? null
  const sleep = sleepH?.['hours'] as string | null ?? legacy?.['sleep_hours'] as string | null ?? null
  const stress = String(mhH?.['stress_level'] ?? legacy?.['stress_level'] ?? '').split(' — ')[0] || null
  const parts = [exercise && `Ejercicio: ${exercise}`, sleep && `Sueño: ${sleep}`, stress && `Estrés: ${stress}`].filter(Boolean)
  const lifestyle = parts.length ? parts.join(' · ') : null

  const risk = famConds?.length ? famConds.join(', ') : null

  return { medications, conditions, allergies: allergiesStr, lifestyle, risk }
}

// ── Componente principal ─────────────────────────────────────────
export function SummaryTab({ analysis, patientAge, patientName, resultDate, parsedData, patient }: SummaryTabProps) {
  const ageDiff = patientAge - analysis.longevity_age
  const gaugeCol = scoreColor(analysis.overallScore)
  const clinicalCtx = extractClinicalContext(patient)

  const topProtocol = [...(analysis.protocol ?? [])].sort((a, b) => {
    const o: Record<string, number> = { immediate: 0, high: 1, medium: 2, low: 3 }
    return (o[a.urgency] ?? 4) - (o[b.urgency] ?? 4)
  }).slice(0, 4)

  const topRisks = (analysis.risks ?? []).slice(0, 3)

  const swot = analysis.swot ?? { strengths: [], weaknesses: [], opportunities: [], threats: [] }

  const organScores = ORGANS.map(organ => ({
    organ,
    biomarkers: parsedData ? organ.getBiomarkers(parsedData) : [],
    score: parsedData ? calcOrganScore(organ.getBiomarkers(parsedData)) : null,
  }))

  const critical  = organScores.filter(o => o.score !== null && o.score < 40).length
  const attention = organScores.filter(o => o.score !== null && o.score >= 40 && o.score < 65).length
  const optimal   = organScores.filter(o => o.score !== null && o.score >= 85).length

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ══ 1. DIAGNÓSTICO GLOBAL ══════════════════════════════════ */}
      <div className="card-medical overflow-hidden p-0">
        {/* Colored accent line at top */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${gaugeCol}00 0%, ${gaugeCol} 40%, ${gaugeCol}aa 70%, ${gaugeCol}00 100%)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart2 size={15} className="text-accent shrink-0" />
            <div>
              <h2 className="font-semibold text-foreground text-sm leading-none">Diagnóstico Global</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide">Evaluación integral de longevidad</p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-wide"
            style={{ background: `${gaugeCol}15`, color: gaugeCol, border: `1px solid ${gaugeCol}30` }}>
            <CheckCircle2 size={9} />
            {scoreLabel(analysis.overallScore)}
          </span>
        </div>

        {/* Fila superior: Gauge + Edades + Delta */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">

          {/* Gauge */}
          <div className="flex flex-col items-center justify-center py-8 px-6 relative">
            {/* Strong radial glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 60%, ${gaugeCol}1a 0%, ${gaugeCol}08 40%, transparent 70%)` }} />
            {/* Outer ring decoration */}
            <div className="absolute inset-6 rounded-full pointer-events-none"
              style={{ boxShadow: `0 0 40px ${gaugeCol}0d` }} />
            <ArcGauge score={analysis.overallScore} />
            <span className="mt-3 text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase"
              style={{ background: `${gaugeCol}1a`, color: gaugeCol, border: `1px solid ${gaugeCol}35`, letterSpacing: '0.08em' }}>
              {scoreLabel(analysis.overallScore)}
            </span>
          </div>

          {/* Edades */}
          <div className="flex divide-x divide-border">
            {/* Edad Biológica */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                  style={{ background: `${gaugeCol}18`, border: `1px solid ${gaugeCol}30` }}>
                  <Heart size={10} style={{ color: gaugeCol }} />
                </span>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Edad Biológica</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-6xl font-black font-mono leading-none" style={{ color: gaugeCol }}>
                  {analysis.longevity_age}
                </span>
                <span className="text-xs text-muted-foreground font-medium">años</span>
              </div>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-center leading-tight"
                style={{ background: `${gaugeCol}12`, color: gaugeCol, border: `1px solid ${gaugeCol}25` }}>
                cómo envejece tu cuerpo
              </span>
            </div>

            {/* Edad Real */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-3 bg-muted/10">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted/50 border border-border">
                  <Clock size={10} className="text-muted-foreground" />
                </span>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Edad Real</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-6xl font-black font-mono leading-none text-foreground">{patientAge}</span>
                <span className="text-xs text-muted-foreground font-medium">años</span>
              </div>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                fecha de nacimiento
              </span>
            </div>
          </div>

          {/* Delta — Diferencia Biológica */}
          <div className="flex flex-col items-center justify-center px-7 py-8 gap-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold text-center">
              Diferencia Biológica
            </p>

            {/* Main delta block */}
            <div className="rounded-2xl px-6 py-6 text-center w-full flex flex-col items-center gap-3"
              style={{
                background: ageDiff > 2 ? '#2EAE7B0d' : ageDiff < -2 ? '#D4536A0d' : '#D4A03A0d',
                border: `1px solid ${ageDiff > 2 ? '#2EAE7B30' : ageDiff < -2 ? '#D4536A30' : '#D4A03A30'}`,
              }}>

              {/* Icon */}
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full"
                style={{
                  background: ageDiff > 2 ? '#2EAE7B15' : ageDiff < -2 ? '#D4536A15' : '#D4A03A15',
                  border: `1px solid ${ageDiff > 2 ? '#2EAE7B40' : ageDiff < -2 ? '#D4536A40' : '#D4A03A40'}`,
                }}>
                {ageDiff > 2
                  ? <TrendingUp size={18} style={{ color: '#2EAE7B' }} />
                  : ageDiff < -2
                  ? <TrendingUp size={18} style={{ color: '#D4536A', transform: 'scaleY(-1)' }} />
                  : <Activity size={18} style={{ color: '#D4A03A' }} />
                }
              </span>

              {/* Delta number */}
              <p className="text-5xl font-black font-mono leading-none"
                style={{ color: ageDiff > 2 ? '#2EAE7B' : ageDiff < -2 ? '#D4536A' : '#D4A03A' }}>
                {ageDiff > 2 ? `−${ageDiff}` : ageDiff < -2 ? `+${Math.abs(ageDiff)}` : '≈ 0'}
              </p>

              {/* Descriptive badge */}
              <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                style={{
                  background: ageDiff > 2 ? '#2EAE7B15' : ageDiff < -2 ? '#D4536A15' : '#D4A03A15',
                  color: ageDiff > 2 ? '#2EAE7B' : ageDiff < -2 ? '#D4536A' : '#D4A03A',
                  border: `1px solid ${ageDiff > 2 ? '#2EAE7B30' : ageDiff < -2 ? '#D4536A30' : '#D4A03A30'}`,
                }}>
                {ageDiff > 2 ? 'más joven' : ageDiff < -2 ? 'desgaste extra' : 'en equilibrio'}
              </span>
            </div>

            {/* Caption */}
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-1">
              {ageDiff > 2
                ? `Tu cuerpo funciona como el de alguien ${ageDiff} años más joven`
                : ageDiff < -2
                ? `Tu cuerpo muestra ${Math.abs(ageDiff)} años de desgaste extra`
                : 'Tu cuerpo va exactamente acorde a tu edad cronológica'}
            </p>
          </div>
        </div>

        {/* ── Reporte Médico Estructurado ──────────────────────── */}
        <div className="border-t border-border">
          {/* Cabecera del reporte */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${gaugeCol}20`, border: `1px solid ${gaugeCol}35` }}>
                <FileText size={13} style={{ color: gaugeCol }} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Evaluación Clínica Integrada</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {patientName && `${patientName} · `}{patientAge} años
                  {resultDate && ` · ${new Date(resultDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                </p>
              </div>
            </div>
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full"
              style={{ background: `${gaugeCol}15`, color: gaugeCol, border: `1px solid ${gaugeCol}30` }}>
              <CheckCircle2 size={9} />
              Análisis con IA
            </span>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* SECCIÓN 1: Valoración General */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Valoración General</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <p className="text-sm leading-7 text-foreground/90">
                {analysis.clinicalSummary}
              </p>
            </div>

            {/* SECCIÓN 2: Alertas prioritarias */}
            {(analysis.keyAlerts ?? []).filter(a => a.level === 'danger' || a.level === 'warning').length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Hallazgos Clínicos Relevantes</span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
                <div className="space-y-2">
                  {(analysis.keyAlerts ?? [])
                    .filter(a => a.level === 'danger' || a.level === 'warning')
                    .slice(0, 4)
                    .map((alert, i) => {
                      const isDanger = alert.level === 'danger'
                      const col = isDanger ? '#D4536A' : '#D4A03A'
                      return (
                        <div key={i} className="flex items-start gap-3 rounded-lg px-3.5 py-3"
                          style={{ background: `${col}08`, border: `1px solid ${col}25`, borderLeft: `3px solid ${col}` }}>
                          <AlertCircle size={13} className="mt-0.5 shrink-0" style={{ color: col }} />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-foreground">{alert.title}</span>
                            {alert.value && (
                              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded"
                                style={{ background: `${col}15`, color: col }}>
                                {alert.value}
                              </span>
                            )}
                            {alert.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{alert.description}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* SECCIÓN 3: Contexto Clínico del paciente */}
            {(clinicalCtx.conditions || clinicalCtx.medications || clinicalCtx.allergies || clinicalCtx.lifestyle || clinicalCtx.risk) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Contexto Clínico del Paciente</span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {clinicalCtx.conditions && (
                    <CtxRow icon={<Info size={11} />} color="#D4A03A" label="Condiciones crónicas" value={clinicalCtx.conditions} />
                  )}
                  {clinicalCtx.medications && (
                    <CtxRow icon={<Pill size={11} />} color="#f97316" label="Medicamentos actuales" value={clinicalCtx.medications} alert />
                  )}
                  {clinicalCtx.allergies && (
                    <CtxRow icon={<AlertCircle size={11} />} color="#D4536A" label="Alergias" value={clinicalCtx.allergies} alert />
                  )}
                  {clinicalCtx.lifestyle && (
                    <CtxRow icon={<Dumbbell size={11} />} color="#3b82f6" label="Estilo de vida" value={clinicalCtx.lifestyle} />
                  )}
                  {clinicalCtx.risk && (
                    <CtxRow icon={<Brain size={11} />} color="#a78bfa" label="Antecedentes familiares" value={clinicalCtx.risk} />
                  )}
                </div>
              </div>
            )}

            {/* Si no hay historia clínica, mostrar aviso sutil */}
            {!patient?.clinical_history && (
              <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 bg-amber-500/5 border border-amber-500/20">
                <Info size={13} className="text-amber-400 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  Sin historia clínica registrada. El análisis se basa exclusivamente en los biomarcadores del laboratorio.{' '}
                  <span className="text-amber-400 font-medium">Completar la historia clínica personaliza el protocolo.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ 2. ÓRGANOS Y SISTEMAS ══════════════════════════════════ */}
      <div className="card-medical overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <HeartPulse size={15} className="text-accent shrink-0" />
            <h2 className="font-semibold text-foreground text-sm">Órganos y Sistemas</h2>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            {critical > 0 && (
              <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: '#D4536A18', color: '#D4536A', border: '1px solid #D4536A30' }}>
                {critical} crítico{critical > 1 ? 's' : ''}
              </span>
            )}
            {attention > 0 && (
              <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: '#D4A03A18', color: '#D4A03A', border: '1px solid #D4A03A30' }}>
                {attention} atención
              </span>
            )}
            {optimal > 0 && (
              <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: '#2EAE7B18', color: '#2EAE7B', border: '1px solid #2EAE7B30' }}>
                {optimal} óptimo{optimal > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-border/60">
          {organScores.map(({ organ, score, biomarkers }) => {
            const col = scoreColor(score)
            const Icon = organ.Icon
            const availableBms = biomarkers.filter(b => b.bm?.value != null)
            return (
              <div key={organ.id} className="p-4 flex flex-col gap-3">
                {/* Icono + score */}
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ background: `${col}12`, border: `2px solid ${col}35`, boxShadow: `0 0 12px ${col}20` }}>
                      <Icon size={18} className={organ.iconClassName} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 text-[9px] font-bold font-mono px-1 py-0.5 rounded-full leading-none"
                      style={{ background: col, color: '#0A1729' }}>
                      {score !== null ? score : '–'}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{organ.name}</p>
                    <p className="text-[10px] font-medium mt-0.5" style={{ color: col }}>{scoreLabel(score)}</p>
                  </div>
                </div>

                {/* Biomarcadores */}
                {availableBms.length > 0 ? (
                  <div className="flex flex-col">
                    {availableBms.slice(0, 3).map(({ key, label, bm }) => (
                      <BmRow key={key} label={label} bm={bm} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">Sin datos en este estudio</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ══ 3. FODA + RIESGOS ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* FODA mini */}
        <div className="card-medical overflow-hidden p-0">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
            <ShieldCheck size={15} className="text-accent shrink-0" />
            <h2 className="font-semibold text-foreground text-sm">Análisis FODA</h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-border/60">
            {[
              { title: 'Fortalezas',     items: swot.strengths,     color: '#2EAE7B', Icon: ShieldCheck },
              { title: 'Debilidades',    items: swot.weaknesses,    color: '#D4536A', Icon: AlertTriangle },
              { title: 'Oportunidades',  items: swot.opportunities, color: '#D4AF37', Icon: Sparkles },
              { title: 'Amenazas',       items: swot.threats,       color: '#D4A03A', Icon: AlertTriangle },
            ].map(({ title, items, color, Icon: QIcon }) => (
              <div key={title} className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <QIcon size={12} style={{ color }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{title}</span>
                  <span className="ml-auto text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${color}15`, color }}>{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.slice(0, 2).map((item, i) => {
                    const label = typeof item === 'string' ? item : (item as { label: string }).label
                    const detail = typeof item === 'string' ? '' : (item as { detail?: string }).detail ?? ''
                    return (
                      <div key={i} className="p-2.5 rounded-lg border"
                        style={{ background: `${color}06`, borderColor: `${color}25`, borderLeft: `3px solid ${color}` }}>
                        <p className="text-[11px] font-semibold text-foreground leading-tight">{label}</p>
                        {detail && <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{detail}</p>}
                      </div>
                    )
                  })}
                  {items.length === 0 && <p className="text-[10px] text-muted-foreground italic">Sin datos</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Perfil de riesgo */}
        <div className="card-medical overflow-hidden p-0">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
            <AlertTriangle size={15} className="text-accent shrink-0" />
            <h2 className="font-semibold text-foreground text-sm">Perfil de Riesgo</h2>
          </div>
          <div className="p-4 space-y-3">
            {topRisks.length > 0 ? topRisks.map((risk, i) => {
              const prob = Math.max(0, Math.min(risk.probability ?? 0, 100))
              const levelColor = prob >= 60 ? '#D4536A' : prob >= 30 ? '#D4A03A' : '#2EAE7B'
              const level = prob >= 60 ? 'Alto' : prob >= 30 ? 'Moderado' : 'Bajo'
              const rColor = risk.color || levelColor
              return (
                <div key={i} className="p-3.5 rounded-xl border"
                  style={{ borderColor: `${rColor}35`, background: `${rColor}06` }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-foreground leading-tight">{risk.disease}</p>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-2xl font-mono font-bold leading-none" style={{ color: rColor }}>{prob}%</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5"
                        style={{ color: levelColor, background: `${levelColor}15`, border: `1px solid ${levelColor}25` }}>
                        Riesgo {level}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-1.5 rounded-full overflow-hidden bg-muted mb-2">
                    <div className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${prob}%`, backgroundColor: rColor }} />
                    <div className="absolute top-0 bottom-0 w-px bg-background/40" style={{ left: '30%' }} />
                    <div className="absolute top-0 bottom-0 w-px bg-background/40" style={{ left: '60%' }} />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {risk.horizon && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock size={9} /> {risk.horizon}
                      </span>
                    )}
                    {(risk.drivers ?? []).slice(0, 3).map((d, di) => (
                      <span key={di} className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: `${rColor}12`, color: rColor, border: `1px solid ${rColor}25` }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )
            }) : (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos de riesgo disponibles</p>
            )}
          </div>
        </div>
      </div>

      {/* ══ 4. PROYECCIÓN + PROTOCOLO ══════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Proyección */}
        <div className="card-medical overflow-hidden p-0">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
            <TrendingUp size={15} className="text-accent shrink-0" />
            <h2 className="font-semibold text-foreground text-sm">Proyección de Salud</h2>
          </div>
          <div className="p-5">
            {(analysis.projectionData ?? []).length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={analysis.projectionData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A2E4C" />
                    <XAxis dataKey="year" tick={{ fill: '#6B6660', fontSize: 10, fontFamily: 'ui-monospace' }}
                      tickFormatter={(v) => `Año ${v}`} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#6B6660', fontSize: 10 }} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#0A1729', border: '1px solid #1A2E4C', borderRadius: 8, fontSize: 11 }}
                      labelFormatter={(v) => `Año ${v}`}
                      formatter={(val: number, name: string) => [
                        val.toFixed(1),
                        name === 'withIntervention' ? 'Con Protocolo' : 'Sin Intervención',
                      ]}
                    />
                    <ReferenceLine y={65} stroke="#D4A03A" strokeDasharray="4 4" strokeOpacity={0.4} />
                    <Line type="monotone" dataKey="withoutIntervention"
                      stroke="#D4536A" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                    <Line type="monotone" dataKey="withIntervention"
                      stroke="#2EAE7B" strokeWidth={2.5} dot={{ r: 3, fill: '#2EAE7B' }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 justify-center mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-0.5 bg-[#2EAE7B] rounded" />
                    <span className="text-[10px] text-muted-foreground">Con protocolo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-0.5 bg-[#D4536A] rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #D4536A 0,#D4536A 4px,transparent 4px,transparent 7px)' }} />
                    <span className="text-[10px] text-muted-foreground">Sin intervención</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sin datos de proyección</p>
            )}
          </div>
        </div>

        {/* Protocolo */}
        <div className="card-medical overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-accent shrink-0" />
              <h2 className="font-semibold text-foreground text-sm">Intervenciones Prioritarias</h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{analysis.protocol?.length ?? 0} intervenciones</span>
          </div>
          <div className="divide-y divide-border/60">
            {topProtocol.map((item, i) => {
              const urgency = item.urgency ?? 'medium'
              const col = getUrgencyColor(urgency)
              const num = String(i + 1).padStart(2, '0')
              return (
                <div key={i} className="flex gap-0" style={{ borderLeft: `3px solid ${col}` }}>
                  {/* Número */}
                  <div className="w-12 shrink-0 flex items-center justify-center py-4"
                    style={{ background: `${col}08` }}>
                    <span className="text-base font-black font-mono leading-none" style={{ color: col }}>{num}</span>
                  </div>
                  {/* Contenido */}
                  <div className="flex-1 p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-bold text-foreground leading-snug">{item.molecule}</p>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: `${col}18`, color: col, border: `1px solid ${col}30` }}>
                        {getUrgencyLabel(urgency)}
                      </span>
                    </div>
                    {item.dose && (
                      <p className="text-xs font-mono text-muted-foreground mb-1.5">{item.dose}</p>
                    )}
                    {item.expectedResult && (
                      <div className="flex items-start gap-1.5 mt-1.5 p-2 rounded-lg bg-info/8 border border-info/20">
                        <Sparkles size={10} className="text-info shrink-0 mt-0.5" />
                        <p className="text-[10px] text-info leading-relaxed">{item.expectedResult}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {topProtocol.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Sin protocolo disponible</p>
            )}
          </div>
        </div>
      </div>

      <MethodologyFooter type="scores" />
      <MethodologyFooter type="age" />

    </div>
  )
}
