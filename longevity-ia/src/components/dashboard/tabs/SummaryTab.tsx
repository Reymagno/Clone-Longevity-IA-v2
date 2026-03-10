'use client'

import { useState } from 'react'
import type { AIAnalysis, SystemScores } from '@/types'
import { toast } from 'sonner'

// ── Palette ────────────────────────────────────────────────
const GOLD    = '#C9A84C'
const EMERALD = '#2D9B6F'
const AMBER   = '#E8A020'
const RED     = '#D94F4F'
const TEXT    = '#0A0A0A'
const MUTED   = '#6B6B6B'
const DIVIDER = '#E5E5E5'
const CARD    = '#F7F7F7'

// ── Helpers ────────────────────────────────────────────────
function scoreColor(s: number): string {
  if (s >= 85) return EMERALD
  if (s >= 65) return AMBER
  return RED
}

function scoreStatus(s: number): { label: string; bg: string; color: string } {
  if (s >= 85) return { label: 'Óptimo',           bg: '#EBF7F2', color: EMERALD }
  if (s >= 65) return { label: 'En seguimiento',    bg: '#FEF7EC', color: AMBER   }
  return              { label: 'Requiere atención', bg: '#FDEEEE', color: RED     }
}

// ── Arc Gauge — Luxury Speedometer ─────────────────────────
function ArcGauge({ score }: { score: number }) {
  // cx=130 centra el gauge en el SVG de 260px.
  // cy=108, r=82: los puntos inferiores del arco quedan en y=108+41=149 < SVG height 165 ✓
  const cx = 130, cy = 108, r = 82, sw = 12
  const safe = Math.max(0, Math.min(score, 100))

  const toXY = (angle: number, radius: number) => ({
    x: +(cx + radius * Math.cos(angle)).toFixed(3),
    y: +(cy + radius * Math.sin(angle)).toFixed(3),
  })

  // Arco de 240° abierto abajo: inicia en 150° (inferior-izq) y termina en 30° (inferior-der)
  // Recorre en sentido creciente (sweep=1) pasando por el TOP: 150°→210°→270°(top)→330°→30°+360°
  const BG_START_DEG = 150
  const s0 = toXY(BG_START_DEG * Math.PI / 180, r)
  const s1 = toXY(30 * Math.PI / 180, r)
  const bgPath = `M ${s0.x} ${s0.y} A ${r} ${r} 0 1 1 ${s1.x} ${s1.y}`

  // Arco del score: avanza SUMANDO grados desde el inicio (corrección del bug de resta)
  const fgEndDeg = BG_START_DEG + (safe / 100) * 240
  const fgEnd    = toXY(fgEndDeg * Math.PI / 180, r)
  // largeArc=1 solo cuando el arco supera 180° (umbral: safe > 75, pues 180°/240°*100=75)
  const largeArc = safe > 75 ? 1 : 0
  const fgPath   = safe === 0
    ? ''
    : `M ${s0.x} ${s0.y} A ${r} ${r} 0 ${largeArc} 1 ${fgEnd.x} ${fgEnd.y}`

  const col = scoreColor(score)
  const ticks = [0, 25, 50, 75, 100]

  // Aguja: misma dirección que el arco (suma)
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
        <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={RED}     />
          <stop offset="45%"  stopColor={AMBER}   />
          <stop offset="100%" stopColor={EMERALD} />
        </linearGradient>
        <mask id="arcMask">
          {safe > 0 && (
            <path d={fgPath} fill="none" stroke="white" strokeWidth={sw} strokeLinecap="round" />
          )}
        </mask>
      </defs>

      {/* Background track */}
      <path d={bgPath} fill="none" stroke="#EBEBEB" strokeWidth={sw} strokeLinecap="round" />

      {/* Colored foreground — gradient strip clipped by arc mask */}
      {safe > 0 && (
        <>
          {/* Solid color arc */}
          <path d={fgPath} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" filter="url(#gaugeGlow)" opacity="0.35" />
          <path d={fgPath} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}

      {/* Tick marks */}
      {ticks.map((t) => {
        const tDeg = BG_START_DEG + (t / 100) * 240
        const tRad = tDeg * Math.PI / 180
        const inner = toXY(tRad, r - sw / 2 - 4)
        const outer = toXY(tRad, r + sw / 2 + 4)
        return (
          <line
            key={t}
            x1={inner.x} y1={inner.y}
            x2={outer.x} y2={outer.y}
            stroke={t <= safe ? col : '#CCCCCC'}
            strokeWidth={t === 0 || t === 100 ? 2 : 1.5}
            strokeLinecap="round"
          />
        )
      })}

      {/* Etiquetas de escala solo en los extremos del arco */}
      {[{ t: 0, label: '0' }, { t: 100, label: '100' }].map(({ t, label }) => {
        const tDeg = BG_START_DEG + (t / 100) * 240
        const tRad = tDeg * Math.PI / 180
        const pos  = toXY(tRad, r + sw / 2 + 14)
        return (
          <text key={t} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill={MUTED} fontFamily="ui-monospace,'SF Mono',monospace">
            {label}
          </text>
        )
      })}

      {/* Needle */}
      {safe > 0 && (
        <>
          <polygon
            points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
            fill={col} opacity="0.2" filter="url(#needleGlow)"
          />
          <line
            x1={cx} y1={cy}
            x2={needleTip.x} y2={needleTip.y}
            stroke={col} strokeWidth="2.5" strokeLinecap="round"
          />
        </>
      )}

      {/* Center hub */}
      <circle cx={cx} cy={cy} r={10} fill="white" stroke={DIVIDER} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={5}  fill={col} />

      {/* Score number — centrado dentro del hueco del arco */}
      <text x={cx} y={cy - 20} textAnchor="middle" fill={TEXT}
        fontSize="38" fontWeight="900" fontFamily="ui-monospace,'SF Mono',monospace" letterSpacing="-2">
        {score}
      </text>
      <text x={cx} y={cy - 4} textAnchor="middle" fill={MUTED} fontSize="11"
        fontFamily="system-ui,sans-serif">
        / 100
      </text>

      {/* Label below hub */}
      <text x={cx} y={cy + 22} textAnchor="middle" fill={MUTED} fontSize="9"
        fontFamily="system-ui,sans-serif" letterSpacing="1.5">
        ÍNDICE LONGEVITY
      </text>
    </svg>
  )
}

// ── Órganos y sistemas (los 8 de SystemScores) ─────────────
const ORGAN_SYSTEMS: Array<{ key: keyof SystemScores; label: string; sublabel: string; icon: JSX.Element }> = [
  {
    key: 'cardiovascular', label: 'Cardiovascular', sublabel: 'Corazón y circulación',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  },
  {
    key: 'metabolic', label: 'Metabólico', sublabel: 'Glucosa y energía',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
  {
    key: 'hepatic', label: 'Hepático', sublabel: 'Hígado y detoxificación',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3C8 3 4 6 4 10c0 2 .8 3.8 2 5l1 5h10l1-5c1.2-1.2 2-3 2-5 0-4-4-7-8-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  },
  {
    key: 'renal', label: 'Renal', sublabel: 'Riñones y filtración',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M7 4C4.5 4 3 6 3 8.5c0 4 3 7.5 5 9.5 1 1 2 2 4 2s3-1 4-2c2-2 5-5.5 5-9.5C21 6 19.5 4 17 4c-2 0-3.5 2-5 2S9 4 7 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  },
  {
    key: 'immune', label: 'Inmunológico', sublabel: 'Defensas y sistema inmune',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11 4.5-.85 8-5.75 8-11V6L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  },
  {
    key: 'hematologic', label: 'Hematológico', sublabel: 'Sangre y oxigenación',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  },
  {
    key: 'inflammatory', label: 'Inflamatorio', sublabel: 'PCR y marcadores',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L8 8H4l4 4-1.5 5.5L12 14l5.5 3.5L16 12l4-4h-4L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  },
  {
    key: 'vitamins', label: 'Vitaminas & Micronutrientes', sublabel: 'Vit. D, B12, Ferritina',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
]

// ── Urgency ────────────────────────────────────────────────
const URGENCY: Record<string, { label: string; color: string }> = {
  immediate: { label: 'Inmediata', color: RED       },
  high:      { label: 'Alta',      color: AMBER     },
  medium:    { label: 'Media',     color: '#0369a1' },
  low:       { label: 'Baja',      color: EMERALD   },
}

// ── Ornamental divider ──────────────────────────────────────
function GoldDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 18px' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${DIVIDER})` }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '4px 14px',
        border: `1px solid ${GOLD}30`,
        borderRadius: 20,
        background: `${GOLD}08`,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
        <span style={{
          fontSize: 9, fontWeight: 700, color: GOLD,
          textTransform: 'uppercase', letterSpacing: '1.5px',
          fontFamily: 'system-ui,sans-serif',
        }}>{label}</span>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
      </div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${DIVIDER})` }} />
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────
interface SummaryTabProps {
  analysis: AIAnalysis
  patientAge: number
  patientName?: string
  resultDate?: string
}

// ── Main Component ─────────────────────────────────────────
export function SummaryTab({ analysis, patientAge, patientName = 'Paciente', resultDate }: SummaryTabProps) {
  const [exporting, setExporting] = useState(false)

  const ageDiff = patientAge - analysis.longevity_age
  const dateStr = resultDate
    ? new Date(resultDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  const sortedProtocol = [...(analysis.protocol ?? [])].sort((a, b) => {
    const o: Record<string, number> = { immediate: 0, high: 1, medium: 2, low: 3 }
    return (o[a.urgency] ?? 4) - (o[b.urgency] ?? 4)
  }).slice(0, 3)

  // keyAlerts viene vacío (el prompt lo define como strings, no objetos).
  // Derivamos los hallazgos del SWOT, que siempre tiene datos ricos.
  const keyFindings = [
    ...(analysis.swot?.weaknesses ?? []).slice(0, 2).map(item => ({
      title: item.label,
      description: item.detail,
      level: 'warning' as const,
      badge: `Probabilidad: ${item.probability ?? 'Media'}`,
    })),
    ...(analysis.swot?.strengths ?? []).slice(0, 1).map(item => ({
      title: item.label,
      description: item.detail,
      level: 'optimal' as const,
      badge: item.expectedImpact ?? '',
    })),
  ].slice(0, 3)

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
      let left = imgH
      pdf.addImage(imgData, 'PNG', 0, 0, W, imgH)
      left -= H
      while (left >= 0) {
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, left - imgH, W, imgH)
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

  const stat = scoreStatus(analysis.overallScore)

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Export controls (outside captured div) ──────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <button
          onClick={exportPDF}
          disabled={exporting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${GOLD}`, color: GOLD,
            background: 'transparent', borderRadius: 8,
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.55 : 1,
            letterSpacing: '0.3px', fontFamily: 'inherit',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 15V3M12 15l-4-4M12 15l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Descargar PDF
        </button>
        <button
          onClick={exportImage}
          disabled={exporting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${GOLD}50`, color: MUTED,
            background: 'transparent', borderRadius: 8,
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.55 : 1,
            letterSpacing: '0.3px', fontFamily: 'inherit',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Descargar Imagen
        </button>
      </div>

      {/* ── Diagnostic document ────────────────────────── */}
      <div
        id="diagnostico-longevity"
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
          overflow: 'hidden',
          color: TEXT,
        }}
      >

        {/* ─── HEADER ──────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, #0A0A0A 0%, #1C1A14 60%, #2A2418 100%)`,
          padding: '0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative background pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(circle at 80% 50%, ${GOLD}18 0%, transparent 60%), radial-gradient(circle at 20% 80%, ${GOLD}08 0%, transparent 50%)`,
            pointerEvents: 'none',
          }} />

          {/* Gold top stripe */}
          <div style={{ height: 3, background: `linear-gradient(to right, ${GOLD}00, ${GOLD}, ${GOLD}80, ${GOLD}00)` }} />

          <div style={{ padding: '22px 32px 0', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `linear-gradient(135deg, ${GOLD}, #A8822A)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 16px ${GOLD}50`,
                  flexShrink: 0,
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

              {/* Patient info — right side */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.2px' }}>
                  {patientName}
                </p>
                <p style={{ fontSize: 11, color: '#FFFFFF80', margin: '4px 0 0' }}>
                  {patientAge} años · {dateStr}
                </p>
              </div>
            </div>

            {/* Motto band */}
            <div style={{
              textAlign: 'center', padding: '18px 0 20px',
              marginTop: 16,
              borderTop: `1px solid #FFFFFF12`,
            }}>
              <p style={{
                fontSize: 13, fontStyle: 'italic', color: GOLD,
                fontWeight: 500, letterSpacing: '0.4px', margin: 0,
              }}>
                &ldquo;Entendemos el envejecimiento como una dirección que tú controlas.&rdquo;
              </p>
            </div>
          </div>

          {/* Bottom gold stripe */}
          <div style={{ height: 2, background: `linear-gradient(to right, ${GOLD}00, ${GOLD}60, ${GOLD}00)` }} />
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div style={{ padding: '32px 32px 28px' }}>

          {/* ─── SCORE PRINCIPAL ─────────────────────────────── */}
          <div style={{ marginBottom: 36 }}>
            <GoldDivider label="Diagnóstico Global" />

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 0,
              border: `1px solid ${DIVIDER}`,
              borderRadius: 14,
              overflow: 'hidden',
              background: CARD,
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}>

              {/* Col 1: Gauge */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '24px 16px 20px',
                borderRight: `1px solid ${DIVIDER}`,
                background: 'white',
                position: 'relative',
              }}>
                {/* Subtle radial glow behind gauge */}
                <div style={{
                  position: 'absolute', top: '30%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 160, height: 160,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${scoreColor(analysis.overallScore)}12 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <ArcGauge score={analysis.overallScore} />
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  marginTop: 8,
                  padding: '5px 16px',
                  borderRadius: 24,
                  background: stat.bg,
                  border: `1px solid ${stat.color}30`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: stat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: stat.color, letterSpacing: '0.3px' }}>
                    {stat.label}
                  </span>
                </div>
              </div>

              {/* Col 2: Age comparison */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                borderRight: `1px solid ${DIVIDER}`,
              }}>
                {/* Biological age */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '20px 16px',
                  borderBottom: `1px solid ${DIVIDER}`,
                  background: 'white',
                }}>
                  <p style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 8px', fontWeight: 600 }}>
                    Edad Biológica
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      fontSize: 48, fontWeight: 900, lineHeight: 1,
                      color: scoreColor(analysis.overallScore),
                      fontFamily: 'ui-monospace,"SF Mono",monospace',
                      letterSpacing: '-2px',
                    }}>
                      {analysis.longevity_age}
                    </span>
                    <span style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>años</span>
                  </div>
                </div>
                {/* Chronological age */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '20px 16px',
                  background: CARD,
                }}>
                  <p style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 8px', fontWeight: 600 }}>
                    Edad Cronológica
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      fontSize: 48, fontWeight: 900, lineHeight: 1,
                      color: TEXT,
                      fontFamily: 'ui-monospace,"SF Mono",monospace',
                      letterSpacing: '-2px',
                    }}>
                      {patientAge}
                    </span>
                    <span style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>años</span>
                  </div>
                </div>
              </div>

              {/* Col 3: Delta + clinical summary */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                padding: '22px 20px',
                background: 'white',
                gap: 16,
              }}>
                {/* Delta badge */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: ageDiff > 2 ? '#EBF7F2' : ageDiff < -2 ? '#FDEEEE' : '#FEF7EC',
                  border: `1px solid ${(ageDiff > 2 ? EMERALD : ageDiff < -2 ? RED : AMBER)}25`,
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontSize: 20, fontWeight: 800, margin: '0 0 4px',
                    color: ageDiff > 2 ? EMERALD : ageDiff < -2 ? RED : AMBER,
                    fontFamily: 'ui-monospace,"SF Mono",monospace',
                  }}>
                    {ageDiff > 2
                      ? `−${ageDiff} años`
                      : ageDiff < -2
                      ? `+${Math.abs(ageDiff)} años`
                      : '≈ 0'}
                  </p>
                  <p style={{ fontSize: 10, color: MUTED, margin: 0, fontWeight: 500 }}>
                    {ageDiff > 2
                      ? 'más joven biológicamente'
                      : ageDiff < -2
                      ? 'de desgaste acumulado'
                      : 'equilibrio biológico'}
                  </p>
                </div>

                {/* Clinical summary */}
                <p style={{
                  fontSize: 12, color: TEXT, lineHeight: 1.7, margin: 0,
                  paddingLeft: 12,
                  borderLeft: `3px solid ${GOLD}`,
                  flex: 1,
                }}>
                  {analysis.clinicalSummary}
                </p>
              </div>
            </div>
          </div>

          {/* ─── ÓRGANOS Y SISTEMAS ──────────────────────────── */}
          <div style={{ marginBottom: 36 }}>
            <GoldDivider label="Órganos y Sistemas" />
            <div style={{
              border: `1px solid ${DIVIDER}`,
              borderRadius: 14,
              overflow: 'hidden',
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}>
              {ORGAN_SYSTEMS.map(({ key, label, sublabel, icon }, i) => {
                const score    = analysis.systemScores[key]
                const col      = scoreColor(score)
                const st       = scoreStatus(score)
                const isRight  = i % 2 === 1
                const isLastRow = i >= ORGAN_SYSTEMS.length - 2
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 18px',
                    borderBottom: isLastRow ? 'none' : `1px solid ${DIVIDER}`,
                    borderRight: isRight ? 'none' : `1px solid ${DIVIDER}`,
                    background: i % 4 < 2 ? 'white' : CARD,
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: `${col}14`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: col,
                    }}>
                      {icon}
                    </div>

                    {/* Name + bar + score */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT, margin: 0, lineHeight: 1.2 }}>{label}</p>
                          <p style={{ fontSize: 9, color: MUTED, margin: '1px 0 0' }}>{sublabel}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          <span style={{
                            fontSize: 17, fontWeight: 900, color: col, lineHeight: 1,
                            fontFamily: 'ui-monospace,"SF Mono",monospace', letterSpacing: '-0.5px',
                          }}>
                            {score}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: st.color,
                            background: st.bg, padding: '2px 7px', borderRadius: 10,
                            border: `1px solid ${st.color}20`, whiteSpace: 'nowrap' as const,
                          }}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 5, background: '#EBEBEB', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${score}%`,
                          background: score >= 85 ? `linear-gradient(to right, ${GOLD}70, ${GOLD})` : col,
                          borderRadius: 3,
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ─── KEY FINDINGS ─────────────────────────────────── */}
          {keyFindings.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <GoldDivider label="Hallazgos Clave" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {keyFindings.map((f, i) => {
                  const dotColor = f.level === 'optimal' ? EMERALD : AMBER
                  const num = ['01', '02', '03'][i] ?? `0${i + 1}`
                  const badgeLabel = f.level === 'optimal' ? 'Fortaleza' : 'Área de atención'
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 0,
                      border: `1px solid ${DIVIDER}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: 'white',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                      {/* Number sidebar */}
                      <div style={{
                        width: 52, flexShrink: 0,
                        background: `${dotColor}10`,
                        borderRight: `1px solid ${dotColor}20`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '16px 8px',
                      }}>
                        <span style={{
                          fontSize: 20, fontWeight: 900,
                          color: dotColor, fontFamily: 'ui-monospace,"SF Mono",monospace',
                          lineHeight: 1, letterSpacing: '-1px',
                        }}>
                          {num}
                        </span>
                        <div style={{ width: 20, height: 2, background: dotColor, borderRadius: 1, marginTop: 6, opacity: 0.4 }} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>{f.title}</p>
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: dotColor, background: `${dotColor}14`,
                            padding: '2px 8px', borderRadius: 10,
                            textTransform: 'uppercase' as const, letterSpacing: '0.5px',
                          }}>
                            {badgeLabel}
                          </span>
                        </div>
                        <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, margin: 0 }}>{f.description}</p>
                        {f.badge && (
                          <p style={{ fontSize: 10, color: GOLD, fontWeight: 600, margin: '8px 0 0' }}>
                            {f.badge}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── INTERVENTIONS ────────────────────────────────── */}
          {sortedProtocol.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <GoldDivider label="Intervenciones Prioritarias" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sortedProtocol.map((item, i) => {
                  const urg = URGENCY[item.urgency] ?? { label: item.urgency, color: AMBER }
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 0,
                      border: `1px solid ${DIVIDER}`,
                      borderLeft: `4px solid ${urg.color}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: 'white',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                      {/* Priority number */}
                      <div style={{
                        width: 56, flexShrink: 0,
                        background: `${urg.color}08`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '18px 0',
                        borderRight: `1px solid ${urg.color}15`,
                      }}>
                        <span style={{
                          fontSize: 26, fontWeight: 900,
                          color: urg.color, fontFamily: 'ui-monospace,"SF Mono",monospace',
                          lineHeight: 1, letterSpacing: '-1px',
                        }}>
                          {i + 1}
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, margin: 0, letterSpacing: '-0.2px' }}>
                            {item.molecule}
                          </p>
                          <span style={{
                            fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const,
                            color: urg.color,
                            background: `${urg.color}15`,
                            border: `1px solid ${urg.color}30`,
                            padding: '3px 10px', borderRadius: 20,
                            letterSpacing: '0.8px', flexShrink: 0, marginLeft: 10,
                          }}>
                            {urg.label}
                          </span>
                        </div>
                        {item.dose && (
                          <p style={{ fontSize: 11, color: MUTED, margin: '0 0 5px', fontWeight: 500 }}>
                            {item.dose}
                          </p>
                        )}
                        {item.expectedResult && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
                            <div style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }}>
                              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                                <path d="M5 12l5 5L19 7" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <p style={{ fontSize: 11, color: GOLD, fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                              {item.expectedResult}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── FOOTER ──────────────────────────────────────── */}
          <div style={{
            borderTop: `1px solid ${DIVIDER}`,
            marginTop: 4,
            paddingTop: 24,
          }}>
            {/* Gold ornamental line */}
            <div style={{
              height: 1,
              background: `linear-gradient(to right, transparent, ${GOLD}50, transparent)`,
              marginBottom: 22,
            }} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 24,
              alignItems: 'center',
            }}>
              {/* Next evaluation */}
              <div>
                <p style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 5px', fontWeight: 600 }}>
                  Próxima evaluación
                </p>
                <p style={{ fontSize: 15, fontWeight: 800, color: GOLD, margin: 0, letterSpacing: '-0.3px' }}>
                  En 90 días
                </p>
                <p style={{ fontSize: 10, color: MUTED, margin: '3px 0 0' }}>
                  seguimiento de protocolo
                </p>
              </div>

              {/* Center: mini logo + signature */}
              <div style={{
                textAlign: 'center',
                padding: '0 28px',
                borderLeft: `1px solid ${DIVIDER}`,
                borderRight: `1px solid ${DIVIDER}`,
              }}>
                {/* Mini logo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
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
                <div style={{ width: 64, height: 1, background: TEXT, margin: '0 auto 8px', opacity: 0.15 }} />
                <p style={{ fontSize: 9, color: MUTED, margin: '0 0 3px', fontWeight: 500 }}>Médico responsable</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: '0.2px' }}>
                  Dr. / Dra. ___________
                </p>
              </div>

              {/* Confidentiality */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 9, color: MUTED, lineHeight: 1.8, margin: 0 }}>
                  Documento de carácter confidencial.<br />
                  Uso exclusivo del paciente<br />
                  y su médico tratante.
                </p>
                <p style={{ fontSize: 10, fontWeight: 700, color: GOLD, margin: '6px 0 0' }}>
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
