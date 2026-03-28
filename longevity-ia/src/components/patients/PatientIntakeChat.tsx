'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, Send, SkipForward, CheckCircle2, ChevronRight } from 'lucide-react'
import type { ClinicalHistory } from '@/types'

// ─── Secciones y preguntas ────────────────────────────────────────────────────

const SECTIONS = [
  'Datos Antropométricos',
  'Alergias',
  'Alimentación',
  'Estilo de Vida',
  'Historial Familiar',
  'Historial Reciente',
]

type QuestionType = 'text' | 'number' | 'choice' | 'multiselect'

interface Question {
  id: string
  section: string
  sectionIndex: number
  text: string
  type: QuestionType
  choices?: string[]
  optional?: boolean
  ack: (v: string) => string
}

const QUESTIONS: Question[] = [
  // ── Antropométrico ───────────────────────────────────────────────────────
  {
    id: 'waist', section: 'Datos Antropométricos', sectionIndex: 0,
    text: '¿Cuál es tu circunferencia de cintura aproximada? (en centímetros)',
    type: 'number', optional: true,
    ack: (v) => v ? `Anotado: ${v} cm de cintura.` : 'Entendido, continuamos.'
  },
  {
    id: 'bp', section: 'Datos Antropométricos', sectionIndex: 0,
    text: '¿Conoces tu presión arterial habitual? Escríbela así: 120/80',
    type: 'text', optional: true,
    ack: (v) => v ? `Registrado: ${v} mmHg.` : 'Sin problema.'
  },
  // ── Alergias ─────────────────────────────────────────────────────────────
  {
    id: 'food_allergy', section: 'Alergias', sectionIndex: 1,
    text: '¿Tienes alguna alergia alimentaria? Si no tienes, escribe "ninguna".',
    type: 'text', optional: false,
    ack: (v) => v.toLowerCase().includes('ninguna') ? 'Perfecto, sin alergias alimentarias.' : `Anotado: alergia a ${v}.`
  },
  {
    id: 'med_allergy', section: 'Alergias', sectionIndex: 1,
    text: '¿Eres alérgico/a a algún medicamento?',
    type: 'text', optional: true,
    ack: (v) => v ? `Registrado: alergia a ${v}.` : 'Sin alergias a medicamentos conocidas.'
  },
  // ── Alimentación ─────────────────────────────────────────────────────────
  {
    id: 'diet_type', section: 'Alimentación', sectionIndex: 2,
    text: '¿Cómo describirías tu forma de alimentarte?',
    type: 'choice',
    choices: ['Omnívora (de todo)', 'Vegetariana', 'Vegana', 'Keto / baja en carbohidratos', 'Mediterránea', 'Sin patrón definido'],
    ack: (v) => `Dieta: ${v}.`
  },
  {
    id: 'meals_per_day', section: 'Alimentación', sectionIndex: 2,
    text: '¿Cuántas veces comes al día?',
    type: 'choice',
    choices: ['1-2 veces', '3 veces', '4-5 veces', 'Más de 5'],
    ack: (v) => `Anotado: ${v} al día.`
  },
  {
    id: 'alcohol', section: 'Alimentación', sectionIndex: 2,
    text: '¿Consumes bebidas alcohólicas?',
    type: 'choice',
    choices: ['No consumo', 'Muy ocasionalmente', 'Fines de semana', 'Frecuentemente (varios días por semana)'],
    ack: (_v) => 'Entendido.'
  },
  {
    id: 'supplements', section: 'Alimentación', sectionIndex: 2,
    text: '¿Tomas algún suplemento, vitamina u otro producto natural? Escribe cuál(es).',
    type: 'text', optional: true,
    ack: (v) => v ? `Anotado: ${v}.` : 'Sin suplementos actualmente.'
  },
  // ── Estilo de vida ────────────────────────────────────────────────────────
  {
    id: 'exercise', section: 'Estilo de Vida', sectionIndex: 3,
    text: '¿Haces ejercicio actualmente? Describe qué tipo y con qué frecuencia.',
    type: 'text', optional: true,
    ack: (v) => v ? `Actividad registrada: ${v}.` : 'Sin actividad física regular actualmente.'
  },
  {
    id: 'sleep', section: 'Estilo de Vida', sectionIndex: 3,
    text: '¿Cuántas horas duermes por noche generalmente?',
    type: 'choice',
    choices: ['Menos de 5 horas', '5 a 6 horas', '7 a 8 horas', 'Más de 8 horas'],
    ack: (v) => `Sueño: ${v}.`
  },
  {
    id: 'smoker', section: 'Estilo de Vida', sectionIndex: 3,
    text: '¿Fumas o has fumado alguna vez?',
    type: 'choice',
    choices: ['Nunca he fumado', 'Exfumador/a', 'Fumo ocasionalmente', 'Fumo a diario'],
    ack: (_v) => 'Anotado.'
  },
  {
    id: 'stress', section: 'Estilo de Vida', sectionIndex: 3,
    text: '¿Cómo calificarías tu nivel de estrés habitual?',
    type: 'choice',
    choices: ['Bajo — me siento tranquilo/a', 'Moderado — a veces bajo presión', 'Alto — frecuentemente estresado/a', 'Muy alto — estrés casi constante'],
    ack: (_v) => 'Registrado.'
  },
  // ── Historial familiar ────────────────────────────────────────────────────
  {
    id: 'family_conditions', section: 'Historial Familiar', sectionIndex: 4,
    text: '¿Algún familiar cercano (padres, hermanos, abuelos) ha tenido alguna de estas condiciones? Puedes elegir varias.',
    type: 'multiselect',
    choices: ['Diabetes tipo 2', 'Cáncer', 'Enfermedades del corazón', 'Hipertensión', 'Alzheimer o demencia', 'Obesidad', 'ACV / derrame cerebral', 'Ninguna conocida'],
    ack: (_v) => 'Historial familiar registrado.'
  },
  {
    id: 'family_details', section: 'Historial Familiar', sectionIndex: 4,
    text: '¿Quieres agregar algún detalle? Por ejemplo: "mi papá tuvo un infarto a los 55 años".',
    type: 'text', optional: true,
    ack: (v) => v ? 'Detalles registrados.' : 'De acuerdo.'
  },
  // ── Historial reciente ────────────────────────────────────────────────────
  {
    id: 'recent_condition', section: 'Historial Reciente', sectionIndex: 5,
    text: '¿Cuál fue tu enfermedad o condición médica más reciente?',
    type: 'text', optional: true,
    ack: (v) => v ? `Anotado: ${v}.` : 'Sin enfermedades recientes registradas.'
  },
  {
    id: 'recent_treatment', section: 'Historial Reciente', sectionIndex: 5,
    text: '¿Qué tratamiento o medicamentos te indicaron en ese momento?',
    type: 'text', optional: true,
    ack: (v) => v ? 'Tratamiento registrado.' : 'Sin tratamiento específico.'
  },
  {
    id: 'current_meds', section: 'Historial Reciente', sectionIndex: 5,
    text: 'Por último: ¿tomas algún medicamento de forma regular actualmente? Si sí, ¿cuál(es)?',
    type: 'text', optional: true,
    ack: (v) => v ? `Medicamentos anotados: ${v}.` : 'Sin medicamentos regulares actualmente.'
  },
]

