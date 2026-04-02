'use client'

import type { Consultation } from '@/types'
import {
  Calendar, Clock, Tag, MessageSquare, FileDown,
  Play, Trash2, ChevronRight, Stethoscope, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ConsultationHistoryProps {
  consultations: Consultation[]
  onSelect: (c: Consultation) => void
  onDelete: (id: string) => void
  onDownloadPDF: (c: Consultation) => void
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
        <p className="text-xs text-muted-foreground/60 mt-1">Las consultas grabadas aparecerán aquí</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {consultations.map((c) => {
        const st = statusConfig(c.status)
        const StatusIcon = st.icon
        const speakerCount = Object.keys(c.speakers || {}).length

        return (
          <div
            key={c.id}
            className="card-medical p-5 hover:border-accent/30 transition-all group cursor-pointer"
            onClick={() => onSelect(c)}
          >
            {/* Header: date + status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar size={12} />
                <span>{formatDate(c.created_at)}</span>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>
                <StatusIcon size={10} />
                {st.label}
              </div>
            </div>

            {/* Summary */}
            {c.ai_summary && (
              <p className="text-sm text-foreground leading-relaxed line-clamp-2 mb-3">
                {c.ai_summary}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatDuration(c.duration_seconds)}
              </span>
              {speakerCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare size={11} />
                  {speakerCount} participante{speakerCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Tags */}
            {c.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {c.tags.slice(0, 4).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground border border-border/30"
                  >
                    <Tag size={8} className="inline mr-0.5 -mt-px" />
                    {tag}
                  </span>
                ))}
                {c.tags.length > 4 && (
                  <span className="text-[9px] text-muted-foreground/50">+{c.tags.length - 4}</span>
                )}
              </div>
            )}

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
