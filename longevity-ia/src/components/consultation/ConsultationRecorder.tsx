'use client'

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import { Mic, Loader2 } from 'lucide-react'
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

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Presiona la estrella para iniciar la consulta',
  recording: 'Grabando consulta...',
  transcribing: 'Transcribiendo audio...',
  analyzing: 'Generando nota SOAP...',
  done: 'Consulta guardada',
  error: 'Error en el proceso',
}

export function ConsultationRecorder({ patientId, onSaved, disabled }: ConsultationRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  // Cleanup on unmount
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

  function handleStarClick() {
    if (disabled || phase === 'transcribing' || phase === 'analyzing' || phase === 'done') return
    if (phase === 'recording') {
      stopAndProcess()
    } else {
      startRecording()
    }
  }

  const isRecording = phase === 'recording'
  const isProcessing = phase === 'transcribing' || phase === 'analyzing'
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 3D Star */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center" style={{ width: 280, height: 280 }}>
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center animate-pulse">
              <Mic size={28} className="text-accent/40" />
            </div>
          </div>
        }
      >
        <StarScene
          phase={phase}
          onClick={handleStarClick}
          disabled={disabled || isProcessing || phase === 'done'}
        />
      </Suspense>

      {/* Timer */}
      {isRecording && (
        <div className="font-mono text-3xl font-bold text-foreground tabular-nums tracking-wider">
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-info">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-medium">{PHASE_LABELS[phase]}</span>
        </div>
      )}

      {/* Phase label */}
      {!isProcessing && (
        <p className={`text-sm text-center ${phase === 'error' ? 'text-danger' : phase === 'done' ? 'text-accent font-medium' : 'text-muted-foreground'}`}>
          {errorMsg || PHASE_LABELS[phase]}
        </p>
      )}

      {/* Hints */}
      {phase === 'idle' && (
        <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
          El audio sera transcrito y analizado automaticamente al finalizar
        </p>
      )}
      {isRecording && (
        <p className="text-xs text-danger/70 text-center animate-pulse">
          Toca la estrella para detener y procesar
        </p>
      )}

      {/* Error retry */}
      {phase === 'error' && (
        <Button variant="outline" size="sm" onClick={() => { setPhase('idle'); setErrorMsg('') }}>
          Intentar de nuevo
        </Button>
      )}
    </div>
  )
}
