'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
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

/* ── CSS Keyframes injected once ────────────────────────────────────────── */
const KEYFRAMES_ID = 'voice-recorder-keyframes'

function injectKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(KEYFRAMES_ID)) return

  const style = document.createElement('style')
  style.id = KEYFRAMES_ID
  style.textContent = `
    @keyframes vr-breathe {
      0%, 100% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.06); opacity: 1; }
    }
    @keyframes vr-ring-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes vr-ring-spin-reverse {
      0% { transform: rotate(360deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes vr-ring-pulse {
      0%, 100% { opacity: 0.3; transform: rotate(0deg) scale(1); }
      50% { opacity: 0.7; transform: rotate(180deg) scale(1.08); }
    }
    @keyframes vr-expand {
      0% { transform: scale(0.8); opacity: 0.6; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes vr-orbit {
      0% { transform: rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg); }
    }
    @keyframes vr-scan {
      0% { transform: translateY(-50%); opacity: 0; }
      50% { opacity: 0.15; }
      100% { transform: translateY(50%); opacity: 0; }
    }
    @keyframes vr-wave-bar {
      0%, 100% { transform: scaleY(0.3); }
      50% { transform: scaleY(1); }
    }
    @keyframes vr-float-particle {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
      50% { transform: translateY(-6px) scale(1.3); opacity: 0.8; }
    }
    @keyframes vr-transcribe-orbit {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes vr-hud-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @keyframes vr-gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes vr-sphere-idle-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.15), 0 0 60px rgba(139,92,246,0.05), inset 0 0 30px rgba(139,92,246,0.1); }
      50% { box-shadow: 0 0 30px rgba(139,92,246,0.25), 0 0 80px rgba(139,92,246,0.1), inset 0 0 40px rgba(139,92,246,0.15); }
    }
    @keyframes vr-sphere-recording-glow {
      0%, 100% { box-shadow: 0 0 40px rgba(139,92,246,0.5), 0 0 100px rgba(56,189,248,0.2), inset 0 0 40px rgba(139,92,246,0.2); }
      50% { box-shadow: 0 0 60px rgba(139,92,246,0.7), 0 0 120px rgba(56,189,248,0.3), inset 0 0 50px rgba(139,92,246,0.3); }
    }
  `
  document.head.appendChild(style)
}

/* ── Orbital particles ──────────────────────────────────────────────────── */
function OrbitParticles({ count, radius, duration, color, size = 3, reverse = false }: {
  count: number; radius: number; duration: number; color: string; size?: number; reverse?: boolean
}) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      delay: -(duration / count) * i,
      startAngle: (360 / count) * i,
    })),
    [count, duration]
  )

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width: radius * 2, height: radius * 2, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            background: color,
            boxShadow: `0 0 ${size * 2}px ${color}`,
            top: '50%',
            left: '50%',
            marginTop: -size / 2,
            marginLeft: -size / 2,
            ['--orbit-radius' as string]: `${radius}px`,
            animation: `vr-orbit ${duration}s linear infinite ${reverse ? 'reverse' : 'normal'}`,
            animationDelay: `${p.delay}s`,
            transformOrigin: '0 0',
            transform: `rotate(${p.startAngle}deg) translateX(${radius}px)`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Sound wave bars ────────────────────────────────────────────────────── */
