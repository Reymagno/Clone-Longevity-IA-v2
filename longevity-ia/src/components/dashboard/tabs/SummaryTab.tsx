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
function scoreColor(s: number) {
  if (s >= 85) return EMERALD
  if (s >= 65) return AMBER
  return RED
}

function scoreStatus(s: number): { label: string; bg: string; color: string } {
  if (s >= 85) return { label: 'Óptimo',             bg: '#EBF7F2', color: EMERALD }
  if (s >= 65) return { label: 'En seguimiento',      bg: '#FEF7EC', color: AMBER   }
  return              { label: 'Requiere atención',   bg: '#FDEEEE', color: RED     }
}

// ── Arc Gauge ──────────────────────────────────────────────
function ArcGauge({ score }: { score: number }) {
  const cx = 100, cy = 72, r = 54, sw = 8
  const safe = Math.max(score, 1)
  const theta = Math.PI - (safe / 100) * Math.PI
  const eX = +(cx + r * Math.cos(theta)).toFixed(2)
  const eY = +(cy - r * Math.sin(theta)).toFixed(2)
  const bg = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const fg = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${eX} ${eY}`
  const col = scoreColor(score)

  return (
    <svg width="200" height="88" viewBox="0 0 200 88">
      <path d={bg} fill="none" stroke="#EBEBEB" strokeWidth={sw} strokeLinecap="round" />
      <path d={fg} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" />
      <circle cx={eX} cy={eY} r={sw / 2 + 1.5} fill="white" stroke={col} strokeWidth="2" />
      <text x={cx} y={cy - 8} textAnchor="middle" fill={TEXT} fontSize="30" fontWeight="800"
        fontFamily="ui-monospace,'SF Mono',monospace">{score}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={MUTED} fontSize="11">/ 100</text>
      <text x={cx - r + 4} y={cy + 18} textAnchor="middle" fill={MUTED} fontSize="9">0</text>
      <text x={cx + r - 4} y={cy + 18} textAnchor="middle" fill={MUTED} fontSize="9">100</text>
    </svg>
  )
}

// ── Metrics config ─────────────────────────────────────────
const METRICS: Array<{ key: keyof SystemScores; label: string; desc: string }> = [
  { key: 'inflammatory',   label: 'Inflamación',        desc: 'PCR y homocisteína'           },
  { key: 'cardiovascular', label: 'Perfil Lipídico',    desc: 'Colesterol y triglicéridos'   },
  { key: 'metabolic',      label: 'Metabolismo',        desc: 'Glucosa y función renal'      },
  { key: 'immune',         label: 'Vitalidad Hormonal', desc: 'Eje inmuno-endocrino'         },
  { key: 'hepatic',        label: 'Función Hepática',   desc: 'ALT, AST, GGT'               },
  { key: 'hematologic',    label: 'Estrés Oxidativo',   desc: 'Células y oxigenación'        },
]

// ── Urgency ────────────────────────────────────────────────
const URGENCY: Record<string, { label: string; color: string }> = {
  immediate: { label: 'Inmediata', color: RED      },
  high:      { label: 'Alta',      color: AMBER    },
  medium:    { label: 'Media',     color: '#0369a1' },
  low:       { label: 'Baja',      color: EMERALD  },
}

// ── Section header helper ──────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
      <p style={{ fontSize: 10, fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
        {children}
      </p>
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

  const keyFindings = (analysis.keyAlerts ?? []).slice(0, 3)

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

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', fontSize: 13, fontWeight: 600,
    border: `1.5px solid ${GOLD}`, color: GOLD,
    background: 'transparent', borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1, transition: 'background 0.15s',
    fontFamily: 'inherit',
  })

  return (
    <div>
      {/* ── Export controls (not captured) ────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <button onClick={exportPDF} disabled={exporting} style={btnStyle(exporting)}>
          ↓ Descargar PDF
        </button>
        <button onClick={exportImage} disabled={exporting} style={btnStyle(exporting)}>
          ↓ Descargar Imagen
        </button>
      </div>

      {/* ── Diagnostic document ───────────────────────────── */}
      <div
        id="diagnostico-longevity"
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 2px 20px rgba(0,0,0,0.09)',
          overflow: 'hidden',
          fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
          color: TEXT,
        }}
      >
        {/* ─── HEADER ─────────────────────────────────────── */}
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${DIVIDER}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: GOLD,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3C8.13 3 5 6.13 5 10c0 3.87 3.13 7 7 7s7-3.13 7-7c0-3.87-3.13-7-7-7zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 12c-2.33 0-4.31-1.17-5.5-2.98C6.53 13.03 9.22 12 12 12s5.47 1.03 5.5 2.02C16.31 15.83 14.33 17 12 17z" fill="white" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, lineHeight: '1.2', margin: 0 }}>Longevity Clinic</p>
                <p style={{ fontSize: 10, color: MUTED, margin: '2px 0 0' }}>Medicina de Precisión · Longevidad</p>
              </div>
            </div>
            {/* Patient info */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>{patientName}</p>
              <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>{patientAge} años · {dateStr}</p>
            </div>
          </div>
          {/* Motto */}
          <div style={{ textAlign: 'center', paddingTop: 14, borderTop: `1px solid ${DIVIDER}` }}>
            <p style={{ fontSize: 12, fontStyle: 'italic', color: GOLD, fontWeight: 500, letterSpacing: '0.3px', margin: 0 }}>
              "Entendemos el envejecimiento como una dirección que tú controlas."
            </p>
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* ─── SCORE PRINCIPAL ────────────────────────────── */}
          <div style={{
            background: CARD, border: `1px solid ${DIVIDER}`, borderRadius: 12,
            padding: '20px 24px', display: 'grid',
            gridTemplateColumns: '210px 1fr', gap: 24,
            alignItems: 'center', marginBottom: 28,
          }}>
            {/* Gauge side */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                Índice Longevity
              </p>
              <ArcGauge score={analysis.overallScore} />
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: scoreStatus(analysis.overallScore).color,
                background: scoreStatus(analysis.overallScore).bg,
                padding: '3px 14px', borderRadius: 20, marginTop: -2,
              }}>
                {scoreStatus(analysis.overallScore).label}
              </span>
            </div>

            {/* Bio age + summary */}
            <div>
              {/* Age comparison row */}
              <div style={{
                display: 'flex', border: `1px solid ${DIVIDER}`,
                borderRadius: 10, overflow: 'hidden',
                marginBottom: 16, background: 'white',
              }}>
                {/* Biological age */}
                <div style={{ flex: 1, padding: '14px 18px', textAlign: 'center', borderRight: `1px solid ${DIVIDER}` }}>
                  <p style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 6px' }}>
                    Edad Biológica
                  </p>
                  <span style={{ fontSize: 34, fontWeight: 800, color: scoreColor(analysis.overallScore), fontFamily: 'ui-monospace,monospace', lineHeight: 1 }}>
                    {analysis.longevity_age}
                  </span>
                  <p style={{ fontSize: 10, color: MUTED, margin: '3px 0 0' }}>años</p>
                </div>
                {/* Chronological age */}
                <div style={{ flex: 1, padding: '14px 18px', textAlign: 'center', borderRight: `1px solid ${DIVIDER}` }}>
                  <p style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 6px' }}>
                    Edad Cronológica
                  </p>
                  <span style={{ fontSize: 34, fontWeight: 800, color: TEXT, fontFamily: 'ui-monospace,monospace', lineHeight: 1 }}>
                    {patientAge}
                  </span>
                  <p style={{ fontSize: 10, color: MUTED, margin: '3px 0 0' }}>años</p>
                </div>
                {/* Delta */}
                <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 3px', color: ageDiff > 2 ? EMERALD : ageDiff < -2 ? RED : AMBER }}>
                      {ageDiff > 2 ? `${ageDiff} años más joven` : ageDiff < -2 ? `${Math.abs(ageDiff)} años de desgaste` : 'En equilibrio'}
                    </p>
                    <p style={{ fontSize: 9, color: MUTED, margin: 0 }}>diferencia biológica</p>
                  </div>
                </div>
              </div>
              {/* Clinical summary */}
              <p style={{
                fontSize: 12, color: TEXT, lineHeight: 1.65, margin: 0,
                borderLeft: `3px solid ${GOLD}`, paddingLeft: 12,
              }}>
                {analysis.clinicalSummary}
              </p>
            </div>
          </div>

          {/* ─── 6 METRICS ──────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Métricas del Sistema</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {METRICS.map(({ key, label, desc }) => {
                const score = analysis.systemScores[key]
                const col = scoreColor(score)
                const stat = scoreStatus(score)
                return (
                  <div key={key} style={{
                    background: CARD, border: `1px solid ${DIVIDER}`,
                    borderTop: `3px solid ${col}`, borderRadius: 10,
                    padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: TEXT, margin: '0 0 2px' }}>{label}</p>
                    <p style={{ fontSize: 9, color: MUTED, margin: '0 0 8px' }}>{desc}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 8 }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: TEXT, fontFamily: 'ui-monospace,monospace', lineHeight: 1 }}>
                        {score}
                      </span>
                      <span style={{ fontSize: 9, color: MUTED }}>/ 100</span>
                    </div>
                    <div style={{ height: 4, background: '#E8E8E8', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${score}%`, background: col, borderRadius: 2 }} />
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: stat.color, background: stat.bg,
                      padding: '2px 8px', borderRadius: 12, display: 'inline-block',
                    }}>
                      {stat.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ─── KEY FINDINGS ───────────────────────────────── */}
          {keyFindings.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <SectionTitle>Hallazgos Clave</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {keyFindings.map((f, i) => {
                  const dotColor = f.level === 'optimal' ? EMERALD : f.level === 'danger' ? RED : f.level === 'warning' ? AMBER : '#0369a1'
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '12px 16px', background: CARD,
                      border: `1px solid ${DIVIDER}`, borderRadius: 10,
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', background: dotColor,
                        flexShrink: 0, marginTop: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ color: 'white', fontSize: 12 }}>✓</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: '0 0 3px' }}>{f.title}</p>
                        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.55, margin: 0 }}>{f.description}</p>
                        {f.value && (
                          <p style={{ fontSize: 10, color: GOLD, marginTop: 5, fontWeight: 600, margin: '5px 0 0' }}>
                            Valor: {f.value} · Meta: {f.target}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── RECOMMENDATIONS ────────────────────────────── */}
          {sortedProtocol.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <SectionTitle>Intervenciones Prioritarias</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedProtocol.map((item, i) => {
                  const urg = URGENCY[item.urgency] ?? { label: item.urgency, color: AMBER }
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                      padding: '14px 16px', background: CARD,
                      border: `1px solid ${DIVIDER}`,
                      borderLeft: `3px solid ${urg.color}`,
                      borderRadius: 10,
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: `${urg.color}18`, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800, color: urg.color,
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>{item.molecule}</p>
                          <span style={{
                            fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const,
                            color: urg.color, background: `${urg.color}12`,
                            padding: '2px 8px', borderRadius: 20,
                            letterSpacing: '0.5px', flexShrink: 0, marginLeft: 8,
                          }}>
                            {urg.label}
                          </span>
                        </div>
                        {item.dose && (
                          <p style={{ fontSize: 11, color: MUTED, margin: '0 0 4px' }}>{item.dose}</p>
                        )}
                        {item.expectedResult && (
                          <p style={{ fontSize: 11, color: GOLD, fontStyle: 'italic', margin: 0 }}>
                            → {item.expectedResult}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── FOOTER ─────────────────────────────────────── */}
          <div style={{
            borderTop: `1px solid ${DIVIDER}`, paddingTop: 20,
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24,
            alignItems: 'start',
          }}>
            {/* Next eval */}
            <div>
              <p style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>
                Próxima evaluación recomendada
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: GOLD, margin: 0 }}>En 90 días</p>
            </div>
            {/* Doctor */}
            <div style={{
              textAlign: 'center',
              borderLeft: `1px solid ${DIVIDER}`, borderRight: `1px solid ${DIVIDER}`,
              padding: '0 24px',
            }}>
              <div style={{ width: 80, height: 1, background: DIVIDER, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 9, color: MUTED, margin: '0 0 3px' }}>Médico responsable</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: TEXT, margin: 0 }}>Dr. / Dra. ___________</p>
            </div>
            {/* Confidentiality */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                Documento confidencial.<br />
                Uso exclusivo del paciente<br />
                y su médico tratante.<br />
                <span style={{ color: GOLD }}>Longevity IA · {new Date().getFullYear()}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
