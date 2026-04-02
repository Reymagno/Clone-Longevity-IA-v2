'use client'

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import { Mic, Loader2, Square, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Consultation } from '@/types'

const StarScene = lazy(() =>
  import('./StarScene').then(m => ({ default: m.StarScene }))
)

interface ConsultationRecorderProps {
  patientId: string
  onSaved: (consultation: Consultation) => void
  disabled?: boolean
}

type Phase = 'idle' | 'recording' | 'transcribing' | 'analyzing' | 'done' | 'error'

export function ConsultationRecorder({ patientId, onSaved, disabled }: ConsultationRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecRef.current?.state === 'recording') {
        mediaRecRef.current.stop()
        mediaRecRef.current.stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setErrorMsg('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })

      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(1000)
      mediaRecRef.current = recorder
      startTimeRef.current = Date.now()
      setPhase('recording')
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch {
      setErrorMsg('No se pudo acceder al microfono')
      setPhase('error')
    }
  }, [])

  const stopAndProcess = useCallback(async () => {
    const recorder = mediaRecRef.current
    if (!recorder || recorder.state !== 'recording') return

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
      recorder.stop()
    })
    recorder.stream.getTracks().forEach(t => t.stop())

    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

    if (audioBlob.size < 1000) {
      setErrorMsg('La grabacion es muy corta. Intenta de nuevo.')
      setPhase('error')
      return
    }

    setPhase('transcribing')
    try {
      const transcribeForm = new FormData()
      transcribeForm.append('audio', audioBlob, 'consultation.webm')
      transcribeForm.append('language', 'es')

      const transcribeRes = await fetch('/api/consultations/transcribe', {
        method: 'POST',
        body: transcribeForm,
      })
      if (!transcribeRes.ok) {
        const err = await transcribeRes.json()
        throw new Error(err.error || 'Error de transcripcion')
      }
      const { transcript } = await transcribeRes.json()

      if (!transcript || transcript.trim().length < 10) {
        setErrorMsg('No se detecto audio suficiente. Verifica el microfono.')
        setPhase('error')
        return
      }

      setPhase('analyzing')
      const saveForm = new FormData()
      saveForm.append('patientId', patientId)
      saveForm.append('transcript', transcript)
      saveForm.append('audio', audioBlob, 'consultation.webm')
      saveForm.append('duration', String(duration))

      const saveRes = await fetch('/api/consultations', {
        method: 'POST',
        body: saveForm,
      })
      if (!saveRes.ok) {
        const err = await saveRes.json()
        throw new Error(err.error || 'Error al guardar')
      }
      const { consultation } = await saveRes.json()

      setPhase('done')
      onSaved(consultation)
      setTimeout(() => setPhase('idle'), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
      setPhase('error')
    }
  }, [patientId, onSaved])

  const isRecording = phase === 'recording'
  const isProcessing = phase === 'transcribing' || phase === 'analyzing'
  const showScene = phase !== 'idle' && phase !== 'error'
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  // ── IDLE: Big start button ──────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <button
          onClick={startRecording}
          disabled={disabled}
          className="
            group relative w-44 h-44 rounded-full
            bg-gradient-to-br from-accent/20 via-accent/10 to-transparent
            border-2 border-accent/30
            flex flex-col items-center justify-center gap-3
            transition-all duration-300
            hover:border-accent/50 hover:from-accent/25 hover:via-accent/15
            hover:shadow-[0_0_40px_rgba(46,174,123,0.15)]
            hover:scale-[1.03]
            active:scale-[0.98]
            disabled:opacity-40 disabled:cursor-not-allowed
            cursor-pointer
          "
        >
          {/* Pulsing ring behind */}
          <div className="absolute inset-0 rounded-full border border-accent/10 animate-pulse-glow" />

          <Mic size={36} className="text-accent group-hover:text-accent transition-colors" />
          <span className="text-sm font-bold text-accent tracking-wide">Iniciar Consulta</span>
        </button>

        <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
          El audio sera transcrito y analizado automaticamente al finalizar
        </p>
      </div>
    )
  }

  // ── ERROR: Message + retry ──────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-28 h-28 rounded-full bg-danger/10 border border-danger/25 flex items-center justify-center">
          <Mic size={32} className="text-danger/60" />
        </div>
        <p className="text-sm text-danger text-center max-w-xs">{errorMsg || 'Error en el proceso'}</p>
        <Button variant="outline" size="sm" onClick={() => { setPhase('idle'); setErrorMsg('') }}>
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  // ── RECORDING / PROCESSING / DONE: 3D Scene ────────────────
  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      {/* 3D Voice Recorder Scene */}
      {showScene && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center" style={{ width: 420, height: 420 }}>
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center animate-pulse">
                <Mic size={28} className="text-accent/40" />
              </div>
            </div>
          }
        >
          <StarScene
            phase={phase}
            onClick={isRecording ? stopAndProcess : () => {}}
            disabled={!isRecording}
          />
        </Suspense>
      )}

      {/* Timer */}
      {isRecording && (
        <div className="font-mono text-4xl font-bold text-foreground tabular-nums tracking-wider" style={{ textShadow: '0 0 20px rgba(212,83,106,0.4)' }}>
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </div>
      )}

      {/* Stop button while recording */}
      {isRecording && (
        <button
          onClick={stopAndProcess}
          className="
            flex items-center gap-2.5 px-6 py-3
            bg-danger/15 border border-danger/30 rounded-xl
            text-danger text-sm font-semibold
            hover:bg-danger/25 hover:border-danger/50
            transition-all duration-200
            animate-pulse
          "
        >
          <Square size={14} className="fill-current" />
          Detener y procesar
        </button>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-3 text-info bg-info/[0.06] border border-info/15 rounded-xl px-5 py-3 backdrop-blur-sm">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-medium">
            {phase === 'transcribing' ? 'Transcribiendo audio...' : 'Generando nota SOAP...'}
          </span>
        </div>
      )}

      {/* Done indicator */}
      {phase === 'done' && (
        <div className="flex items-center gap-3 text-accent bg-accent/[0.06] border border-accent/15 rounded-xl px-5 py-3 backdrop-blur-sm">
          <CheckCircle2 size={16} />
          <span className="text-sm font-semibold">Consulta guardada</span>
        </div>
      )}
    </div>
  )
}
