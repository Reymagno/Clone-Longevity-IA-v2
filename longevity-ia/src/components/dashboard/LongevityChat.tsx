'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { AIAnalysis, Patient } from '@/types'
import { X, Send, Sparkles, ChevronDown, RotateCcw, CheckCircle2 } from 'lucide-react'
import { LogoIcon } from '@/components/ui/logo-icon'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  patient: Pick<Patient, 'name' | 'age' | 'gender'> & { id?: string }
  analysis: AIAnalysis
  resultId?: string
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Soy **Longevity IA**, tu asistente de salud personalizado.\n\nTengo acceso completo a tu análisis de laboratorio y puedo responderte cualquier pregunta sobre tus biomarcadores, recomendaciones, riesgos o proyección de salud.\n\nTambién puedes **compartirme información de tu salud** (medicamentos, alergias, hábitos, síntomas) y la guardaré automáticamente en tu historia clínica.\n\n¿En qué te puedo ayudar hoy?',
}

const SUGGESTIONS = [
  '¿Qué significa mi score general?',
  '¿Cuáles son mis principales riesgos?',
  'Explícame mi protocolo de suplementos',
  'Tomo metformina y vitamina D diario',
]

// ─────────────────────────────────────────────────────────────────
// PERSISTENCIA DE HISTORIAL EN LOCALSTORAGE
// ─────────────────────────────────────────────────────────────────

const CHAT_STORAGE_PREFIX = 'longevity-chat-'
const MAX_STORED_MESSAGES = 100

function getChatStorageKey(patientId?: string, resultId?: string): string | null {
  if (!patientId) return null
  return `${CHAT_STORAGE_PREFIX}${patientId}${resultId ? `-${resultId}` : ''}`
}

function loadChatHistory(key: string | null): Message[] {
  if (!key) return [WELCOME]
  try {
    const stored = sessionStorage.getItem(key)
    if (!stored) return [WELCOME]
    const parsed = JSON.parse(stored) as Message[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [WELCOME]
    // Ensure welcome message is always first
    if (parsed[0]?.id !== 'welcome') return [WELCOME, ...parsed]
    return parsed
  } catch {
    return [WELCOME]
  }
}

function saveChatHistory(key: string | null, messages: Message[]) {
  if (!key) return
  try {
    const toStore = messages.slice(-MAX_STORED_MESSAGES)
    sessionStorage.setItem(key, JSON.stringify(toStore))
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

// ─────────────────────────────────────────────────────────────────
// EXTRACCIÓN DE DATOS CLÍNICOS DEL CHAT
// ─────────────────────────────────────────────────────────────────

const CLINICAL_MARKER_RE = /\[CLINICAL_UPDATE\]\s*([\s\S]*?)\s*\[\/CLINICAL_UPDATE\]/

function extractClinicalData(text: string): { cleanText: string; data: Record<string, unknown> | null } {
  const match = text.match(CLINICAL_MARKER_RE)
  if (!match) return { cleanText: text, data: null }

  const cleanText = text.replace(CLINICAL_MARKER_RE, '').trimEnd()
  try {
    const data = JSON.parse(match[1])
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return { cleanText, data }
    }
  } catch { /* ignore parse errors */ }
  return { cleanText, data: null }
}

async function saveClinicalUpdate(patientId: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/patients/${patientId}/clinical-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  return res.ok
}

// ─────────────────────────────────────────────────────────────────
// MARKDOWN INLINE — renderiza **negrita** y saltos de línea
// ─────────────────────────────────────────────────────────────────

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return part.split('\n').map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ))
      })}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// INDICADOR DE ESCRITURA
