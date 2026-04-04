export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getToolsForRole } from '@/lib/agent-tools'
import { executeAgentTool } from '@/lib/agent-tool-executor'
import { resolveClinicaId } from '@/lib/steps'
import { logAudit } from '@/lib/audit'

// ── Types ───────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AgentRequest {
  messages: ChatMessage[]
}

// ── System prompts by role ──────────────────────────────────────────

function buildSystemPrompt(role: string, clinicName?: string): string {
  const base = `Eres el Asistente Inteligente de Longevity IA, especializado en gestión clínica y análisis de datos de salud. Estás integrado en el panel de ${role === 'clinica' ? 'administración de la clínica' : 'médico'}.

Tienes acceso a herramientas que te permiten consultar datos reales de la plataforma. SIEMPRE usa las herramientas disponibles para responder con datos precisos — nunca inventes números ni estadísticas.`

  if (role === 'clinica') {
    return `${base}

━━━ CONTEXTO ━━━
• Rol del usuario: Director/Administrador de Clínica${clinicName ? ` (${clinicName})` : ''}
• Puedes consultar: actividad de médicos, sesiones de login, pacientes críticos, métricas operativas, rendimiento por médico, tendencias de biomarcadores.
• Puedes generar: reportes PDF descargables, notificaciones a Slack.

━━━ INSTRUCCIONES ━━━
• Responde siempre en español mexicano, con tono profesional y directo.
• Cuando muestres datos, usa tablas markdown para mejor legibilidad.
• Si el usuario pide un reporte o PDF, usa la herramienta generate_pdf.
• Si el usuario pide enviar algo por Slack, usa send_slack.
• Si el usuario menciona un médico por nombre, busca su ID con query_medico_sessions o query_active_medicos.
• Sé conciso pero completo. Si hay datos relevantes adicionales, menciónalos brevemente.
• Cuando reportes pacientes críticos, siempre incluye los biomarcadores en peligro y el score.
• Para métricas de actividad, ofrece contexto (ej: "12 sesiones es X% más que la semana anterior" si tienes los datos).
• IMPORTANTE: Cuando uses herramientas y obtengas resultados, presenta los datos de forma clara y organizada. No digas "voy a consultar" — simplemente usa la herramienta y presenta los resultados.`
  }

  // Médico
  return `${base}

━━━ CONTEXTO ━━━
• Rol del usuario: Médico
• Puedes consultar: datos de tus pacientes, tendencias de biomarcadores, búsquedas por criterios clínicos.
• Puedes generar: reportes PDF, notificaciones a Slack.

━━━ INSTRUCCIONES ━━━
• Responde siempre en español mexicano, con tono profesional y empático.
• Cuando muestres datos de pacientes, usa tablas markdown.
• Si el usuario pide tendencias o evolución, usa query_biomarker_trends.
• Para buscar pacientes por criterios, usa query_patient_search.
• Para exportar, usa generate_pdf.
• Sé conciso pero clínicamente preciso.
• IMPORTANTE: Cuando uses herramientas, presenta los resultados directamente.`
}

// ── SSE helpers ─────────────────────────────────────────────────────

function sseEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, ...data as Record<string, unknown> })}\n\n`
}

// ── Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('No autorizado', { status: 401 })

    const role = user.user_metadata?.role as string
    if (role !== 'medico' && role !== 'clinica') {
      return new Response('Solo médicos y clínicas pueden usar el agente', { status: 403 })
    }

    const body = (await request.json()) as AgentRequest
    const { messages } = body
    if (!messages?.length) {
      return new Response('Mensajes requeridos', { status: 400 })
    }

    const tools = getToolsForRole(role)
    if (tools.length === 0) {
      return new Response('No hay herramientas disponibles para este rol', { status: 403 })
    }

    // Resolver contexto
    let clinicaId: string | null = null
    let clinicName: string | undefined

    if (role === 'clinica') {
      clinicaId = await resolveClinicaId(user.id)
      const { data: clinica } = await supabase.from('clinicas').select('clinic_name').eq('user_id', user.id).single()
      clinicName = clinica?.clinic_name
    } else if (role === 'medico') {
      // Médico: resolver su clínica si tiene una
      const { data: medico } = await supabase.from('medicos').select('clinica_id').eq('user_id', user.id).single()
      clinicaId = medico?.clinica_id ?? null
    }

    const toolContext = {
      userId: user.id,
      role: role as 'medico' | 'clinica',
      clinicaId,
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = buildSystemPrompt(role, clinicName)
    const encoder = new TextEncoder()

    // Convertir mensajes del chat a formato Anthropic
    const anthropicMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const toolsUsed: string[] = []
          let currentMessages = [...anthropicMessages]
          let iterations = 0
          const MAX_ITERATIONS = 5

          // Agentic loop: Claude puede encadenar múltiples tools
          while (iterations < MAX_ITERATIONS) {
            iterations++

            const response = await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              system: systemPrompt,
              tools,
              messages: currentMessages,
            })

            // Procesar bloques de contenido
            const hasToolUse = response.content.some(block => block.type === 'tool_use')

            if (!hasToolUse) {
              // Respuesta final de texto — stream al cliente
              for (const block of response.content) {
                if (block.type === 'text') {
                  controller.enqueue(encoder.encode(sseEvent('text', { content: block.text })))
                }
              }
              break
            }

            // Hay tool_use — ejecutar cada tool
            const toolResults: Anthropic.MessageParam['content'] = []

            for (const block of response.content) {
              if (block.type === 'tool_use') {
                const toolName = block.name
                const toolInput = block.input as Record<string, unknown>

                const toolCallId = block.id // Unique ID from Claude

                // Notificar al frontend qué tool se está ejecutando
                controller.enqueue(encoder.encode(sseEvent('tool_call', {
                  tool: toolName,
                  tool_call_id: toolCallId,
                  input: toolInput,
                })))

                // Ejecutar el tool
                const result = await executeAgentTool(toolName, toolInput, toolContext)
                toolsUsed.push(toolName)

                // Notificar resultado al frontend
                controller.enqueue(encoder.encode(sseEvent('tool_result', {
                  tool: toolName,
                  tool_call_id: toolCallId,
                  success: result.success,
                  preview: result.success
                    ? `${JSON.stringify(result.data).slice(0, 200)}...`
                    : result.error,
                })))

                // Agregar como tool_result para la siguiente iteración de Claude
                ;(toolResults as Anthropic.ToolResultBlockParam[]).push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify(result.success ? result.data : { error: result.error }),
                })
              }
            }

            // Agregar la respuesta de Claude (con tool_use) y los tool_results a los mensajes
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: response.content },
              { role: 'user', content: toolResults as Anthropic.ToolResultBlockParam[] },
            ]

            // Extraer texto parcial que Claude haya incluido junto con tool_use
            for (const block of response.content) {
              if (block.type === 'text' && block.text.trim()) {
                controller.enqueue(encoder.encode(sseEvent('text', { content: block.text })))
              }
            }
          }

          // Si se agotaron las iteraciones sin respuesta final, pedir un resumen
          if (iterations >= MAX_ITERATIONS) {
            const finalResponse = await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2048,
              system: systemPrompt,
              tools: [],
              messages: [...currentMessages, {
                role: 'user',
                content: 'Resume los resultados de las consultas anteriores de forma clara y concisa para el usuario. No uses herramientas, solo responde con texto.',
              }],
            })
            for (const block of finalResponse.content) {
              if (block.type === 'text') {
                controller.enqueue(encoder.encode(sseEvent('text', { content: block.text })))
              }
            }
          }

          // Enviar evento de finalización
          controller.enqueue(encoder.encode(sseEvent('done', { tools_used: toolsUsed })))

          // Audit log
          logAudit({
            userId: user.id,
            email: user.email ?? undefined,
            role,
            action: 'agent_chat',
            resourceType: 'chat',
            details: {
              tools_used: toolsUsed,
              iterations,
              message_count: messages.length,
            },
          }, request)

          controller.close()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error desconocido'
          console.error('[chat/agent]', err)
          controller.enqueue(encoder.encode(sseEvent('error', { message: msg })))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[chat/agent]', err)
    return new Response('Error interno del servidor', { status: 500 })
  }
}
