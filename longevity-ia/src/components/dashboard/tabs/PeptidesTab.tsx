'use client'

import { useMemo, useState } from 'react'
import type { Patient, ParsedData, AIAnalysis } from '@/types'
import { computePeptideProtocol, type PeptideRecommendation } from '@/lib/peptide-protocol'
import {
  Dna, ChevronDown, ChevronRight, AlertTriangle, BookOpen,
  Syringe, Clock, Target, ShieldCheck, FlaskConical, FileDown,
} from 'lucide-react'
import { toast } from 'sonner'

interface PeptidesTabProps {
  patient: Patient
  parsedData: ParsedData | null
  analysis: AIAnalysis
}

const URGENCY_CONFIG = {
  high: { label: 'Alta prioridad', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  medium: { label: 'Prioridad media', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  low: { label: 'Preventivo', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
}

export function PeptidesTab({ patient, parsedData, analysis }: PeptidesTabProps) {
  const [expandedPeptide, setExpandedPeptide] = useState<string | null>(null)
  const [showEvidence, setShowEvidence] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadPDF() {
    if (!parsedData) return
    setDownloading(true)
    try {
      const { generatePeptideProtocolPDF } = await import('@/lib/peptide-protocol-pdf')
      await generatePeptideProtocolPDF(patient, parsedData, analysis)
      toast.success('Recomendación de Péptidos PDF generada')
    } catch {
      toast.error('Error al generar el PDF')
    } finally {
      setDownloading(false)
    }
  }

  const protocol = useMemo(() => {
    if (!parsedData) return null
    const bmi = patient.weight && patient.height
      ? patient.weight / Math.pow(patient.height / 100, 2)
      : null
    return computePeptideProtocol(
      parsedData,
      analysis,
      patient.age,
      bmi,
      patient.clinical_history as Record<string, unknown> | null
    )
  }, [parsedData, analysis, patient])

  if (!protocol) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Dna size={32} className="text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Sin datos de biomarcadores para evaluar péptidos</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Download */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Dna size={18} className="text-accent" />
            <h2 className="text-lg font-bold text-foreground">Protocolo de Péptidos Terapéuticos</h2>
          </div>
          <p className="text-xs text-muted-foreground">{protocol.summary}</p>
        </div>
        {protocol.recommendations.length > 0 && (
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors shrink-0 disabled:opacity-50"
          >
            <FileDown size={14} />
            {downloading ? 'Generando...' : 'Descarga Recomendación PDF'}
          </button>
        )}
      </div>

      {/* Warnings */}
      {protocol.warnings.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-1.5">
          <h3 className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            Advertencias
          </h3>
          {protocol.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-red-400/80">{w}</p>
          ))}
        </div>
      )}

      {/* No recommendations */}
      {protocol.recommendations.length === 0 && (
        <div className="bg-card border border-border/30 rounded-xl p-8 text-center">
          <Dna size={28} className="text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium mb-1">Sin indicación de péptidos</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Los biomarcadores actuales no muestran indicaciones claras para péptidos terapéuticos.
            Esto puede cambiar con nuevos análisis o si se actualiza la historia clínica.
          </p>
        </div>
      )}

      {/* Peptide cards */}
      {protocol.recommendations.map((rec) => (
        <PeptideCard
          key={rec.peptide}
          rec={rec}
          isExpanded={expandedPeptide === rec.peptide}
          onToggle={() => setExpandedPeptide(expandedPeptide === rec.peptide ? null : rec.peptide)}
          showEvidence={showEvidence === rec.peptide}
          onToggleEvidence={() => setShowEvidence(showEvidence === rec.peptide ? null : rec.peptide)}
        />
      ))}

      {/* Methodology footer */}
      <div className="mt-4 pt-4 border-t border-border/20">
        <p className="text-[9px] text-muted-foreground/40 leading-relaxed">
          Protocolo de péptidos generado por el motor determinista de Longevity IA v1.0. La selección
          se basa en biomarcadores del paciente, historial clínico, edad e IMC. Cada péptido incluye
          evidencia de instituciones como Harvard/MGH, Cleveland Clinic, University of Zagreb, UCL,
          Eli Lilly y Novo Nordisk. Este protocolo es informativo y requiere validación por un médico
          certificado. Las dosis deben ajustarse según respuesta clínica individual.
        </p>
      </div>
    </div>
  )
}

