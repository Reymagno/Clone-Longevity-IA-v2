'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ClipboardList, CheckCircle2, RefreshCw, Brain, Sparkles, Mic } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Patient, ClinicalHistory, VoiceNote } from '@/types'
import { PatientIntakeChat } from '@/components/patients/PatientIntakeChat'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'

interface LatestResult {
  id: string
  result_date: string
}

export default function IntakePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [latestResult, setLatestResult] = useState<LatestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [isMedico, setIsMedico] = useState(false)

  function loadData() {
    Promise.all([
      supabase.from('patients').select('*').eq('id', params.id).single(),
      supabase
        .from('lab_results')
        .select('id, result_date')
        .eq('patient_id', params.id)
        .order('result_date', { ascending: false })
        .limit(1)
        .single(),
      supabase.auth.getUser(),
    ]).then(([{ data: p }, { data: r }, { data: { user } }]) => {
      setPatient(p)
      setLatestResult(r ?? null)
      setIsMedico(user?.user_metadata?.role === 'medico')
      setLoading(false)
      if (!p?.clinical_history) setShowChat(true)
    })
  }

  useEffect(() => { loadData() }, [params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleComplete() {
    setJustCompleted(true)
    setShowChat(false)
    loadData()
  }

  async function handleReanalyze() {
    if (!latestResult) return
    setReanalyzing(true)
    try {
      const res = await fetch(`/api/results/${latestResult.id}/reanalyze`, {
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
            router.push(`/patients/${params.id}/dashboard?resultId=${latestResult.id}`)
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al re-analizar')
      setReanalyzing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="w-6 h-6 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
    </div>
  )

  if (!patient) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
      Paciente no encontrado.
    </div>
  )

  const hasHistory = !!patient.clinical_history

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/patients" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <ClipboardList size={16} className="text-background" />
            </div>
            <div>
              <span className="font-semibold text-foreground">{patient.name}</span>
              <span className="text-muted-foreground"> — Historia Clínica</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Estado: historia completada y no en modo edición */}
        {hasHistory && !showChat ? (
          <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {justCompleted ? '¡Historia Clínica guardada!' : 'Historia Clínica Completada'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Guardada el {new Date(patient.clinical_history!.completed_at).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Resumen del historial */}
            <HistorySummary history={patient.clinical_history!} />

            {/* Banner de actualización de análisis */}
            {latestResult && (
              <div className="card-medical p-5 border-accent/30 bg-accent/5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <Brain size={16} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground mb-0.5">
                      {justCompleted ? 'Actualiza tu análisis con esta información' : 'Tu historia clínica enriquece el análisis'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      La IA puede re-analizar tus biomarcadores incorporando tu estilo de vida, historial familiar y medicamentos actuales para personalizar el protocolo.
                    </p>
                    <button
                      onClick={handleReanalyze}
                      disabled={reanalyzing}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {reanalyzing ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                          Re-analizando con IA… (2-5 min)
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Actualizar Análisis con Historia Clínica
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Botón actualizar historial */}
            <button
              onClick={() => { setShowChat(true); setJustCompleted(false) }}
              className="flex items-center gap-2 text-sm text-muted-foreground border border-border px-4 py-2 rounded-lg hover:text-foreground hover:border-accent/50 transition-colors"
            >
              {isMedico ? <Mic size={14} /> : <RefreshCw size={14} />}
              {isMedico ? 'Agregar nota de voz' : 'Actualizar historial clínico'}
            </button>
          </div>

        ) : isMedico ? (
          /* Médico → grabación de voz */
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Historia Clínica por Voz</h1>
              <p className="text-sm text-muted-foreground">
                Describe padecimientos, recomendaciones y aspectos importantes de {patient.name}. La IA analizará y utilizará esta información en el análisis del paciente.
              </p>
            </div>

            <IntakeMedicoVoicePanel
              patientId={params.id}
              patientName={patient.name}
              onNoteSaved={() => { setJustCompleted(true); setShowChat(false); loadData() }}
            />
          </div>
        ) : (
          /* Paciente → chat de intake */
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Historia Clínica</h1>
              <p className="text-sm text-muted-foreground">
                Un asistente conversacional recopilará tu información de salud en aproximadamente 5 minutos.
                {latestResult && ' Puedes completarla y después actualizar tu análisis.'}
              </p>
            </div>

            <PatientIntakeChat
              patientId={params.id}
              patientName={patient.name}
              onComplete={handleComplete}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel de voz para médicos ────────────────────────────────────────────────

function IntakeMedicoVoicePanel({
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
  const audioBlobRef = useRef<{ blob: Blob; duration: number } | null>(null)

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

      // Adjuntar audio si existe
      if (audioBlobRef.current) {
        formData.append('audio', audioBlobRef.current.blob, 'voice-note.webm')
        formData.append('duration', String(audioBlobRef.current.duration))
        audioBlobRef.current = null
      }

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

  function handleAudioBlob(blob: Blob, duration: number) {
    audioBlobRef.current = { blob, duration }
  }

  const finalText = transcript || manualText

  return (
    <div className="space-y-6">
      {/* Esfera protagonista */}
      <div className="card-medical py-10 px-5">
        <VoiceRecorder
          onTranscript={handleVoiceTranscript}
          onAudioBlob={handleAudioBlob}
          placeholder={`Toca la esfera y describe los padecimientos, recomendaciones y aspectos importantes de ${patientName}`}
          disabled={saving}
        />
      </div>

      {/* Textarea para editar o escribir */}
      <div className="card-medical p-5 space-y-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {transcript ? 'Transcripción (puedes editar antes de guardar)' : 'O si prefiere, escriba la nota manualmente'}
        </label>
        <textarea
          value={transcript || manualText}
          onChange={e => {
            if (transcript) setTranscript(e.target.value)
            else setManualText(e.target.value)
          }}
          rows={4}
          placeholder="Paciente presenta dolor lumbar crónico de 6 meses de evolución, refractario a AINES. Se recomienda iniciar protocolo de BPC-157 y fisioterapia..."
          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent resize-y transition-colors"
        />

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

      {/* Notas recientes */}
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

// ─── Resumen visual del historial ─────────────────────────────────────────────

function HistorySummary({ history }: { history: ClinicalHistory }) {
  // Acceso seguro a la estructura nueva y a campos legacy
  const h = history as unknown as Record<string, unknown>
  const anthro = h['anthropometric'] as Record<string, unknown> | undefined
  const allergies = h['allergies'] as Record<string, unknown> | undefined
  const diet = h['diet'] as Record<string, unknown> | undefined
  const pa = h['physical_activity'] as Record<string, unknown> | undefined
  const sleep = h['sleep'] as Record<string, unknown> | undefined
  const mh = h['mental_health'] as Record<string, unknown> | undefined
  const cv = h['cardiovascular'] as Record<string, unknown> | undefined
  const medHist = h['medical_history'] as Record<string, unknown> | undefined
  const fam = h['family_history'] as Record<string, unknown> | undefined

  // Legacy
  const lifestyle = h['lifestyle'] as Record<string, unknown> | undefined
  const recentIllness = h['recent_illness'] as Record<string, unknown> | undefined

  const sections = [
    {
      title: 'Datos Generales',
      items: [
        anthro?.['waist_cm'] != null && `Cintura: ${anthro['waist_cm']} cm`,
        anthro?.['blood_pressure'] && `Presión arterial: ${anthro['blood_pressure']} mmHg`,
        anthro?.['energy_level'] && `Energía: ${(anthro['energy_level'] as string).split(' — ')[0]}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Alergias',
      items: [
        allergies?.['food'] && `Alimentaria: ${allergies['food']}`,
        allergies?.['medication'] && `⚠ Medicamento: ${allergies['medication']}`,
        allergies?.['environmental'] && allergies['environmental'] !== 'No tengo' && `Ambiental: ${allergies['environmental']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Alimentación',
      items: [
        diet?.['type'] && `Tipo: ${diet['type']}`,
        diet?.['meals_per_day'] && `Comidas: ${diet['meals_per_day']}`,
        diet?.['water_intake'] && `Agua: ${diet['water_intake']}`,
        diet?.['processed_food'] && `Procesados: ${diet['processed_food']}`,
        diet?.['alcohol'] && `Alcohol: ${diet['alcohol']}`,
        diet?.['supplements'] && `Suplementos: ${diet['supplements']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Actividad Física y Sueño',
      items: [
        (pa?.['type'] || lifestyle?.['exercise']) && `Ejercicio: ${pa?.['type'] || lifestyle?.['exercise']}`,
        pa?.['frequency'] && `Frecuencia: ${pa['frequency']}`,
        pa?.['sedentary_hours'] && `Horas sedentario: ${pa['sedentary_hours']}`,
        (sleep?.['hours'] || lifestyle?.['sleep_hours']) && `Sueño: ${sleep?.['hours'] || lifestyle?.['sleep_hours']}`,
        sleep?.['quality'] && `Calidad de sueño: ${(sleep['quality'] as string).split(' — ')[0]}`,
        sleep?.['snoring'] && sleep['snoring'] !== 'No / No sé' && `Ronquido: ${sleep['snoring']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Salud Mental',
      items: [
        (mh?.['stress_level'] || lifestyle?.['stress_level']) && `Estrés: ${String(mh?.['stress_level'] ?? lifestyle?.['stress_level'] ?? '').split(' — ')[0]}`,
        mh?.['mood'] && `Ánimo: ${mh['mood']}`,
        mh?.['anxiety'] && `Ansiedad: ${(mh['anxiety'] as string).split(',')[0]}`,
        mh?.['cognitive'] && `Cognición: ${(mh['cognitive'] as string).split(' — ')[0]}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Salud Cardiovascular',
      items: [
        cv?.['chest_pain'] && cv['chest_pain'] !== 'Nunca' && `Dolor pecho: ${cv['chest_pain']}`,
        cv?.['shortness_of_breath'] && cv['shortness_of_breath'] !== 'No' && `Disnea: ${cv['shortness_of_breath']}`,
        cv?.['palpitations'] && cv['palpitations'] !== 'Nunca' && `Palpitaciones: ${cv['palpitations']}`,
        cv?.['thyroid_symptoms'] && `Tiroides: ${(cv['thyroid_symptoms'] as string).split(',')[0].substring(0, 40)}…`,
        cv?.['hormonal_symptoms'] && `Hormonal: ${cv['hormonal_symptoms']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Historial Médico',
      items: [
        (() => {
          const conds = medHist?.['chronic_conditions'] as string[] | undefined
          return conds && conds.length > 0 ? `Condiciones: ${conds.join(', ')}` : null
        })(),
        medHist?.['surgeries'] && `Cirugías: ${medHist['surgeries']}`,
        (medHist?.['smoker'] || lifestyle?.['smoker']) && `Tabaco: ${medHist?.['smoker'] || lifestyle?.['smoker']}`,
        medHist?.['current_medications'] && `Medicamentos: ${medHist['current_medications']}`,
        medHist?.['recent_condition'] && `Condición reciente: ${medHist['recent_condition']}`,
        (!medHist?.['recent_condition'] && recentIllness?.['condition']) && `Condición reciente: ${recentIllness['condition']}`,
        (!medHist?.['current_medications'] && recentIllness?.['current_medications']) && `Medicamentos: ${recentIllness['current_medications']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Historial Familiar',
      items: [
        (() => {
          const conds = fam?.['conditions'] as string[] | undefined
          return conds && conds.length > 0 ? `Condiciones: ${conds.join(', ')}` : null
        })(),
        fam?.['longevity'] && `Longevidad familiar: ${fam['longevity']}`,
        fam?.['details'] && `Detalles: ${fam['details']}`,
        (() => {
          const legacyConds = (h['family_history'] as Record<string, unknown> | undefined)?.['conditions'] as string[] | undefined
          if (!fam && legacyConds && legacyConds.length > 0) return `Condiciones: ${legacyConds.join(', ')}`
          return null
        })(),
      ].filter(Boolean) as string[],
    },
  ].filter(s => s.items.length > 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sections.map(s => (
        <div key={s.title} className="card-medical p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {s.title}
          </p>
          <ul className="space-y-1">
            {s.items.map((item, i) => (
              <li key={i} className="text-sm text-foreground">{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