// ─── Convertir respuestas → ClinicalHistory ───────────────────────────────────

function buildHistory(ans: Record<string, string>): ClinicalHistory {
  return {
    anthropometric: {
      waist_cm: ans['waist'] ? (parseFloat(ans['waist']) || null) : null,
      blood_pressure: ans['bp'] || null,
    },
    allergies: {
      food: ans['food_allergy'] || null,
      medication: ans['med_allergy'] || null,
    },
    diet: {
      type: ans['diet_type'] || '',
      meals_per_day: ans['meals_per_day'] || '',
      alcohol: ans['alcohol'] || '',
      supplements: ans['supplements'] || null,
    },
    lifestyle: {
      exercise: ans['exercise'] || '',
      sleep_hours: ans['sleep'] || '',
      smoker: ans['smoker'] || '',
      stress_level: ans['stress'] || '',
    },
    family_history: {
      conditions: ans['family_conditions'] ? ans['family_conditions'].split('||') : [],
      details: ans['family_details'] || null,
    },
    recent_illness: {
      condition: ans['recent_condition'] || null,
      treatment: ans['recent_treatment'] || null,
      current_medications: ans['current_meds'] || null,
    },
    completed_at: new Date().toISOString(),
  }
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  from: 'bot' | 'user'
  text: string
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientIntakeChatProps {
  patientId: string
  patientName: string
  onComplete?: () => void
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PatientIntakeChat({ patientId, patientName, onComplete }: PatientIntakeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(-1)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [input, setInput] = useState('')
  const [multiSelected, setMultiSelected] = useState<string[]>([])
  const [phase, setPhase] = useState<'chat' | 'saving' | 'done'>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const startedRef = useRef(false)

  // Auto-scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Enviar mensaje del bot con delay simulado
  const botSay = useCallback((text: string, delay = 700): Promise<void> => {
    return new Promise(resolve => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, { id: crypto.randomUUID(), from: 'bot', text }])
        resolve()
      }, delay)
    })
  }, [])

  // Saludo inicial
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    async function greet() {
      await botSay(`¡Hola, ${patientName}! Soy tu asistente de salud de Longevity IA.`, 400)
      await botSay('Voy a hacerte algunas preguntas para conocer mejor tu condición física, estilo de vida e historial médico.', 1400)
      await botSay('Esta información complementará tu análisis de longevidad. Puedes saltar cualquier pregunta opcional con el botón de omitir.', 2600)
      await botSay('¡Empezamos!', 3600)
      setTimeout(() => setCurrentQIndex(0), 4200)
    }

    greet()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Hacer la siguiente pregunta al cambiar el índice
  useEffect(() => {
    if (currentQIndex < 0 || currentQIndex >= QUESTIONS.length) return
    const q = QUESTIONS[currentQIndex]
    const prevQ = currentQIndex > 0 ? QUESTIONS[currentQIndex - 1] : null
    const newSection = !prevQ || prevQ.sectionIndex !== q.sectionIndex

    async function ask() {
      if (newSection) {
        await botSay(`— ${q.section} —`, 500)
        await botSay(q.text, 1100)
      } else {
        await botSay(q.text, 600)
      }
      inputRef.current?.focus()
    }

    ask()
  }, [currentQIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Procesar respuesta del usuario
  async function handleAnswer(rawValue: string) {
    const q = QUESTIONS[currentQIndex]
    const trimmed = rawValue.trim()

    // Mensaje del usuario en el chat
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      from: 'user',
      text: trimmed || '(omitir)',
    }])
    setInput('')
    setMultiSelected([])

    // Guardar respuesta
    const newAnswers = { ...answers, [q.id]: trimmed }
    setAnswers(newAnswers)

    // Acuse del bot
    await botSay(q.ack(trimmed), 700)

    const next = currentQIndex + 1
    if (next >= QUESTIONS.length) {
      await botSay('¡Excelente! Ya tengo toda tu información.', 800)
      await botSay('Guardando tu historial clínico...', 1400)
      setPhase('saving')
      await saveHistory(newAnswers)
    } else {
      setCurrentQIndex(next)
    }
  }

  async function saveHistory(finalAnswers: Record<string, string>) {
    try {
      const history = buildHistory(finalAnswers)
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinical_history: history }),
      })
      if (!res.ok) throw new Error('Error al guardar')

      setPhase('done')
      await botSay('¡Historial guardado exitosamente! Tu información está segura en tu perfil de Longevity IA.', 0)
      onComplete?.()
    } catch {
      setPhase('chat')
      await botSay('Hubo un error al guardar. Por favor intenta nuevamente.', 0)
    }
  }

  function handleMultiConfirm() {
    handleAnswer(multiSelected.length === 0 ? 'Ninguna conocida' : multiSelected.join('||'))
  }

  function toggleMulti(option: string) {
    setMultiSelected(prev =>
      prev.includes(option) ? prev.filter(x => x !== option) : [...prev, option]
    )
  }

  const currentQ = currentQIndex >= 0 && currentQIndex < QUESTIONS.length ? QUESTIONS[currentQIndex] : null
  const progress = currentQIndex < 0 ? 0 : Math.round((currentQIndex / QUESTIONS.length) * 100)

  return (
    <div className="flex flex-col" style={{ height: '65vh', minHeight: 480, maxHeight: 760 }}>

      {/* Barra de progreso */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{currentQ ? currentQ.section : 'Iniciando…'}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-1 mt-2">
          {SECTIONS.map((_, i) => {
            const active = currentQ?.sectionIndex === i
            const done = (currentQ?.sectionIndex ?? -1) > i || phase === 'done'
            return (
              <div
                key={i}
                className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${
                  done ? 'bg-accent' : active ? 'bg-accent/50' : 'bg-muted'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.from === 'bot' && (
              <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Bot size={14} className="text-accent" />
              </div>
            )}
            <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.from === 'bot'
                ? 'bg-card border border-border text-foreground rounded-tl-sm'
                : 'bg-accent/15 border border-accent/25 text-foreground rounded-tr-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Indicador de escritura */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
              <Bot size={14} className="text-accent" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Estado completado */}
        {phase === 'done' && (
          <div className="flex justify-center py-6">
            <div className="flex items-center gap-2 text-accent">
              <CheckCircle2 size={20} />
              <span className="text-sm font-semibold">Historial clínico completado</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Área de entrada */}
      {phase === 'chat' && currentQ && !isTyping && (
        <div className="mt-4 space-y-3 shrink-0">

          {/* Opciones de selección única */}
          {currentQ.type === 'choice' && (
            <div className="flex flex-wrap gap-2">
              {currentQ.choices!.map(c => (
                <button
                  key={c}
                  onClick={() => handleAnswer(c)}
                  className="px-3 py-1.5 text-sm rounded-full border border-border text-muted-foreground hover:border-accent hover:text-accent hover:bg-accent/5 transition-all"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Selección múltiple */}
          {currentQ.type === 'multiselect' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {currentQ.choices!.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleMulti(c)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                      multiSelected.includes(c)
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                onClick={handleMultiConfirm}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
              >
                <ChevronRight size={14} />
                Continuar
              </button>
            </div>
          )}

          {/* Entrada de texto / número */}
          {(currentQ.type === 'text' || currentQ.type === 'number') && (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type={currentQ.type === 'number' ? 'number' : 'text'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleAnswer(input) }}
                placeholder="Escribe tu respuesta…"
                className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
              />
              {currentQ.optional && (
                <button
                  onClick={() => handleAnswer('')}
                  title="Omitir pregunta"
                  className="px-3 py-2 text-muted-foreground border border-border rounded-xl hover:border-accent/50 hover:text-foreground transition-colors"
                >
                  <SkipForward size={14} />
                </button>
              )}
              <button
                onClick={() => { if (input.trim()) handleAnswer(input) }}
                disabled={!input.trim()}
                className="px-4 py-2 bg-accent text-background rounded-xl hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Estado guardando */}
      {phase === 'saving' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground shrink-0">
          <span className="w-4 h-4 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <span className="text-sm">Guardando historial…</span>
        </div>
      )}
    </div>
  )
}
