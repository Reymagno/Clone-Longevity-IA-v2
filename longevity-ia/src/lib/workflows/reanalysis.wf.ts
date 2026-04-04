/**
 * WF-6: Re-analysis Workflow
 *
 * Flujo de re-análisis de resultados:
 *   fetchResult → fetchPatient → detectStrategy → executeAnalysis → save → alerts → audit
 *
 * Mejoras: SKIP si hash idéntico, diff entre análisis viejo y nuevo.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit'
import { alertGenerationWorkflow } from './alert-generation.wf'
import type { ParsedData, AIAnalysis } from '@/types'
import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'

export type AnalysisStrategy = 'full' | 'partial' | 'skip'

export interface ReanalysisInput {
  supabase: SupabaseClient
  userId: string
  userEmail: string
  resultId: string
  request?: NextRequest
}

export interface ReanalysisResult {
  success: boolean
  strategy: AnalysisStrategy
  analysis?: AIAnalysis
  error?: string
}

function hashClinicalHistory(ch: unknown): string {
  if (!ch) return 'none'
  return createHash('sha256').update(JSON.stringify(ch)).digest('hex').slice(0, 16)
}

export async function reanalysisWorkflow(input: ReanalysisInput): Promise<ReanalysisResult> {
  const { supabase, userId, userEmail, resultId } = input

  try {
    // Step 1: Fetch result
    const { data: result } = await supabase
      .from('lab_results')
      .select('id, parsed_data, ai_analysis, patient_id')
      .eq('id', resultId)
      .single()

    if (!result) return { success: false, strategy: 'skip', error: 'Resultado no encontrado' }
    if (!result.parsed_data) return { success: false, strategy: 'skip', error: 'Sin datos parseados' }

    // Step 2: Fetch patient
    const { data: patient } = await supabase
      .from('patients')
      .select('id, name, age, gender, weight, height, clinical_history')
      .eq('id', result.patient_id)
      .single()

    if (!patient) return { success: false, strategy: 'skip', error: 'Paciente no encontrado' }

    // Step 3: Build context (needed for both hash and analysis)
    const { buildVoiceNotesContext } = await import('@/lib/voice-notes-context')
    const voiceContext = await buildVoiceNotesContext(supabase, patient.id)

    // Step 4: Detect strategy — include voice notes in hash to detect changes
    const currentHash = hashClinicalHistory({ ch: patient.clinical_history, vn: voiceContext })
    const existingAnalysis = result.ai_analysis as AIAnalysis | null
    const meta = (existingAnalysis as Record<string, unknown> | null)?._meta as Record<string, unknown> | undefined
    const previousHash = meta?.clinicalHistoryHash as string | undefined

    let strategy: AnalysisStrategy
    if (previousHash && previousHash === currentHash && existingAnalysis) {
      strategy = 'skip'
    } else if (existingAnalysis?.systemScores && existingAnalysis?.swot) {
      strategy = 'partial'
    } else {
      strategy = 'full'
    }

    if (strategy === 'skip') {
      return { success: true, strategy, analysis: existingAnalysis! }
    }

    // Step 5: Execute analysis
    const analyzer = await import('@/lib/anthropic/analyzer')
    let newAnalysis: AIAnalysis

    // Note: the analyzer functions accept (parsedData, cachedAnalysis, patientContext, onProgress?, wearableData?)
    // voiceContext is appended to clinical_history before calling
    const patientWithContext = {
      ...patient,
      clinical_history: {
        ...(patient.clinical_history as Record<string, unknown> ?? {}),
        _voiceNotesContext: voiceContext,
      },
    }

    if (strategy === 'partial') {
      newAnalysis = await analyzer.reanalyzePartial(
        result.parsed_data as ParsedData,
        existingAnalysis!,
        patientWithContext as unknown as Parameters<typeof analyzer.reanalyzePartial>[2],
      ) as AIAnalysis
    } else {
      newAnalysis = await analyzer.reanalyzeWithClinicalHistory(
        result.parsed_data as ParsedData,
        patientWithContext as unknown as Parameters<typeof analyzer.reanalyzeWithClinicalHistory>[1],
      ) as AIAnalysis
    }

    // Step 6: Inject metadata and save
    const analysisWithMeta = {
      ...newAnalysis,
      _meta: { clinicalHistoryHash: currentHash, reanalyzedAt: new Date().toISOString(), strategy },
    }

    await supabase
      .from('lab_results')
      .update({ ai_analysis: analysisWithMeta })
      .eq('id', resultId)

    // Step 7: Generate alerts (non-blocking)
    // Get previous result for comparison
    const { data: prevResults } = await supabase
      .from('lab_results')
      .select('parsed_data')
      .eq('patient_id', patient.id)
      .neq('id', resultId)
      .order('created_at', { ascending: false })
      .limit(1)

    alertGenerationWorkflow({
      patientId: patient.id,
      resultId,
      patientName: patient.name,
      parsedData: result.parsed_data as ParsedData,
      aiAnalysis: newAnalysis,
      previousParsed: (prevResults?.[0]?.parsed_data as ParsedData) ?? null,
      isNewAnalysis: false,
    }).catch(err => console.error('[reanalysis.wf] alerts error:', err))

    // Step 8: Audit
    logAudit({
      userId, email: userEmail,
      action: 'reanalyze_result', resourceType: 'lab_result',
      resourceId: resultId, patientId: patient.id,
      details: { strategy },
    }, input.request)

    return { success: true, strategy, analysis: newAnalysis }
  } catch (err) {
    return { success: false, strategy: 'full', error: err instanceof Error ? err.message : 'Error interno' }
  }
}
