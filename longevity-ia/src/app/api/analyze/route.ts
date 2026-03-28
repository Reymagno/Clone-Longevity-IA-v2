export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { analyzeLabFiles } from '@/lib/anthropic/analyzer'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const patientId = formData.get('patientId') as string | null
    const resultDate = formData.get('resultDate') as string | null

    if (!files.length || !patientId || !resultDate) {
      return NextResponse.json(
        { error: 'Archivos, paciente y fecha son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el paciente pertenece al usuario autenticado
    const { data: ownPatient } = await supabase
      .from('patients')
      .select('id, name, age, gender, weight, height, clinical_history')
      .eq('id', patientId)
      .eq('user_id', user.id)
      .single()

    if (!ownPatient) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const ALLOWED_MIME_TYPES = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ])

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${file.name}. Solo se aceptan PDF, JPG, PNG o WEBP.` },
          { status: 400 }
        )
      }
    }

    // 1. Subir todos los archivos a Supabase Storage
    const fileUrls: string[] = []
    const timestamp = Date.now()

    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${patientId}/${timestamp}-${file.name.replace(/\s/g, '_')}.${fileExt}`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabase.storage
        .from('lab-files')
        .upload(fileName, buffer, { contentType: file.type, upsert: false })

      if (uploadError) {
        return NextResponse.json(
          { error: `Error al subir ${file.name}: ${uploadError.message}` },
          { status: 500 }
        )
      }

      const { data: urlData } = supabase.storage.from('lab-files').getPublicUrl(fileName)
      fileUrls.push(urlData.publicUrl)
    }

    // 2. Crear registro en DB
    const { data: labResult, error: dbError } = await supabase
      .from('lab_results')
      .insert({ patient_id: patientId, result_date: resultDate, file_urls: fileUrls })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: `Error al crear registro: ${dbError.message}` }, { status: 500 })
    }

    // 3. Preparar archivos para Claude
    const fileParams = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const isImage = file.type.startsWith('image/')
        return { fileBase64: base64, fileType: isImage ? 'image' as const : 'pdf' as const, mimeType: file.type }
      })
    )

    // 4. Llamar a Claude (timeout 5 minutos)
    const patientContext = {
      name: ownPatient.name,
      age: ownPatient.age,
      gender: ownPatient.gender,
      weight: ownPatient.weight,
      height: ownPatient.height,
      clinical_history: ownPatient.clinical_history ?? null,
    }

    const analysisResult = await Promise.race([
      analyzeLabFiles(fileParams, patientContext),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('El análisis tardó demasiado. Intenta de nuevo.')), 300_000)
      ),
    ])

    // 5. Guardar análisis en DB
    const { data: updatedResult, error: updateError } = await supabase
      .from('lab_results')
      .update({ parsed_data: analysisResult.parsedData, ai_analysis: analysisResult.aiAnalysis })
      .eq('id', labResult.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: `Error al guardar análisis: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, resultId: labResult.id, patientId, result: updatedResult })
  } catch (error) {
    console.error('Error en análisis:', error)
    const isUserFacingError = error instanceof Error &&
      (error.message.includes('No se pudo extraer texto') ||
       error.message.includes('Archivos') ||
       error.message.includes('Tipo de archivo'))
    const message = isUserFacingError
      ? (error as Error).message
      : 'Error al procesar el análisis. Intenta de nuevo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
