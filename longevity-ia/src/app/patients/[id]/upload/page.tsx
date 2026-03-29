'use client'

import { useState, useCallback, useEffect, useRef, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { FileUploader } from '@/components/upload/FileUploader'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress-ring'
import { PatientIntakeChat } from '@/components/patients/PatientIntakeChat'
import { toast } from 'sonner'
import {
  Dna, ArrowLeft, Calendar, Cpu,
  CheckCircle2, Upload, FileSearch, Brain, Save, Sparkles, ClipboardList
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import type { Patient } from '@/types'

type AnalysisStep = 'idle' | 'uploading' | 'reading' | 'analyzing' | 'saving' | 'done' | 'error'

const STEPS: { step: AnalysisStep; label: string; sublabel: string; icon: ElementType; color: string; target: number }[] = [
  { step: 'uploading', label: 'Subiendo archivo',     sublabel: 'Guardando en la nube...',         icon: Upload,     color: '#5BA4C9', target: 20 },
  { step: 'reading',   label: 'Extrayendo datos',     sublabel: 'Leyendo biomarcadores...',         icon: FileSearch, color: '#a78bfa', target: 40 },
  { step: 'analyzing', label: 'IA analizando',        sublabel: 'Generando diagnóstico clínico...', icon: Brain,      color: '#2EAE7B', target: 90 },
  { step: 'saving',    label: 'Guardando resultados', sublabel: 'Preparando tu dashboard...',       icon: Save,       color: '#D4A03A', target: 97 },
  { step: 'done',      label: '¡Análisis listo!',     sublabel: 'Redirigiendo al dashboard...',    icon: Sparkles,   color: '#2EAE7B', target: 100 },
]

function getStepInfo(step: AnalysisStep) {
  return STEPS.find(s => s.step === step) ?? STEPS[2]
}

export default function UploadPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [step, setStep] = useState<AnalysisStep>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [section, setSection] = useState<'upload' | 'history'>('upload')
  const analyzeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    supabase.from('patients').select('*').eq('id', params.id).single()
      .then(({ data }) => setPatient(data))
  }, [params.id])

  // Animación lenta durante el análisis de la IA
  useEffect(() => {
    if (step === 'analyzing') {
      analyzeIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 89) {
            clearInterval(analyzeIntervalRef.current!)
            return 89
          }
          // Avanza más rápido al principio, más lento al final
          const increment = prev < 60 ? 0.4 : prev < 80 ? 0.2 : 0.05
          return prev + increment
        })
      }, 800)
    }
    return () => {
      if (analyzeIntervalRef.current) clearInterval(analyzeIntervalRef.current)
    }
  }, [step])

  const goToProgress = useCallback((newStep: AnalysisStep) => {
    setStep(newStep)
    const info = getStepInfo(newStep)
    if (newStep !== 'analyzing') {
      setProgress(info.target)
    }
  }, [])

  const isAnalyzing = ['uploading', 'reading', 'analyzing', 'saving', 'done'].includes(step)

  const handleAnalyze = useCallback(async () => {
    if (files.length === 0) { toast.error('Selecciona al menos un archivo'); return }

    setErrorMsg(null)
    goToProgress('uploading')

    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      formData.append('patientId', params.id)
      formData.append('resultDate', date)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok || !response.body) {
        throw new Error(`Error ${response.status}`)
      }

      // Read the SSE stream — keepalive bytes keep Vercel from 504-ing
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let resultId: string | null = null

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return
        let event: { ok: boolean; step?: string; error?: string; resultId?: string } | null = null
        try { event = JSON.parse(line.slice(6)) } catch { return }
        if (!event) return

        if (!event.ok) throw new Error(event.error || 'Error desconocido')

        if (event.step === 'uploading') goToProgress('uploading')
        else if (event.step === 'reading') goToProgress('reading')
        else if (event.step === 'analyzing') goToProgress('analyzing')
        else if (event.step === 'saving') goToProgress('saving')
        else if (event.step === 'done') {
          resultId = event.resultId ?? null
          setProgress(100)
          setStep('done')
          toast.success('¡Análisis completado!')
          setTimeout(() => {
            router.push(`/patients/${params.id}/dashboard?resultId=${resultId}`)
          }, 1800)
        }
      }

      while (true) {
        const { done, value } = await reader.read()

        if (value) {
          buffer += decoder.decode(value, { stream: !done })
        }

        const lines = buffer.split('\n')
        // If not done, keep the last incomplete line in the buffer
        // If done, process all remaining lines
        buffer = done ? '' : (lines.pop() ?? '')

        for (const line of lines) {
          processLine(line)
        }

        if (done) break
      }

    } catch (err) {
      setStep('error')
      setProgress(0)
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setErrorMsg(msg)
      toast.error(msg)
    }
  }, [files, date, params.id, router, goToProgress])

  const currentStepInfo = step !== 'idle' && step !== 'error' ? getStepInfo(step) : null
  const ringColor = currentStepInfo?.color ?? '#2EAE7B'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/patients" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-accent/20 shadow-lg">
              <Dna size={16} className="text-background" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">
              {patient ? patient.name : 'Longevity IA'}
            </span>
          </div>

          {/* Tabs del header — solo visibles si no está analizando */}
          {!isAnalyzing && (
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => setSection('upload')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-xl transition-all ${
                  section === 'upload'
                    ? 'bg-accent text-background font-medium shadow-accent/20 shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Upload size={13} />
                Subir Estudio
              </button>
              <button
                onClick={() => setSection('history')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-xl transition-all ${
                  section === 'history'
                    ? 'bg-accent text-background font-medium shadow-accent/20 shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <ClipboardList size={13} />
                Historia Clínica
                {patient && !patient.clinical_history && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-warning inline-block" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Vista de análisis en progreso */}
        {isAnalyzing ? (
          <div className="flex flex-col items-center animate-fade-in">

            {/* Círculo de progreso principal */}
            <div className="mb-8">
              <ProgressRing
                progress={progress}
                size={240}
                strokeWidth={16}
                color={ringColor}
                label={currentStepInfo?.label}
                sublabel={currentStepInfo?.sublabel}
              />
            </div>

            {/* Timeline de pasos */}
            <div className="w-full max-w-md space-y-3">
              {STEPS.slice(0, 4).map((s, i) => {
                const StepIcon = s.icon
                const isDone = STEPS.findIndex(x => x.step === step) > i
                const isActive = s.step === step

                return (
                  <div
                    key={s.step}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${
                      isActive
                        ? 'border-opacity-60 bg-opacity-10'
                        : isDone
                        ? 'border-border bg-muted/20 opacity-70'
                        : 'border-border/30 opacity-30'
                    }`}
                    style={isActive ? { borderColor: `${s.color}60`, background: `${s.color}10` } : {}}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500"
                      style={{
                        background: isActive || isDone ? `${s.color}20` : '#1A2E4C',
                        border: `1px solid ${isActive || isDone ? s.color + '50' : '#1A2E4C'}`,
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2 size={16} style={{ color: s.color }} />
                      ) : (
                        <StepIcon
                          size={16}
                          style={{ color: isActive ? s.color : '#6B6660' }}
                          className={isActive ? 'animate-pulse' : ''}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.label}
                      </p>
                      {isActive && (
                        <p className="text-xs text-muted-foreground mt-0.5 animate-pulse">
                          {s.sublabel}
                        </p>
                      )}
                    </div>

                    {/* Mini barra de progreso por etapa */}
                    {isActive && (
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-full animate-pulse"
                          style={{ width: '60%', background: s.color }}
                        />
                      </div>
                    )}
                    {isDone && (
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                        <div className="h-full rounded-full" style={{ width: '100%', background: s.color }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {step === 'analyzing' && (
              <p className="text-xs text-muted-foreground mt-6 text-center max-w-xs">
                La IA está leyendo todos tus biomarcadores y generando el análisis clínico. Esto puede tardar 2-5 minutos.
              </p>
            )}

            {step === 'done' && (
              <div className="mt-8 flex flex-col items-center gap-2 animate-fade-in">
                <CheckCircle2 size={40} className="text-accent" />
                <p className="text-lg font-semibold text-foreground">¡Análisis completado!</p>
                <p className="text-sm text-muted-foreground">Redirigiendo a tu dashboard...</p>
              </div>
            )}
          </div>

        ) : section === 'upload' ? (
          /* Vista de subida de archivo */
          <div className="space-y-6 animate-fade-in">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Subir Estudio de Laboratorio</h1>
              <p className="text-muted-foreground">
                Sube un PDF o imagen. La IA extraerá todos los biomarcadores y generará tu dashboard médico.
              </p>
            </div>

            <FileUploader
              onFilesChange={setFiles}
              selectedFiles={files}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <Calendar size={14} />
                Fecha del estudio
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors w-48"
              />
            </div>

            {step === 'error' && (
              <div className="p-4 rounded-xl border border-danger/30 bg-danger/5 text-sm text-danger space-y-1">
                <p className="font-medium">Error en el análisis</p>
                <p className="text-xs opacity-80 break-words">{errorMsg ?? 'Verifica tu conexión e intenta nuevamente.'}</p>
              </div>
            )}

            <Button onClick={handleAnalyze} disabled={files.length === 0} size="lg" className="w-full">
              <Cpu size={18} />
              Analizar con IA
            </Button>
          </div>
        ) : (
          /* Vista de historia clínica */
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Historia Clínica</h1>
              <p className="text-muted-foreground">
                Completa tu información de salud para personalizar el análisis con IA.
              </p>
            </div>
            {patient && (
              <PatientIntakeChat
                patientId={params.id}
                patientName={patient.name}
                onComplete={() => {
                  toast.success('Historia clínica guardada')
                  setSection('upload')
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
