'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Sparkles, RotateCcw, Database, FileText,
  MessageSquare, Loader2, CheckCircle2, AlertCircle, Search,
} from 'lucide-react'
import { LogoIcon } from '@/components/ui/logo-icon'

// ── Types ───────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ToolEvent {
  id: string
  tool: string
  status: 'running' | 'done' | 'error'
  preview?: string
}

interface Props {
  role: 'medico' | 'clinica'
}

// ── Constants ───────────────────────────────────────────────────────

const WELCOME_CLINICA: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Soy el **Asistente Inteligente** de Longevity IA.\n\nPuedo consultar datos reales de tu clinica: actividad de medicos, pacientes criticos, biomarcadores, metricas operativas y mas.\n\nTambien puedo **generar reportes PDF** y **enviar notificaciones a Slack**.\n\n¿Que necesitas saber hoy?',
}

const WELCOME_MEDICO: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Soy el **Asistente Inteligente** de Longevity IA.\n\nPuedo consultar datos de tus pacientes: tendencias de biomarcadores, busquedas por criterios clinicos y generar reportes.\n\n¿En que te puedo ayudar?',
}

const SUGGESTIONS_CLINICA = [
  '¿Cuantos medicos estuvieron activos esta semana?',
  'Pacientes con biomarcadores criticos',
  'Rendimiento de medicos este mes',
  'Pacientes sin analisis en 90 dias',
]

const SUGGESTIONS_MEDICO = [
  'Pacientes con score cardiovascular bajo',
  'Tendencia de LDL de mis pacientes',
  'Busca pacientes mayores de 60 con alertas',
  'Genera reporte de mis pacientes criticos',
]

const TOOL_LABELS: Record<string, { label: string; icon: 'search' | 'db' | 'file' | 'msg' }> = {
  query_patients:          { label: 'Buscando pacientes', icon: 'search' },
  query_medico_sessions:   { label: 'Consultando sesiones', icon: 'db' },
  query_active_medicos:    { label: 'Verificando medicos activos', icon: 'db' },
  query_clinic_activity:   { label: 'Consultando actividad', icon: 'db' },
  query_doctor_performance:{ label: 'Evaluando rendimiento', icon: 'db' },
  query_biomarker_trends:  { label: 'Analizando tendencias', icon: 'search' },
  query_patient_search:    { label: 'Buscando pacientes', icon: 'search' },
  generate_pdf:            { label: 'Generando PDF', icon: 'file' },
  send_slack:              { label: 'Enviando a Slack', icon: 'msg' },
}

// ── Persistence ─────────────────────────────────────────────────────

const STORAGE_KEY = 'longevity-agent-chat'
const MAX_STORED = 80

