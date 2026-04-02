'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Loader2, Square, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Consultation } from '@/types'

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

  const isProcessing = phase === 'transcribing' || phase === 'analyzing'
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

  // ── RECORDING: Same circular button style ───────────────────
  if (phase === 'recording') {
    return (
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <button
          onClick={stopAndProcess}
          className="
            group relative w-44 h-44 rounded-full
            bg-gradient-to-br from-danger/20 via-danger/10 to-transparent
            border-2 border-danger/40
            flex flex-col items-center justify-center gap-3
            transition-all duration-300
            hover:border-danger/60 hover:from-danger/25 hover:via-danger/15
            hover:shadow-[0_0_40px_rgba(220,60,60,0.2)]
            hover:scale-[1.03]
            active:scale-[0.98]
            cursor-pointer
          "
        >
          {/* Pulsing ring – recording */}
          <div className="absolute inset-0 rounded-full border border-danger/20 animate-pulse-glow" />

          <Square size={28} className="text-danger fill-danger/80" />
          <span className="text-sm font-bold text-danger tracking-wide">Detener</span>
        </button>

        {/* Timer */}
        <div className="font-mono text-4xl font-bold text-foreground tabular-nums tracking-wider" style={{ textShadow: '0 0 20px rgba(220,60,60,0.3)' }}>
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </div>

        <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
          Grabando consulta...
        </p>
      </div>
    )
  }

  // ── PROCESSING / DONE ──────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-5 animate-fade-in">
      <div className="relative w-44 h-44 rounded-full
        bg-gradient-to-br from-accent/20 via-accent/10 to-transparent
        border-2 border-accent/30
        flex flex-col items-center justify-center gap-3"
      >
        <div className="absolute inset-0 rounded-full border border-accent/10 animate-pulse-glow" />

        {isProcessing && (
          <>
            <Loader2 size={36} className="text-accent animate-spin" />
            <span className="text-xs font-bold text-accent tracking-wide text-center px-4">
              {phase === 'transcribing' ? 'Transcribiendo...' : 'Generando SOAP...'}
            </span>
          </>
        )}

        {phase === 'done' && (
          <>
            <CheckCircle2 size={36} className="text-accent" />
            <span className="text-sm font-bold text-accent tracking-wide">Guardada</span>
          </>
        )}
      </div>
    </div>
  )
}
