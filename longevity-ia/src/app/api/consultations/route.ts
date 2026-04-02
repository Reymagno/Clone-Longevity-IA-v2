import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

// Lazy init — evita crash si ANTHROPIC_API_KEY no está en el env durante build
let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

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
    console.error('Consultation GET error:', err)
    const message = err instanceof Error ? err.message : 'Error al obtener consultas'
    // Si la tabla no existe, retornar lista vacía en vez de error
    if (message.includes('relation') || message.includes('does not exist')) {
      return NextResponse.json({ consultations: [] })
    }
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
      try {
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
        // Si falla el upload (bucket no existe, etc.), continuamos sin audio
      } catch {
        // Storage no disponible — continuar sin audio
      }
    }

    // Analizar transcripción con Claude — extraer SOLO insights clínicos (no guardar diálogo crudo)
    let aiSummary: string | null = null
    let aiSoap: Record<string, unknown> | null = null
    let tags: string[] = []
    let speakers: Record<string, string> = {}
    let clinicalInsights = ''  // versión condensada con solo lo clínicamente relevante

    try {
      const analysisResponse = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 4000,
        system: `Eres un asistente medico clinico especializado en medicina de longevidad. Analiza la siguiente transcripcion de consulta medica y EXTRAE UNICAMENTE los insights clinicos relevantes.

NO guardes el dialogo textual. Transforma la conversacion en informacion clinica estructurada.

Debes responder EXCLUSIVAMENTE con un JSON valido (sin markdown, sin backticks) con esta estructura:
{
  "speakers": {"Speaker 1": "Doctor" o nombre si se menciona, "Speaker 2": "Paciente" o nombre si se menciona},
  "soap": {
    "subjective": "Sintomas, quejas y preocupaciones reportadas por el paciente (redactado como nota clinica, NO como dialogo)",
    "objective": "Datos objetivos mencionados: signos vitales, resultados de estudios, hallazgos clinicos, mediciones",
    "assessment": "Evaluacion clinica del medico: diagnosticos, impresiones diagnosticas, correlaciones clinicas",
    "plan": "Plan de tratamiento completo: medicamentos con dosis, estudios solicitados, interconsultas, proxima cita, cambios de estilo de vida",
    "diagnoses": ["lista de diagnosticos o impresiones diagnosticas mencionados"],
    "follow_up": "fecha o periodo de seguimiento y que se debe evaluar"
  },
  "summary": "Resumen ejecutivo de 2-3 oraciones con los hallazgos y decisiones mas importantes",
  "key_findings": [
    "Hallazgo clinico 1 (dato especifico, no generalidades)",
    "Hallazgo clinico 2",
    "Decision terapeutica importante"
  ],
  "medications": [
    {"name": "nombre del medicamento", "dose": "dosis", "instructions": "indicaciones"}
  ],
  "pending_studies": ["estudios o laboratorios solicitados"],
  "alerts": ["cualquier dato de alarma o urgencia que requiera atencion inmediata"],
  "tags": ["etiquetas: seguimiento, primera-vez, urgente, preventivo, resultados, tratamiento, etc."]
}

Contexto del paciente: ${patient.name}, ${patient.age} anos, ${patient.gender === 'male' ? 'masculino' : patient.gender === 'female' ? 'femenino' : 'otro'}.

IMPORTANTE:
- Redacta como nota clinica profesional, NO como transcripcion de dialogo
- Incluye datos especificos (numeros, dosis, fechas) mencionados en la consulta
- Omite saludos, despedidas, conversacion social y repeticiones
- Si mencionan medicamentos, incluye nombre y dosis exacta
- Si mencionan estudios previos, incluye los valores relevantes`,
        messages: [{
          role: 'user',
          content: `Transcripcion de consulta medica:\n\n"${transcript}"`,
        }],
      })

      const textBlock = analysisResponse.content.find(b => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        // Extraer JSON robusto — Claude a veces envuelve en ```json...```
        let jsonText = textBlock.text.trim()
        // Remover markdown code fences si existen
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
        // Buscar el JSON entre la primera { y la última }
        const firstBrace = jsonText.indexOf('{')
        const lastBrace = jsonText.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          jsonText = jsonText.slice(firstBrace, lastBrace + 1)
        }

        try {
          const parsed = JSON.parse(jsonText)
          console.log('Claude consultation fields:', {
            hasSummary: !!parsed.summary,
            hasKeyFindings: !!parsed.key_findings?.length,
            hasMedications: !!parsed.medications?.length,
            hasPendingStudies: !!parsed.pending_studies?.length,
            hasAlerts: !!parsed.alerts?.length,
            hasSoap: !!parsed.soap,
            hasTags: !!parsed.tags?.length,
          })

          aiSummary = parsed.summary || null
          aiSoap = parsed.soap || null
          tags = parsed.tags || []
          speakers = parsed.speakers || {}

          // Construir insights condensados a partir del análisis (reemplaza la transcripción cruda)
          const parts: string[] = []
          if (parsed.summary) parts.push(`RESUMEN: ${parsed.summary}`)
          if (parsed.key_findings?.length) parts.push(`HALLAZGOS: ${parsed.key_findings.join(' | ')}`)
          if (parsed.medications?.length) {
            const meds = parsed.medications.map((m: { name: string; dose?: string; instructions?: string }) =>
              `${m.name}${m.dose ? ` ${m.dose}` : ''}${m.instructions ? ` — ${m.instructions}` : ''}`
            )
            parts.push(`MEDICAMENTOS: ${meds.join(' | ')}`)
          }
          if (parsed.pending_studies?.length) parts.push(`ESTUDIOS PENDIENTES: ${parsed.pending_studies.join(' | ')}`)
          if (parsed.alerts?.length) parts.push(`ALERTAS: ${parsed.alerts.join(' | ')}`)
          if (parsed.soap?.diagnoses?.length) parts.push(`DIAGNOSTICOS: ${parsed.soap.diagnoses.join(' | ')}`)
          if (parsed.soap?.follow_up) parts.push(`SEGUIMIENTO: ${parsed.soap.follow_up}`)

          clinicalInsights = parts.join('\n\n')

          // Agregar medications, pending_studies, alerts y key_findings al SOAP
          if (parsed.medications) aiSoap = { ...aiSoap as object, medications: parsed.medications }
          if (parsed.pending_studies) aiSoap = { ...aiSoap as object, pending_studies: parsed.pending_studies }
          if (parsed.alerts) aiSoap = { ...aiSoap as object, alerts: parsed.alerts }
          if (parsed.key_findings) aiSoap = { ...aiSoap as object, key_findings: parsed.key_findings }
        } catch (parseErr) {
          console.error('JSON parse failed for consultation analysis:', parseErr, 'Raw text:', textBlock.text.substring(0, 500))
          aiSummary = textBlock.text
          clinicalInsights = textBlock.text
        }
      }
    } catch {
      // Si falla el análisis, guardar transcripción como fallback
      clinicalInsights = transcript
    }

    // Guardar en base de datos — solo insights clínicos, NO el diálogo crudo
    const { data: consultation, error: insertError } = await supabase
      .from('consultations')
      .insert({
        patient_id: patientId,
        medico_user_id: user.id,
        transcript: clinicalInsights,  // insights condensados en vez de diálogo completo
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

    if (insertError) {
      console.error('Insert error:', insertError)
      const hint = insertError.message?.includes('relation') || insertError.message?.includes('does not exist')
        ? ' — Ejecuta la migracion 20260401_consultations.sql en Supabase.'
        : ''
      return NextResponse.json({
        error: `Error al insertar consulta: ${insertError.message}${hint}`,
      }, { status: 500 })
    }

    return NextResponse.json({ consultation })
  } catch (err) {
    console.error('Consultation POST error:', err)
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
