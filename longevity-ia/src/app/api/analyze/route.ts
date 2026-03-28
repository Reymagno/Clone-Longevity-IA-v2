export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { analyzeLabFiles } from '@/lib/anthropic/analyzer'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // Parse body BEFORE creating the stream so the upload completes before we start
  const formData = await request.formData()
  const files = formData.getAll('files') as File[]
  const patientId = formData.get('patientId') as string | null
  const resultDate = formData.get('resultDate') as string | null

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try { controller.enqueue(encoder.encode(chunk)) } catch { /* stream closed */ }
      }
      const send = (data: Record<string, unknown>) =>
        enqueue(`data: ${JSON.stringify(data)}\n\n`)

      // Immediate first byte — starts the clock reset on Vercel's edge proxy
      enqueue(': keepalive\n\n')

      // Every 5s so no 60s idle window can accumulate
      const keepalive = setInterval(() => enqueue(': keepalive\n\n'), 5_000)

      try {
        const supabase = createClientFromRequest(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { send({ ok: false, error: 'No autorizado' }); return }

        if (!files.length || !patientId || !resultDate) {
          send({ ok: false, error: 'Archivos, paciente y fecha son requeridos' })
          return
        }

        const { data: ownPatient } = await supabase
          .from('patients')
          .select('id, name, age, gender, weight, height, clinical_history')
          .eq('id', patientId)
          .eq('user_id', user.id)
          .single()

        if (!ownPatient) { send({ ok: false, error: 'No autorizado' }); return }

        const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])
        for (const file of files) {
          if (!ALLOWED.has(file.type)) {
            send({ ok: false, error: `Tipo no permitido: ${file.name}. Solo PDF, JPG, PNG o WEBP.` })
            return
          }
        }

        // 1. Upload files
        send({ ok: true, step: 'uploading' })
        const fileUrls: string[] = []
        const timestamp = Date.now()

        for (const file of files) {
          const fileName = `${patientId}/${timestamp}-${file.name.replace(/\s/g, '_')}`
          const buffer = Buffer.from(await file.arrayBuffer())

          const { error: uploadError } = await supabase.storage
            .from('lab-files')
            .upload(fileName, buffer, { contentType: file.type, upsert: false })

          if (uploadError) {
            send({ ok: false, error: `Error al subir ${file.name}: ${uploadError.message}` })
            return
          }

          const { data: urlData } = supabase.storage.from('lab-files').getPublicUrl(fileName)
          fileUrls.push(urlData.publicUrl)
        }

        // 2. Create DB record
        const { data: labResult, error: dbError } = await supabase
          .from('lab_results')
          .insert({ patient_id: patientId, result_date: resultDate, file_urls: fileUrls })
          .select()
          .single()

        if (dbError) {
          send({ ok: false, error: `Error al crear registro: ${dbError.message}` })
          return
        }

        // 3. Prepare files for Claude
        const fileParams = await Promise.all(
          files.map(async (file) => {
            const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
            return {
              fileBase64: base64,
              fileType: file.type.startsWith('image/') ? 'image' as const : 'pdf' as const,
              mimeType: file.type,
            }
          })
        )

        // 4. Call Claude — onProgress enqueues a keepalive on every streamed chunk
        send({ ok: true, step: 'analyzing' })

        const analysisResult = await analyzeLabFiles(fileParams, {
          name: ownPatient.name,
          age: ownPatient.age,
          gender: ownPatient.gender,
          weight: ownPatient.weight,
          height: ownPatient.height,
          clinical_history: ownPatient.clinical_history ?? null,
        }, () => enqueue(': keepalive\n\n'))

        // 5. Save to DB
        send({ ok: true, step: 'saving' })

        const { data: updatedResult, error: updateError } = await supabase
          .from('lab_results')
          .update({ parsed_data: analysisResult.parsedData, ai_analysis: analysisResult.aiAnalysis })
          .eq('id', labResult.id)
          .select()
          .single()

        if (updateError) {
          send({ ok: false, error: `Error al guardar análisis: ${updateError.message}` })
          return
        }

        send({ ok: true, step: 'done', resultId: labResult.id, patientId })

      } catch (error) {
        console.error('Error en análisis:', error)
        const msg = error instanceof Error ? error.message : String(error)
        send({ ok: false, error: msg || 'Error al procesar el análisis. Intenta de nuevo.' })
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
