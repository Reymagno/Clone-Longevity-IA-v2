'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { BarChart2, Stethoscope, Mic, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

interface TimelineEvent {
  id: string
  type: 'lab' | 'consultation' | 'voice_note'
  date: string
  title: string
  detail: string
  score?: number
}

interface Props {
  patientId: string
}

export function PatientTimeline({ patientId }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTimeline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  async function loadTimeline() {
    setLoading(true)
    const [labRes, consultRes, voiceRes] = await Promise.all([
      supabase.from('lab_results').select('id, result_date, ai_analysis, created_at')
        .eq('patient_id', patientId).order('result_date', { ascending: false }).limit(20),
      supabase.from('consultations').select('id, ai_summary, ai_soap, created_at, duration_seconds')
        .eq('patient_id', patientId).order('created_at', { ascending: false }).limit(20),
      supabase.from('voice_notes').select('id, transcript, ai_summary, created_at')
        .eq('patient_id', patientId).order('created_at', { ascending: false }).limit(20),
    ])

    const all: TimelineEvent[] = []

    // Lab results
    ;(labRes.data ?? []).forEach(r => {
      const analysis = r.ai_analysis as Record<string, unknown> | null
      const score = analysis?.overallScore as number | undefined
      all.push({
        id: r.id,
        type: 'lab',
        date: r.result_date ?? r.created_at,
        title: 'Analisis de laboratorio',
        detail: analysis?.clinicalSummary ? String(analysis.clinicalSummary).substring(0, 200) : 'Sin resumen',
        score,
      })
    })

    // Consultations
    ;(consultRes.data ?? []).forEach(c => {
      all.push({
        id: c.id,
        type: 'consultation',
        date: c.created_at,
        title: 'Consulta medica',
        detail: c.ai_summary ? String(c.ai_summary).substring(0, 200) : 'Sin resumen',
      })
    })

    // Voice notes
    ;(voiceRes.data ?? []).forEach(v => {
      all.push({
        id: v.id,
        type: 'voice_note',
        date: v.created_at,
        title: 'Nota de voz',
        detail: v.transcript ? String(v.transcript).substring(0, 200) : '',
      })
    })

    // Sort chronologically (newest first)
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setEvents(all)
    setLoading(false)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Type styling
  const typeConfig = {
    lab: { icon: BarChart2, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20', label: 'Laboratorio' },
    consultation: { icon: Stethoscope, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20', label: 'Consulta' },
    voice_note: { icon: Mic, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', label: 'Nota de voz' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="w-5 h-5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Sin actividad registrada para este paciente
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {events.map(event => {
          const config = typeConfig[event.type]
          const Icon = config.icon
          const isExpanded = expanded.has(event.id)
          const dateStr = new Date(event.date).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
          })

          return (
            <div key={event.id} className="relative pl-14">
              {/* Icon circle on timeline */}
              <div className={`absolute left-3 w-7 h-7 rounded-full ${config.bg} border ${config.border} flex items-center justify-center`}>
                <Icon size={14} className={config.color} />
              </div>

              {/* Event card */}
              <button
                type="button"
                className="card-medical p-4 cursor-pointer hover:border-accent/30 transition-colors w-full text-left"
                onClick={() => toggleExpand(event.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                    {event.score != null && (
                      <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                        Score: {Math.round(event.score)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar size={10} />
                      {dateStr}
                    </span>
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">{event.title}</p>
                {isExpanded && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {event.detail || 'Sin detalles disponibles'}
                  </p>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