// ─────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// BURBUJA DE MENSAJE
// ─────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  const isEmpty = msg.content === ''

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar IA */}
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 mb-0.5">
          <Sparkles size={11} className="text-accent" />
        </div>
      )}

      {/* Burbuja */}
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
          isUser
            ? 'bg-accent text-background font-medium rounded-br-sm'
            : 'bg-muted/60 text-foreground rounded-bl-sm border border-border/50'
        }`}
      >
        {isEmpty ? <TypingDots /> : <InlineMarkdown text={msg.content} />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────

export function LongevityChat({ patient, analysis, resultId }: Props) {
  const storageKey = getChatStorageKey(patient.id, resultId)

  const [isOpen, setIsOpen]         = useState(false)
  const [messages, setMessages]     = useState<Message[]>(() => loadChatHistory(storageKey))
  const [input, setInput]           = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasNotif, setHasNotif]     = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const abortRef       = useRef<AbortController | null>(null)

  // Scroll al fondo cuando llegan mensajes nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist chat history to localStorage on every update
  useEffect(() => {
    if (messages.length > 1) {
      saveChatHistory(storageKey, messages)
    }
  }, [messages, storageKey])

  // Notificación visual en el botón cuando llega una respuesta y el panel está cerrado
  useEffect(() => {
    if (!isOpen && messages.length > 1) setHasNotif(true)
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen) setHasNotif(false)
  }, [isOpen])

  // Redimensionar textarea automáticamente
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }

  const resetTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // ── Enviar mensaje ─────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim()
      if (!content || isStreaming) return

      const userMsg: Message   = { id: `u-${Date.now()}`, role: 'user',      content }
      const assistantId        = `a-${Date.now() + 1}`
      const pendingMsg: Message = { id: assistantId,       role: 'assistant', content: '' }

      setMessages(prev => [...prev, userMsg, pendingMsg])
      setInput('')
      resetTextarea()
      setIsStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        // Construir historial sin el mensaje de bienvenida
        const history = [...messages, userMsg]
          .filter(m => m.id !== 'welcome' && m.content !== '')
          .map(m => ({ role: m.role, content: m.content }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, patient, analysis }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`)
        }

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          // Strip marker from display during streaming so user never sees it
          const { cleanText } = extractClinicalData(accumulated)
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: cleanText } : m),
          )
        }

        // After stream completes, extract and save clinical data if present
        const { cleanText, data: clinicalData } = extractClinicalData(accumulated)
        if (cleanText !== accumulated) {
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: cleanText } : m),
          )
        }
        if (clinicalData && patient.id) {
          saveClinicalUpdate(patient.id, clinicalData).then(ok => {
            if (ok) {
              toast.success('Información clínica actualizada', {
                description: 'Los datos que compartiste fueron registrados en tu historia clínica.',
                icon: <CheckCircle2 size={16} />,
                duration: 4000,
              })
            }
          })
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: 'Ocurrió un error al generar la respuesta. Por favor intenta de nuevo.' }
                : m,
            ),
          )
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [input, isStreaming, messages, patient, analysis],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleReset = () => {
    abortRef.current?.abort()
    setMessages([WELCOME])
    setInput('')
    setIsStreaming(false)
    // Clear persisted history
    if (storageKey) {
      try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
    }
  }

  const handleOpen = () => {
    setIsOpen(v => !v)
    // Enfocar textarea al abrir
    setTimeout(() => textareaRef.current?.focus(), 300)
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      {/* ──────────── PANEL DE CHAT ──────────── */}
      <div
        aria-label="Chat Longevity IA"
        className={`
          fixed z-50 flex flex-col rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden
          transition-all duration-300 ease-out origin-bottom-right
          bottom-[5.5rem] right-4 sm:right-6
          w-[calc(100vw-2rem)] sm:w-[400px]
          ${isOpen
            ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
            : 'opacity-0 scale-95 pointer-events-none translate-y-3'
          }
        `}
        style={{ maxHeight: 'min(600px, calc(100vh - 7rem))' }}
      >

        {/* ── Cabecera ── */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-border/60 shrink-0"
          style={{ background: 'linear-gradient(135deg, #0E1A30 0%, #0A1729 100%)' }}
        >
          {/* Icono + branding */}
          <LogoIcon size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-none">Longevity IA</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" style={{ animation: 'pulseRing 2s ease-in-out infinite' }} />
              <p className="text-[10px] text-muted-foreground">
                {messages.length > 1
                  ? `${Math.floor((messages.length - 1) / 2)} conversación${Math.floor((messages.length - 1) / 2) !== 1 ? 'es' : ''}`
                  : 'Asistente de salud activo'
                }
              </p>
            </div>
          </div>

          {/* Botón reset */}
          <button
            onClick={handleReset}
            title="Reiniciar conversación"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <RotateCcw size={13} />
          </button>

          {/* Botón minimizar */}
          <button
            onClick={() => setIsOpen(false)}
            title="Minimizar"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* ── Área de mensajes ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Chips de sugerencias (solo hasta el primer mensaje del usuario) ── */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={isStreaming}
                className="text-[10px] font-medium px-3 py-1.5 rounded-full border border-accent/20 text-accent bg-accent/8 hover:bg-accent/15 hover:border-accent/40 transition-all disabled:opacity-40 text-left"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <div className="px-3 pb-3 pt-2 border-t border-border/60 shrink-0">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 focus-within:border-accent/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta o comparte info de salud…"
              disabled={isStreaming}
              rows={1}
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 resize-none outline-none leading-5 disabled:opacity-50 py-0.5"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-accent text-background hover:bg-accent/85 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title="Enviar"
            >
              <Send size={13} />
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground/40 text-center mt-1.5">
            Enter para enviar · Shift+Enter nueva línea
          </p>
        </div>
      </div>

      {/* ──────────── BOTON FLOTANTE ──────────── */}
      <button
        onClick={handleOpen}
        aria-label={isOpen ? 'Cerrar Longevity IA' : 'Abrir Longevity IA'}
        className={`
          fixed bottom-6 right-4 sm:right-6 z-50
          flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-semibold text-sm
          shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95
          ${isOpen
            ? 'bg-card/90 backdrop-blur-xl border border-border/60 text-muted-foreground hover:text-foreground'
            : 'bg-accent text-background'
          }
        `}
        style={
          !isOpen
            ? { boxShadow: '0 0 32px #2EAE7B44, 0 8px 40px rgba(0,0,0,0.5)' }
            : undefined
        }
      >
        {isOpen ? (
          <>
            <X size={16} />
            Cerrar
          </>
        ) : (
          <>
            <LogoIcon size={20} animate={false} />
            Longevity IA

            {/* Indicador de respuesta no leída */}
            {hasNotif && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-danger border-2 border-background" />
            )}

            {/* Punto de actividad cuando está respondiendo */}
            {isStreaming && (
              <span className="w-1.5 h-1.5 rounded-full bg-background/70 animate-pulse" />
            )}
          </>
        )}
      </button>
    </>
  )
}
