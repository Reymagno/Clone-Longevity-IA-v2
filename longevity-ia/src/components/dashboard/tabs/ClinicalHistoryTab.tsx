'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PatientIntakeChat } from '@/components/patients/PatientIntakeChat'
import {
  Activity, AlertTriangle, Apple, Brain, CheckCircle2, ChevronRight, ChevronDown,
  ClipboardList, Dumbbell, FileText, Heart, HeartPulse, Mic, Pill,
  RefreshCw, Sparkles, ArrowLeft, Users, Shield, Zap, Droplets, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'
import type { Patient, LabResult, ClinicalHistory, VoiceNote } from '@/types'

interface Props {
  patient: Patient
  result: LabResult
  viewerRole?: string
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionItem {
  label: string
  value: string
  alert?: boolean
}

interface Section {
  title: string
  icon: React.ElementType
  color: string
  items: SectionItem[]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClinicalHistoryTab({ patient, result, viewerRole = 'paciente' }: Props) {
  const isMedico = viewerRole === 'medico'
  const router = useRouter()
  const [showChat, setShowChat] = useState(!patient.clinical_history)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  function handleComplete() {
    setShowChat(false)
    setJustSaved(true)
    toast.success('Historia clínica guardada')
    router.refresh()
  }

  async function handleReanalyze() {
    setReanalyzing(true)
    try {
      const res = await fetch(`/api/results/${result.id}/reanalyze`, {
        method: 'POST',
        credentials: 'same-origin',
      })

      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`)

      // Read SSE stream — keepalive bytes prevent Vercel 504
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: { ok: boolean; step?: string; error?: string } | null = null
          try { event = JSON.parse(line.slice(6)) } catch { continue }
          if (!event) continue
          if (!event.ok) throw new Error(event.error || 'Error al re-analizar')
          if (event.step === 'done') {
            toast.success('¡Análisis actualizado con tu historia clínica!')
            router.refresh()
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al re-analizar')
    } finally {
      setReanalyzing(false)
    }
  }

  // ── Vista: médico → grabación de voz ────────────────────────────────────────
  if (isMedico && showChat) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          {patient.clinical_history && (
            <button
              onClick={() => setShowChat(false)}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors shrink-0"
              aria-label="Volver al resumen"
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Historia Clínica por Voz
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Describe padecimientos, recomendaciones y aspectos importantes del paciente. La IA analizará y utilizará esta información en el análisis.
            </p>
          </div>
        </div>

        <MedicoVoicePanel
          patientId={patient.id}
          patientName={patient.name}
          onNoteSaved={() => { setJustSaved(true); setShowChat(false) }}
        />
      </div>
    )
  }

  // ── Vista: paciente → chat de intake ──────────────────────────────────────
  if (!isMedico && showChat) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          {patient.clinical_history && (
            <button
              onClick={() => setShowChat(false)}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors shrink-0"
              aria-label="Volver al resumen"
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {patient.clinical_history ? 'Actualizar Historia Clínica' : 'Completar Historia Clínica'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Esta información personaliza y enriquece tu análisis de longevidad.
            </p>
          </div>
        </div>

        <PatientIntakeChat
          patientId={patient.id}
          patientName={patient.name}
          onComplete={handleComplete}
        />
      </div>
    )
  }

  // ── Vista: resumen + re-análisis ───────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: patient.clinical_history ? 'rgba(46,174,123,0.12)' : 'rgba(107,114,128,0.1)',
              border: patient.clinical_history ? '1px solid rgba(46,174,123,0.25)' : '1px solid rgba(107,114,128,0.2)',
            }}
          >
            {patient.clinical_history
              ? <CheckCircle2 size={18} className="text-accent" />
              : <ClipboardList size={18} className="text-muted-foreground" />
            }
          </div>

          <div>
            {/* Title + badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground leading-tight">
                {justSaved
                  ? '¡Historia Clínica guardada!'
                  : patient.clinical_history
                  ? 'Historia Clínica Completada'
                  : 'Sin historia clínica'}
              </p>
              {patient.clinical_history && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                  <CheckCircle2 size={10} />
                  Completa
                </span>
              )}
            </div>

            {/* Date */}
            {patient.clinical_history && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Actualizada el{' '}
                {new Date(patient.clinical_history.completed_at).toLocaleDateString('es-MX', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Update button */}
        <button
          onClick={() => { setShowChat(true); setJustSaved(false) }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground border border-border px-4 py-2 rounded-lg hover:text-foreground hover:border-accent/40 hover:bg-accent/5 transition-all shrink-0"
        >
          {isMedico ? <Mic size={14} /> : <RefreshCw size={14} />}
          {isMedico
            ? 'Agregar nota de voz'
            : patient.clinical_history ? 'Actualizar historial' : 'Completar historial'}
        </button>
      </div>

      {/* ── Content: history exists ── */}
      {patient.clinical_history ? (
        <>
          {/* Summary cards grid */}
          <HistorySummary history={patient.clinical_history} />

          {/* Voice Notes Section — solo médicos */}
          {isMedico && <VoiceNotesSection patientId={patient.id} />}

          {/* Re-analyze CTA card */}
          <div
            className="card-medical p-5 border border-accent/30"
            style={{ background: 'linear-gradient(to right, rgba(46,174,123,0.08), rgba(46,174,123,0.03))' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Left: icon + copy */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(46,174,123,0.12)', border: '1px solid rgba(46,174,123,0.25)' }}
                >
                  <Brain size={17} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm mb-0.5">
                    {justSaved
                      ? 'Actualiza tu análisis con esta nueva información'
                      : 'Personaliza tu análisis con la historia clínica'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    La IA re-procesa tus biomarcadores incorporando estilo de vida, historial familiar, alergias y medicamentos para un protocolo más preciso.
                  </p>
                </div>
              </div>

              {/* Right: CTA button */}
              <div className="sm:shrink-0">
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-background text-sm font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
                  style={{ boxShadow: reanalyzing ? undefined : '0 0 0 0 transparent' }}
                >
                  {reanalyzing ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                      Re-analizando… (2-5 min)
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Actualizar Análisis con Historia Clínica
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── Empty state ── */
        <div className="card-medical p-12 flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.12)' }}
          >
            <ClipboardList size={40} className="text-muted-foreground" strokeWidth={1.25} />
          </div>

          <h3 className="text-lg font-bold text-foreground mb-2">
            {isMedico ? 'Agregar Historia Clínica por Voz' : 'Completa tu Historia Clínica'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-7">
            {isMedico
              ? 'Dicta padecimientos, recomendaciones y aspectos importantes del paciente. La IA analizará y enriquecerá el análisis.'
              : 'Un asistente conversacional recopilará tu información en ~10 minutos. Esta información personaliza tu protocolo de longevidad.'}
          </p>

          <button
            onClick={() => setShowChat(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-background text-sm font-semibold rounded-xl hover:bg-accent/90 transition-all shadow-sm"
          >
            {isMedico ? <><Mic size={16} /> Grabar nota de voz</> : <>Comenzar Historia Clínica <ChevronRight size={16} /></>}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Medico Voice Panel (pantalla completa de grabación para médicos) ────────

function MedicoVoicePanel({
  patientId,
  patientName,
  onNoteSaved,
}: {
  patientId: string
  patientName: string
  onNoteSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [manualText, setManualText] = useState('')
  const [savedNotes, setSavedNotes] = useState<VoiceNote[]>([])

  // Cargar notas existentes
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/voice-notes?patientId=${patientId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setSavedNotes(data.notes || [])
        }
      } catch { /* silenciar */ }
    }
    load()
    return () => { cancelled = true }
  }, [patientId])

  async function saveNote(text: string) {
    if (!text.trim()) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('patientId', patientId)
      formData.append('transcript', text.trim())

      const res = await fetch('/api/voice-notes', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Error al guardar')

      const data = await res.json()
      setSavedNotes(prev => [data.note, ...prev])
      setTranscript('')
      setManualText('')
      toast.success('Nota guardada y analizada por IA')
      onNoteSaved()
    } catch {
      toast.error('No se pudo guardar la nota')
    }
    setSaving(false)
  }

  function handleVoiceTranscript(text: string) {
    setTranscript(prev => prev ? `${prev} ${text}` : text)
  }

  const finalText = transcript || manualText

  return (
    <div className="space-y-6">
      {/* Instrucciones */}
      <div
        className="card-medical p-5 border border-purple-500/20"
        style={{ background: 'linear-gradient(to right, rgba(139,92,246,0.06), rgba(139,92,246,0.02))' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <Mic size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm mb-1">
              Nota clínica por voz para {patientName}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Describe padecimientos, hallazgos del examen físico, recomendaciones terapéuticas y aspectos importantes.
              La IA extraerá datos clínicos relevantes y los incorporará al análisis del paciente.
            </p>
          </div>
        </div>
      </div>

      {/* Grabador de voz */}
      <div className="card-medical p-5 space-y-4">
        <VoiceRecorder
          onTranscript={handleVoiceTranscript}
          placeholder="Presiona el micrófono y dicta la nota clínica del paciente"
          disabled={saving}
        />

        {/* Transcripción acumulada o texto manual */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {transcript ? 'Transcripción (puedes editar)' : 'O escribe manualmente'}
          </label>
          <textarea
            value={transcript || manualText}
            onChange={e => {
              if (transcript) setTranscript(e.target.value)
              else setManualText(e.target.value)
            }}
            rows={5}
            placeholder="Paciente de 45 años presenta dolor lumbar crónico de 6 meses de evolución, refractario a AINES. Se recomienda iniciar protocolo de BPC-157 y fisioterapia..."
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent resize-y transition-colors"
          />
        </div>

        {/* Botón guardar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveNote(finalText)}
            disabled={!finalText.trim() || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-background text-sm font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                Analizando y guardando…
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Guardar y analizar nota
              </>
            )}
          </button>

          {finalText.trim() && !saving && (
            <button
              onClick={() => { setTranscript(''); setManualText('') }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Notas guardadas recientes */}
      {savedNotes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Notas recientes ({savedNotes.length})
          </p>
          {savedNotes.slice(0, 3).map(note => (
            <div key={note.id} className="card-medical p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mic size={11} />
                <span>
                  {new Date(note.created_at).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                {note.transcript}
              </p>
              {note.ai_summary && (
                <details className="group">
                  <summary className="text-xs text-accent cursor-pointer flex items-center gap-1 hover:underline">
                    <Sparkles size={10} />
                    Ver análisis IA
                  </summary>
                  <div className="mt-2 bg-accent/5 border border-accent/15 rounded-lg px-3 py-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {note.ai_summary}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Voice Notes Section ─────────────────────────────────────────────────────

function VoiceNotesSection({ patientId }: { patientId: string }) {
  const [notes, setNotes] = useState<VoiceNote[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/voice-notes?patientId=${patientId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setNotes(data.notes || [])
        }
      } catch { /* silenciar */ }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [patientId])

  async function handleTranscript(text: string) {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('patientId', patientId)
      formData.append('transcript', text)

      const res = await fetch('/api/voice-notes', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Error al guardar')

      const data = await res.json()
      setNotes(prev => [data.note, ...prev])
      toast.success('Nota de voz guardada y analizada')
    } catch {
      toast.error('No se pudo guardar la nota de voz')
    }
    setSaving(false)
  }

  async function handleAudioBlob(blob: Blob, duration: number) {
    // Audio se guarda junto con la transcripción en el próximo save
    // Para guardar audio separadamente, se necesitaría una cola
    void blob
    void duration
  }

  async function handleDelete(noteId: string) {
    if (!confirm('¿Eliminar esta nota de voz?')) return
    try {
      const res = await fetch(`/api/voice-notes?noteId=${noteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setNotes(prev => prev.filter(n => n.id !== noteId))
      toast.success('Nota eliminada')
    } catch {
      toast.error('No se pudo eliminar la nota')
    }
  }

  return (
    <div className="card-medical overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <Mic size={16} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Notas de Voz</p>
            <p className="text-xs text-muted-foreground">
              {notes.length === 0 ? 'Graba notas clínicas por voz' : `${notes.length} nota${notes.length !== 1 ? 's' : ''} guardada${notes.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4">
          {/* Recorder */}
          <VoiceRecorder
            onTranscript={handleTranscript}
            onAudioBlob={handleAudioBlob}
            placeholder="Presiona el micrófono para dictar una nota clínica. La IA analizará y extraerá datos relevantes."
            disabled={saving}
          />

          {saving && (
            <div className="flex items-center gap-2 text-sm text-accent">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
              Analizando y guardando nota…
            </div>
          )}

          {/* Notes List */}
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin mr-2" />
              Cargando notas…
            </div>
          ) : notes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Historial de notas
              </p>
              {notes.map(note => (
                <div key={note.id} className="border border-border rounded-lg overflow-hidden">
                  {/* Note header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Mic size={12} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {note.duration_seconds && (
                        <span className="text-xs text-muted-foreground/60">
                          ({Math.floor(note.duration_seconds / 60)}:{(note.duration_seconds % 60).toString().padStart(2, '0')})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Eliminar nota"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Transcript */}
                  <div className="px-3 py-2">
                    <p className="text-sm text-foreground leading-relaxed">{note.transcript}</p>
                  </div>

                  {/* AI Analysis (expandable) */}
                  {note.ai_summary && (
                    <div className="border-t border-border/50">
                      <button
                        onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent hover:bg-accent/5 transition-colors"
                      >
                        <Sparkles size={11} />
                        <span>Análisis IA</span>
                        <ChevronDown
                          size={11}
                          className={`ml-auto transition-transform ${expandedNote === note.id ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {expandedNote === note.id && (
                        <div className="px-3 pb-3">
                          <div className="bg-accent/5 border border-accent/15 rounded-lg px-3 py-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                            {note.ai_summary}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ─── History Summary ──────────────────────────────────────────────────────────

function HistorySummary({ history }: { history: ClinicalHistory }) {
  const h = history as unknown as Record<string, unknown>
  const anthro    = h['anthropometric']    as Record<string, unknown> | undefined
  const allergies = h['allergies']         as Record<string, unknown> | undefined
  const diet      = h['diet']              as Record<string, unknown> | undefined
  const pa        = h['physical_activity'] as Record<string, unknown> | undefined
  const sleep     = h['sleep']             as Record<string, unknown> | undefined
  const mh        = h['mental_health']     as Record<string, unknown> | undefined
  const cv        = h['cardiovascular']    as Record<string, unknown> | undefined
  const medHist   = h['medical_history']   as Record<string, unknown> | undefined
  const fam       = h['family_history']    as Record<string, unknown> | undefined
  // Legacy fields
  const lifestyle     = h['lifestyle']      as Record<string, unknown> | undefined
  const recentIllness = h['recent_illness'] as Record<string, unknown> | undefined

  const sections: Section[] = [
    {
      title: 'Datos Generales',
      icon: Activity,
      color: '#2EAE7B',
      items: [
        anthro?.['waist_cm'] != null
          ? { label: 'Cintura', value: `${anthro['waist_cm']} cm` }
          : null,
        anthro?.['blood_pressure']
          ? { label: 'Presión arterial', value: `${anthro['blood_pressure']} mmHg` }
          : null,
        anthro?.['energy_level']
          ? { label: 'Energía', value: (anthro['energy_level'] as string).split(' — ')[0] }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Alergias',
      icon: Shield,
      color: '#f59e0b',
      items: [
        allergies?.['food']
          ? { label: 'Alimentaria', value: String(allergies['food']) }
          : null,
        allergies?.['medication']
          ? { label: 'Medicamento', value: String(allergies['medication']), alert: true }
          : null,
        allergies?.['environmental'] && allergies['environmental'] !== 'No tengo'
          ? { label: 'Ambiental', value: String(allergies['environmental']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Alimentación',
      icon: Apple,
      color: '#22c55e',
      items: [
        diet?.['type']
          ? { label: 'Tipo', value: String(diet['type']) }
          : null,
        diet?.['meals_per_day']
          ? { label: 'Comidas al día', value: String(diet['meals_per_day']) }
          : null,
        diet?.['water_intake']
          ? { label: 'Agua', value: String(diet['water_intake']) }
          : null,
        diet?.['processed_food']
          ? { label: 'Procesados', value: String(diet['processed_food']) }
          : null,
        diet?.['alcohol']
          ? { label: 'Alcohol', value: String(diet['alcohol']) }
          : null,
        diet?.['supplements']
          ? { label: 'Suplementos', value: String(diet['supplements']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Actividad y Sueño',
      icon: Dumbbell,
      color: '#3b82f6',
      items: [
        (pa?.['type'] || lifestyle?.['exercise'])
          ? { label: 'Ejercicio', value: String(pa?.['type'] ?? lifestyle?.['exercise']) }
          : null,
        pa?.['frequency']
          ? { label: 'Frecuencia', value: String(pa['frequency']) }
          : null,
        pa?.['sedentary_hours']
          ? { label: 'Sedentarismo', value: `${pa['sedentary_hours']} al día` }
          : null,
        (sleep?.['hours'] || lifestyle?.['sleep_hours'])
          ? { label: 'Sueño', value: String(sleep?.['hours'] ?? lifestyle?.['sleep_hours']) }
          : null,
        sleep?.['quality']
          ? { label: 'Calidad de sueño', value: (sleep['quality'] as string).split(' — ')[0] }
          : null,
        sleep?.['snoring'] && sleep['snoring'] !== 'No / No sé'
          ? { label: 'Ronquido', value: String(sleep['snoring']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Salud Mental',
      icon: Brain,
      color: '#a78bfa',
      items: [
        (mh?.['stress_level'] || lifestyle?.['stress_level'])
          ? {
              label: 'Estrés',
              value: String(mh?.['stress_level'] ?? lifestyle?.['stress_level'] ?? '').split(' — ')[0],
            }
          : null,
        mh?.['mood']
          ? { label: 'Ánimo', value: String(mh['mood']) }
          : null,
        mh?.['anxiety']
          ? { label: 'Ansiedad', value: (mh['anxiety'] as string).split(',')[0] }
          : null,
        mh?.['cognitive']
          ? { label: 'Cognición', value: (mh['cognitive'] as string).split(' — ')[0] }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Salud Cardiovascular',
      icon: HeartPulse,
      color: '#ef4444',
      items: [
        cv?.['chest_pain'] && cv['chest_pain'] !== 'Nunca'
          ? { label: 'Dolor pecho', value: String(cv['chest_pain']) }
          : null,
        cv?.['shortness_of_breath'] && cv['shortness_of_breath'] !== 'No'
          ? { label: 'Disnea', value: String(cv['shortness_of_breath']) }
          : null,
        cv?.['palpitations'] && cv['palpitations'] !== 'Nunca'
          ? { label: 'Palpitaciones', value: String(cv['palpitations']) }
          : null,
        cv?.['thyroid_symptoms'] && cv['thyroid_symptoms'] !== 'Ninguno de estos'
          ? { label: 'Tiroides', value: (cv['thyroid_symptoms'] as string).substring(0, 45) + '…' }
          : null,
        cv?.['hormonal_symptoms']
          ? { label: 'Síntomas hormonales', value: String(cv['hormonal_symptoms']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Historial Médico',
      icon: Pill,
      color: '#f97316',
      items: [
        (() => {
          const c = medHist?.['chronic_conditions'] as string[] | undefined
          return c && c.length > 0
            ? { label: 'Condiciones crónicas', value: c.join(', '), alert: true }
            : null
        })(),
        medHist?.['surgeries']
          ? { label: 'Cirugías', value: String(medHist['surgeries']) }
          : null,
        (medHist?.['smoker'] || lifestyle?.['smoker'])
          ? { label: 'Tabaco', value: String(medHist?.['smoker'] ?? lifestyle?.['smoker']) }
          : null,
        medHist?.['current_medications']
          ? { label: 'Medicamentos actuales', value: String(medHist['current_medications']), alert: true }
          : null,
        medHist?.['recent_condition']
          ? { label: 'Condición reciente', value: String(medHist['recent_condition']) }
          : null,
        !medHist?.['recent_condition'] && recentIllness?.['condition']
          ? { label: 'Condición reciente', value: String(recentIllness['condition']) }
          : null,
        !medHist?.['current_medications'] && recentIllness?.['current_medications']
          ? { label: 'Medicamentos', value: String(recentIllness['current_medications']), alert: true }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Historial Familiar',
      icon: Users,
      color: '#06b6d4',
      items: [
        (() => {
          const c = fam?.['conditions'] as string[] | undefined
          return c && c.length > 0
            ? { label: 'Condiciones', value: c.join(', ') }
            : null
        })(),
        fam?.['longevity']
          ? { label: 'Longevidad familiar', value: String(fam['longevity']) }
          : null,
        fam?.['details']
          ? { label: 'Detalles', value: String(fam['details']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
  ].filter(s => s.items.length > 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sections.map(section => {
        const Icon = section.icon
        return (
          <div key={section.title} className="card-medical overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/50">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${section.color}18`,
                  border: `1px solid ${section.color}30`,
                }}
              >
                <Icon size={15} style={{ color: section.color }} />
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {section.title}
              </p>
            </div>

            {/* Card body */}
            <div className="px-4 py-3 space-y-2">
              {section.items.map((item, i) =>
                item.alert ? (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 px-2 py-1.5 rounded border-l-2"
                    style={{
                      borderLeftColor: '#f59e0b',
                      background: 'rgba(245,158,11,0.07)',
                    }}
                  >
                    <span className="text-xs text-muted-foreground uppercase tracking-wide leading-relaxed pt-0.5 shrink-0">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-foreground text-right leading-relaxed">
                      {item.value}
                    </span>
                  </div>
                ) : (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide leading-relaxed pt-0.5 shrink-0">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-foreground text-right leading-relaxed">
                      {item.value}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
