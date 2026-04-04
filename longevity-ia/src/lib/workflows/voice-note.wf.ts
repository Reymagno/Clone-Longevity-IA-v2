/**
 * WF-7: Voice Note Workflow
 *
 * Flujo de nota de voz:
 *   validateDuration → [uploadAudio ∥ summarize] → save → updateClinicalHistory → audit
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadToStorage, buildStoragePath } from '@/lib/steps/storage'
import { updateClinicalHistory } from '@/lib/steps/patient'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'

export interface VoiceNoteInput {
  supabase: SupabaseClient
  userId: string
  userEmail: string
  patientId: string
  transcript: string
  audioFile?: File | null
  duration?: number
  request?: NextRequest
}

export interface VoiceNoteResult {
  success: boolean
  noteId?: string
  error?: string
}

export async function voiceNoteWorkflow(input: VoiceNoteInput): Promise<VoiceNoteResult> {
  const { supabase, userId, userEmail, patientId, transcript, audioFile, duration } = input

  try {
    // Step 1: Upload audio and summarize in PARALLEL
    const [audioPath, aiSummary] = await Promise.all([
      audioFile ? (async () => {
        const buffer = Buffer.from(await audioFile.arrayBuffer())
        const path = buildStoragePath(patientId, 'voice-note.webm')
        const { path: stored, error } = await uploadToStorage(supabase, {
          bucket: 'voice-notes', path, data: buffer, contentType: 'audio/webm',
        })
        return error ? null : stored
      })() : Promise.resolve(null),

      summarizeVoiceNote(transcript),
    ])

    // Step 2: Save voice note
    const { data: note, error: saveError } = await supabase
      .from('voice_notes')
      .insert({
        patient_id: patientId,
        user_id: userId,
        transcript,
        ai_summary: aiSummary?.summary ?? null,
        audio_url: audioPath,
        duration_seconds: duration ?? null,
      })
      .select('id')
      .single()

    if (saveError || !note) {
      return { success: false, error: saveError?.message ?? 'Error al guardar nota' }
    }

    // Step 3: Update clinical history if AI extracted data
    if (aiSummary?.clinicalData) {
      updateClinicalHistory(supabase, patientId, aiSummary.clinicalData).catch(err =>
        console.error('[voice-note.wf] clinical update error:', err),
      )
    }

    // Step 4: Add voice note reference to patient clinical_history
    const { data: patient } = await supabase
      .from('patients')
      .select('clinical_history')
      .eq('id', patientId)
      .single()

    if (patient) {
      const ch = (patient.clinical_history ?? {}) as Record<string, unknown>
      const vnRefs = Array.isArray(ch.voice_notes) ? ch.voice_notes : []
      if (!vnRefs.includes(note.id)) {
        vnRefs.push(note.id)
        await supabase
          .from('patients')
          .update({ clinical_history: { ...ch, voice_notes: vnRefs } })
          .eq('id', patientId)
      }
    }

    // Step 5: Audit
    logAudit({
      userId, email: userEmail, action: 'create_voice_note',
      resourceType: 'voice_note', resourceId: note.id, patientId,
    }, input.request)

    return { success: true, noteId: note.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' }
  }
}

// ── AI summarize helper ─────────────────────────────────────────────

async function summarizeVoiceNote(transcript: string): Promise<{ summary: string; clinicalData: Record<string, unknown> | null } | null> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'Eres un asistente médico. Resume notas de voz clínicas y extrae datos estructurados.',
      messages: [{
        role: 'user',
        content: `Resume esta nota de voz médica y extrae datos clínicos relevantes:\n\n${transcript}\n\nResponde con JSON:\n{"summary": "resumen en 2-3 líneas", "clinical_data": {"section": {"field": "value"}} | null}`,
      }],
    })

    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    const clean = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start === -1) return null

    const parsed = JSON.parse(clean.slice(start, end + 1))
    return { summary: parsed.summary ?? '', clinicalData: parsed.clinical_data ?? null }
  } catch {
    return null
  }
}
