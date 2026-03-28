'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, Send, SkipForward, CheckCircle2, ChevronRight } from 'lucide-react'
import type { ClinicalHistory } from '@/types'

// ─── Secciones ────────────────────────────────────────────────────────────────

const SECTIONS = [
  'Datos Generales',
  'Alergias',
  'Alimentación',
  'Actividad Física y Sueño',
  'Salud Mental',
  'Salud Cardiovascular',
  'Historial Médico',
  'Historial Familiar',
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
  // ── SECCIÓN 0: Datos Generales ───────────────────────────────────────────
  {
    id: 'waist', section: 'Datos Generales', sectionIndex: 0,
    text: '¿Cuál es tu circunferencia de cintura aproximada? (en centímetros)',
    type: 'number', optional: true,
    ack: (v) => v ? `Anotado: ${v} cm de cintura.` : 'Continuamos sin ese dato.',
  },
  {
    id: 'bp', section: 'Datos Generales', sectionIndex: 0,
    text: '¿Conoces tu presión arterial habitual? Escríbela así: 120/80',
    type: 'text', optional: true,
    ack: (v) => v ? `Registrado: ${v} mmHg.` : 'Sin problema, continuamos.',
  },
  {
    id: 'energy_level', section: 'Datos Generales', sectionIndex: 0,
    text: '¿Cómo describes tu nivel de energía habitual a lo largo del día?',
    type: 'choice',
    choices: ['Muy alta — me siento vigoroso/a', 'Alta — generalmente activo/a', 'Moderada — con altibajos', 'Baja — me canso con facilidad', 'Muy baja — fatiga crónica'],
    ack: (v) => `Nivel de energía: ${v.split(' — ')[0]}.`,
  },

  // ── SECCIÓN 1: Alergias ──────────────────────────────────────────────────
  {
    id: 'food_allergy', section: 'Alergias', sectionIndex: 1,
    text: '¿Tienes alergias o intolerancias alimentarias conocidas? Si no tienes, escribe "ninguna".',
    type: 'text', optional: false,
    ack: (v) => v.toLowerCase().includes('ninguna') ? 'Sin alergias alimentarias.' : `Anotado: ${v}.`,
  },
  {
    id: 'med_allergy', section: 'Alergias', sectionIndex: 1,
    text: '¿Eres alérgico/a a algún medicamento? (ej: penicilina, ibuprofeno)',
    type: 'text', optional: true,
    ack: (v) => v ? `⚠ Alergia a medicamento registrada: ${v}.` : 'Sin alergias a medicamentos.',
  },
  {
    id: 'env_allergy', section: 'Alergias', sectionIndex: 1,
    text: '¿Tienes alergias ambientales?',
    type: 'choice',
    choices: ['No tengo', 'Polen o plantas', 'Ácaros o polvo', 'Animales', 'Látex u otras'],
    ack: (v) => v === 'No tengo' ? 'Sin alergias ambientales.' : `Registrado: ${v}.`,
  },

  // ── SECCIÓN 2: Alimentación ──────────────────────────────────────────────
  {
    id: 'diet_type', section: 'Alimentación', sectionIndex: 2,
    text: '¿Cómo describes tu patrón de alimentación habitual?',
    type: 'choice',
    choices: ['Omnívora (de todo)', 'Vegetariana', 'Vegana', 'Keto / baja en carbohidratos', 'Mediterránea', 'Paleo', 'Sin patrón definido'],
    ack: (v) => `Patrón alimentario: ${v}.`,
  },
  {
    id: 'meals_per_day', section: 'Alimentación', sectionIndex: 2,
    text: '¿Cuántas veces comes al día?',
    type: 'choice',
    choices: ['1-2 veces (ayuno intermitente)', '3 veces al día', '4-5 veces al día', 'Más de 5 (picoteo frecuente)'],
    ack: (v) => `Frecuencia de comidas: ${v}.`,
  },
  {
    id: 'water_intake', section: 'Alimentación', sectionIndex: 2,
    text: '¿Cuánta agua bebes al día aproximadamente?',
    type: 'choice',
    choices: ['Menos de 1 litro', '1 a 1.5 litros', '1.5 a 2 litros', 'Más de 2 litros'],
    ack: (v) => `Hidratación: ${v} al día.`,
  },
  {
    id: 'processed_food', section: 'Alimentación', sectionIndex: 2,
    text: '¿Con qué frecuencia consumes alimentos ultraprocesados (comida rápida, snacks, refrescos, embutidos)?',
    type: 'choice',
    choices: ['Rara vez o nunca', '1-2 veces por semana', '3-4 veces por semana', 'Casi todos los días'],
    ack: (v) => `Consumo de procesados: ${v}.`,
  },
  {
    id: 'alcohol', section: 'Alimentación', sectionIndex: 2,
    text: '¿Consumes bebidas alcohólicas?',
    type: 'choice',
    choices: ['No consumo', 'Muy ocasionalmente (menos de 1 vez al mes)', 'Fines de semana', 'Varios días por semana', 'A diario'],
    ack: (_v) => 'Entendido.',
  },
  {
    id: 'supplements', section: 'Alimentación', sectionIndex: 2,
    text: '¿Tomas algún suplemento, vitamina o producto natural actualmente? Escribe cuál(es).',
    type: 'text', optional: true,
    ack: (v) => v ? `Suplementos anotados: ${v}.` : 'Sin suplementos actualmente.',
  },

  // ── SECCIÓN 3: Actividad Física y Sueño ─────────────────────────────────
  {
    id: 'exercise_type', section: 'Actividad Física y Sueño', sectionIndex: 3,
    text: '¿Qué tipo de actividad física realizas principalmente?',
    type: 'choice',
    choices: ['Soy sedentario/a', 'Caminata o cardio ligero', 'Entrenamiento de fuerza o pesas', 'Cardio intenso (correr, ciclismo)', 'Entrenamiento mixto (fuerza + cardio)', 'Yoga o Pilates', 'Deporte de equipo o artes marciales'],
    ack: (v) => `Actividad física: ${v}.`,
  },
  {
    id: 'exercise_frequency', section: 'Actividad Física y Sueño', sectionIndex: 3,
    text: '¿Con qué frecuencia haces ejercicio por semana?',
    type: 'choice',
    choices: ['No hago ejercicio', '1-2 veces por semana', '3-4 veces por semana', '5 o más veces por semana'],
    ack: (v) => `Frecuencia: ${v}.`,
  },
  {
    id: 'sedentary_hours', section: 'Actividad Física y Sueño', sectionIndex: 3,
    text: '¿Cuántas horas al día permaneces sentado/a (trabajo de escritorio, pantallas, descanso)?',
    type: 'choice',
    choices: ['Menos de 4 horas', '4 a 6 horas', '6 a 8 horas', 'Más de 8 horas'],
    ack: (v) => `Horas sedentario/a: ${v}.`,
  },
  {
    id: 'sleep_hours', section: 'Actividad Física y Sueño', sectionIndex: 3,
    text: '¿Cuántas horas duermes por noche generalmente?',
    type: 'choice',
    choices: ['Menos de 5 horas', '5 a 6 horas', '7 a 8 horas', 'Más de 8 horas'],
    ack: (v) => `Sueño: ${v} por noche.`,
  },
  {
    id: 'sleep_quality', section: 'Actividad Física y Sueño', sectionIndex: 3,
    text: '¿Cómo calificarías la calidad de tu sueño?',
    type: 'choice',
    choices: ['Excelente — me despierto descansado/a', 'Buena — generalmente duermo bien', 'Regular — a veces me desvelo o no descanso bien', 'Mala — duermo mal con frecuencia o me despierto cansado/a'],
    ack: (v) => `Calidad de sueño: ${v.split(' — ')[0]}.`,
  },
  {
    id: 'snoring', section: 'Actividad Física y Sueño', sectionIndex: 3,
    text: '¿Roncas o alguien te ha comentado que dejas de respirar mientras duermes?',
    type: 'choice', optional: true,
    choices: ['No / No sé', 'Ronco leve y ocasionalmente', 'Ronco fuerte y frecuentemente', 'Me han dicho que hago pausas al respirar'],
    ack: (v) => `Sueño registrado: ${v}.`,
  },

  // ── SECCIÓN 4: Salud Mental ──────────────────────────────────────────────
  {
    id: 'stress_level', section: 'Salud Mental', sectionIndex: 4,
    text: '¿Cómo calificarías tu nivel de estrés habitual?',
    type: 'choice',
    choices: ['Bajo — me siento tranquilo/a la mayor parte del tiempo', 'Moderado — a veces bajo presión', 'Alto — frecuentemente estresado/a', 'Muy alto — estrés casi constante que afecta mi vida'],
    ack: (_v) => 'Registrado.',
  },
  {
    id: 'mood', section: 'Salud Mental', sectionIndex: 4,
    text: '¿Cómo describes tu estado de ánimo habitual?',
    type: 'choice',
    choices: ['Estable y positivo', 'Neutro, sin grandes cambios', 'Irritable con frecuencia', 'Episodios de tristeza o desmotivación', 'Cambios de humor bruscos y frecuentes'],
    ack: (_v) => 'Anotado.',
  },
  {
    id: 'anxiety', section: 'Salud Mental', sectionIndex: 4,
    text: '¿Experimentas ansiedad o preocupación excesiva?',
    type: 'choice',
    choices: ['Nunca o raramente', 'Ocasionalmente, en situaciones concretas', 'Frecuentemente, me cuesta manejarla', 'Casi siempre — afecta mi sueño, trabajo o relaciones'],
    ack: (_v) => 'Anotado.',
  },
  {
    id: 'cognitive', section: 'Salud Mental', sectionIndex: 4,
    text: '¿Has notado cambios en tu memoria o capacidad de concentración?',
    type: 'choice',
    choices: ['Sin cambios, me siento igual de bien', 'Olvidos leves y ocasionales (normal para mi edad)', 'Dificultad de concentración frecuente', 'Olvidos frecuentes que me preocupan'],
    ack: (_v) => 'Registrado.',
  },

  // ── SECCIÓN 5: Salud Cardiovascular ─────────────────────────────────────
  {
    id: 'chest_pain', section: 'Salud Cardiovascular', sectionIndex: 5,
    text: '¿Has tenido dolor, presión u opresión en el pecho?',
    type: 'choice',
    choices: ['Nunca', 'Rara vez, solo con esfuerzo muy intenso', 'Ocasionalmente con esfuerzo moderado', 'Frecuentemente o también en reposo'],
    ack: (_v) => 'Anotado.',
  },
  {
    id: 'shortness_of_breath', section: 'Salud Cardiovascular', sectionIndex: 5,
    text: '¿Tienes falta de aire o dificultad para respirar?',
    type: 'choice',
    choices: ['No', 'Solo con ejercicio muy intenso', 'Al subir escaleras o esfuerzo moderado', 'En reposo o al hablar'],
    ack: (_v) => 'Registrado.',
  },
  {
    id: 'palpitations', section: 'Salud Cardiovascular', sectionIndex: 5,
    text: '¿Tienes palpitaciones (sensación de corazón acelerado o latidos irregulares)?',
    type: 'choice',
    choices: ['Nunca', 'Ocasionalmente bajo estrés o cafeína', 'Frecuentemente sin causa clara', 'Con frecuencia y me preocupan'],
    ack: (_v) => 'Anotado.',
  },
  {
    id: 'thyroid_symptoms', section: 'Salud Cardiovascular', sectionIndex: 5,
    text: '¿Tienes alguno de estos síntomas de forma frecuente?',
    type: 'choice',
    choices: ['Ninguno de estos', 'Fatiga excesiva, frío constante, piel seca (puede ser hipotiroidismo)', 'Nerviosismo, calor excesivo, pérdida de peso sin causa (puede ser hipertiroidismo)', 'Cambios de peso inexplicables sin cambios en dieta o ejercicio'],
    ack: (v) => v === 'Ninguno de estos' ? 'Sin síntomas tiroideos.' : 'Anotado para evaluar.',
  },
  {
    id: 'hormonal_symptoms', section: 'Salud Cardiovascular', sectionIndex: 5,
    text: '¿Tienes síntomas hormonales? (ej: bochornos, ciclo menstrual irregular, cambios en libido, disfunción eréctil, caída de cabello, acné hormonal)',
    type: 'text', optional: true,
    ack: (v) => v ? `Síntomas hormonales anotados: ${v}.` : 'Sin síntomas hormonales.',
  },

  // ── SECCIÓN 6: Historial Médico ──────────────────────────────────────────
  {
    id: 'chronic_conditions', section: 'Historial Médico', sectionIndex: 6,
    text: '¿Tienes alguna condición médica diagnosticada? Puedes elegir varias.',
    type: 'multiselect',
    choices: ['Diabetes tipo 1 o 2', 'Hipertensión arterial', 'Hipotiroidismo o hipertiroidismo', 'Síndrome metabólico u obesidad', 'Enfermedad cardiovascular (angina, infarto, arritmia)', 'Enfermedad autoinmune (lupus, artritis, Hashimoto…)', 'Enfermedad renal crónica', 'Apnea del sueño', 'Depresión o ansiedad diagnosticada', 'Cáncer (presente o pasado)', 'Ninguna conocida'],
    ack: (_v) => 'Condiciones registradas.',
  },
  {
    id: 'surgeries', section: 'Historial Médico', sectionIndex: 6,
    text: '¿Has tenido cirugías, hospitalizaciones o procedimientos médicos importantes?',
    type: 'text', optional: true,
    ack: (v) => v ? `Historial quirúrgico: ${v}.` : 'Sin cirugías o procedimientos relevantes.',
  },
  {
    id: 'smoker', section: 'Historial Médico', sectionIndex: 6,
    text: '¿Fumas o has fumado alguna vez?',
    type: 'choice',
    choices: ['Nunca he fumado', 'Exfumador/a (dejé hace más de 1 año)', 'Exfumador/a reciente (dejé hace menos de 1 año)', 'Fumo ocasionalmente (socialmente)', 'Fumo a diario'],
    ack: (_v) => 'Anotado.',
  },
  {
    id: 'current_meds', section: 'Historial Médico', sectionIndex: 6,
    text: '¿Tomas algún medicamento de forma regular actualmente? Si sí, ¿cuál(es) y para qué?',
    type: 'text', optional: true,
    ack: (v) => v ? `Medicamentos actuales anotados: ${v}.` : 'Sin medicamentos regulares.',
  },
  {
    id: 'recent_condition', section: 'Historial Médico', sectionIndex: 6,
    text: '¿Cuál fue tu enfermedad o condición médica más reciente (último año)?',
    type: 'text', optional: true,
    ack: (v) => v ? `Anotado: ${v}.` : 'Sin enfermedades recientes registradas.',
  },
  {
    id: 'recent_treatment', section: 'Historial Médico', sectionIndex: 6,
    text: '¿Qué tratamiento o medicamentos te indicaron en ese momento?',
    type: 'text', optional: true,
    ack: (v) => v ? 'Tratamiento registrado.' : 'Sin tratamiento específico.',
  },

  // ── SECCIÓN 7: Historial Familiar ────────────────────────────────────────
  {
    id: 'family_conditions', section: 'Historial Familiar', sectionIndex: 7,
    text: '¿Algún familiar de primer grado (padres, hermanos, abuelos) ha tenido alguna de estas condiciones? Puedes elegir varias.',
    type: 'multiselect',
    choices: ['Diabetes tipo 2', 'Cáncer (cualquier tipo)', 'Enfermedades del corazón', 'Hipertensión arterial', 'Alzheimer o demencia', 'ACV o derrame cerebral', 'Osteoporosis', 'Enfermedad renal', 'Enfermedades autoinmunes', 'Ninguna conocida'],
    ack: (_v) => 'Historial familiar registrado.',
  },
  {
    id: 'family_longevity', section: 'Historial Familiar', sectionIndex: 7,
    text: '¿Tus familiares cercanos han tenido una vida larga?',
    type: 'choice',
    choices: ['Sí, varios vivieron o viven más de 85 años', 'La mayoría llegó entre 70 y 85 años', 'Varios fallecieron antes de los 70 años', 'No tengo información suficiente'],
    ack: (_v) => 'Registrado.',
  },
  {
    id: 'family_details', section: 'Historial Familiar', sectionIndex: 7,
    text: '¿Quieres agregar algún detalle? (ej: "mi padre tuvo un infarto a los 55 años", "mi madre tiene diabetes tipo 2")',
    type: 'text', optional: true,
    ack: (v) => v ? 'Detalles familiares registrados.' : 'De acuerdo.',
  },
]

