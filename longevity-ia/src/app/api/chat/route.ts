export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClientFromRequest } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import type { AIAnalysis, Patient } from '@/types'

// ─────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  patient: Pick<Patient, 'name' | 'age' | 'gender'> & { id?: string; clinical_history?: unknown }
  analysis: AIAnalysis
}

// ─────────────────────────────────────────────────────────────────
// CONSTRUCTOR DEL SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────

const SYSTEM_NAMES: Record<string, string> = {
  cardiovascular: 'Cardiovascular',
  metabolic:      'Metabólico',
  hepatic:        'Hepático (Hígado)',
  renal:          'Renal (Riñones)',
  immune:         'Inmune',
  hematologic:    'Hematológico (Sangre)',
  inflammatory:   'Inflamatorio',
  vitamins:       'Vitaminas & Micronutrientes',
}

const GENDER_LABEL: Record<string, string> = {
  male:   'Masculino',
  female: 'Femenino',
  other:  'Otro',
}

function formatExistingClinicalHistory(ch: unknown): string {
  if (!ch || typeof ch !== 'object') return '  (sin historia clínica registrada)'
  const h = ch as Record<string, unknown>
  const parts: string[] = []

  const section = (key: string, label: string) => {
    const s = h[key]
    if (!s || typeof s !== 'object') return
    const entries = Object.entries(s as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => `    ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    if (entries.length > 0) parts.push(`  ${label}:\n${entries.join('\n')}`)
  }

  section('anthropometric', 'Antropométricos')
  section('allergies', 'Alergias')
  section('diet', 'Alimentación')
  section('physical_activity', 'Actividad Física')
  section('sleep', 'Sueño')
  section('mental_health', 'Salud Mental')
  section('cardiovascular', 'Cardiovascular')
  section('medical_history', 'Historial Médico')
  section('family_history', 'Historial Familiar')

  return parts.length > 0 ? parts.join('\n') : '  (sin historia clínica registrada)'
}

function buildSystemPrompt(
  patient: ChatRequest['patient'],
  analysis: AIAnalysis,
): string {
  const scores = Object.entries(analysis.systemScores)
    .map(([k, v]) => `  • ${SYSTEM_NAMES[k] ?? k}: ${v}/100`)
    .join('\n')

  const protocol = (analysis.protocol ?? [])
    .map(p =>
      `  ${p.number}. [${p.category}] ${p.molecule}\n` +
      `     Dosis: ${p.dose}\n` +
      `     Resultado esperado: ${p.expectedResult}\n` +
      `     Urgencia: ${p.urgency}`,
    )
    .join('\n')

  const risks = (analysis.risks ?? [])
    .map(r => `  • ${r.disease}: ${r.probability}% de probabilidad en ${r.horizon}`)
    .join('\n')

  const strengths = (analysis.swot?.strengths ?? [])
    .map(s => `  • ${s.label}: ${s.detail}`)
    .join('\n') || '  (ninguna registrada)'

  const weaknesses = (analysis.swot?.weaknesses ?? [])
    .map(s => `  • ${s.label}: ${s.detail}`)
    .join('\n') || '  (ninguna registrada)'

  const ageDiff = patient.age - analysis.longevity_age
  const bioAgeNote =
    ageDiff > 2
      ? `Su cuerpo muestra desgaste de alguien ${ageDiff} años mayor.`
      : ageDiff < -2
      ? `Su cuerpo funciona ${Math.abs(ageDiff)} años más joven de lo que corresponde.`
      : `Su edad biológica coincide con su edad cronológica.`

  return `Eres Longevity IA, el asistente de inteligencia artificial especializado en medicina regenerativa, longevidad y optimización biológica. Estás integrado en el dashboard de salud personal de ${patient.name}.

Tienes acceso completo al análisis de laboratorio más reciente del paciente y debes usarlo como base de tus respuestas.

━━━ DATOS DEL PACIENTE ━━━
• Nombre: ${patient.name}
• Edad cronológica: ${patient.age} años
• Género: ${GENDER_LABEL[patient.gender] ?? patient.gender}
• Edad biológica estimada: ${analysis.longevity_age} años
• ${bioAgeNote}
• Score de salud general: ${analysis.overallScore}/100

━━━ RESUMEN CLÍNICO ━━━
${analysis.clinicalSummary}

━━━ SCORES POR SISTEMA (0-100) ━━━
${scores}

━━━ PROTOCOLO PERSONALIZADO ━━━
${protocol}

━━━ RIESGOS DE ENFERMEDADES IDENTIFICADOS ━━━
${risks}

━━━ FORTALEZAS ━━━
${strengths}

━━━ ÁREAS DE MEJORA ━━━
${weaknesses}

━━━ HISTORIA CLÍNICA REGISTRADA ━━━
${formatExistingClinicalHistory(patient.clinical_history)}

━━━ INSTRUCCIONES DE COMPORTAMIENTO ━━━
• Responde siempre en español mexicano, con tono cálido, empático y motivador.
• Usa lenguaje claro y accesible; evita jerga médica innecesaria, pero puedes ser técnico si el paciente lo pide.
• Cuando el paciente pregunte sobre sus resultados, cita sus valores y scores específicos.
• Sé conciso — máximo 3-4 párrafos salvo que el usuario pida más detalle.
• Usa **negritas** para resaltar valores o términos importantes.
• Usa guiones para listas cuando ayude a organizar la información.
• Si la pregunta requiere un diagnóstico clínico o intervención urgente, recomienda consultar a su médico.
• Si te preguntan sobre algo completamente ajeno a la salud de ${patient.name}, redirige amablemente.

━━━ RECOLECCIÓN DE INFORMACIÓN CLÍNICA ━━━
IMPORTANTE: Cuando el paciente comparta información sobre su salud en la conversación (medicamentos, alergias, síntomas, hábitos, condiciones, ejercicio, sueño, historial familiar, etc.), debes:
1. Responder naturalmente reconociendo y comentando la información compartida.
2. Al FINAL de tu respuesta, agregar un bloque de extracción con los datos detectados en este formato EXACTO:

[CLINICAL_UPDATE]
{"seccion": {"campo": "valor"}}
[/CLINICAL_UPDATE]

Secciones válidas y sus campos:
- anthropometric: waist_cm (número), blood_pressure (texto), energy_level (texto)
- allergies: food (texto), medication (texto), environmental (texto)
- diet: type (texto), meals_per_day (texto), water_intake (texto), processed_food (texto), alcohol (texto), supplements (texto)
- physical_activity: type (texto), frequency (texto), sedentary_hours (texto)
- sleep: hours (texto), quality (texto), snoring (texto)
- mental_health: stress_level (texto), mood (texto), anxiety (texto), cognitive (texto)
- cardiovascular: chest_pain (texto), shortness_of_breath (texto), palpitations (texto), thyroid_symptoms (texto), hormonal_symptoms (texto)
- medical_history: chronic_conditions (array de strings), surgeries (texto), smoker (texto), current_medications (texto), recent_condition (texto), recent_treatment (texto)
- family_history: conditions (array de strings), longevity (texto), details (texto)

REGLAS:
- Solo incluye campos que el paciente mencionó EXPLÍCITAMENTE en su mensaje. No inventes datos.
- Si el mensaje es solo una pregunta sin compartir datos nuevos de salud, NO incluyas el bloque.
- El bloque va al final, después de tu respuesta completa. El paciente NO verá este bloque.
- Puedes incluir múltiples secciones en un solo bloque.
- Para arrays (chronic_conditions, conditions), incluye los valores como array JSON.
- Si el paciente menciona que YA NO tiene una condición o cambió un hábito, actualiza con el valor nuevo.`
}

// ─────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('No autorizado', { status: 401 })

    // Rate limit: max 20 mensajes por minuto por usuario
    const rl = rateLimit(`chat:${user.id}`, 20, 60_000)
    if (!rl.allowed) return new Response('Demasiadas solicitudes', { status: 429 })

    const body = (await request.json()) as ChatRequest
    const { messages, patient, analysis } = body

    if (!messages?.length || !patient || !analysis) {
      return new Response('Datos incompletos', { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = buildSystemPrompt(patient, analysis)

    // Excluir el mensaje de bienvenida (id='welcome') — ya está en el system prompt el contexto
    const apiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: apiMessages,
          })

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }

          controller.close()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error desconocido'
          controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[chat/route]', err)
    return new Response('Error interno del servidor', { status: 500 })
  }
}
