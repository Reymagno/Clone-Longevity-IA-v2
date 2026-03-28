export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { reanalyzeWithClinicalHistory } from '@/lib/anthropic/analyzer'

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
          .select('id, parsed_data, patient_id')
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
        if (!patient.clinical_history) { send({ ok: false, error: 'El paciente no tiene historia clínica registrada' }); return }

        send({ ok: true, step: 'analyzing' })

        const newAiAnalysis = await reanalyzeWithClinicalHistory(result.parsed_data, {
          name: patient.name as string,
          age: patient.age as number,
          gender: patient.gender as string,
          weight: patient.weight as number | null,
          height: patient.height as number | null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          clinical_history: patient.clinical_history as any,
        }, () => enqueue(': keepalive\n\n'))

        const { data: updated, error: updateError } = await supabase
          .from('lab_results')
          .update({ ai_analysis: newAiAnalysis })
          .eq('id', params.id)
          .select()
          .single()

        if (updateError) { send({ ok: false, error: `Error al guardar: ${updateError.message}` }); return }

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