function loadHistory(role: string): Message[] {
  const welcome = role === 'clinica' ? WELCOME_CLINICA : WELCOME_MEDICO
  try {
    const stored = sessionStorage.getItem(`${STORAGE_KEY}-${role}`)
    if (!stored) return [welcome]
    const parsed = JSON.parse(stored) as Message[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [welcome]
    if (parsed[0]?.id !== 'welcome') return [welcome, ...parsed]
    return parsed
  } catch {
    return [welcome]
  }
}

function saveHistory(role: string, messages: Message[]) {
  try {
    sessionStorage.setItem(`${STORAGE_KEY}-${role}`, JSON.stringify(messages.slice(-MAX_STORED)))
  } catch { /* silent */ }
}

// ── Markdown renderer ───────────────────────────────────────────────

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

// ── Typing indicator ────────────────────────────────────────────────

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

// ── Tool activity indicator ─────────────────────────────────────────

function ToolIndicator({ event }: { event: ToolEvent }) {
  const info = TOOL_LABELS[event.tool] ?? { label: event.tool, icon: 'db' }

  const iconMap = {
    search: <Search size={11} />,
    db: <Database size={11} />,
    file: <FileText size={11} />,
    msg: <MessageSquare size={11} />,
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/8 border border-accent/15 text-[10px] text-accent animate-fade-in">
      {event.status === 'running' ? (
        <Loader2 size={11} className="animate-spin" />
      ) : event.status === 'done' ? (
        <CheckCircle2 size={11} />
      ) : (
        <AlertCircle size={11} className="text-danger" />
      )}
      {iconMap[info.icon]}
      <span className="font-medium">{info.label}</span>
      {event.status === 'done' && event.preview && (
        <span className="text-muted-foreground truncate max-w-[160px]">{event.preview}</span>
      )}
    </div>
  )
}

// ── Message bubble ──────────────────────────────────────────────────

function MessageBubble({ msg, toolEvents }: { msg: Message; toolEvents?: ToolEvent[] }) {
  const isUser = msg.role === 'user'
  const isEmpty = msg.content === ''
  const showTools = !isUser && toolEvents && toolEvents.length > 0

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 mb-0.5">
          <Sparkles size={11} className="text-accent" />
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-[82%]">
        {/* Tool activity indicators */}
        {showTools && (
          <div className="flex flex-col gap-1">
            {toolEvents.map(ev => (
              <ToolIndicator key={ev.id} event={ev} />
            ))}
          </div>
        )}

        {/* Message content */}
        {(msg.content || isEmpty) && (
          <div
            className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
              isUser
                ? 'bg-accent text-background font-medium rounded-br-sm'
                : 'bg-muted/60 text-foreground rounded-bl-sm border border-border/50'
            }`}
          >
            {isEmpty && !showTools ? <TypingDots /> : isEmpty ? null : <InlineMarkdown text={msg.content} />}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────

export function AgentChat({ role }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => loadHistory(role))
  const [toolEvents, setToolEvents] = useState<Map<string, ToolEvent[]>>(new Map())
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const suggestions = role === 'clinica' ? SUGGESTIONS_CLINICA : SUGGESTIONS_MEDICO

  // Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolEvents])

  // Persist
  useEffect(() => {
    if (messages.length > 1) saveHistory(role, messages)
  }, [messages, role])

  // Focus
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }

  const resetTextarea = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  // ── Send message ──────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim()
      if (!content || isStreaming) return

      const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content }
      const assistantId = `a-${Date.now() + 1}`
      const pendingMsg: Message = { id: assistantId, role: 'assistant', content: '' }

      setMessages(prev => [...prev, userMsg, pendingMsg])
      setInput('')
      resetTextarea()
      setIsStreaming(true)
      setToolEvents(prev => new Map(prev).set(assistantId, []))

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const history = [...messages, userMsg]
          .filter(m => m.id !== 'welcome' && m.content !== '')
          .map(m => ({ role: m.role, content: m.content }))

        const res = await fetch('/api/chat/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6))

              switch (event.type) {
                case 'tool_call': {
                  const toolEvent: ToolEvent = {
                    id: event.tool_call_id ?? `t-${Date.now()}-${event.tool}`,
                    tool: event.tool,
                    status: 'running',
                  }
                  setToolEvents(prev => {
                    const next = new Map(prev)
                    const existing = next.get(assistantId) ?? []
                    next.set(assistantId, [...existing, toolEvent])
                    return next
                  })
                  break
                }

                case 'tool_result': {
                  setToolEvents(prev => {
                    const next = new Map(prev)
                    const existing = next.get(assistantId) ?? []
                    // Match by unique tool_call_id to avoid ambiguity with duplicate tool names
                    const targetId = event.tool_call_id
                    const updated = existing.map(ev =>
                      (targetId ? ev.id === targetId : ev.tool === event.tool && ev.status === 'running')
                        ? { ...ev, status: event.success ? 'done' as const : 'error' as const, preview: event.preview?.slice(0, 100) }
                        : ev
                    )
                    next.set(assistantId, updated)
                    return next
                  })
                  break
                }

                case 'text': {
                  accumulated += event.content
                  setMessages(prev =>
                    prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
                  )
                  break
                }

                case 'error': {
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId
                        ? { ...m, content: `Error: ${event.message}` }
                        : m
                    )
                  )
                  break
                }

                case 'done':
                  break
              }
            } catch {
              // Malformed SSE event — skip
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: 'Ocurrio un error al generar la respuesta. Por favor intenta de nuevo.' }
                : m
            )
          )
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [input, isStreaming, messages],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleReset = () => {
    abortRef.current?.abort()
    const welcome = role === 'clinica' ? WELCOME_CLINICA : WELCOME_MEDICO
    setMessages([welcome])
    setToolEvents(new Map())
    setInput('')
    setIsStreaming(false)
    try { localStorage.removeItem(`${STORAGE_KEY}-${role}`) } catch { /* silent */ }
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="card-medical flex flex-col" style={{ height: 'min(680px, calc(100vh - 16rem))' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border/60 shrink-0 rounded-t-2xl"
        style={{ background: 'linear-gradient(135deg, #0E1A30 0%, #0A1729 100%)' }}
      >
        <LogoIcon size={28} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-none">Asistente Inteligente</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-accent"
              style={{ animation: 'pulseRing 2s ease-in-out infinite' }}
            />
            <p className="text-[10px] text-muted-foreground">
              {isStreaming ? 'Procesando consulta...' : 'Listo para consultar datos'}
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          title="Reiniciar conversacion"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            toolEvents={msg.role === 'assistant' ? toolEvents.get(msg.id) : undefined}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {suggestions.map(s => (
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

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-border/60 shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 focus-within:border-accent/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={role === 'clinica'
              ? 'Pregunta sobre medicos, pacientes, metricas...'
              : 'Pregunta sobre tus pacientes, biomarcadores...'
            }
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
            {isStreaming ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/40 text-center mt-1.5">
          Enter para enviar · Shift+Enter nueva linea · Consulta datos reales de la plataforma
        </p>
      </div>
    </div>
  )
}
