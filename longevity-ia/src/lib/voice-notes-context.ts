import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetch voice notes for a patient and build a context string for AI analysis.
 * Used by both /api/analyze and /api/results/[id]/reanalyze.
 */
export async function buildVoiceNotesContext(
  supabase: SupabaseClient,
  patientId: string
): Promise<string> {
  const { data: voiceNotes } = await supabase
    .from('voice_notes')
    .select('transcript, ai_summary, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!voiceNotes || voiceNotes.length === 0) return ''

  return '\n\n--- NOTAS CLÍNICAS DEL MÉDICO (por voz) ---\n' +
    voiceNotes.map((n: { transcript: string; ai_summary: string | null; created_at: string }, i: number) =>
      `[Nota ${i + 1} — ${new Date(n.created_at).toLocaleDateString('es-MX')}]\n${n.transcript}` +
      (n.ai_summary ? `\n[Análisis IA]: ${n.ai_summary}` : '')
    ).join('\n\n')
}
