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

export function VoiceRecorder({
  onTranscript,
  onAudioBlob,
  compact = false,
  lang = 'es-MX',
  placeholder = 'Toca la esfera y dicta tu nota clínica',
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
      } catch { /* sin transcripción */ }
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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  if (!supported && !useWhisper) return null

  // ─── Modo compacto (solo botón pequeño) ────────────────────────────────
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

  // ─── Modo esfera flotante (principal) ──────────────────────────────────
  return (
    <div className={`flex flex-col items-center ${className}`}>

      {/* Esfera pulsante */}
      <div className="relative flex items-center justify-center mb-5">
        {/* Anillos de expansión cuando graba */}
        {state === 'recording' && (
          <>
            <span
              className="absolute rounded-full animate-ping"
              style={{
                width: 140, height: 140,
                background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                animationDuration: '2s',
              }}
            />
            <span
              className="absolute rounded-full animate-ping"
              style={{
                width: 110, height: 110,
                background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
                animationDuration: '1.5s',
                animationDelay: '0.3s',
              }}
            />
            <span
              className="absolute rounded-full"
              style={{
                width: 96, height: 96,
                background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </>
        )}

        {/* Halo sutil en idle */}
        {state === 'idle' && (
          <span
            className="absolute rounded-full"
            style={{
              width: 96, height: 96,
              background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
              animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        )}

        {/* Esfera principal */}
        <button
          onClick={state === 'idle' ? startRecording : stopRecording}
          disabled={disabled || state === 'transcribing'}
          className="relative z-10 group transition-all duration-300 ease-out"
          style={{ outline: 'none' }}
        >
          <div
            className={`
              w-20 h-20 rounded-full flex items-center justify-center
              transition-all duration-500 ease-out
              ${state === 'recording'
                ? 'shadow-[0_0_40px_rgba(139,92,246,0.4),0_0_80px_rgba(139,92,246,0.15)]'
                : state === 'transcribing'
                  ? 'shadow-[0_0_30px_rgba(46,174,123,0.3)]'
                  : 'shadow-[0_0_20px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_35px_rgba(139,92,246,0.3)]'
              }
            `}
            style={{
              background: state === 'recording'
                ? 'radial-gradient(circle at 35% 35%, rgba(167,139,250,0.95), rgba(139,92,246,0.85), rgba(109,40,217,0.9))'
                : state === 'transcribing'
                  ? 'radial-gradient(circle at 35% 35%, rgba(74,222,128,0.9), rgba(46,174,123,0.85), rgba(22,163,74,0.9))'
                  : 'radial-gradient(circle at 35% 35%, rgba(167,139,250,0.6), rgba(139,92,246,0.5), rgba(109,40,217,0.55))',
              border: state === 'recording'
                ? '1.5px solid rgba(167,139,250,0.6)'
                : state === 'transcribing'
                  ? '1.5px solid rgba(74,222,128,0.5)'
                  : '1.5px solid rgba(139,92,246,0.25)',
              transform: state === 'recording' ? 'scale(1.08)' : undefined,
            }}
          >
            {/* Brillo superior de la esfera */}
            <div
              className="absolute top-2 left-5 w-6 h-3 rounded-full opacity-40"
              style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.6), transparent)' }}
            />

            {state === 'transcribing' ? (
              <Loader2 size={28} className="text-white animate-spin" strokeWidth={1.8} />
            ) : state === 'recording' ? (
              <Square size={24} className="text-white drop-shadow-md" strokeWidth={2} />
            ) : (
              <Mic size={28} className="text-white drop-shadow-md" strokeWidth={1.8} />
            )}
          </div>
        </button>
      </div>

      {/* Timer cuando graba */}
      {state === 'recording' && (
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <span className="text-sm font-mono text-purple-300/80 tracking-wider">{formatTime(elapsed)}</span>
        </div>
      )}

      {/* Frase al pie */}
      <p className="text-center text-sm text-muted-foreground/70 leading-relaxed max-w-xs mb-4">
        {state === 'transcribing'
          ? 'Procesando transcripción…'
          : state === 'recording'
            ? 'Escuchando… Toca la esfera para detener'
            : placeholder}
      </p>

      {/* Transcripción en tiempo real */}
      {state === 'recording' && interim && (
        <div className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground/70 italic leading-relaxed text-center max-w-md">
          &ldquo;{interim}&rdquo;
        </div>
      )}
    </div>
  )
}
