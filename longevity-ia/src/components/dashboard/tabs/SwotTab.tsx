'use client'

import type { ElementType } from 'react'
import type { AIAnalysis } from '@/types'
import {
  ShieldCheck, AlertTriangle, TrendingUp, Zap,
  Sparkles, Activity,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from 'recharts'

// ─────────────────────────────────────────────────────────────────
// NORMALIZERS
// ─────────────────────────────────────────────────────────────────

function normalizeSwotItem(item: unknown): { label: string; detail: string; evidence?: string; expectedImpact?: string; probability?: string } {
  if (typeof item === 'string') return { label: item, detail: '' }
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>
    return {
      label: String(obj.label || obj.title || obj.name || ''),
      detail: String(obj.detail || obj.description || obj.desc || ''),
      evidence:       obj.evidence       ? String(obj.evidence)       : undefined,
      expectedImpact: obj.expectedImpact ? String(obj.expectedImpact) : undefined,
      probability:    obj.probability    ? String(obj.probability)    : undefined,
    }
  }
  return { label: String(item), detail: '' }
}

function normalizeRisk(r: unknown): { disease: string; probability: number; horizon: string; drivers: string[]; color: string } {
  if (!r || typeof r !== 'object') return { disease: String(r), probability: 0, horizon: '', drivers: [], color: '#D4A03A' }
  const obj = r as Record<string, unknown>
  return {
    disease:     String(obj.disease || obj.name || ''),
    probability: Number(obj.probability ?? 0),
    horizon:     String(obj.horizon || ''),
    drivers:     Array.isArray(obj.drivers) ? obj.drivers.map(String) : [],
    color:       String(obj.color || '#D4A03A'),
  }
}

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

function ProbabilityBadge({ value }: { value: string }) {
  const v = value.toLowerCase()
  const isHigh = v.includes('alta') || v.includes('alto') || v.includes('high')
  const isMed  = v.includes('media') || v.includes('medio') || v.includes('medium') || v.includes('moderada')
  const cfg = isHigh
    ? { color: '#D4536A', label: 'Probabilidad Alta' }
    : isMed
    ? { color: '#D4A03A', label: 'Probabilidad Media' }
    : { color: '#2EAE7B', label: 'Probabilidad Baja' }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
      style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

function HealthGainChip({ text }: { text: string }) {
  return (
    <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-lg bg-info/8 border border-info/20">
      <Sparkles size={11} className="text-info shrink-0 mt-0.5" />
      <p className="text-[11px] text-info leading-relaxed font-medium">{text}</p>
    </div>
  )
}

function EvidenceChip({ text }: { text: string }) {
  return (
    <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/40">
      <Activity size={10} className="text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[10px] text-muted-foreground leading-relaxed italic">{text}</p>
    </div>
  )
}

function SwotItem({
  index, label, detail, evidence, expectedImpact, probability, color,
}: {
  index: number
  label: string
  detail: string
  evidence?: string
  expectedImpact?: string
  probability?: string
  color: string
}) {
  return (
    <div className="flex gap-3 p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 transition-colors">
      {/* Número */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 mt-0.5"
        style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
      >
        {index + 1}
      </div>
      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-snug">{label}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{detail}</p>
        {evidence       && <EvidenceChip text={evidence} />}
        {probability    && <div className="mt-2"><ProbabilityBadge value={probability} /></div>}
        {expectedImpact && <HealthGainChip text={expectedImpact} />}
      </div>
    </div>
  )
}

function SwotQuadrant({
  title, subtitle, items, color, icon: Icon,
}: {
  title: string
  subtitle: string
  items: { label: string; detail: string; evidence?: string; expectedImpact?: string; probability?: string }[]
  color: string
  icon: ElementType
}) {
  return (
    <div className="card-medical p-5 border-t-2" style={{ borderTopColor: color }}>
      {/* Encabezado */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `1.5px solid ${color}30` }}
        >
          <Icon size={17} style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-foreground">{title}</h3>
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: `${color}15`, color }}
            >
              {items.length}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
        </div>
      </div>
      {/* Ítems */}
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <SwotItem
            key={i}
            index={i}
            label={item.label}
            detail={item.detail}
            evidence={item.evidence}
            expectedImpact={item.expectedImpact}
            probability={item.probability}
            color={color}
          />
        ))}
      </div>
    </div>
  )
}

