'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'

interface VoiceRecorderProps {
  onTranscript: (text: string) => void
  onAudioBlob?: (blob: Blob, durationSeconds: number) => void
  compact?: boolean
  lang?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

type RecordingState = 'idle' | 'recording' | 'transcribing'

function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  VoiceRecorder                                                          */
/* ════════════════════════════════════════════════════════════════════════ */

export function VoiceRecorder({
  onTranscript,
  onAudioBlob,
  compact = false,
  lang = 'es-MX',
  placeholder = 'Toca el botón y dicta tu nota clínica',
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(250)
      mediaRecorderRef.current = recorder
      return stream
    } catch { return null }
  }, [])

  const stopMediaRecorder = useCallback((): Promise<{ blob: Blob; duration: number } | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') { resolve(null); return }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        recorder.stream.getTracks().forEach(t => t.stop())
        resolve({ blob, duration })
      }
      recorder.stop()
    })
  }, [])

  const transcribeWithWhisper = useCallback(async (blob: Blob): Promise<string> => {
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')
    formData.append('language', lang.split('-')[0])
    const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Error en transcripción')
    const data = await res.json()
    return data.text || ''
  }, [lang])

  const startRecording = useCallback(async () => {
    if (disabled || state !== 'idle') return
    fullTranscriptRef.current = ''
    setInterim('')
    setState('recording')
    startTimer()
    await startMediaRecorder()

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
          if (result.isFinal) finalText += result[0].transcript + ' '
          else interimText += result[0].transcript
        }
        if (finalText) fullTranscriptRef.current = finalText.trim()
        setInterim(interimText || finalText)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed') setUseWhisper(true)
      }

      recognition.start()
      recognitionRef.current = recognition
    }
  }, [disabled, state, startTimer, startMediaRecorder, useWhisper, lang])

  const stopRecording = useCallback(async () => {
    stopTimer()
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null }
    const audioResult = await stopMediaRecorder()
    if (state !== 'recording') return

    if (useWhisper && audioResult) {
      setState('transcribing')
      try {
        const text = await transcribeWithWhisper(audioResult.blob)
        if (text.trim()) {
          onTranscript(text.trim())
          onAudioBlob?.(audioResult.blob, audioResult.duration)
        }
      } catch { /* sin transcripcion */ }
      setState('idle')
      setInterim('')
      return
    }

    const transcript = fullTranscriptRef.current.trim()
    if (transcript) {
      onTranscript(transcript)
      if (audioResult) onAudioBlob?.(audioResult.blob, audioResult.duration)
    }
    setState('idle')
    setInterim('')
  }, [state, useWhisper, stopTimer, stopMediaRecorder, transcribeWithWhisper, onTranscript, onAudioBlob])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  if (!supported && !useWhisper) return null

  /* ── Compact mode (small button only) ─────────────────────────────────── */
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
        {state === 'transcribing' ? <Loader2 size={14} className="animate-spin" />
          : state === 'recording' ? <Square size={14} />
          : <Mic size={14} />}
      </button>
    )
  }

  /* ── IDLE: Circular button ───────────────────────────────────────────── */
  if (state === 'idle') {
    return (
      <div className={`flex flex-col items-center gap-5 animate-fade-in ${className}`}>
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
          <div className="absolute inset-0 rounded-full border border-accent/10 animate-pulse-glow" />
          <Mic size={36} className="text-accent group-hover:text-accent transition-colors" />
          <span className="text-sm font-bold text-accent tracking-wide">Iniciar Nota</span>
        </button>

        <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
          {placeholder}
        </p>
      </div>
    )
  }

  /* ── RECORDING: Circular button (danger style) ──────────────────────── */
  if (state === 'recording') {
    return (
      <div className={`flex flex-col items-center gap-5 animate-fade-in ${className}`}>
        <button
          onClick={stopRecording}
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
          <div className="absolute inset-0 rounded-full border border-danger/20 animate-pulse-glow" />
          <Square size={28} className="text-danger fill-danger/80" />
          <span className="text-sm font-bold text-danger tracking-wide">Detener</span>
        </button>

        {/* Timer */}
        <div className="font-mono text-4xl font-bold text-foreground tabular-nums tracking-wider" style={{ textShadow: '0 0 20px rgba(220,60,60,0.3)' }}>
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </div>

        {/* Real-time transcript */}
        {interim && (
          <div className="w-full max-w-lg">
            <div className="px-4 py-3 text-sm italic leading-relaxed text-center rounded-xl bg-muted/50 border border-border text-muted-foreground">
              &ldquo;{interim}&rdquo;
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
          Grabando nota de voz...
        </p>
      </div>
    )
  }

  /* ── TRANSCRIBING: Circular button (accent style with spinner) ──────── */
  return (
    <div className={`flex flex-col items-center gap-5 animate-fade-in ${className}`}>
      <div className="relative w-44 h-44 rounded-full
        bg-gradient-to-br from-accent/20 via-accent/10 to-transparent
        border-2 border-accent/30
        flex flex-col items-center justify-center gap-3"
      >
        <div className="absolute inset-0 rounded-full border border-accent/10 animate-pulse-glow" />
        <Loader2 size={36} className="text-accent animate-spin" />
        <span className="text-xs font-bold text-accent tracking-wide text-center px-4">
          Transcribiendo...
        </span>
      </div>
    </div>
  )
}
