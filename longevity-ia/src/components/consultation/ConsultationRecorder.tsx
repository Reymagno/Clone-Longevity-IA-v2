'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Consultation } from '@/types'

interface ConsultationRecorderProps {
  patientId: string
  onSaved: (consultation: Consultation) => void
  disabled?: boolean
}

type Phase = 'idle' | 'recording' | 'transcribing' | 'analyzing' | 'done' | 'error'

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Listo para grabar',
  recording: 'Grabando consulta...',
  transcribing: 'Transcribiendo audio...',
  analyzing: 'Generando nota SOAP...',
  done: 'Consulta guardada',
  error: 'Error en el proceso',
}

/* ── Keyframes ────────────────────────────────────────────── */
const KF_ID = 'consultation-recorder-kf'
function injectKF() {
  if (typeof document === 'undefined' || document.getElementById(KF_ID)) return
  const s = document.createElement('style')
  s.id = KF_ID
  s.textContent = `
    @keyframes cr-pulse { 0%,100% { transform:scale(1); opacity:.5; } 50% { transform:scale(1.15); opacity:.9; } }
    @keyframes cr-ring  { 0% { transform:scale(.8); opacity:.6; } 100% { transform:scale(2); opacity:0; } }
    @keyframes cr-spin  { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
  `
  document.head.appendChild(s)
}

export function ConsultationRecorder({ patientId, onSaved, disabled }: ConsultationRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  useEffect(() => { injectKF() }, [])

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

      recorder.start(1000) // chunk every second
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
    // Stop recording
    const recorder = mediaRecRef.current
    if (!recorder || recorder.state !== 'recording') return

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)

    // Wait for final chunks
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

    // Phase 1: Transcribe
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

      // Phase 2: Save + SOAP analysis
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

      // Reset after 3 seconds
      setTimeout(() => setPhase('idle'), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
      setPhase('error')
    }
  }, [patientId, onSaved])

  const isRecording = phase === 'recording'
  const isProcessing = phase === 'transcribing' || phase === 'analyzing'
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  // Sphere colors per phase
  const sphereColor = phase === 'recording' ? 'rgba(212, 83, 106, 0.8)'
    : phase === 'transcribing' ? 'rgba(91, 164, 201, 0.8)'
    : phase === 'analyzing' ? 'rgba(46, 174, 123, 0.8)'
    : phase === 'done' ? 'rgba(46, 174, 123, 0.9)'
    : phase === 'error' ? 'rgba(212, 83, 106, 0.6)'
    : 'rgba(46, 174, 123, 0.5)'

  const sphereGlow = phase === 'recording' ? '0 0 40px rgba(212, 83, 106, 0.3), 0 0 80px rgba(212, 83, 106, 0.1)'
    : isProcessing ? '0 0 40px rgba(91, 164, 201, 0.3), 0 0 80px rgba(91, 164, 201, 0.1)'
    : '0 0 30px rgba(46, 174, 123, 0.2), 0 0 60px rgba(46, 174, 123, 0.08)'

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Sphere */}
      <div className="relative" style={{ width: 200, height: 200 }}>
        {/* Pulse rings when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full" style={{
              border: `2px solid ${sphereColor}`,
              animation: 'cr-ring 2s ease-out infinite',
            }} />
            <div className="absolute inset-0 rounded-full" style={{
              border: `2px solid ${sphereColor}`,
              animation: 'cr-ring 2s ease-out 0.6s infinite',
            }} />
            <div className="absolute inset-0 rounded-full" style={{
              border: `2px solid ${sphereColor}`,
              animation: 'cr-ring 2s ease-out 1.2s infinite',
            }} />
          </>
        )}

        {/* Processing spinner ring */}
        {isProcessing && (
          <div className="absolute inset-[-10px] rounded-full" style={{
            border: '2px solid transparent',
            borderTopColor: sphereColor,
            borderRightColor: sphereColor,
            animation: 'cr-spin 1.2s linear infinite',
          }} />
        )}

        {/* Main sphere */}
        <button
          onClick={isRecording ? stopAndProcess : startRecording}
          disabled={disabled || isProcessing || phase === 'done'}
          className="absolute inset-4 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-500 disabled:cursor-not-allowed"
          style={{
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.1) 0%, ${sphereColor} 60%, rgba(0,0,0,0.3) 100%)`,
            boxShadow: sphereGlow,
            animation: isRecording ? 'cr-pulse 2s ease-in-out infinite' : undefined,
          }}
        >
          {phase === 'idle' && <Mic size={36} className="text-white/90" />}
          {isRecording && <Square size={28} className="text-white" />}
          {isProcessing && <Loader2 size={32} className="text-white animate-spin" />}
          {phase === 'done' && <Send size={28} className="text-white" />}
          {phase === 'error' && <Mic size={32} className="text-white/70" />}
        </button>
      </div>

      {/* Timer */}
      {isRecording && (
        <div className="font-mono text-2xl font-bold text-foreground tabular-nums">
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </div>
      )}

      {/* Phase label */}
      <p className="text-sm text-muted-foreground text-center">
        {errorMsg || PHASE_LABELS[phase]}
      </p>

      {/* Action hint */}
      {phase === 'idle' && (
        <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
          Presiona la esfera para iniciar la grabacion de la consulta medica. Al terminar, el audio sera transcrito y analizado automaticamente.
        </p>
      )}
      {isRecording && (
        <p className="text-xs text-danger/80 text-center">
          Presiona la esfera para detener y procesar la consulta
        </p>
      )}

      {/* Error retry */}
      {phase === 'error' && (
        <Button variant="outline" size="sm" onClick={() => setPhase('idle')}>
          Intentar de nuevo
        </Button>
      )}
    </div>
  )
}
