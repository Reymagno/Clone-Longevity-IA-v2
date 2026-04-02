import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── GET: Listar consultas de un paciente ──────────────────────────────────

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
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ consultations: data || [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al obtener consultas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST: Crear consulta con transcripción y análisis SOAP ─────────────────

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
      const filePath = `${patientId}/${timestamp}-consultation.webm`
      const { error: uploadError } = await supabase.storage
        .from('consultation-audio')
        .upload(filePath, audioBlob, { contentType: 'audio/webm' })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('consultation-audio')
          .getPublicUrl(filePath)
        audioUrl = urlData.publicUrl
      }
    }

    // Analizar transcripción con Claude — generar SOAP + resumen + tags
    let aiSummary: string | null = null
    let aiSoap: Record<string, unknown> | null = null
    let tags: string[] = []
    let speakers: Record<string, string> = {}

    try {
      const analysisResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 3000,
        system: `Eres un asistente medico clinico especializado en medicina de longevidad. Analiza la siguiente transcripcion de consulta medica entre un doctor y un paciente.

Debes responder EXCLUSIVAMENTE con un JSON valido (sin markdown, sin backticks) con esta estructura:
{
  "speakers": {"Speaker 1": "Doctor" o nombre si se menciona, "Speaker 2": "Paciente" o nombre si se menciona},
  "soap": {
    "subjective": "Lo que el paciente reporta: sintomas, quejas, historia",
    "objective": "Datos objetivos mencionados: signos vitales, resultados, hallazgos",
    "assessment": "Evaluacion clinica: diagnosticos, impresiones, analisis",
    "plan": "Plan de tratamiento: medicamentos, estudios, seguimiento, cambios de estilo de vida",
    "diagnoses": ["lista de diagnosticos mencionados"],
    "follow_up": "cuando y como debe ser el seguimiento"
  },
  "summary": "Resumen ejecutivo de 2-3 oraciones con lo mas importante de la consulta",
  "tags": ["etiquetas relevantes como: seguimiento, primera-vez, urgente, preventivo, resultados, tratamiento, etc."]
}

Contexto del paciente: ${patient.name}, ${patient.age} anos, ${patient.gender === 'male' ? 'masculino' : patient.gender === 'female' ? 'femenino' : 'otro'}.

Responde en espanol. Si la transcripcion es muy corta o no tiene contenido medico, genera igualmente el JSON con los campos que puedas llenar y deja vacios los demas.`,
        messages: [{
          role: 'user',
          content: `Transcripcion de consulta medica:\n\n"${transcript}"`,
        }],
      })

      const textBlock = analysisResponse.content.find(b => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        try {
          const parsed = JSON.parse(textBlock.text)
          aiSummary = parsed.summary || null
          aiSoap = parsed.soap || null
          tags = parsed.tags || []
          speakers = parsed.speakers || {}
        } catch {
          // Si no se pudo parsear JSON, usar como resumen de texto plano
          aiSummary = textBlock.text
        }
      }
    } catch {
      // Si falla el analisis, guardamos sin resumen
    }

    // Guardar en base de datos
    const { data: consultation, error: insertError } = await supabase
      .from('consultations')
      .insert({
        patient_id: patientId,
        medico_user_id: user.id,
        transcript,
        speakers,
        ai_summary: aiSummary,
        ai_soap: aiSoap,
        audio_url: audioUrl,
        duration_seconds: durationStr ? parseInt(durationStr) : null,
        tags,
        status: 'completed',
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ consultation })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al guardar consulta'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE: Eliminar consulta ──────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultationId')
    if (!consultationId) {
      return NextResponse.json({ error: 'consultationId requerido' }, { status: 400 })
    }

    const { data: consultation } = await supabase
      .from('consultations')
      .select('id, medico_user_id, audio_url')
      .eq('id', consultationId)
      .single()

    if (!consultation) {
      return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 })
    }

    if (consultation.medico_user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para eliminar esta consulta' }, { status: 403 })
    }

    // Eliminar audio de storage
    if (consultation.audio_url) {
      const urlParts = consultation.audio_url.split('/consultation-audio/')
      if (urlParts[1]) {
        await supabase.storage.from('consultation-audio').remove([urlParts[1]])
      }
    }

    const { error } = await supabase
      .from('consultations')
      .delete()
      .eq('id', consultationId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al eliminar consulta'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
