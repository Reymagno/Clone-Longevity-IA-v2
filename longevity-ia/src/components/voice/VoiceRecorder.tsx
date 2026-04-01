'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Square, Loader2 } from 'lucide-react'

interface VoiceRecorderProps {
  /** Llamada cuando la transcripción está lista */
  onTranscript: (text: string) => void
  /** Llamada con el blob de audio grabado (opcional) */
  onAudioBlob?: (blob: Blob, durationSeconds: number) => void
  /** Modo compacto (solo botón, sin texto) */
  compact?: boolean
  /** Idioma de reconocimiento */
  lang?: string
  /** Texto placeholder */
  placeholder?: string
  /** Clase CSS adicional */
  className?: string
  /** Deshabilitado */
  disabled?: boolean
}

type RecordingState = 'idle' | 'recording' | 'transcribing'

// Detectar soporte de Web Speech API
function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function VoiceRecorder({
  onTranscript,
  onAudioBlob,
  compact = false,
  lang = 'es-MX',
  placeholder = 'Presiona el micrófono para dictar',
  className = '',
  disabled = false,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [interim, setInterim] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [supported, setSupported] = useState(true)
  const [useWhisper, setUseWhisper] = useState(false)

  const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fullTranscriptRef = useRef('')

  useEffect(() => {
    const SR = getSpeechRecognition()
    if (!SR) {
      setSupported(false)
      setUseWhisper(true)
    }
    return () => {
      // Cleanup on unmount (sync)
      if (timerRef.current) clearInterval(timerRef.current)
      if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
        mediaRecorderRef.current.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startTimer = useCallback(() => {
    setElapsed(0)
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ─── Iniciar grabación con MediaRecorder (para Whisper o audio backup) ───
  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(250) // chunks cada 250ms
      mediaRecorderRef.current = recorder
      return stream
    } catch {
      return null
    }
  }, [])

  const stopMediaRecorder = useCallback((): Promise<{ blob: Blob; duration: number } | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        // Detener todas las pistas del stream
        recorder.stream.getTracks().forEach(t => t.stop())
        resolve({ blob, duration })
      }

      recorder.stop()
    })
  }, [])

  // ─── Transcripción con Whisper API ───────────────────────────────────────
  const transcribeWithWhisper = useCallback(async (blob: Blob): Promise<string> => {
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')
    formData.append('language', lang.split('-')[0]) // 'es'

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) throw new Error('Error en transcripción')
    const data = await res.json()
    return data.text || ''
  }, [lang])

  // ─── Iniciar grabación ──────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (disabled || state !== 'idle') return

    fullTranscriptRef.current = ''
    setInterim('')
    setState('recording')
    startTimer()

    // Siempre iniciar MediaRecorder para capturar audio
    await startMediaRecorder()

    // Si hay Web Speech API disponible y no forzamos Whisper, usarla
    if (!useWhisper) {
      const SR = getSpeechRecognition()!
      const recognition = new SR()
      recognition.lang = lang
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = ''
        let interimText = ''

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalText += result[0].transcript + ' '
          } else {
            interimText += result[0].transcript
          }
        }

        if (finalText) {
          fullTranscriptRef.current = finalText.trim()
        }
        setInterim(interimText || finalText)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed') {
          setUseWhisper(true)
        }
      }

      recognition.start()
      recognitionRef.current = recognition
    }
  }, [disabled, state, startTimer, startMediaRecorder, useWhisper, lang])

  // ─── Detener grabación ──────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    stopTimer()

    // Detener Web Speech
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    // Detener MediaRecorder y obtener blob
    const audioResult = await stopMediaRecorder()

    if (state !== 'recording') return

    // Si usamos Whisper, transcribir el audio
    if (useWhisper && audioResult) {
      setState('transcribing')
      try {
        const text = await transcribeWithWhisper(audioResult.blob)
        if (text.trim()) {
          onTranscript(text.trim())
          onAudioBlob?.(audioResult.blob, audioResult.duration)
        }
      } catch {
        // Fallback: no hay transcripción disponible
      }
      setState('idle')
      setInterim('')
      return
    }

    // Web Speech: usar la transcripción acumulada
    const transcript = fullTranscriptRef.current.trim()
    if (transcript) {
      onTranscript(transcript)
      if (audioResult) {
        onAudioBlob?.(audioResult.blob, audioResult.duration)
      }
    }

    setState('idle')
    setInterim('')
  }, [state, useWhisper, stopTimer, stopMediaRecorder, transcribeWithWhisper, onTranscript, onAudioBlob])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  if (!supported && !useWhisper) {
    return null // No hay soporte de voz en absoluto
  }

  if (compact) {
    return (
      <button
        onClick={state === 'idle' ? startRecording : stopRecording}
        disabled={disabled || state === 'transcribing'}
        title={state === 'recording' ? 'Detener grabación' : 'Dictar por voz'}
        className={`relative p-2 rounded-xl transition-all ${
          state === 'recording'
            ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
            : state === 'transcribing'
              ? 'bg-accent/10 border border-accent/20 text-accent'
              : 'border border-border text-muted-foreground hover:border-accent/50 hover:text-foreground'
        } ${className}`}
      >
        {state === 'recording' && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        )}
        {state === 'transcribing' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : state === 'recording' ? (
          <Square size={14} />
        ) : (
          <Mic size={14} />
        )}
      </button>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={state === 'idle' ? startRecording : stopRecording}
          disabled={disabled || state === 'transcribing'}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            state === 'recording'
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
              : state === 'transcribing'
                ? 'bg-accent/10 border border-accent/20 text-accent cursor-wait'
                : 'bg-accent/10 border border-accent/20 text-accent hover:bg-accent/15'
          }`}
        >
          {state === 'transcribing' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Transcribiendo…
            </>
          ) : state === 'recording' ? (
            <>
              <Square size={16} />
              Detener ({formatTime(elapsed)})
            </>
          ) : (
            <>
              <Mic size={16} />
              Grabar nota de voz
            </>
          )}
        </button>

        {state === 'recording' && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400">Grabando…</span>
          </div>
        )}
      </div>

      {/* Transcripción en tiempo real */}
      {state === 'recording' && interim && (
        <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground italic">
          {interim}
        </div>
      )}

      {state === 'idle' && !compact && (
        <p className="text-xs text-muted-foreground/60">{placeholder}</p>
      )}
    </div>
  )
}
