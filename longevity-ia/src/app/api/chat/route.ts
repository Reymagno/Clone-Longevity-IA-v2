export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClientFromRequest } from '@/lib/supabase/server'
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
  patient: Pick<Patient, 'name' | 'age' | 'gender'>
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

━━━ INSTRUCCIONES DE COMPORTAMIENTO ━━━
• Responde siempre en español mexicano, con tono cálido, empático y motivador.
• Usa lenguaje claro y accesible; evita jerga médica innecesaria, pero puedes ser técnico si el paciente lo pide.
• Cuando el paciente pregunte sobre sus resultados, cita sus valores y scores específicos.
• Sé conciso — máximo 3-4 párrafos salvo que el usuario pida más detalle.
• Usa **negritas** para resaltar valores o términos importantes.
• Usa guiones para listas cuando ayude a organizar la información.
• Si la pregunta requiere un diagnóstico clínico o intervención urgente, recomienda consultar a su médico.
• Si te preguntan sobre algo completamente ajeno a la salud de ${patient.name}, redirige amablemente.`
}

// ─────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('No autorizado', { status: 401 })

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
            model: 'claude-sonnet-4-6',
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
