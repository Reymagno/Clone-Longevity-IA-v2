import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── GET: Listar notas de voz de un paciente ───────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    if (!patientId) {
      return NextResponse.json({ error: 'patientId requerido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('voice_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ notes: data || [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al obtener notas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST: Crear nota de voz con transcripción y análisis AI ────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const patientId = formData.get('patientId') as string
    const transcript = formData.get('transcript') as string
    const audioBlob = formData.get('audio') as File | null
    const durationStr = formData.get('duration') as string | null

    if (!patientId || !transcript) {
      return NextResponse.json({ error: 'patientId y transcript requeridos' }, { status: 400 })
    }

    // Verificar acceso al paciente
    const { data: patient } = await supabase
      .from('patients')
      .select('id, user_id, name, age, gender')
      .eq('id', patientId)
      .single()

    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    // Subir audio si existe
    let audioUrl: string | null = null
    if (audioBlob) {
      const timestamp = Date.now()
      const filePath = `${patientId}/${timestamp}-voice-note.webm`
      const { error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(filePath, audioBlob, { contentType: 'audio/webm' })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('voice-notes')
          .getPublicUrl(filePath)
        audioUrl = urlData.publicUrl
      }
    }

    // Analizar transcripción con Claude para extraer datos clínicos relevantes
    let aiSummary: string | null = null
    try {
      const analysisResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `Eres un asistente médico clínico de longevidad. Analiza la siguiente nota de voz transcrita de un paciente o médico y extrae:

1. **Síntomas reportados** — lista concisa
2. **Datos clínicos relevantes** — signos vitales, mediciones, resultados mencionados
3. **Medicamentos o tratamientos mencionados** — nombres, dosis si se mencionan
4. **Cambios en estilo de vida** — dieta, ejercicio, sueño
5. **Alertas o urgencias** — cualquier dato que requiera atención inmediata
6. **Resumen ejecutivo** — 2-3 líneas resumiendo lo más importante

Contexto del paciente: ${patient.name}, ${patient.age} años, ${patient.gender === 'male' ? 'masculino' : patient.gender === 'female' ? 'femenino' : 'otro'}.

Responde en español, de forma concisa y clínica. Si la nota no contiene información médica relevante, indica "Sin datos clínicos relevantes en esta nota."`,
        messages: [{
          role: 'user',
          content: `Transcripción de nota de voz:\n\n"${transcript}"`,
        }],
      })

      const textBlock = analysisResponse.content.find(b => b.type === 'text')
      aiSummary = textBlock ? textBlock.text : null
    } catch {
      // Si falla el análisis, guardamos sin resumen
    }

    // Guardar en base de datos
    const { data: note, error: insertError } = await supabase
      .from('voice_notes')
      .insert({
        patient_id: patientId,
        user_id: user.id,
        transcript,
        ai_summary: aiSummary,
        audio_url: audioUrl,
        duration_seconds: durationStr ? parseInt(durationStr) : null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Actualizar clinical_history del paciente con las notas de voz
    // (agregar referencia a la nota en el historial)
    try {
      const { data: currentPatient } = await supabase
        .from('patients')
        .select('clinical_history')
        .eq('id', patientId)
        .single()

      if (currentPatient?.clinical_history) {
        const history = currentPatient.clinical_history as Record<string, unknown>
        const voiceNotes = (history.voice_notes as string[] | undefined) || []
        voiceNotes.push(note.id)

        await supabase
          .from('patients')
          .update({
            clinical_history: { ...history, voice_notes: voiceNotes },
          })
          .eq('id', patientId)
      }
    } catch {
      // No crítico — la nota ya se guardó en voice_notes
    }

    return NextResponse.json({ note })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al guardar nota'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE: Eliminar nota de voz ────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('noteId')
    if (!noteId) {
      return NextResponse.json({ error: 'noteId requerido' }, { status: 400 })
    }

    // Verificar propiedad
    const { data: note } = await supabase
      .from('voice_notes')
      .select('id, user_id, audio_url')
      .eq('id', noteId)
      .single()

    if (!note) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }

    if (note.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para eliminar esta nota' }, { status: 403 })
    }

    // Eliminar audio de storage si existe
    if (note.audio_url) {
      const urlParts = note.audio_url.split('/voice-notes/')
      if (urlParts[1]) {
        await supabase.storage.from('voice-notes').remove([urlParts[1]])
      }
    }

    // Eliminar registro
    const { error } = await supabase
      .from('voice_notes')
      .delete()
      .eq('id', noteId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al eliminar nota'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
