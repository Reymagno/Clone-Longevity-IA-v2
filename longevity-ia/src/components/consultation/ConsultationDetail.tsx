'use client'

import { useState } from 'react'
import type { Patient, Consultation, ConsultationSOAP } from '@/types'
import {
  X, FileDown, Calendar, Clock, Tag, MessageSquare,
  ChevronDown, ChevronUp, Stethoscope, User,
  ClipboardList, Activity, Target, CheckCircle2,
  Pill, FlaskConical, AlertTriangle, Lightbulb,
  ShieldAlert, HeartPulse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface ConsultationDetailProps {
  consultation: Consultation
  patient: Patient
  onClose: () => void
  medicoName?: string
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ── SOAP Section with colored left border accent ────────────── */
function SOAPSection({ label, icon: Icon, content, color, borderColor, stagger }: {
  label: string
  icon: React.ElementType
  content: string
  color: string
  borderColor: string
  stagger: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        bg-[var(--glass)] backdrop-blur-md
        border border-[var(--glass-border)]
        animate-slide-up ${stagger}
      `}
      style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center`}
            style={{ background: `${borderColor}15`, border: `1px solid ${borderColor}30` }}
          >
            <Icon size={13} className={color} />
          </div>
          <span className="text-xs font-bold text-foreground tracking-wide uppercase">{label}</span>
        </div>
        {open
          ? <ChevronUp size={14} className="text-muted-foreground/60" />
          : <ChevronDown size={14} className="text-muted-foreground/60" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-[38px]">
            <p className="text-xs text-muted-foreground/90 leading-relaxed whitespace-pre-wrap">
              {content || 'Sin datos'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Tag color mapping ───────────────────────────────────────── */
function getTagBadgeClass(tag: string): string {
  const lower = tag.toLowerCase()
  if (lower.includes('urgente') || lower.includes('critico') || lower.includes('alerta'))
    return 'badge-danger'
  if (lower.includes('pendiente') || lower.includes('seguimiento') || lower.includes('revision'))
    return 'badge-warning'
  if (lower.includes('control') || lower.includes('normal') || lower.includes('info'))
    return 'badge-normal'
  return 'badge-optimal'
}

export function ConsultationDetail({ consultation, patient, onClose, medicoName }: ConsultationDetailProps) {
  const [downloading, setDownloading] = useState(false)
  const soap = consultation.ai_soap as ConsultationSOAP | null
  const soapExt = (consultation.ai_soap || {}) as {
    key_findings?: string[]
    medications?: { name: string; dose?: string; instructions?: string }[]
    pending_studies?: string[]
    alerts?: string[]
  }
  const speakers = (consultation.speakers || {}) as Record<string, string>
  const speakerEntries = Object.entries(speakers)

  async function handleDownloadPDF() {
    setDownloading(true)
    try {
      const { generateConsultationPDF } = await import('@/lib/consultation-pdf')
      await generateConsultationPDF(patient, consultation, medicoName)
      toast.success('PDF de consulta generado')
    } catch {
      toast.error('Error al generar PDF')
    } finally {
      setDownloading(false)
    }
  }

  let sectionIndex = 0
  const nextStagger = () => `stagger-${++sectionIndex}`

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal container - premium glass card with gold top edge */}
      <div
        className="
          absolute top-4 left-4 right-4
          sm:top-6 sm:left-[8%] sm:right-[8%]
          max-h-[90vh]
          rounded-2xl
          border border-[var(--glass-border)]
          shadow-2xl
          flex flex-col overflow-hidden
          animate-scale-in
        "
        style={{
          background: 'linear-gradient(135deg, rgba(10, 23, 41, 0.97) 0%, rgba(16, 31, 56, 0.95) 100%)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset, 0 1px 0 0 rgba(212,175,55,0.12) inset',
          borderTop: '1px solid rgba(212, 175, 55, 0.15)',
        }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="relative shrink-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center animate-pulse-glow"
                style={{
                  background: 'linear-gradient(135deg, rgba(46, 174, 123, 0.15) 0%, rgba(46, 174, 123, 0.05) 100%)',
                  border: '1px solid rgba(46, 174, 123, 0.25)',
                }}
              >
                <Stethoscope size={19} className="text-accent" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-wide">Detalle de Consulta</h2>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><Calendar size={9} /> {formatDate(consultation.created_at)}</span>
                  <span className="flex items-center gap-1"><Clock size={9} /> {formatDuration(consultation.duration_seconds)}</span>
                  {speakerEntries.length > 0 && (
                    <span className="flex items-center gap-1"><MessageSquare size={9} /> {speakerEntries.length} participantes</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} loading={downloading} className="rounded-xl border-[var(--border)] hover:border-accent/30 transition-all">
                <FileDown size={13} />
                PDF
              </Button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-colors border border-transparent hover:border-[var(--border)]"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          {/* Gradient accent line below header */}
          <div className="accent-line w-full" style={{ height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(212,175,55,0.25) 30%, rgba(46,174,123,0.2) 60%, rgba(91,164,201,0.15) 80%, transparent 95%)' }} />
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Alerts (Full-width danger card, first for urgency) ── */}
          {soapExt.alerts && soapExt.alerts.length > 0 && (
            <div
              className={`
                urgency-immediate card-status-danger
                rounded-xl p-4
                animate-slide-up ${nextStagger()}
              `}
              style={{
                background: 'linear-gradient(135deg, rgba(212, 83, 106, 0.08) 0%, rgba(212, 83, 106, 0.02) 100%)',
                border: '1px solid rgba(212, 83, 106, 0.2)',
              }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(212, 83, 106, 0.15)',
                    boxShadow: '0 0 16px rgba(212, 83, 106, 0.2)',
                  }}
                >
                  <ShieldAlert size={15} className="text-danger" />
                </div>
                <span className="text-xs font-bold text-danger tracking-wide uppercase">Alertas Clinicas</span>
              </div>
              <div className="space-y-2 ml-[42px]">
                {soapExt.alerts.map((a: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-danger/90">
                    <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tags ──────────────────────────────────────────── */}
          {consultation.tags.length > 0 && (
            <div className={`flex flex-wrap gap-2 animate-slide-up ${nextStagger()}`}>
              {consultation.tags.map((tag, i) => (
                <span
                  key={i}
                  className={`
                    text-[10px] font-semibold px-3 py-1.5 rounded-full
                    ${getTagBadgeClass(tag)}
                    flex items-center gap-1
                  `}
                >
                  <Tag size={9} />{tag}
                </span>
              ))}
            </div>
          )}

          {/* ── Speakers ──────────────────────────────────────── */}
          {speakerEntries.length > 0 && (
            <div className={`flex gap-3 animate-slide-up ${nextStagger()}`}>
              {speakerEntries.map(([key, label], idx) => {
                const isDoctor = label.toLowerCase().includes('dr') || label.toLowerCase().includes('medic') || label.toLowerCase().includes('doc')
                const iconColor = isDoctor ? 'text-accent' : 'text-info'
                const bgColor = isDoctor
                  ? 'rgba(46, 174, 123, 0.08)'
                  : 'rgba(91, 164, 201, 0.08)'
                const borderCol = isDoctor
                  ? 'rgba(46, 174, 123, 0.2)'
                  : 'rgba(91, 164, 201, 0.2)'
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 text-xs rounded-xl px-3.5 py-2"
                    style={{ background: bgColor, border: `1px solid ${borderCol}` }}
                  >
                    {isDoctor
                      ? <Stethoscope size={12} className={iconColor} />
                      : <HeartPulse size={12} className={iconColor} />
                    }
                    <span className="font-mono text-[10px] text-muted-foreground/50">{key}</span>
                    <span className="text-foreground font-semibold">{label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── AI Summary (prominent glass card with accent border) ── */}
          {consultation.ai_summary && (
            <div
              className={`
                rounded-xl p-5
                animate-slide-up ${nextStagger()}
              `}
              style={{
                background: 'linear-gradient(135deg, rgba(46, 174, 123, 0.06) 0%, rgba(16, 31, 56, 0.6) 100%)',
                border: '1px solid rgba(46, 174, 123, 0.2)',
                borderLeft: '3px solid rgba(46, 174, 123, 0.5)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 0 40px rgba(46, 174, 123, 0.02)',
              }}
            >
              <h3 className="text-xs font-bold text-accent mb-3 flex items-center gap-2 tracking-wide uppercase">
                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <CheckCircle2 size={13} className="text-accent" />
                </div>
                Resumen Ejecutivo
              </h3>
              <p className="text-sm text-foreground leading-relaxed ml-[38px]">{consultation.ai_summary}</p>
            </div>
          )}

          {/* ── SOAP Note ─────────────────────────────────────── */}
          {soap && (
            <div className="space-y-3">
              <h3 className={`text-xs font-bold text-foreground flex items-center gap-2 tracking-wide uppercase animate-slide-up ${nextStagger()}`}>
                <div className="w-7 h-7 rounded-lg bg-info/10 border border-info/20 flex items-center justify-center">
                  <ClipboardList size={13} className="text-info" />
                </div>
                Nota SOAP
              </h3>

              <SOAPSection
                label="S -- Subjetivo"
                icon={User}
                content={soap.subjective}
                color="text-info"
                borderColor="#5BA4C9"
                stagger={nextStagger()}
              />
              <SOAPSection
                label="O -- Objetivo"
                icon={Activity}
                content={soap.objective}
                color="text-accent"
                borderColor="#2EAE7B"
                stagger={nextStagger()}
              />
              <SOAPSection
                label="A -- Evaluacion"
                icon={Target}
                content={soap.assessment}
                color="text-warning"
                borderColor="#D4A03A"
                stagger={nextStagger()}
              />
              <SOAPSection
                label="P -- Plan"
                icon={ClipboardList}
                content={soap.plan}
                color="text-accent"
                borderColor="#2EAE7B"
                stagger={nextStagger()}
              />

              {/* ── Diagnoses (danger-styled prominent card) ──── */}
              {soap.diagnoses && soap.diagnoses.length > 0 && (
                <div
                  className={`
                    card-status-danger rounded-xl p-4
                    animate-slide-up ${nextStagger()}
                  `}
                  style={{
                    background: 'linear-gradient(135deg, rgba(212, 83, 106, 0.08) 0%, rgba(16, 31, 56, 0.6) 100%)',
                    border: '1px solid rgba(212, 83, 106, 0.25)',
                    borderLeft: '3px solid rgba(212, 83, 106, 0.6)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center">
                      <AlertTriangle size={13} className="text-danger" />
                    </div>
                    <span className="text-xs font-bold text-danger tracking-wide uppercase">Diagnosticos</span>
                  </div>
                  <div className="ml-[38px] space-y-1.5">
                    {soap.diagnoses.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                        <span className="w-5 h-5 rounded-md bg-danger/10 flex items-center justify-center text-[9px] font-bold text-danger font-mono shrink-0">{i + 1}</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Follow-up (accent card with calendar styling) ── */}
              {soap.follow_up && (
                <div
                  className={`
                    rounded-xl p-4
                    animate-slide-up ${nextStagger()}
                  `}
                  style={{
                    background: 'linear-gradient(135deg, rgba(46, 174, 123, 0.06) 0%, rgba(16, 31, 56, 0.5) 100%)',
                    border: '1px solid rgba(46, 174, 123, 0.2)',
                    borderLeft: '3px solid rgba(46, 174, 123, 0.4)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Calendar size={13} className="text-accent" />
                    </div>
                    <span className="text-xs font-bold text-accent tracking-wide uppercase">Seguimiento</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed ml-[38px]">{soap.follow_up}</p>
                </div>
              )}

              {/* ── Key Findings (glass card, info accent, numbered) ── */}
              {soapExt.key_findings && soapExt.key_findings.length > 0 && (
                <div
                  className={`
                    rounded-xl p-4
                    animate-slide-up ${nextStagger()}
                  `}
                  style={{
                    background: 'linear-gradient(135deg, rgba(91, 164, 201, 0.06) 0%, rgba(16, 31, 56, 0.5) 100%)',
                    border: '1px solid rgba(91, 164, 201, 0.2)',
                    borderLeft: '3px solid rgba(91, 164, 201, 0.4)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-info/10 border border-info/20 flex items-center justify-center">
                      <Lightbulb size={13} className="text-info" />
                    </div>
                    <span className="text-xs font-bold text-info tracking-wide uppercase">Hallazgos Clave</span>
                  </div>
                  <div className="ml-[38px] space-y-2">
                    {soapExt.key_findings.map((f: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-xs text-foreground rounded-lg px-3 py-2"
                        style={{
                          background: i % 2 === 0 ? 'rgba(91, 164, 201, 0.04)' : 'transparent',
                          border: '1px solid rgba(91, 164, 201, 0.06)',
                        }}
                      >
                        <span className="w-5 h-5 rounded-md bg-info/10 flex items-center justify-center text-[9px] font-bold text-info font-mono shrink-0 mt-px">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Medications (premium table layout) ────────── */}
              {soapExt.medications && soapExt.medications.length > 0 && (
                <div
                  className={`
                    rounded-xl overflow-hidden
                    animate-slide-up ${nextStagger()}
                  `}
                  style={{
                    background: 'linear-gradient(135deg, rgba(46, 174, 123, 0.04) 0%, rgba(16, 31, 56, 0.5) 100%)',
                    border: '1px solid rgba(46, 174, 123, 0.2)',
                    borderLeft: '3px solid rgba(46, 174, 123, 0.4)',
                  }}
                >
                  <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Pill size={13} className="text-accent" />
                    </div>
                    <span className="text-xs font-bold text-accent tracking-wide uppercase">Medicamentos Indicados</span>
                  </div>
                  {/* Table header */}
                  <div
                    className="grid grid-cols-[1fr_auto_1fr] gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 ml-[38px] mr-2"
                    style={{ borderBottom: '1px solid rgba(46, 174, 123, 0.1)' }}
                  >
                    <span>Medicamento</span>
                    <span>Dosis</span>
                    <span>Instrucciones</span>
                  </div>
                  {/* Table rows */}
                  <div className="px-4 pb-4 ml-[38px] mr-2">
                    {soapExt.medications.map((m: { name: string; dose?: string; instructions?: string }, i: number) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_auto_1fr] gap-3 py-2.5 text-xs items-center"
                        style={{
                          background: i % 2 === 0 ? 'rgba(46, 174, 123, 0.03)' : 'transparent',
                          borderBottom: i < soapExt.medications!.length - 1 ? '1px solid rgba(26, 46, 76, 0.3)' : 'none',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          marginTop: '2px',
                        }}
                      >
                        <span className="text-foreground font-semibold">{m.name}</span>
                        <span className="text-accent font-mono text-[11px]">{m.dose || '--'}</span>
                        <span className="text-muted-foreground/80">{m.instructions || '--'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Pending Studies (warning chips) ───────────── */}
              {soapExt.pending_studies && soapExt.pending_studies.length > 0 && (
                <div
                  className={`
                    card-status-warning rounded-xl p-4
                    animate-slide-up ${nextStagger()}
                  `}
                  style={{
                    background: 'linear-gradient(135deg, rgba(212, 160, 58, 0.06) 0%, rgba(16, 31, 56, 0.5) 100%)',
                    border: '1px solid rgba(212, 160, 58, 0.2)',
                    borderLeft: '3px solid rgba(212, 160, 58, 0.4)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                      <FlaskConical size={13} className="text-warning" />
                    </div>
                    <span className="text-xs font-bold text-warning tracking-wide uppercase">Estudios Pendientes</span>
                  </div>
                  <div className="ml-[38px] flex flex-wrap gap-2">
                    {soapExt.pending_studies.map((s: string, i: number) => (
                      <span
                        key={i}
                        className="badge-warning text-[10px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                      >
                        <FlaskConical size={9} />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Audio Player (custom styled container) ─────── */}
          {consultation.audio_url && (
            <div
              className={`
                rounded-xl p-4
                animate-slide-up ${nextStagger()}
              `}
              style={{
                background: 'linear-gradient(135deg, rgba(16, 31, 56, 0.8) 0%, rgba(10, 23, 41, 0.9) 100%)',
                border: '1px solid rgba(26, 46, 76, 0.6)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 tracking-wide uppercase">
                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <Activity size={13} className="text-accent" />
                </div>
                Audio de la Consulta
              </h3>
              <div className="ml-[38px]">
                <audio
                  controls
                  className="w-full rounded-lg"
                  src={consultation.audio_url}
                  style={{ filter: 'saturate(0.8) brightness(0.9)' }}
                >
                  Tu navegador no soporta reproduccion de audio.
                </audio>
              </div>
            </div>
          )}

          {/* ── Clinical Insights (monospace, line numbers) ─── */}
          {consultation.transcript && (
            <div className={`animate-slide-up ${nextStagger()}`}>
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 tracking-wide uppercase">
                <div className="w-7 h-7 rounded-lg bg-[var(--card-elevated)] border border-[var(--border)] flex items-center justify-center">
                  <MessageSquare size={13} className="text-muted-foreground" />
                </div>
                Insights Clinicos
              </h3>
              <div
                className="rounded-xl max-h-80 overflow-y-auto"
                style={{
                  background: 'linear-gradient(135deg, rgba(10, 23, 41, 0.9) 0%, rgba(5, 14, 27, 0.95) 100%)',
                  border: '1px solid rgba(26, 46, 76, 0.5)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="p-4 font-mono text-[11px] leading-[1.8] text-muted-foreground/80">
                  {consultation.transcript.split('\n').map((line, i) => (
                    <div key={i} className="flex hover:bg-white/[0.02] rounded-sm transition-colors">
                      <span
                        className="select-none text-muted-foreground/25 text-right pr-4 shrink-0 tabular-nums"
                        style={{ width: '40px', borderRight: '1px solid rgba(26, 46, 76, 0.3)', marginRight: '12px' }}
                      >
                        {i + 1}
                      </span>
                      <span className="whitespace-pre-wrap">{line || '\u00A0'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
