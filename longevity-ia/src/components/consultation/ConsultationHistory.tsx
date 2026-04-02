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
    case 'completed': return { label: 'Completada', color: 'text-accent', bg: 'bg-accent/10 border-accent/20', icon: CheckCircle2 }
    case 'recording': return { label: 'Grabando', color: 'text-danger', bg: 'bg-danger/10 border-danger/20', icon: AlertTriangle }
    case 'transcribing': return { label: 'Transcribiendo', color: 'text-info', bg: 'bg-info/10 border-info/20', icon: Clock }
    case 'analyzing': return { label: 'Analizando', color: 'text-info', bg: 'bg-info/10 border-info/20', icon: Clock }
    case 'error': return { label: 'Error', color: 'text-danger', bg: 'bg-danger/10 border-danger/20', icon: AlertTriangle }
    default: return { label: status, color: 'text-muted-foreground', bg: 'bg-muted/10', icon: Clock }
  }
}

export function ConsultationHistory({ consultations, onSelect, onDelete, onDownloadPDF }: ConsultationHistoryProps) {
  if (consultations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Stethoscope size={32} className="text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground">Sin consultas registradas</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Las consultas grabadas apareceran aqui</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {consultations.map((c) => {
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
            className={`card-medical p-5 hover:border-accent/30 transition-all group cursor-pointer ${hasAlerts ? 'border-danger/20' : ''}`}
            onClick={() => onSelect(c)}
          >
            {/* Header: date + status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar size={12} />
                <span>{formatDate(c.created_at)}</span>
                <span className="text-muted-foreground/40">·</span>
                <Clock size={11} />
                <span>{formatDuration(c.duration_seconds)}</span>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>
                <StatusIcon size={10} />
                {st.label}
              </div>
            </div>

            {/* Alerts — top priority, shown first if they exist */}
            {hasAlerts && (
              <div className="mb-3 rounded-lg bg-danger/5 border border-danger/20 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldAlert size={11} className="text-danger" />
                  <span className="text-[10px] font-semibold text-danger">Alertas</span>
                </div>
                {soap.alerts!.slice(0, 2).map((a, i) => (
                  <p key={i} className="text-[11px] text-danger/80 leading-snug">• {a}</p>
                ))}
                {soap.alerts!.length > 2 && (
                  <p className="text-[10px] text-danger/50 mt-0.5">+{soap.alerts!.length - 2} mas</p>
                )}
              </div>
            )}

            {/* Summary */}
            {c.ai_summary && (
              <p className="text-sm text-foreground leading-relaxed line-clamp-2 mb-3">
                {c.ai_summary}
              </p>
            )}

            {/* Key Findings */}
            {hasFindings && (
              <div className="mb-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Lightbulb size={11} className="text-info" />
                  <span className="text-[10px] font-semibold text-info">Hallazgos</span>
                </div>
                {soap.key_findings!.slice(0, 2).map((f, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground leading-snug pl-4">• {f}</p>
                ))}
                {soap.key_findings!.length > 2 && (
                  <p className="text-[10px] text-muted-foreground/50 pl-4">+{soap.key_findings!.length - 2} mas</p>
                )}
              </div>
            )}

            {/* Medications + Studies — compact row */}
            {(hasMeds || hasStudies) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {hasMeds && (
                  <div className="flex-1 min-w-[120px] rounded-lg bg-accent/5 border border-accent/15 px-2.5 py-1.5">
                    <div className="flex items-center gap-1 mb-1">
                      <Pill size={10} className="text-accent" />
                      <span className="text-[9px] font-semibold text-accent">{soap.medications!.length} Medicamento{soap.medications!.length > 1 ? 's' : ''}</span>
                    </div>
                    {soap.medications!.slice(0, 2).map((m, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground leading-snug truncate">
                        {m.name}{m.dose ? ` — ${m.dose}` : ''}
                      </p>
                    ))}
                    {soap.medications!.length > 2 && (
                      <p className="text-[9px] text-muted-foreground/50">+{soap.medications!.length - 2} mas</p>
                    )}
                  </div>
                )}
                {hasStudies && (
                  <div className="flex-1 min-w-[120px] rounded-lg bg-warning/5 border border-warning/15 px-2.5 py-1.5">
                    <div className="flex items-center gap-1 mb-1">
                      <FlaskConical size={10} className="text-warning" />
                      <span className="text-[9px] font-semibold text-warning">{soap.pending_studies!.length} Estudio{soap.pending_studies!.length > 1 ? 's' : ''}</span>
                    </div>
                    {soap.pending_studies!.slice(0, 2).map((s, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground leading-snug truncate">{s}</p>
                    ))}
                    {soap.pending_studies!.length > 2 && (
                      <p className="text-[9px] text-muted-foreground/50">+{soap.pending_studies!.length - 2} mas</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Info chips: speakers + tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {speakerCount > 0 && (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted/20 text-muted-foreground border border-border/20">
                  <MessageSquare size={8} className="inline mr-0.5 -mt-px" />
                  {speakerCount} participante{speakerCount > 1 ? 's' : ''}
                </span>
              )}
              {c.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground border border-border/30"
                >
                  <Tag size={8} className="inline mr-0.5 -mt-px" />
                  {tag}
                </span>
              ))}
              {c.tags.length > 3 && (
                <span className="text-[9px] text-muted-foreground/50">+{c.tags.length - 3}</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              <div className="flex gap-1">
                {c.audio_url && (
                  <button
                    onClick={(e) => { e.stopPropagation(); window.open(c.audio_url!, '_blank') }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground rounded hover:bg-muted/20 hover:text-foreground transition-colors"
                    title="Reproducir audio"
                  >
                    <Play size={10} />
                    Audio
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDownloadPDF(c) }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground rounded hover:bg-muted/20 hover:text-foreground transition-colors"
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
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground rounded hover:bg-danger/10 hover:text-danger transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-accent transition-colors" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
