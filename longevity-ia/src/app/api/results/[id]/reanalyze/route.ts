export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { createClientFromRequest } from '@/lib/supabase/server'
import { reanalyzeWithClinicalHistory, reanalyzePartial } from '@/lib/anthropic/analyzer'
import { generateAlertsForResult } from '@/lib/generate-alerts'
import { buildVoiceNotesContext } from '@/lib/voice-notes-context'

function hashClinicalHistory(ch: unknown): string {
  return createHash('sha256').update(JSON.stringify(ch ?? null)).digest('hex').slice(0, 16)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try { controller.enqueue(encoder.encode(chunk)) } catch { /* stream closed */ }
      }
      const send = (data: Record<string, unknown>) =>
        enqueue(`data: ${JSON.stringify(data)}\n\n`)

      // Immediate first byte + every 5s keepalive
      enqueue(': keepalive\n\n')
      const keepalive = setInterval(() => enqueue(': keepalive\n\n'), 5_000)

      try {
        const supabase = createClientFromRequest(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { send({ ok: false, error: 'No autorizado' }); return }

        const { data: result, error: resultError } = await supabase
          .from('lab_results')
          .select('id, parsed_data, ai_analysis, patient_id')
          .eq('id', params.id)
          .single()

        if (resultError || !result) { send({ ok: false, error: 'Resultado no encontrado' }); return }
        if (!result.parsed_data) { send({ ok: false, error: 'Este resultado no tiene datos extraídos' }); return }

        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('id, name, age, gender, weight, height, clinical_history')
          .eq('id', result.patient_id)
          .eq('user_id', user.id)
          .single()

        if (patientError || !patient) { send({ ok: false, error: 'No autorizado' }); return }

        // Obtener notas de voz del médico (contexto adicional)
        const voiceNotesContext = await buildVoiceNotesContext(supabase, result.patient_id)

        const patientCtx = {
          name: patient.name as string,
          age: patient.age as number,
          gender: patient.gender as string,
          weight: patient.weight as number | null,
          height: patient.height as number | null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          clinical_history: patient.clinical_history as any,
          voice_notes_context: voiceNotesContext,
        }

        // Si ya existe un análisis IA previo, usar re-análisis parcial (solo protocolo + proyección + resumen)
        // Esto reduce de ~4min a ~1-1.5min al cachear FODA, scores, riesgos y alertas
        const canUsePartial = result.ai_analysis &&
          (result.ai_analysis as Record<string, unknown>).systemScores &&
          (result.ai_analysis as Record<string, unknown>).swot

        send({ ok: true, step: 'analyzing' })

        let newAiAnalysis: object
        if (canUsePartial) {
          send({ ok: true, step: 'analyzing', partial: true })
          newAiAnalysis = await reanalyzePartial(
            result.parsed_data,
            result.ai_analysis as object,
            patientCtx,
            () => enqueue(': keepalive\n\n')
          )
        } else {
          newAiAnalysis = await reanalyzeWithClinicalHistory(
            result.parsed_data,
            patientCtx,
            () => enqueue(': keepalive\n\n')
          )
        }

        // Inyectar hash de historia clínica para detectar cambios futuros
        const analysisWithMeta = {
          ...(newAiAnalysis as Record<string, unknown>),
          _meta: { clinicalHistoryHash: hashClinicalHistory(patient.clinical_history) },
        }

        const { data: updated, error: updateError } = await supabase
          .from('lab_results')
          .update({ ai_analysis: analysisWithMeta })
          .eq('id', params.id)
          .select()
          .single()

        if (updateError) { send({ ok: false, error: `Error al guardar: ${updateError.message}` }); return }

        // Generate alerts for linked medicos (non-blocking)
        generateAlertsForResult(
          supabase, result.patient_id, params.id,
          updated.parsed_data as Record<string, unknown> | null,
          analysisWithMeta as Record<string, unknown>,
          false
        ).catch(e => console.error('Alert generation on reanalyze failed:', e))

        send({ ok: true, step: 'done', resultId: params.id, result: updated })

      } catch (error) {
        console.error('Error en re-análisis:', error)
        send({ ok: false, error: error instanceof Error ? error.message : 'Error al procesar el re-análisis.' })
      } finally {
        clearInterval(keepalive)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    },
  })
}
