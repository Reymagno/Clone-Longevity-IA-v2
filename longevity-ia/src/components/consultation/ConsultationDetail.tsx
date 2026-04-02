'use client'

import { useState } from 'react'
import type { Patient, Consultation, ConsultationSOAP } from '@/types'
import {
  X, FileDown, Calendar, Clock, Tag, MessageSquare,
  ChevronDown, ChevronUp, Stethoscope, User,
  ClipboardList, Activity, Target, CheckCircle2,
  Pill, FlaskConical, AlertTriangle, Lightbulb,
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

function SOAPSection({ label, icon: Icon, content, color }: {
  label: string; icon: React.ElementType; content: string; color: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className={color} />
          <span className="text-xs font-semibold text-foreground">{label}</span>
        </div>
        {open ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{content || 'Sin datos'}</p>
        </div>
      )}
    </div>
  )
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

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-[8%] sm:right-[8%] max-h-[90vh] bg-card rounded-2xl border border-border/60 shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
              <Stethoscope size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Detalle de Consulta</h2>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Calendar size={9} /> {formatDate(consultation.created_at)}</span>
                <span className="flex items-center gap-1"><Clock size={9} /> {formatDuration(consultation.duration_seconds)}</span>
                {speakerEntries.length > 0 && (
                  <span className="flex items-center gap-1"><MessageSquare size={9} /> {speakerEntries.length} participantes</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} loading={downloading} className="rounded-xl">
              <FileDown size={13} />
              PDF
            </Button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/30 transition-colors">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Tags */}
          {consultation.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {consultation.tags.map((tag, i) => (
                <span key={i} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                  <Tag size={9} className="inline mr-0.5 -mt-px" />{tag}
                </span>
              ))}
            </div>
          )}

          {/* Speakers */}
          {speakerEntries.length > 0 && (
            <div className="flex gap-3">
              {speakerEntries.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-1.5 border border-border/30">
                  <User size={11} />
                  <span className="font-mono text-[10px] text-muted-foreground/60">{key}</span>
                  <span className="text-foreground font-medium">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Summary */}
          {consultation.ai_summary && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <h3 className="text-xs font-semibold text-accent mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Resumen Ejecutivo
              </h3>
              <p className="text-sm text-foreground leading-relaxed">{consultation.ai_summary}</p>
            </div>
          )}

          {/* SOAP Note */}
          {soap && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ClipboardList size={12} className="text-info" />
                Nota SOAP
              </h3>
              <SOAPSection label="S — Subjetivo" icon={User} content={soap.subjective} color="text-info" />
              <SOAPSection label="O — Objetivo" icon={Activity} content={soap.objective} color="text-accent" />
              <SOAPSection label="A — Evaluacion" icon={Target} content={soap.assessment} color="text-warning" />
              <SOAPSection label="P — Plan" icon={ClipboardList} content={soap.plan} color="text-accent" />

              {soap.diagnoses && soap.diagnoses.length > 0 && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 p-3">
                  <p className="text-[10px] font-semibold text-danger mb-1">Diagnosticos</p>
                  <p className="text-xs text-foreground">{soap.diagnoses.join(' | ')}</p>
                </div>
              )}

              {soap.follow_up && (
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <p className="text-[10px] font-semibold text-accent mb-1">Seguimiento</p>
                  <p className="text-xs text-foreground">{soap.follow_up}</p>
                </div>
              )}

              {/* Key Findings */}
              {soapExt.key_findings && soapExt.key_findings.length > 0 && (
                <div className="rounded-lg border border-info/20 bg-info/5 p-3">
                  <p className="text-[10px] font-semibold text-info mb-2 flex items-center gap-1">
                    <Lightbulb size={10} />
                    Hallazgos Clave
                  </p>
                  <ul className="space-y-1">
                    {soapExt.key_findings.map((f: string, i: number) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="text-info mt-0.5">•</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Medications */}
              {soapExt.medications && soapExt.medications.length > 0 && (
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <p className="text-[10px] font-semibold text-accent mb-2 flex items-center gap-1">
                    <Pill size={10} />
                    Medicamentos Indicados
                  </p>
                  <div className="space-y-1.5">
                    {soapExt.medications.map((m: { name: string; dose?: string; instructions?: string }, i: number) => (
                      <div key={i} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="text-accent mt-0.5">•</span>
                        <span>
                          <strong>{m.name}</strong>
                          {m.dose && <span className="text-muted-foreground font-mono ml-1">{m.dose}</span>}
                          {m.instructions && <span className="text-muted-foreground ml-1">— {m.instructions}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Studies */}
              {soapExt.pending_studies && soapExt.pending_studies.length > 0 && (
                <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                  <p className="text-[10px] font-semibold text-warning mb-2 flex items-center gap-1">
                    <FlaskConical size={10} />
                    Estudios Pendientes
                  </p>
                  <ul className="space-y-1">
                    {soapExt.pending_studies.map((s: string, i: number) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="text-warning mt-0.5">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alerts */}
              {soapExt.alerts && soapExt.alerts.length > 0 && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 p-3">
                  <p className="text-[10px] font-semibold text-danger mb-2 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    Alertas Clinicas
                  </p>
                  <ul className="space-y-1">
                    {soapExt.alerts.map((a: string, i: number) => (
                      <li key={i} className="text-xs text-danger/90 flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Audio player */}
          {consultation.audio_url && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">Audio de la consulta</h3>
              <audio controls className="w-full" src={consultation.audio_url}>
                Tu navegador no soporta reproduccion de audio.
              </audio>
            </div>
          )}

          {/* Clinical Insights (condensed, not raw dialogue) */}
          {consultation.transcript && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <MessageSquare size={12} className="text-muted-foreground" />
                Insights Clinicos
              </h3>
              <div className="rounded-xl border border-border/30 bg-muted/10 p-4 max-h-80 overflow-y-auto">
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {consultation.transcript}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