function SoundWave({ bars = 24, radius = 62 }: { bars?: number; radius?: number }) {
  const barData = useMemo(() =>
    Array.from({ length: bars }, (_, i) => ({
      angle: (360 / bars) * i,
      delay: Math.random() * 0.8,
      height: 8 + Math.random() * 14,
      duration: 0.4 + Math.random() * 0.5,
    })),
    [bars]
  )

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width: radius * 2, height: radius * 2, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
      {barData.map((bar, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: 2,
            height: bar.height,
            background: 'linear-gradient(to top, rgba(139,92,246,0.8), rgba(56,189,248,0.6))',
            borderRadius: 1,
            top: '50%',
            left: '50%',
            transformOrigin: `0 ${radius}px`,
            transform: `rotate(${bar.angle}deg) translateY(-${radius}px)`,
            animation: `vr-wave-bar ${bar.duration}s ease-in-out infinite`,
            animationDelay: `${bar.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Concentric ring ────────────────────────────────────────────────────── */
function ConcentricRing({ radius, borderColor, duration, reverse = false, dashed = false, opacity = 0.3 }: {
  radius: number; borderColor: string; duration: number; reverse?: boolean; dashed?: boolean; opacity?: number
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: radius * 2,
        height: radius * 2,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        border: `1px ${dashed ? 'dashed' : 'solid'} ${borderColor}`,
        opacity,
        animation: `${reverse ? 'vr-ring-spin-reverse' : 'vr-ring-spin'} ${duration}s linear infinite`,
      }}
    />
  )
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  VoiceRecorder                                                          */
/* ════════════════════════════════════════════════════════════════════════ */

export function VoiceRecorder({
  onTranscript,
  onAudioBlob,
  compact = false,
  lang = 'es-MX',
  placeholder = 'Toca la esfera y dicta tu nota cl\u00ednica',
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
    injectKeyframes()
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
    if (!res.ok) throw new Error('Error en transcripci\u00f3n')
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  if (!supported && !useWhisper) return null

  /* ── Compact mode (small button only) ─────────────────────────────────── */
  if (compact) {
    return (
      <button
        onClick={state === 'idle' ? startRecording : stopRecording}
        disabled={disabled || state === 'transcribing'}
        title={state === 'recording' ? 'Detener grabaci\u00f3n' : 'Dictar por voz'}
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

  /* ── Floating sphere (main mode) ──────────────────────────────────────── */
  const isRecording = state === 'recording'
  const isTranscribing = state === 'transcribing'
  const isIdle = state === 'idle'

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>

      {/* ── Sci-fi grid backdrop ──────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>

        {/* Scan line effect */}
        <div
          className="absolute pointer-events-none overflow-hidden rounded-full"
          style={{ width: 180, height: 180, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: 1,
              background: isRecording
                ? 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(139,92,246,0.15), transparent)',
              animation: 'vr-scan 3s ease-in-out infinite',
            }}
          />
        </div>

        {/* ── Energy expansion rings (recording) ─────────────────────────── */}
        {isRecording && (
          <>
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 88, height: 88,
                left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                border: '1px solid rgba(139,92,246,0.5)',
                animation: 'vr-expand 2s ease-out infinite',
              }}
            />
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 88, height: 88,
                left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                border: '1px solid rgba(56,189,248,0.4)',
                animation: 'vr-expand 2s ease-out infinite 0.7s',
              }}
            />
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 88, height: 88,
                left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                border: '1px solid rgba(139,92,246,0.3)',
                animation: 'vr-expand 2s ease-out infinite 1.4s',
              }}
            />
          </>
        )}

        {/* ── Concentric rotating rings ──────────────────────────────────── */}
        {isRecording && (
          <>
            <ConcentricRing radius={56} borderColor="rgba(139,92,246,0.35)" duration={8} opacity={0.5} />
            <ConcentricRing radius={68} borderColor="rgba(56,189,248,0.25)" duration={12} reverse dashed />
            <ConcentricRing radius={80} borderColor="rgba(139,92,246,0.15)" duration={18} opacity={0.25} />
          </>
        )}

        {isTranscribing && (
          <>
            <ConcentricRing radius={56} borderColor="rgba(46,174,123,0.4)" duration={4} opacity={0.5} />
            <ConcentricRing radius={68} borderColor="rgba(46,174,123,0.25)" duration={6} reverse dashed />
            <ConcentricRing radius={80} borderColor="rgba(46,174,123,0.15)" duration={10} opacity={0.3} />
          </>
        )}

        {isIdle && (
          <>
            <ConcentricRing radius={58} borderColor="rgba(139,92,246,0.08)" duration={30} opacity={0.15} />
            <ConcentricRing radius={70} borderColor="rgba(139,92,246,0.05)" duration={40} reverse dashed opacity={0.1} />
          </>
        )}

        {/* ── Orbital particles ──────────────────────────────────────────── */}
        {isRecording && (
          <>
            <OrbitParticles count={8} radius={58} duration={4} color="rgba(139,92,246,0.9)" size={3} />
            <OrbitParticles count={6} radius={72} duration={7} color="rgba(56,189,248,0.7)" size={2} reverse />
            <OrbitParticles count={4} radius={86} duration={10} color="rgba(139,92,246,0.5)" size={2} />
          </>
        )}

        {isTranscribing && (
          <OrbitParticles count={6} radius={58} duration={3} color="rgba(46,174,123,0.8)" size={3} />
        )}

        {isIdle && (
          <OrbitParticles count={4} radius={60} duration={16} color="rgba(139,92,246,0.3)" size={2} />
        )}

        {/* ── Sound wave visualization (recording) ──────────────────────── */}
        {isRecording && <SoundWave bars={28} radius={52} />}

        {/* ── Ambient glow behind sphere ─────────────────────────────────── */}
        <div
          className="absolute rounded-full pointer-events-none transition-all duration-700"
          style={{
            width: 120, height: 120,
            left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            background: isRecording
              ? 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(56,189,248,0.08) 40%, transparent 70%)'
              : isTranscribing
                ? 'radial-gradient(circle, rgba(46,174,123,0.2) 0%, rgba(46,174,123,0.05) 40%, transparent 70%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)',
            animation: 'vr-breathe 3s ease-in-out infinite',
          }}
        />

        {/* ── THE SPHERE ─────────────────────────────────────────────────── */}
        <button
          onClick={isIdle ? startRecording : stopRecording}
          disabled={disabled || isTranscribing}
          aria-label={isRecording ? 'Detener grabaci\u00f3n' : isTranscribing ? 'Procesando' : 'Iniciar grabaci\u00f3n de voz'}
          className="relative z-10 group focus:outline-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* Outer glass shell */}
          <div
            className="relative rounded-full flex items-center justify-center transition-all duration-700 ease-out"
            style={{
              width: isRecording ? 96 : 88,
              height: isRecording ? 96 : 88,

              /* Glass morphism background */
              background: isRecording
                ? 'linear-gradient(135deg, rgba(139,92,246,0.45) 0%, rgba(56,189,248,0.2) 50%, rgba(139,92,246,0.5) 100%)'
                : isTranscribing
                  ? 'linear-gradient(135deg, rgba(46,174,123,0.4) 0%, rgba(46,174,123,0.15) 50%, rgba(46,174,123,0.45) 100%)'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.08) 50%, rgba(139,92,246,0.25) 100%)',

              /* Frosted glass border */
              border: isRecording
                ? '1.5px solid rgba(167,139,250,0.5)'
                : isTranscribing
                  ? '1.5px solid rgba(74,222,128,0.4)'
                  : '1.5px solid rgba(139,92,246,0.2)',

              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',

              /* State-based glow animation */
              animation: isRecording
                ? 'vr-sphere-recording-glow 2s ease-in-out infinite'
                : isTranscribing
                  ? 'none'
                  : 'vr-sphere-idle-glow 4s ease-in-out infinite',

              boxShadow: isTranscribing
                ? '0 0 40px rgba(46,174,123,0.4), 0 0 80px rgba(46,174,123,0.15), inset 0 0 30px rgba(46,174,123,0.15)'
                : undefined,

              cursor: isTranscribing ? 'default' : 'pointer',
            }}
          >
            {/* Inner specular highlight (top-left) */}
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                width: '55%',
                height: '30%',
                top: '10%',
                left: '15%',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.18), transparent)',
                filter: 'blur(2px)',
              }}
            />

            {/* Inner sphere core (darker center for depth) */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: '70%',
                height: '70%',
                background: isRecording
                  ? 'radial-gradient(circle at 40% 40%, rgba(167,139,250,0.3), rgba(109,40,217,0.15), transparent)'
                  : isTranscribing
                    ? 'radial-gradient(circle at 40% 40%, rgba(74,222,128,0.25), rgba(46,174,123,0.1), transparent)'
                    : 'radial-gradient(circle at 40% 40%, rgba(139,92,246,0.15), transparent)',
              }}
            />

            {/* Bottom edge reflection */}
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                width: '50%',
                height: '15%',
                bottom: '12%',
                left: '25%',
                background: isRecording
                  ? 'radial-gradient(ellipse, rgba(56,189,248,0.12), transparent)'
                  : 'radial-gradient(ellipse, rgba(139,92,246,0.06), transparent)',
                filter: 'blur(3px)',
              }}
            />

            {/* Icon */}
            <div className="relative z-10 flex items-center justify-center">
              {isTranscribing ? (
                <Loader2
                  size={30}
                  className="text-white/90"
                  strokeWidth={1.5}
                  style={{ animation: 'vr-ring-spin 1.5s linear infinite' }}
                />
              ) : isRecording ? (
                <Square
                  size={22}
                  className="text-white drop-shadow-lg"
                  strokeWidth={2}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' }}
                />
              ) : (
                <Mic
                  size={30}
                  className="text-white/80 group-hover:text-white transition-colors duration-300 drop-shadow-lg"
                  strokeWidth={1.5}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' }}
                />
              )}
            </div>
          </div>
        </button>
      </div>

      {/* ── HUD Timer (recording) ───────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-3 transition-all duration-500"
        style={{
          height: isRecording ? 32 : 0,
          opacity: isRecording ? 1 : 0,
          marginTop: isRecording ? 8 : 0,
          overflow: 'hidden',
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: '#8b5cf6',
            boxShadow: '0 0 8px rgba(139,92,246,0.8)',
            animation: 'vr-hud-blink 1.5s ease-in-out infinite',
          }}
        />
        <span
          className="font-mono text-sm tracking-[0.3em] uppercase"
          style={{
            color: 'rgba(167,139,250,0.9)',
            textShadow: '0 0 10px rgba(139,92,246,0.4)',
            letterSpacing: '0.3em',
          }}
        >
          rec {formatTime(elapsed)}
        </span>
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: '#8b5cf6',
            boxShadow: '0 0 8px rgba(139,92,246,0.8)',
            animation: 'vr-hud-blink 1.5s ease-in-out infinite 0.75s',
          }}
        />
      </div>

      {/* ── Status text ─────────────────────────────────────────────────── */}
      <p
        className="text-center text-sm leading-relaxed max-w-xs transition-all duration-500 mt-3"
        style={{
          color: isRecording
            ? 'rgba(167,139,250,0.7)'
            : isTranscribing
              ? 'rgba(46,174,123,0.7)'
              : 'rgba(107,102,96,0.8)',
          letterSpacing: '0.02em',
        }}
      >
        {isTranscribing
          ? 'Analizando audio...'
          : isRecording
            ? 'Escuchando -- toca la esfera para finalizar'
            : placeholder}
      </p>

      {/* ── Real-time transcript ────────────────────────────────────────── */}
      <div
        className="w-full max-w-md transition-all duration-500 overflow-hidden"
        style={{
          maxHeight: (isRecording && interim) ? 120 : 0,
          opacity: (isRecording && interim) ? 1 : 0,
          marginTop: (isRecording && interim) ? 16 : 0,
        }}
      >
        <div
          className="px-5 py-3 text-sm italic leading-relaxed text-center rounded-2xl"
          style={{
            color: 'rgba(226,223,214,0.6)',
            background: 'linear-gradient(135deg, rgba(10,23,41,0.6), rgba(16,31,56,0.4))',
            border: '1px solid rgba(139,92,246,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          &ldquo;{interim}&rdquo;
        </div>
      </div>

    </div>
  )
}