// ── Peptide Card ───────────────────────────────────────────────

function PeptideCard({ rec, isExpanded, onToggle, showEvidence, onToggleEvidence }: {
  rec: PeptideRecommendation
  isExpanded: boolean
  onToggle: () => void
  showEvidence: boolean
  onToggleEvidence: () => void
}) {
  const urgCfg = URGENCY_CONFIG[rec.urgency]

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isExpanded ? 'border-accent/30 shadow-lg shadow-accent/5' : 'border-border/30'
    }`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/10 transition-colors text-left"
      >
        {/* Relevance score */}
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${urgCfg.bg}`}>
          <span className={`text-lg font-bold ${urgCfg.color}`}>{rec.relevanceScore}</span>
          <span className="text-[7px] text-muted-foreground -mt-0.5">score</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-sm font-bold text-foreground">{rec.peptide}</h3>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ${urgCfg.bg} ${urgCfg.color}`}>
              {urgCfg.label}
            </span>
            {rec.requiresSupervision && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-0.5">
                <ShieldCheck size={8} />
                Supervisión médica
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{rec.fullName}</p>
          <p className="text-[10px] text-accent font-mono mt-0.5">{rec.dose} — {rec.route}</p>
        </div>

        {isExpanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in border-t border-border/20 pt-4">
          {/* Dosificación */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoBox icon={Syringe} label="Vía" value={rec.route} />
            <InfoBox icon={Clock} label="Frecuencia" value={rec.frequency} />
            <InfoBox icon={Target} label="Duración" value={rec.duration} />
            <InfoBox icon={FlaskConical} label="Categoría" value={rec.category} />
          </div>

          {/* Mecanismo */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
            <p className="text-[10px] font-semibold text-accent mb-1">Mecanismo de acción</p>
            <p className="text-[11px] text-foreground/80 leading-relaxed">{rec.mechanism}</p>
          </div>

          {/* Nota personalizada */}
          {rec.patientNote && (
            <div className="p-3 rounded-lg bg-accent/5 border border-accent/15">
              <p className="text-[10px] font-semibold text-accent mb-1">Justificación clínica personalizada</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{rec.patientNote}</p>
            </div>
          )}

          {/* Sistemas objetivo */}
          <div className="flex flex-wrap gap-1.5">
            {rec.targetSystems.map(sys => (
              <span key={sys} className="text-[9px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 capitalize">
                {sys}
              </span>
            ))}
          </div>

          {/* Contraindicaciones */}
          {rec.contraindications.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
              <p className="text-[10px] font-semibold text-red-400 mb-1 flex items-center gap-1">
                <AlertTriangle size={10} />
                Contraindicaciones
              </p>
              <ul className="space-y-0.5">
                {rec.contraindications.map((c, i) => (
                  <li key={i} className="text-[10px] text-red-400/70 flex items-start gap-1">
                    <span className="text-red-400/40 mt-0.5">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidencia científica */}
          <div>
            <button
              onClick={onToggleEvidence}
              className="flex items-center gap-1.5 text-[10px] text-accent/60 hover:text-accent transition-colors"
            >
              <BookOpen size={10} />
              <ChevronDown size={8} className={`transition-transform ${showEvidence ? 'rotate-180' : ''}`} />
              {showEvidence ? 'Ocultar evidencia' : `Ver ${rec.evidence.length} estudios científicos`}
            </button>

            {showEvidence && (
              <div className="mt-2 space-y-1.5 animate-fade-in">
                {rec.evidence.map((ev, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg bg-accent/3 border border-accent/8">
                    <div className="flex items-start gap-1.5">
                      <span className="text-[8px] font-mono text-accent/40 mt-0.5 shrink-0">[{i + 1}]</span>
                      <div>
                        <p className="text-[10px] font-medium text-foreground/80">{ev.title}</p>
                        <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                          {ev.authors} — <span className="italic">{ev.journal}</span>, {ev.year}
                        </p>
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5">{ev.institution}</p>
                        <p className="text-[9px] text-accent/70 mt-1">{ev.finding}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoBox({ icon: Icon, label, value }: { icon: typeof Syringe; label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/20 border border-border/20">
      <div className="flex items-center gap-1 mb-1">
        <Icon size={10} className="text-muted-foreground/50" />
        <span className="text-[9px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-[10px] font-medium text-foreground">{value}</p>
    </div>
  )
}
