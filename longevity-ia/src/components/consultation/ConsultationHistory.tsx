'use client'

import type { Consultation } from '@/types'
import {
  Calendar, Clock, Tag, MessageSquare, FileDown,
  Play, Trash2, ChevronRight, Stethoscope, CheckCircle2, AlertTriangle,
  Lightbulb, Pill, FlaskConical, ShieldAlert,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ConsultationHistoryProps {
  consultations: Consultation[]
  onSelect: (c: Consultation) => void
  onDelete: (id: string) => void
  onDownloadPDF: (c: Consultation) => void
}

// Extended SOAP type for the new fields
interface SoapExt {
  key_findings?: string[]
  medications?: { name: string; dose?: string; instructions?: string }[]
  pending_studies?: string[]
  alerts?: string[]
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function statusConfig(status: Consultation['status']) {
  switch (status) {
    case 'completed': return { label: 'Completada', color: 'text-accent', bg: 'bg-accent/10 border-accent/20', icon: CheckCircle2, badge: 'badge-optimal' }
    case 'recording': return { label: 'Grabando', color: 'text-danger', bg: 'bg-danger/10 border-danger/20', icon: AlertTriangle, badge: 'badge-danger' }
    case 'transcribing': return { label: 'Transcribiendo', color: 'text-info', bg: 'bg-info/10 border-info/20', icon: Clock, badge: 'badge-normal' }
    case 'analyzing': return { label: 'Analizando', color: 'text-info', bg: 'bg-info/10 border-info/20', icon: Clock, badge: 'badge-normal' }
    case 'error': return { label: 'Error', color: 'text-danger', bg: 'bg-danger/10 border-danger/20', icon: AlertTriangle, badge: 'badge-danger' }
    default: return { label: status, color: 'text-muted-foreground', bg: 'bg-muted/10', icon: Clock, badge: 'badge-normal' }
  }
}

/** Map common tag names to badge color classes */
function tagBadgeClass(tag: string): string {
  const t = tag.toLowerCase()
  if (t.includes('urgente') || t.includes('critico') || t.includes('crítico') || t.includes('emergencia')) return 'badge-danger'
  if (t.includes('seguimiento') || t.includes('pendiente') || t.includes('revisar')) return 'badge-warning'
  if (t.includes('completado') || t.includes('estable') || t.includes('optimo') || t.includes('óptimo') || t.includes('normal')) return 'badge-optimal'
  return 'badge-normal'
}

/** Stagger class capped at 12 */
function staggerClass(index: number): string {
  return `stagger-${Math.min(index + 1, 12)}`
}

export function ConsultationHistory({ consultations, onSelect, onDelete, onDownloadPDF }: ConsultationHistoryProps) {
  if (consultations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-accent/5 blur-xl" />
          <Stethoscope size={36} className="text-muted-foreground/20 relative" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Sin consultas registradas</p>
        <p className="text-xs text-muted-foreground/50 mt-1.5">Las consultas grabadas apareceran aqui</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {consultations.map((c, index) => {
        const st = statusConfig(c.status)
        const StatusIcon = st.icon
        const speakerCount = Object.keys(c.speakers || {}).length
        const soap = (c.ai_soap || {}) as SoapExt

        const hasAlerts = soap.alerts && soap.alerts.length > 0
        const hasMeds = soap.medications && soap.medications.length > 0
        const hasFindings = soap.key_findings && soap.key_findings.length > 0
        const hasStudies = soap.pending_studies && soap.pending_studies.length > 0

        return (
          <div
            key={c.id}
            className={`
              card-medical p-0 group cursor-pointer
              animate-slide-up ${staggerClass(index)}
              ${hasAlerts ? 'card-status-danger' : ''}
            `}
            onClick={() => onSelect(c)}
          >
            {/* ── Top gradient accent line ─────────────────────── */}
            <div className={`h-[2px] rounded-t-2xl ${
              hasAlerts
                ? 'bg-gradient-to-r from-transparent via-danger/60 to-transparent'
                : 'bg-gradient-to-r from-transparent via-accent-warm/20 to-transparent'
            }`} />

            <div className="p-5">
              {/* ── Header: date + status badge ──────────────────── */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar size={12} className="opacity-60" />
                  <span className="font-medium">{formatDate(c.created_at)}</span>
                  <span className="text-muted-foreground/30">|</span>
                  <Clock size={11} className="opacity-60" />
                  <span className="font-mono text-[11px]">{formatDuration(c.duration_seconds)}</span>
                </div>
                <div className={`
                  flex items-center gap-1.5 text-[10px] font-semibold
                  px-2.5 py-1 rounded-full
                  ${st.badge}
                `}>
                  <StatusIcon size={10} />
                  {st.label}
                </div>
              </div>

              {/* ── Alerts section ────────────────────────────────── */}
              {hasAlerts && (
                <div className="mb-4 rounded-xl urgency-immediate badge-danger-pulse overflow-hidden">
                  <div className="bg-danger/[0.06] border border-danger/20 rounded-xl px-3.5 py-2.5 backdrop-blur-sm">
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-danger/30 to-transparent mb-2.5 -mx-3.5" />
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative">
                        <ShieldAlert size={13} className="text-danger relative z-10" />
                        <div className="absolute inset-0 bg-danger/20 blur-md rounded-full" />
                      </div>
                      <span className="text-[11px] font-bold text-danger tracking-wide uppercase">Alertas</span>
                    </div>
                    {soap.alerts!.slice(0, 2).map((a, i) => (
                      <p key={i} className="text-[11px] text-danger/80 leading-relaxed pl-5">
                        <span className="text-danger/50 mr-1">&bull;</span>{a}
                      </p>
                    ))}
                    {soap.alerts!.length > 2 && (
                      <p className="text-[10px] text-danger/40 mt-1 pl-5 font-medium">
                        +{soap.alerts!.length - 2} mas
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Summary with accent border ───────────────────── */}
              {c.ai_summary && (
                <div className="mb-4 pl-3.5 border-l-2 border-l-accent/30" style={{
                  borderImage: 'linear-gradient(to bottom, #2EAE7B, rgba(46,174,123,0.15)) 1',
                }}>
                  <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2">
                    {c.ai_summary}
                  </p>
                </div>
              )}

              {/* ── Key Findings — mini glass card ────────────────── */}
              {hasFindings && (
                <div className="mb-3 rounded-xl bg-info/[0.04] border border-info/15 px-3.5 py-2.5 backdrop-blur-sm">
                  <div className="h-[1px] bg-gradient-to-r from-transparent via-info/20 to-transparent mb-2.5 -mx-3.5" />
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative">
                      <Lightbulb size={12} className="text-info relative z-10" />
                      <div className="absolute inset-0 bg-info/15 blur-md rounded-full" />
                    </div>
                    <span className="text-[10px] font-bold text-info tracking-wide uppercase">Hallazgos</span>
                  </div>
                  {soap.key_findings!.slice(0, 2).map((f, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground/80 leading-relaxed pl-5">
                      <span className="text-info/40 mr-1">&bull;</span>{f}
                    </p>
                  ))}
                  {soap.key_findings!.length > 2 && (
                    <p className="text-[10px] text-muted-foreground/40 pl-5 mt-1 font-medium">
                      +{soap.key_findings!.length - 2} mas
                    </p>
                  )}
                </div>
              )}

              {/* ── Medications + Studies — side by side mini cards ── */}
              {(hasMeds || hasStudies) && (
                <div className="flex flex-wrap gap-2.5 mb-3">
                  {/* Medications */}
                  {hasMeds && (
                    <div className="flex-1 min-w-[130px] rounded-xl bg-accent/[0.04] border border-accent/15 px-3 py-2.5 backdrop-blur-sm">
                      <div className="h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent mb-2 -mx-3" />
                      <div className="flex items-center gap-1.5 mb-2">
                        <Pill size={11} className="text-accent" />
                        <span className="text-[10px] font-bold text-accent tracking-wide">
                          {soap.medications!.length} Medicamento{soap.medications!.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {/* Mini table layout */}
                      <div className="space-y-1">
                        {soap.medications!.slice(0, 3).map((m, i) => (
                          <div key={i} className="flex items-baseline justify-between gap-2">
                            <span className="text-[10px] text-foreground/70 truncate flex-1">{m.name}</span>
                            {m.dose && (
                              <span className="text-[9px] font-mono text-accent/60 whitespace-nowrap">{m.dose}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {soap.medications!.length > 3 && (
                        <p className="text-[9px] text-muted-foreground/40 mt-1.5 font-medium">
                          +{soap.medications!.length - 3} mas
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pending Studies */}
                  {hasStudies && (
                    <div className="flex-1 min-w-[130px] rounded-xl bg-warning/[0.04] border border-warning/15 px-3 py-2.5 backdrop-blur-sm">
                      <div className="h-[1px] bg-gradient-to-r from-transparent via-warning/20 to-transparent mb-2 -mx-3" />
                      <div className="flex items-center gap-1.5 mb-2">
                        <FlaskConical size={11} className="text-warning" />
                        <span className="text-[10px] font-bold text-warning tracking-wide">
                          {soap.pending_studies!.length} Estudio{soap.pending_studies!.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {soap.pending_studies!.slice(0, 3).map((s, i) => (
                          <p key={i} className="text-[10px] text-foreground/70 leading-snug truncate">
                            <span className="text-warning/40 mr-1">&bull;</span>{s}
                          </p>
                        ))}
                      </div>
                      {soap.pending_studies!.length > 3 && (
                        <p className="text-[9px] text-muted-foreground/40 mt-1.5 font-medium">
                          +{soap.pending_studies!.length - 3} mas
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tags + participants ───────────────────────────── */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {speakerCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2.5 py-1 rounded-full badge-normal">
                    <MessageSquare size={9} />
                    {speakerCount} participante{speakerCount > 1 ? 's' : ''}
                  </span>
                )}
                {c.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2.5 py-1 rounded-full ${tagBadgeClass(tag)}`}
                  >
                    <Tag size={8} />
                    {tag}
                  </span>
                ))}
                {c.tags.length > 3 && (
                  <span className="text-[9px] text-muted-foreground/40 font-medium ml-0.5">
                    +{c.tags.length - 3}
                  </span>
                )}
              </div>

              {/* ── Divider ──────────────────────────────────────── */}
              <div className="divider-glow mb-3" />

              {/* ── Actions ──────────────────────────────────────── */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {c.audio_url && (
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(c.audio_url!, '_blank') }}
                      className="
                        flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium
                        text-muted-foreground rounded-lg
                        border border-transparent
                        hover:bg-accent/10 hover:text-accent hover:border-accent/20
                        hover-glow transition-all duration-200
                      "
                      title="Reproducir audio"
                    >
                      <Play size={10} />
                      Audio
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDownloadPDF(c) }}
                    className="
                      flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium
                      text-muted-foreground rounded-lg
                      border border-transparent
                      hover:bg-info/10 hover:text-info hover:border-info/20
                      hover-glow transition-all duration-200
                    "
                    title="Descargar PDF"
                  >
                    <FileDown size={10} />
                    PDF
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm('¿Eliminar esta consulta?')) onDelete(c.id)
                    }}
                    className="
                      flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium
                      text-muted-foreground rounded-lg
                      border border-transparent
                      hover:bg-danger/10 hover:text-danger hover:border-danger/20
                      transition-all duration-200
                    "
                    title="Eliminar"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground/30 group-hover:text-accent transition-colors duration-300">
                  <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Ver detalle
                  </span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