function RiskCard({ risk }: {
  risk: { disease: string; probability: number; horizon: string; drivers: string[]; color: string }
}) {
  const level      = risk.probability >= 60 ? 'Alto' : risk.probability >= 30 ? 'Moderado' : 'Bajo'
  const levelColor = risk.probability >= 60 ? '#D4536A' : risk.probability >= 30 ? '#D4A03A' : '#2EAE7B'

  return (
    <div
      className="p-4 rounded-xl border"
      style={{ borderColor: `${risk.color}35`, background: `${risk.color}06` }}
    >
      {/* Cabecera: nombre + % */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-bold text-foreground leading-tight">{risk.disease}</p>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-2xl font-mono font-bold leading-none" style={{ color: risk.color }}>
            {risk.probability}%
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color: levelColor, background: `${levelColor}15`, border: `1px solid ${levelColor}25` }}
          >
            Riesgo {level}
          </span>
        </div>
      </div>

      {/* Barra de probabilidad con zonas */}
      <div className="mb-3">
        <div className="relative h-2 rounded-full overflow-hidden bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{ width: `${risk.probability}%`, backgroundColor: risk.color }}
          />
          <div className="absolute top-0 bottom-0 w-px bg-background/60" style={{ left: '30%' }} />
          <div className="absolute top-0 bottom-0 w-px bg-background/60" style={{ left: '60%' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-emerald-400/70 font-medium">Bajo</span>
          <span className="text-[9px] text-amber-400/70 font-medium">Moderado</span>
          <span className="text-[9px] text-red-400/70 font-medium">Alto</span>
        </div>
      </div>

      {/* Horizonte */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: risk.color }} />
        <span className="text-xs text-muted-foreground">
          Horizonte: <strong className="text-foreground">{risk.horizon}</strong>
        </span>
      </div>

      {/* Factores causales */}
      {risk.drivers.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Factores que lo generan
          </p>
          <div className="flex flex-wrap gap-1.5">
            {risk.drivers.map((d, j) => (
              <span
                key={j}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: `${risk.color}12`, color: risk.color, border: `1px solid ${risk.color}25` }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

interface SwotTabProps {
  analysis: AIAnalysis
}

export function SwotTab({ analysis }: SwotTabProps) {
  const { swot, risks } = analysis

  const normalizedSwot = {
    strengths:     (swot?.strengths     ?? []).map(normalizeSwotItem),
    weaknesses:    (swot?.weaknesses    ?? []).map(normalizeSwotItem),
    opportunities: (swot?.opportunities ?? []).map(normalizeSwotItem),
    threats:       (swot?.threats       ?? []).map(normalizeSwotItem),
  }

  const normalizedRisks = (risks ?? []).map(normalizeRisk)

  const riskData = normalizedRisks.map(r => ({
    name:        r.disease.length > 22 ? r.disease.substring(0, 20) + '…' : r.disease,
    probability: r.probability,
    color:       r.color,
    fullName:    r.disease,
    horizon:     r.horizon,
  }))

  const QUADRANTS = [
    {
      key: 'strengths',
      title: 'Fortalezas',
      subtitle: 'Lo que ya funciona bien en tu cuerpo',
      color: '#2EAE7B',
      icon: ShieldCheck,
      items: normalizedSwot.strengths,
    },
    {
      key: 'weaknesses',
      title: 'Debilidades',
      subtitle: 'Áreas que necesitan atención médica',
      color: '#D4A03A',
      icon: AlertTriangle,
      items: normalizedSwot.weaknesses,
    },
    {
      key: 'opportunities',
      title: 'Oportunidades',
      subtitle: 'Acciones concretas que pueden mejorar tu salud',
      color: '#5BA4C9',
      icon: TrendingUp,
      items: normalizedSwot.opportunities,
    },
    {
      key: 'threats',
      title: 'Amenazas',
      subtitle: 'Riesgos que podrían crecer sin intervención',
      color: '#D4536A',
      icon: Zap,
      items: normalizedSwot.threats,
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Intro ── */}
      <div className="card-medical px-5 py-4">
        <div className="flex items-start gap-3 mb-4">
          <Activity size={18} className="text-accent shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-foreground">Análisis FODA de tu Salud</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Un análisis de tu salud desde 4 ángulos: lo que ya funciona bien, lo que necesita atención,
              las acciones que pueden mejorar tu bienestar, y los riesgos que conviene prevenir.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUADRANTS.map(q => (
            <div
              key={q.key}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
              style={{ borderColor: `${q.color}30`, background: `${q.color}08` }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: q.color }} />
              <span className="text-xs font-semibold" style={{ color: q.color }}>
                {q.items.length} {q.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cuadrantes FODA ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map(q => (
          <SwotQuadrant
            key={q.key}
            title={q.title}
            subtitle={q.subtitle}
            items={q.items}
            color={q.color}
            icon={q.icon}
          />
        ))}
      </div>

      {/* ── Riesgos ── */}
      {normalizedRisks.length > 0 && (
        <div className="card-medical p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-warning" />
            <h3 className="font-bold text-foreground">Enfermedades con Mayor Riesgo</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Enfermedades que podrían desarrollarse sin intervención, basadas directamente en tus valores actuales.
          </p>

          {/* Gráfica resumen */}
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riskData} layout="vertical" margin={{ left: 16, right: 48, top: 4, bottom: 4 }}>
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: '#6B6660', fontSize: 11, fontFamily: 'DM Mono' }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={148}
                tick={{ fill: '#E2DFD6', fontSize: 11, fontFamily: 'Space Grotesk' }}
              />
              <Tooltip
                contentStyle={{ background: '#0F2A1E', border: '1px solid #1E4A38', borderRadius: 10, padding: '8px 12px' }}
                formatter={(value: number, _name: string, props) => [
                  <span key="v" className="font-mono">{value}% — {props.payload.horizon}</span>,
                  props.payload.fullName,
                ]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="probability" radius={[0, 5, 5, 0]}>
                {riskData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Tarjetas detalladas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 pt-5 border-t border-border/40">
            {normalizedRisks.map((risk, i) => (
              <RiskCard key={i} risk={risk} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
