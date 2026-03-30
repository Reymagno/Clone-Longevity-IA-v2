export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { createClientFromRequest } from '@/lib/supabase/server'
import { extractBiomarkers, reanalyzeWithClinicalHistory } from '@/lib/anthropic/analyzer'

/** Compute a combined SHA-256 hash of all file buffers for cache lookup */
function computeFilesHash(buffers: Buffer[]): string {
  const hash = createHash('sha256')
  for (const buf of buffers) hash.update(buf)
  return hash.digest('hex')
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // Parse body BEFORE creating the stream so the upload completes before we start
  const formData = await request.formData()
  const files = formData.getAll('files') as File[]
  const patientId = formData.get('patientId') as string | null
  const resultDate = formData.get('resultDate') as string | null

  // Cache buffers immediately — arrayBuffer() on a File can only be reliably
  // read once in some serverless environments (Node.js undici FormData)
  const fileBuffers: Buffer[] = await Promise.all(
    files.map(async (f) => Buffer.from(await f.arrayBuffer()))
  )

  // Compute hash for cache lookup
  const filesHash = computeFilesHash(fileBuffers)

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try { controller.enqueue(encoder.encode(chunk)) } catch { /* stream closed */ }
      }
      const send = (data: Record<string, unknown>) =>
        enqueue(`data: ${JSON.stringify(data)}\n\n`)

      // Immediate first byte — starts the clock on Vercel's edge proxy
      enqueue(': keepalive\n\n')

      // Fallback keepalive every 5s
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

        // ── Cache check: buscar análisis existente con el mismo hash de archivos ──
        const { data: cachedResults } = await supabase
          .from('lab_results')
          .select('id, parsed_data, ai_analysis')
          .eq('patient_id', patientId)
          .not('ai_analysis', 'is', null)
          .not('parsed_data', 'is', null)

        if (cachedResults && cachedResults.length > 0) {
          for (const cached of cachedResults) {
            const meta = (cached.parsed_data as Record<string, unknown>)?._meta as Record<string, unknown> | undefined
            if (meta?.fileHash === filesHash) {
              // Found cached result with same files — clone into a new record
              send({ ok: true, step: 'uploading' })

              const fileUrls: string[] = []
              const timestamp = Date.now()
              for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const buffer = fileBuffers[i]
                const fileName = `${patientId}/${timestamp}-${file.name.replace(/\s/g, '_')}`
                await supabase.storage.from('lab-files').upload(fileName, buffer, { contentType: file.type, upsert: false })
                const { data: urlData } = supabase.storage.from('lab-files').getPublicUrl(fileName)
                fileUrls.push(urlData.publicUrl)
              }

              send({ ok: true, step: 'analyzing' })

              const cachedParsed = { ...(cached.parsed_data as object), _meta: { fileHash: filesHash } }
              const { data: newResult, error: insertError } = await supabase
                .from('lab_results')
                .insert({
                  patient_id: patientId,
                  result_date: resultDate,
                  file_urls: fileUrls,
                  parsed_data: cachedParsed,
                  ai_analysis: cached.ai_analysis,
                })
                .select()
                .single()

              if (insertError) {
                send({ ok: false, error: `Error al guardar resultado cacheado: ${insertError.message}` })
                return
              }

              send({ ok: true, step: 'done', resultId: newResult.id, patientId, cached: true })
              return
            }
          }
        }

        const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])
        for (const file of files) {
          if (!ALLOWED.has(file.type)) {
            send({ ok: false, error: `Tipo no permitido: ${file.name}. Solo PDF, JPG, PNG o WEBP.` })
            return
          }
        }

        // ══════════════════════════════════════════════════════════════
        // PASO 1: Subir archivos + Extraer biomarcadores
        // ══════════════════════════════════════════════════════════════
        send({ ok: true, step: 'uploading' })
        const fileUrls: string[] = []
        const timestamp = Date.now()

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const buffer = fileBuffers[i]
          const fileName = `${patientId}/${timestamp}-${file.name.replace(/\s/g, '_')}`

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

        // Extraer biomarcadores (Llamada 1 a Claude — ligera, ~30-60s)
        send({ ok: true, step: 'reading' })

        const fileParams = files.map((file, i) => ({
          fileBase64: fileBuffers[i].toString('base64'),
          fileType: file.type.startsWith('image/') ? 'image' as const : 'pdf' as const,
          mimeType: file.type,
        }))

        const parsedData = await extractBiomarkers(fileParams, () => enqueue(': keepalive\n\n'))

        // Guardar parsedData inmediatamente — si el análisis IA falla, no se pierde la extracción
        const parsedDataWithHash = { ...parsedData as object, _meta: { fileHash: filesHash } }

        const { data: labResult, error: dbError } = await supabase
          .from('lab_results')
          .insert({
            patient_id: patientId,
            result_date: resultDate,
            file_urls: fileUrls,
            parsed_data: parsedDataWithHash,
          })
          .select()
          .single()

        if (dbError) {
          send({ ok: false, error: `Error al crear registro: ${dbError.message}` })
          return
        }

        // ── Enviar resultado parcial al cliente para dashboard inmediato ──
        send({ ok: true, step: 'extracted', resultId: labResult.id, patientId })

        // ══════════════════════════════════════════════════════════════
        // PASO 2: Generar análisis IA completo a partir de parsedData
        // ══════════════════════════════════════════════════════════════
        send({ ok: true, step: 'analyzing' })

        const aiAnalysis = await reanalyzeWithClinicalHistory(parsedData, {
          name: ownPatient.name,
          age: ownPatient.age,
          gender: ownPatient.gender,
          weight: ownPatient.weight,
          height: ownPatient.height,
          clinical_history: ownPatient.clinical_history ?? null,
        }, () => enqueue(': keepalive\n\n'))

        // Guardar análisis IA
        send({ ok: true, step: 'saving' })

        const { error: updateError } = await supabase
          .from('lab_results')
          .update({ ai_analysis: aiAnalysis })
          .eq('id', labResult.id)

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