// ─── Convertir respuestas → ClinicalHistory ───────────────────────────────────

function buildHistory(ans: Record<string, string>): ClinicalHistory {
  return {
    anthropometric: {
      waist_cm: ans['waist'] ? (parseFloat(ans['waist']) || null) : null,
      blood_pressure: ans['bp'] || null,
      energy_level: ans['energy_level'] || null,
    },
    allergies: {
      food: ans['food_allergy'] || null,
      medication: ans['med_allergy'] || null,
      environmental: ans['env_allergy'] === 'No tengo' ? null : (ans['env_allergy'] || null),
    },
    diet: {
      type: ans['diet_type'] || '',
      meals_per_day: ans['meals_per_day'] || '',
      water_intake: ans['water_intake'] || null,
      processed_food: ans['processed_food'] || null,
      alcohol: ans['alcohol'] || '',
      supplements: ans['supplements'] || null,
    },
    physical_activity: {
      type: ans['exercise_type'] || null,
      frequency: ans['exercise_frequency'] || null,
      sedentary_hours: ans['sedentary_hours'] || null,
    },
    sleep: {
      hours: ans['sleep_hours'] || '',
      quality: ans['sleep_quality'] || null,
      snoring: ans['snoring'] || null,
    },
    mental_health: {
      stress_level: ans['stress_level'] || '',
      mood: ans['mood'] || null,
      anxiety: ans['anxiety'] || null,
      cognitive: ans['cognitive'] || null,
    },
    cardiovascular: {
      chest_pain: ans['chest_pain'] || null,
      shortness_of_breath: ans['shortness_of_breath'] || null,
      palpitations: ans['palpitations'] || null,
      thyroid_symptoms: ans['thyroid_symptoms'] === 'Ninguno de estos' ? null : (ans['thyroid_symptoms'] || null),
      hormonal_symptoms: ans['hormonal_symptoms'] || null,
    },
    medical_history: {
      chronic_conditions: ans['chronic_conditions'] ? ans['chronic_conditions'].split('||').filter(c => c !== 'Ninguna conocida') : [],
      surgeries: ans['surgeries'] || null,
      smoker: ans['smoker'] || '',
      current_medications: ans['current_meds'] || null,
      recent_condition: ans['recent_condition'] || null,
      recent_treatment: ans['recent_treatment'] || null,
    },
    family_history: {
      conditions: ans['family_conditions'] ? ans['family_conditions'].split('||').filter(c => c !== 'Ninguna conocida') : [],
      longevity: ans['family_longevity'] || null,
      details: ans['family_details'] || null,
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

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

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    async function greet() {
      await botSay(`¡Hola, ${patientName}! Soy tu asistente clínico de Longevity IA.`, 400)
      await botSay('Voy a hacerte una serie de preguntas para construir tu perfil de salud completo. Esta evaluación sigue los estándares clínicos de UpToDate.', 1500)
      await botSay('Cubre 8 áreas: datos generales, alergias, alimentación, actividad física y sueño, salud mental, salud cardiovascular, historial médico e historial familiar.', 2800)
      await botSay('Las preguntas opcionales puedes saltarlas con el botón de omitir. ¡Empezamos!', 4200)
      setTimeout(() => setCurrentQIndex(0), 5000)
    }

    greet()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleAnswer(rawValue: string) {
    const q = QUESTIONS[currentQIndex]
    const trimmed = rawValue.trim()

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      from: 'user',
      text: trimmed || '(omitir)',
    }])
    setInput('')
    setMultiSelected([])

    const newAnswers = { ...answers, [q.id]: trimmed }
    setAnswers(newAnswers)

    await botSay(q.ack(trimmed), 700)

    const next = currentQIndex + 1
    if (next >= QUESTIONS.length) {
      await botSay('¡Excelente! Ya tengo toda tu información de salud.', 800)
      await botSay('Guardando tu historial clínico completo…', 1400)
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
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinical_history: history }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Error ${res.status}`)
      }

      setPhase('done')
      await botSay('¡Historial guardado exitosamente! Tu perfil de salud completo está listo en Longevity IA.', 0)
      onComplete?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setPhase('chat')
      await botSay(`No se pudo guardar el historial: ${msg}. Por favor intenta nuevamente.`, 0)
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
    <div className="flex flex-col" style={{ height: '70vh', minHeight: 520, maxHeight: 820 }}>

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

      {phase === 'saving' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground shrink-0">
          <span className="w-4 h-4 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <span className="text-sm">Guardando historial…</span>
        </div>
      )}
    </div>
  )
}
