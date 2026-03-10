'use client'

import { useState } from 'react'
import type { AIAnalysis, SystemScores, ProjectionPoint } from '@/types'
import { toast } from 'sonner'

// ── Palette ─────────────────────────────────────────────────────
const GOLD    = '#C9A84C'
const EMERALD = '#2D9B6F'
const AMBER   = '#E8A020'
const RED     = '#D94F4F'
const BLUE    = '#3B82F6'
const TEXT    = '#0A0A0A'
const MUTED   = '#6B6B6B'
const DIVIDER = '#E5E5E5'
const CARD    = '#F7F7F7'

// ── Score helpers ────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 85) return EMERALD
  if (s >= 65) return AMBER
  return RED
}
function scoreStatus(s: number) {
  if (s >= 85) return { label: 'Óptimo',           bg: '#EBF7F2', color: EMERALD }
  if (s >= 65) return { label: 'En seguimiento',    bg: '#FEF7EC', color: AMBER   }
  return              { label: 'Requiere atención', bg: '#FDEEEE', color: RED     }
}

// ── Arc Gauge ────────────────────────────────────────────────────
function ArcGauge({ score }: { score: number }) {
  const cx = 130, cy = 108, r = 82, sw = 12
  const safe = Math.max(0, Math.min(score, 100))
  const toXY = (angle: number, radius: number) => ({
    x: +(cx + radius * Math.cos(angle)).toFixed(3),
    y: +(cy + radius * Math.sin(angle)).toFixed(3),
  })
  const BG_START_DEG = 150
  const s0 = toXY(BG_START_DEG * Math.PI / 180, r)
  const s1 = toXY(30 * Math.PI / 180, r)
  const bgPath = `M ${s0.x} ${s0.y} A ${r} ${r} 0 1 1 ${s1.x} ${s1.y}`
  const fgEndDeg = BG_START_DEG + (safe / 100) * 240
  const fgEnd    = toXY(fgEndDeg * Math.PI / 180, r)
  const largeArc = safe > 75 ? 1 : 0
  const fgPath   = safe === 0 ? '' : `M ${s0.x} ${s0.y} A ${r} ${r} 0 ${largeArc} 1 ${fgEnd.x} ${fgEnd.y}`
  const col = scoreColor(score)
  const ticks = [0, 25, 50, 75, 100]
  const needleDeg  = BG_START_DEG + (safe / 100) * 240
  const needleRad  = needleDeg * Math.PI / 180
  const needleTip   = { x: +(cx + (r - 10) * Math.cos(needleRad)).toFixed(2), y: +(cy + (r - 10) * Math.sin(needleRad)).toFixed(2) }
  const needleBase1 = { x: +(cx + 8 * Math.cos(needleRad + Math.PI / 2)).toFixed(2), y: +(cy + 8 * Math.sin(needleRad + Math.PI / 2)).toFixed(2) }
  const needleBase2 = { x: +(cx + 8 * Math.cos(needleRad - Math.PI / 2)).toFixed(2), y: +(cy + 8 * Math.sin(needleRad - Math.PI / 2)).toFixed(2) }

  return (
    <svg width="260" height="165" viewBox="0 0 260 165" style={{ overflow: 'visible' }}>
      <defs>
        <filter id="gaugeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={bgPath} fill="none" stroke="#EBEBEB" strokeWidth={sw} strokeLinecap="round" />
      {safe > 0 && (
        <>
          <path d={fgPath} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" filter="url(#gaugeGlow)" opacity="0.35" />
          <path d={fgPath} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
      {ticks.map((t) => {
        const tDeg = BG_START_DEG + (t / 100) * 240
        const tRad = tDeg * Math.PI / 180
        const inner = toXY(tRad, r - sw / 2 - 4)
        const outer = toXY(tRad, r + sw / 2 + 4)
        return (
          <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke={t <= safe ? col : '#CCCCCC'}
            strokeWidth={t === 0 || t === 100 ? 2 : 1.5} strokeLinecap="round" />
        )
      })}
      {[{ t: 0, label: '0' }, { t: 100, label: '100' }].map(({ t, label }) => {
        const pos = toXY((BG_START_DEG + (t / 100) * 240) * Math.PI / 180, r + sw / 2 + 14)
        return (
          <text key={t} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill={MUTED} fontFamily="ui-monospace,'SF Mono',monospace">{label}</text>
        )
      })}
      {safe > 0 && (
        <>
          <polygon points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
            fill={col} opacity="0.2" filter="url(#needleGlow)" />
          <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y}
            stroke={col} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      <circle cx={cx} cy={cy} r={10} fill="white" stroke={DIVIDER} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={5}  fill={col} />
      <text x={cx} y={cy - 20} textAnchor="middle" fill={TEXT}
        fontSize="38" fontWeight="900" fontFamily="ui-monospace,'SF Mono',monospace" letterSpacing="-2">
        {score}
      </text>
      <text x={cx} y={cy - 4} textAnchor="middle" fill={MUTED} fontSize="11" fontFamily="system-ui,sans-serif">
        / 100
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fill={MUTED} fontSize="9"
        fontFamily="system-ui,sans-serif" letterSpacing="1.5">
        ÍNDICE LONGEVITY
      </text>
    </svg>
  )
}

// ── Projection mini SVG chart ────────────────────────────────────
function ProjectionMiniChart({ data }: { data: ProjectionPoint[] }) {
  if (!data || data.length < 2) return null
  const W = 300, H = 110
  const PAD = { t: 12, r: 12, b: 22, l: 28 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b

  const allVals = data.flatMap(d => [d.withoutIntervention, d.withIntervention])
  const minV = Math.min(...allVals) - 3
  const maxV = Math.max(...allVals) + 3
  const range = maxV - minV || 1

  const xScale = (i: number) => PAD.l + (i / (data.length - 1)) * chartW
  const yScale = (v: number) => PAD.t + (1 - (v - minV) / range) * chartH

  const pathWith = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.withIntervention).toFixed(1)}`
  ).join(' ')
  const pathWithout = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.withoutIntervention).toFixed(1)}`
  ).join(' ')

  // Area fill under "with intervention"
  const areaWith = `${pathWith} L ${xScale(data.length - 1).toFixed(1)} ${(PAD.t + chartH).toFixed(1)} L ${PAD.l} ${(PAD.t + chartH).toFixed(1)} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.18" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((frac, i) => (
        <line key={i}
          x1={PAD.l} y1={PAD.t + frac * chartH}
          x2={PAD.l + chartW} y2={PAD.t + frac * chartH}
          stroke={DIVIDER} strokeWidth="0.5" />
      ))}
      {/* Area fill */}
      <path d={areaWith} fill="url(#projGradient)" />
      {/* Without intervention */}
      <path d={pathWithout} fill="none" stroke="#CCCCCC" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* With intervention */}
      <path d={pathWith} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Dots on "with" */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.withIntervention)} r="3"
          fill="white" stroke={GOLD} strokeWidth="1.5" />
      ))}
      {/* Year labels */}
      {data.map((d, i) => (
        <text key={i} x={xScale(i)} y={H - 4} textAnchor="middle"
          fontSize="8" fill={MUTED} fontFamily="ui-monospace,'SF Mono',monospace">
          {d.year}
        </text>
      ))}
      {/* Y axis first/last */}
      <text x={PAD.l - 4} y={PAD.t} textAnchor="end" dominantBaseline="middle"
        fontSize="8" fill={MUTED}>{Math.round(maxV)}</text>
      <text x={PAD.l - 4} y={PAD.t + chartH} textAnchor="end" dominantBaseline="middle"
        fontSize="8" fill={MUTED}>{Math.round(minV)}</text>
    </svg>
  )
}

// ── Organ systems ────────────────────────────────────────────────
const ORGAN_SYSTEMS: Array<{ key: keyof SystemScores; label: string; sublabel: string; icon: JSX.Element }> = [
  { key: 'cardiovascular', label: 'Cardiovascular', sublabel: 'Corazón y circulación',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg> },
  { key: 'metabolic', label: 'Metabólico', sublabel: 'Glucosa y energía',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
  { key: 'hepatic', label: 'Hepático', sublabel: 'Hígado y detox',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3C8 3 4 6 4 10c0 2 .8 3.8 2 5l1 5h10l1-5c1.2-1.2 2-3 2-5 0-4-4-7-8-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg> },
  { key: 'renal', label: 'Renal', sublabel: 'Riñones y filtración',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 4C4.5 4 3 6 3 8.5c0 4 3 7.5 5 9.5 1 1 2 2 4 2s3-1 4-2c2-2 5-5.5 5-9.5C21 6 19.5 4 17 4c-2 0-3.5 2-5 2S9 4 7 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg> },
  { key: 'immune', label: 'Inmunológico', sublabel: 'Defensas',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11 4.5-.85 8-5.75 8-11V6L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg> },
  { key: 'hematologic', label: 'Hematológico', sublabel: 'Sangre y oxigenación',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg> },
  { key: 'inflammatory', label: 'Inflamatorio', sublabel: 'PCR y marcadores',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L8 8H4l4 4-1.5 5.5L12 14l5.5 3.5L16 12l4-4h-4L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg> },
  { key: 'vitamins', label: 'Vitaminas & Micronutrientes', sublabel: 'Vit. D, B12, Ferritina',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
]

const URGENCY: Record<string, { label: string; color: string }> = {
  immediate: { label: 'Inmediata', color: RED   },
  high:      { label: 'Alta',      color: AMBER },
  medium:    { label: 'Media',     color: BLUE  },
  low:       { label: 'Baja',      color: EMERALD },
}

// ── Ornamental divider ────────────────────────────────────────────
function GoldDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${DIVIDER})` }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '4px 14px', border: `1px solid ${GOLD}30`,
        borderRadius: 20, background: `${GOLD}08`,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'system-ui,sans-serif' }}>{label}</span>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
      </div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${DIVIDER})` }} />
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────
interface SummaryTabProps {
  analysis: AIAnalysis
  patientAge: number
  patientName?: string
  resultDate?: string
}

// ── Main ─────────────────────────────────────────────────────────
export function SummaryTab({ analysis, patientAge, patientName = 'Paciente', resultDate }: SummaryTabProps) {
  const [exporting, setExporting] = useState(false)

  const ageDiff   = patientAge - analysis.longevity_age
  const stat      = scoreStatus(analysis.overallScore)
  const dateStr   = resultDate
    ? new Date(resultDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  const topProtocol = [...(analysis.protocol ?? [])].sort((a, b) => {
    const o: Record<string, number> = { immediate: 0, high: 1, medium: 2, low: 3 }
    return (o[a.urgency] ?? 4) - (o[b.urgency] ?? 4)
  }).slice(0, 3)

  const topRisks = (analysis.risks ?? []).slice(0, 3)

  // SWOT top items per quadrant
  const swotTop = {
    strengths:     (analysis.swot?.strengths    ?? []).slice(0, 2),
    weaknesses:    (analysis.swot?.weaknesses   ?? []).slice(0, 2),
    opportunities: (analysis.swot?.opportunities ?? []).slice(0, 2),
    threats:       (analysis.swot?.threats       ?? []).slice(0, 2),
  }

  async function exportPDF() {
    setExporting(true)
    try {
      const el = document.getElementById('diagnostico-longevity')
      if (!el) { toast.error('No se encontró el contenido'); return }
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, H = 297
      const imgData = canvas.toDataURL('image/png')
      const imgH = (canvas.height * W) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, W, imgH)
      let left = imgH - H
      while (left >= 0) {
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -(imgH - left), W, imgH)
        left -= H
      }
      pdf.save(`Longevity_${patientName.replace(/\s+/g, '_')}.pdf`)
      toast.success('PDF exportado')
    } catch { toast.error('Error al exportar PDF') }
    finally { setExporting(false) }
  }

  async function exportImage() {
    setExporting(true)
    try {
      const el = document.getElementById('diagnostico-longevity')
      if (!el) { toast.error('No se encontró el contenido'); return }
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false })
      const link = document.createElement('a')
      link.download = `Longevity_${patientName.replace(/\s+/g, '_')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Imagen exportada')
    } catch { toast.error('Error al exportar imagen') }
    finally { setExporting(false) }
  }

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Export controls ─────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <button onClick={exportPDF} disabled={exporting} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px',
          fontSize: 12, fontWeight: 600, border: `1.5px solid ${GOLD}`, color: GOLD,
          background: 'transparent', borderRadius: 8, cursor: exporting ? 'not-allowed' : 'pointer',
          opacity: exporting ? 0.55 : 1, fontFamily: 'inherit',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 15V3M12 15l-4-4M12 15l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Descargar PDF
        </button>
        <button onClick={exportImage} disabled={exporting} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px',
          fontSize: 12, fontWeight: 600, border: `1.5px solid ${GOLD}50`, color: MUTED,
          background: 'transparent', borderRadius: 8, cursor: exporting ? 'not-allowed' : 'pointer',
          opacity: exporting ? 0.55 : 1, fontFamily: 'inherit',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Descargar Imagen
        </button>
      </div>

      {/* ── Document ────────────────────────────────────── */}
      <div id="diagnostico-longevity" style={{
        background: '#FFFFFF', borderRadius: 16,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)', overflow: 'hidden', color: TEXT,
      }}>

        {/* ═══ HEADER ══════════════════════════════════════ */}
        <div style={{
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1C1A14 60%, #2A2418 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(circle at 80% 50%, ${GOLD}18 0%, transparent 60%), radial-gradient(circle at 20% 80%, ${GOLD}08 0%, transparent 50%)`,
            pointerEvents: 'none',
          }} />
          <div style={{ height: 3, background: `linear-gradient(to right, ${GOLD}00, ${GOLD}, ${GOLD}80, ${GOLD}00)` }} />
          <div style={{ padding: '22px 32px 0', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `linear-gradient(135deg, ${GOLD}, #A8822A)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 16px ${GOLD}50`, flexShrink: 0,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C9 5 6 8 6 12a6 6 0 0012 0c0-4-3-7-6-10z" fill="white" opacity="0.9" />
                    <path d="M12 22V12M9 15l3 3 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', lineHeight: '1.1', margin: 0, letterSpacing: '-0.3px' }}>
                    Longevity Clinic
                  </p>
                  <p style={{ fontSize: 10, color: `${GOLD}CC`, margin: '3px 0 0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    Medicina de Precisión
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{patientName}</p>
                <p style={{ fontSize: 11, color: '#FFFFFF80', margin: '4px 0 0' }}>
                  {patientAge} años · {dateStr}
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0 18px', marginTop: 14, borderTop: `1px solid #FFFFFF12` }}>
              <p style={{ fontSize: 13, fontStyle: 'italic', color: GOLD, fontWeight: 500, letterSpacing: '0.4px', margin: 0 }}>
                &ldquo;Entendemos el envejecimiento como una dirección que tú controlas.&rdquo;
              </p>
            </div>
          </div>
          <div style={{ height: 2, background: `linear-gradient(to right, ${GOLD}00, ${GOLD}60, ${GOLD}00)` }} />
        </div>

        {/* ═══ BODY ════════════════════════════════════════ */}
        <div style={{ padding: '28px 28px 24px' }}>

          {/* ── SECCIÓN 1: SCORE + EDADES + RESUMEN ─────── */}
          <div style={{ marginBottom: 28 }}>
            <GoldDivider label="Diagnóstico Global" />
            <div style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr 1fr',
              gap: 0, border: `1px solid ${DIVIDER}`, borderRadius: 14,
              overflow: 'hidden', background: 'white',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}>
              {/* Gauge */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '20px 16px 16px',
                borderRight: `1px solid ${DIVIDER}`, background: 'white', position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 160, height: 160, borderRadius: '50%',
                  background: `radial-gradient(circle, ${scoreColor(analysis.overallScore)}12 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <ArcGauge score={analysis.overallScore} />
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
                  padding: '4px 14px', borderRadius: 24, background: stat.bg,
                  border: `1px solid ${stat.color}30`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: stat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: stat.color }}>{stat.label}</span>
                </div>
              </div>

              {/* Ages */}
              <div style={{ display: 'flex', flexDirection: 'column', borderRight: `1px solid ${DIVIDER}` }}>
                {/* Biological */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '16px', borderBottom: `1px solid ${DIVIDER}`, background: 'white',
                }}>
                  <p style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 6px', fontWeight: 600 }}>
                    Edad Biológica
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      fontSize: 46, fontWeight: 900, lineHeight: 1,
                      color: scoreColor(analysis.overallScore),
                      fontFamily: 'ui-monospace,"SF Mono",monospace', letterSpacing: '-2px',
                    }}>{analysis.longevity_age}</span>
                    <span style={{ fontSize: 12, color: MUTED }}>años</span>
                  </div>
                </div>
                {/* Chronological */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '16px', background: CARD,
                }}>
                  <p style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 6px', fontWeight: 600 }}>
                    Edad Cronológica
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      fontSize: 46, fontWeight: 900, lineHeight: 1, color: TEXT,
                      fontFamily: 'ui-monospace,"SF Mono",monospace', letterSpacing: '-2px',
                    }}>{patientAge}</span>
                    <span style={{ fontSize: 12, color: MUTED }}>años</span>
                  </div>
                </div>
              </div>

              {/* Delta + summary */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 20px', background: 'white', gap: 14 }}>
                <div style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: ageDiff > 2 ? '#EBF7F2' : ageDiff < -2 ? '#FDEEEE' : '#FEF7EC',
                  border: `1px solid ${(ageDiff > 2 ? EMERALD : ageDiff < -2 ? RED : AMBER)}25`,
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontSize: 22, fontWeight: 800, margin: '0 0 3px',
                    color: ageDiff > 2 ? EMERALD : ageDiff < -2 ? RED : AMBER,
                    fontFamily: 'ui-monospace,"SF Mono",monospace',
                  }}>
                    {ageDiff > 2 ? `−${ageDiff} años` : ageDiff < -2 ? `+${Math.abs(ageDiff)} años` : '≈ 0'}
                  </p>
                  <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>
                    {ageDiff > 2 ? 'más joven biológicamente' : ageDiff < -2 ? 'de desgaste acumulado' : 'equilibrio biológico'}
                  </p>
                </div>
                <p style={{ fontSize: 11.5, color: TEXT, lineHeight: 1.7, margin: 0, paddingLeft: 12, borderLeft: `3px solid ${GOLD}`, flex: 1 }}>
                  {analysis.clinicalSummary}
                </p>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 2: ÓRGANOS Y SISTEMAS ────────────── */}
          <div style={{ marginBottom: 28 }}>
            <GoldDivider label="Órganos y Sistemas" />
            <div style={{
              border: `1px solid ${DIVIDER}`, borderRadius: 14, overflow: 'hidden',
              background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'grid', gridTemplateColumns: '1fr 1fr',
            }}>
              {ORGAN_SYSTEMS.map(({ key, label, sublabel, icon }, i) => {
                const score   = analysis.systemScores[key]
                const col     = scoreColor(score)
                const st      = scoreStatus(score)
                const isRight = i % 2 === 1
                const isLast  = i >= ORGAN_SYSTEMS.length - 2
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                    borderBottom: isLast ? 'none' : `1px solid ${DIVIDER}`,
                    borderRight: isRight ? 'none' : `1px solid ${DIVIDER}`,
                    background: i % 4 < 2 ? 'white' : CARD,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: `${col}14`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: col,
                    }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                        <div>
                          <p style={{ fontSize: 10.5, fontWeight: 700, color: TEXT, margin: 0, lineHeight: 1.2 }}>{label}</p>
                          <p style={{ fontSize: 8.5, color: MUTED, margin: '1px 0 0' }}>{sublabel}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 6 }}>
                          <span style={{
                            fontSize: 16, fontWeight: 900, color: col, lineHeight: 1,
                            fontFamily: 'ui-monospace,"SF Mono",monospace', letterSpacing: '-0.5px',
                          }}>{score}</span>
                          <span style={{
                            fontSize: 8.5, fontWeight: 700, color: st.color,
                            background: st.bg, padding: '2px 6px', borderRadius: 8,
                            border: `1px solid ${st.color}20`, whiteSpace: 'nowrap' as const,
                          }}>{st.label}</span>
                        </div>
                      </div>
                      <div style={{ height: 4, background: '#EBEBEB', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${score}%`,
                          background: score >= 85 ? `linear-gradient(to right, ${GOLD}70, ${GOLD})` : col,
                          borderRadius: 3, transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── SECCIÓN 3: FODA MINI + RIESGOS ──────────── */}
          <div style={{ marginBottom: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* FODA 2×2 */}
            <div>
              <GoldDivider label="Análisis FODA" />
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
                border: `1px solid ${DIVIDER}`, borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                {/* Fortalezas */}
                {[
                  { title: 'Fortalezas', items: swotTop.strengths,     accent: EMERALD, bg: '#F0FBF6', icon: '↑' },
                  { title: 'Debilidades', items: swotTop.weaknesses,   accent: RED,     bg: '#FEF5F5', icon: '↓' },
                  { title: 'Oportunidades', items: swotTop.opportunities, accent: GOLD, bg: '#FDFAF2', icon: '→' },
                  { title: 'Amenazas',   items: swotTop.threats,        accent: AMBER,   bg: '#FEF9EC', icon: '⚠' },
                ].map((quad, qi) => (
                  <div key={qi} style={{
                    padding: '12px 14px',
                    background: qi % 2 === 0 ? quad.bg : 'white',
                    borderRight: qi % 2 === 0 ? `1px solid ${DIVIDER}` : 'none',
                    borderBottom: qi < 2 ? `1px solid ${DIVIDER}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 900, color: quad.accent,
                        width: 18, height: 18, borderRadius: 4,
                        background: `${quad.accent}18`, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{quad.icon}</span>
                      <p style={{ fontSize: 9, fontWeight: 800, color: quad.accent, margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        {quad.title}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {quad.items.length > 0 ? quad.items.map((item, ii) => (
                        <div key={ii} style={{
                          padding: '5px 8px', borderRadius: 6,
                          background: 'white', border: `1px solid ${quad.accent}18`,
                          borderLeft: `3px solid ${quad.accent}`,
                        }}>
                          <p style={{ fontSize: 9.5, fontWeight: 600, color: TEXT, margin: 0, lineHeight: 1.3 }}>
                            {typeof item === 'string' ? item : (item as { label: string }).label}
                          </p>
                        </div>
                      )) : (
                        <p style={{ fontSize: 9, color: MUTED, margin: 0, fontStyle: 'italic' }}>Sin datos</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Riesgos */}
            <div>
              <GoldDivider label="Perfil de Riesgo" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topRisks.length > 0 ? topRisks.map((risk, i) => {
                  const prob = Math.max(0, Math.min(risk.probability ?? 0, 100))
                  const rColor = prob >= 70 ? RED : prob >= 40 ? AMBER : EMERALD
                  return (
                    <div key={i} style={{
                      border: `1px solid ${DIVIDER}`, borderRadius: 10, overflow: 'hidden',
                      background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{
                        height: 3,
                        background: `linear-gradient(to right, ${rColor}, ${rColor}40)`,
                        width: `${prob}%`,
                      }} />
                      <div style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <p style={{ fontSize: 11.5, fontWeight: 700, color: TEXT, margin: 0, flex: 1, paddingRight: 8 }}>
                            {risk.disease}
                          </p>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span style={{
                              fontSize: 18, fontWeight: 900, color: rColor, lineHeight: 1,
                              fontFamily: 'ui-monospace,"SF Mono",monospace', letterSpacing: '-1px',
                            }}>{prob}</span>
                            <span style={{ fontSize: 9, color: MUTED }}>%</span>
                          </div>
                        </div>
                        {risk.horizon && (
                          <p style={{ fontSize: 9, color: MUTED, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 } as React.CSSProperties}>
                            <span style={{ color: rColor, fontWeight: 700 }}>◷</span> {risk.horizon}
                          </p>
                        )}
                        <div style={{ height: 4, background: '#EBEBEB', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${prob}%`, borderRadius: 3,
                            background: `linear-gradient(to right, ${rColor}80, ${rColor})`,
                          }} />
                        </div>
                        {risk.drivers && risk.drivers.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginTop: 6 }}>
                            {risk.drivers.slice(0, 3).map((d, di) => (
                              <span key={di} style={{
                                fontSize: 8.5, padding: '2px 6px', borderRadius: 8,
                                background: `${rColor}10`, color: rColor,
                                border: `1px solid ${rColor}25`, fontWeight: 600,
                              }}>{d}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }) : (
                  <div style={{ padding: 20, textAlign: 'center', color: MUTED, fontSize: 12 }}>
                    Sin datos de riesgo disponibles
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 4: PROYECCIÓN + PROTOCOLO ────────── */}
          <div style={{ marginBottom: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Mini projection chart */}
            <div>
              <GoldDivider label="Proyección de Salud" />
              <div style={{
                border: `1px solid ${DIVIDER}`, borderRadius: 14, overflow: 'hidden',
                background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '16px',
              }}>
                <ProjectionMiniChart data={analysis.projectionData ?? []} />
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 20, height: 2, background: GOLD, borderRadius: 1 }} />
                    <span style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>Con protocolo</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 20, height: 2, background: '#CCCCCC', borderRadius: 1, borderTop: '1px dashed #CCCCCC' }} />
                    <span style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>Sin intervención</span>
                  </div>
                </div>
                {/* Projection factors top 2 */}
                {(analysis.projectionFactors ?? []).slice(0, 2).map((f, i) => (
                  <div key={i} style={{
                    marginTop: 10, padding: '8px 12px', borderRadius: 8,
                    background: CARD, border: `1px solid ${DIVIDER}`,
                  }}>
                    <p style={{ fontSize: 9.5, fontWeight: 700, color: TEXT, margin: '0 0 2px' }}>{f.factor}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 8.5, color: RED, fontWeight: 600 }}>Sin: {f.withoutProtocol}</span>
                      <span style={{ fontSize: 8.5, color: MUTED }}>·</span>
                      <span style={{ fontSize: 8.5, color: EMERALD, fontWeight: 600 }}>Con: {f.withProtocol}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Protocol top 3 */}
            <div>
              <GoldDivider label="Intervenciones Prioritarias" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topProtocol.map((item, i) => {
                  const urg = URGENCY[item.urgency] ?? { label: item.urgency, color: AMBER }
                  return (
                    <div key={i} style={{
                      border: `1px solid ${DIVIDER}`,
                      borderLeft: `4px solid ${urg.color}`,
                      borderRadius: 10, overflow: 'hidden',
                      background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{ display: 'flex', gap: 0 }}>
                        <div style={{
                          width: 44, flexShrink: 0,
                          background: `${urg.color}08`, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          borderRight: `1px solid ${urg.color}15`,
                          padding: '14px 0',
                        }}>
                          <span style={{
                            fontSize: 22, fontWeight: 900, color: urg.color,
                            fontFamily: 'ui-monospace,"SF Mono",monospace', lineHeight: 1,
                          }}>{i + 1}</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 800, color: TEXT, margin: 0 }}>{item.molecule}</p>
                            <span style={{
                              fontSize: 8, fontWeight: 800, textTransform: 'uppercase' as const,
                              color: urg.color, background: `${urg.color}15`,
                              border: `1px solid ${urg.color}30`, padding: '2px 8px',
                              borderRadius: 20, letterSpacing: '0.6px', flexShrink: 0, marginLeft: 6,
                            }}>{urg.label}</span>
                          </div>
                          {item.dose && (
                            <p style={{ fontSize: 10, color: MUTED, margin: '0 0 4px', fontWeight: 500 }}>{item.dose}</p>
                          )}
                          {item.expectedResult && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                              <svg viewBox="0 0 24 24" fill="none" width="12" height="12" style={{ flexShrink: 0, marginTop: 1 }}>
                                <path d="M5 12l5 5L19 7" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <p style={{ fontSize: 10, color: GOLD, fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
                                {item.expectedResult}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ═══ FOOTER ══════════════════════════════════════ */}
          <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: 20, marginTop: 4 }}>
            <div style={{
              height: 1, background: `linear-gradient(to right, transparent, ${GOLD}50, transparent)`,
              marginBottom: 20,
            }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px', fontWeight: 600 }}>
                  Próxima evaluación
                </p>
                <p style={{ fontSize: 15, fontWeight: 800, color: GOLD, margin: 0 }}>En 90 días</p>
                <p style={{ fontSize: 10, color: MUTED, margin: '2px 0 0' }}>seguimiento de protocolo</p>
              </div>
              <div style={{
                textAlign: 'center', padding: '0 24px',
                borderLeft: `1px solid ${DIVIDER}`, borderRight: `1px solid ${DIVIDER}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `linear-gradient(135deg, ${GOLD}, #A8822A)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C9 5 6 8 6 12a6 6 0 0012 0c0-4-3-7-6-10z" fill="white" opacity="0.9" />
                    </svg>
                  </div>
                </div>
                <div style={{ width: 56, height: 1, background: TEXT, margin: '0 auto 6px', opacity: 0.12 }} />
                <p style={{ fontSize: 9, color: MUTED, margin: '0 0 2px', fontWeight: 500 }}>Médico responsable</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: TEXT, margin: 0 }}>Dr. / Dra. ___________</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 9, color: MUTED, lineHeight: 1.9, margin: 0 }}>
                  Documento de carácter confidencial.<br />
                  Uso exclusivo del paciente<br />
                  y su médico tratante.
                </p>
                <p style={{ fontSize: 10, fontWeight: 700, color: GOLD, margin: '5px 0 0' }}>
                  Longevity IA · {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
