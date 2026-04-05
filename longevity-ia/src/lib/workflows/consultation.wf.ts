/**
 * WF-2: Consultation Workflow
 *
 * Orquesta el flujo post-consulta médica:
 *   uploadAudio ∥ generateSOAP → saveConsultation → [extractClinicalData + generateAlert] → audit
 *
 * Mejoras sobre el handler actual:
 * - Upload y SOAP en paralelo (ahorra ~3s)
 * - Extrae datos clínicos del SOAP y actualiza historia automáticamente
 * - Genera alerta de follow-up si el plan lo requiere
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadToStorage, buildStoragePath } from '@/lib/steps/storage'
import { updateClinicalHistory } from '@/lib/steps/patient'
import { createAlert } from '@/lib/steps/alerts'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'

export interface ConsultationInput {
  supabase: SupabaseClient
  userId: string
  userEmail: string
  patientId: string
  transcript: string
  audioFile?: File | null
  duration?: number
  request?: NextRequest
}

export interface ConsultationResult {
  success: boolean
  consultationId?: string
  error?: string
}

export async function consultationWorkflow(input: ConsultationInput): Promise<ConsultationResult> {
  const { supabase, userId, userEmail, patientId, transcript, audioFile, duration } = input

  try {
    // Step 1: Verify patient access
    const { data: patient } = await supabase
      .from('patients')
      .select('id, name, age, gender')
      .eq('id', patientId)
      .single()

    if (!patient) return { success: false, error: 'Paciente no encontrado' }

    // Step 2: Upload audio and generate SOAP in PARALLEL
    const [audioResult, soapResult] = await Promise.all([
      // Upload audio (if provided)
      audioFile ? (async () => {
        const buffer = Buffer.from(await audioFile.arrayBuffer())
        const path = buildStoragePath(patientId, 'consultation.webm')
        const { path: storedPath, error } = await uploadToStorage(supabase, {
          bucket: 'consultation-audio',
          path,
          data: buffer,
          contentType: 'audio/webm',
        })
        return error ? null : storedPath
      })() : Promise.resolve(null),

      // Generate SOAP via Claude
      generateSOAP(transcript, patient.name),
    ])

    // Step 3: Save consultation
    const { data: consultation, error: saveError } = await supabase
      .from('consultations')
      .insert({
        patient_id: patientId,
        medico_user_id: userId,
        transcript: soapResult?.condensedTranscript ?? transcript,
        speakers: soapResult?.speakers ?? null,
        ai_summary: soapResult?.summary ?? null,
        ai_soap: soapResult?.soap ?? null,
        audio_url: audioResult,
        duration_seconds: duration ?? null,
        tags: soapResult?.tags ?? [],
        status: 'completed',
      })
      .select('id')
      .single()

    if (saveError) return { success: false, error: saveError.message }

    // Step 4: Post-save actions in PARALLEL (non-blocking)
    const postSavePromises: Promise<void>[] = []

    // 4a: Extract clinical data from SOAP and update patient history
    if (soapResult?.extractedClinicalData) {
      postSavePromises.push(
        updateClinicalHistory(supabase, patientId, soapResult.extractedClinicalData)
          .then(() => {})
          .catch(err => console.error('[consultation.wf] clinical update error:', err)),
      )
    }

    // 4b: Generate follow-up alert if plan mentions it
    if (soapResult?.soap?.plan && soapResult.soap.plan.length > 10) {
      postSavePromises.push(
        createAlert({
          medico_user_id: userId,
          patient_id: patientId,
          alert_type: 'follow_up_due',
          level: 'info',
          title: `${patient.name}: consulta registrada — revisar plan`,
          detail: `Plan: ${soapResult.soap.plan.slice(0, 200)}...`,
          metadata: { consultation_id: consultation.id },
        }).catch(err => console.error('[consultation.wf] alert error:', err)),
      )
    }

    // 4c: Audit log
    postSavePromises.push(
      Promise.resolve(logAudit({
        userId, email: userEmail, role: 'medico',
        action: 'create_consultation', resourceType: 'consultation',
        resourceId: consultation.id, patientId,
      }, input.request)),
    )

    await Promise.allSettled(postSavePromises)

    return { success: true, consultationId: consultation.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' }
  }
}

// ── SOAP generation helper ──────────────────────────────────────────

interface SOAPResult {
  speakers: Record<string, string> | null
  soap: { subjective: string; objective: string; assessment: string; plan: string } | null
  summary: string | null
  tags: string[]
  condensedTranscript: string
  extractedClinicalData: Record<string, unknown> | null
}

async function generateSOAP(transcript: string, patientName: string): Promise<SOAPResult | null> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0,
      system: `Eres un asistente médico experto. Analiza la transcripción de una consulta médica y extrae información estructurada en formato JSON.`,
      messages: [{
        role: 'user',
        content: `Analiza esta transcripción de consulta del paciente ${patientName}:

${transcript}

Responde SOLO con un JSON válido (sin markdown) con esta estructura:
{
  "speakers": { "speaker1": "rol", "speaker2": "rol" },
  "soap": {
    "subjective": "síntomas y quejas del paciente",
    "objective": "hallazgos clínicos observados",
    "assessment": "diagnóstico y evaluación",
    "plan": "plan de tratamiento y seguimiento"
  },
  "summary": "resumen ejecutivo en 2-3 líneas",
  "key_findings": ["hallazgo1", "hallazgo2"],
  "medications": [{"name": "med", "dose": "dosis", "instructions": "instrucciones"}],
  "pending_studies": ["estudio1"],
  "alerts": ["alerta urgente si hay"],
  "tags": ["seguimiento", "tratamiento"],
  "clinical_data": { "section": { "field": "value" } }
}

El campo "clinical_data" debe extraer datos estructurados para la historia clínica del paciente:
- medical_history.current_medications, medical_history.chronic_conditions (arrays)
- anthropometric.blood_pressure, etc.
Solo incluye datos EXPLÍCITAMENTE mencionados.`,
      }],
    })

    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    const jsonText = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    const start = jsonText.indexOf('{')
    const end = jsonText.lastIndexOf('}')
    if (start === -1 || end === -1) return null

    const parsed = JSON.parse(jsonText.slice(start, end + 1))

    // Build condensed transcript
    const parts = [parsed.summary, ...(parsed.key_findings ?? [])].filter(Boolean)
    const condensed = parts.length > 0 ? parts.join('\n') : transcript.slice(0, 1000)

    return {
      speakers: parsed.speakers ?? null,
      soap: parsed.soap ?? null,
      summary: parsed.summary ?? null,
      tags: parsed.tags ?? [],
      condensedTranscript: condensed,
      extractedClinicalData: parsed.clinical_data ?? null,
    }
  } catch (err) {
    console.error('[consultation.wf] SOAP generation error:', err)
    return null
  }
}
