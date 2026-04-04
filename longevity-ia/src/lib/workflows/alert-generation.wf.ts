/**
 * WF-5: Alert Generation Workflow
 *
 * Genera alertas deduplicadas en batch para todos los médicos vinculados.
 * Reemplaza la lógica monolítica de generate-alerts.ts con steps reutilizables.
 *
 * Flujo:
 *   findLinkedMedicos → evaluateConditions → deduplicateAlerts → batchCreateAlerts
 */

import {
  findLinkedMedicos,
  expandAlertsToMedicos,
  deduplicateAlerts,
  batchCreateAlerts,
  type AlertData,
} from '@/lib/steps/alerts'
import type { ParsedData, AIAnalysis, BiomarkerValue } from '@/types'

// ── Biomarker comparison config ─────────────────────────────────────

const LOWER_IS_BETTER: Record<string, boolean> = {
  ldl: true, triglycerides: true, glucose: true, creatinine: true,
  uricAcid: true, alt: true, ast: true, ggt: true, crp: true,
  homocysteine: true, hba1c: true, insulin: true, rdw: true, totalCholesterol: true,
}

// ── Evaluate alert conditions ───────────────────────────────────────

interface AlertConditionResult {
  alerts: Omit<AlertData, 'medico_user_id'>[]
}

function evaluateAlertConditions(
  patientId: string,
  resultId: string,
  patientName: string,
  parsedData: ParsedData | null,
  aiAnalysis: AIAnalysis | null,
  previousParsed: ParsedData | null,
  isNewAnalysis: boolean,
): AlertConditionResult {
  const alerts: Omit<AlertData, 'medico_user_id'>[] = []

  // 1. New analysis notification
  if (isNewAnalysis) {
    alerts.push({
      patient_id: patientId,
      result_id: resultId,
      alert_type: 'new_analysis',
      level: 'info',
      title: `${patientName}: subio un nuevo analisis`,
      detail: 'Se ha subido un nuevo análisis de laboratorio.',
    })
  }

  if (!parsedData) return { alerts }

  // 2. Danger biomarkers
  const dangerBiomarkers: { name: string; value: number | null; unit: string }[] = []
  const sections = ['hematology', 'metabolic', 'lipids', 'liver', 'vitamins', 'hormones', 'inflammation', 'urinalysis'] as const

  for (const section of sections) {
    const s = parsedData[section] as unknown as Record<string, BiomarkerValue | null> | undefined
    if (!s) continue
    for (const [key, bio] of Object.entries(s)) {
      if (bio?.status === 'danger') {
        dangerBiomarkers.push({ name: key, value: bio.value, unit: bio.unit ?? '' })
      }
    }
  }

  if (dangerBiomarkers.length > 0) {
    alerts.push({
      patient_id: patientId,
      result_id: resultId,
      alert_type: 'biomarker_danger',
      level: dangerBiomarkers.length >= 3 ? 'critical' : 'danger',
      title: `${patientName}: ${dangerBiomarkers.length} biomarcador(es) en rango critico`,
      detail: dangerBiomarkers.map(b => `${b.name}: ${b.value ?? '?'} ${b.unit}`).join(', '),
      metadata: { biomarkers: dangerBiomarkers },
    })
  }

  // 3. Worsened biomarkers (>20% change)
  if (previousParsed) {
    const worsened: { name: string; change: number }[] = []

    for (const section of sections) {
      const current = parsedData[section] as unknown as Record<string, BiomarkerValue | null> | undefined
      const previous = previousParsed[section] as unknown as Record<string, BiomarkerValue | null> | undefined
      if (!current || !previous) continue

      for (const [key, bio] of Object.entries(current)) {
        if (!bio?.value || !previous[key]?.value) continue
        const prev = previous[key]!.value!
        if (prev === 0) continue

        const pct = ((bio.value - prev) / Math.abs(prev)) * 100
        const lowerBetter = LOWER_IS_BETTER[key] ?? false
        const isWorse = lowerBetter ? pct > 20 : pct < -20

        if (isWorse) {
          worsened.push({ name: key, change: Math.round(pct) })
        }
      }
    }

    if (worsened.length > 0) {
      alerts.push({
        patient_id: patientId,
        result_id: resultId,
        alert_type: 'biomarker_worsened',
        level: worsened.length >= 3 ? 'danger' : 'warning',
        title: `${patientName}: ${worsened.length} biomarcador(es) empeoraron >20%`,
        detail: worsened.map(w => `${w.name}: ${w.change > 0 ? '+' : ''}${w.change}%`).join(', '),
        metadata: { biomarkers: worsened },
      })
    }
  }

  // 4. Critical overall score
  if (aiAnalysis?.overallScore !== undefined && aiAnalysis.overallScore < 40) {
    alerts.push({
      patient_id: patientId,
      result_id: resultId,
      alert_type: 'overall_score_critical',
      level: 'critical',
      title: `${patientName}: Score General critico (${aiAnalysis.overallScore}/100)`,
      detail: `El score general del paciente ha caído por debajo del umbral crítico de 40.`,
      metadata: { overallScore: aiAnalysis.overallScore },
    })
  }

  return { alerts }
}

// ── Main workflow ───────────────────────────────────────────────────

export interface AlertGenerationInput {
  patientId: string
  resultId: string
  patientName: string
  parsedData: ParsedData | null
  aiAnalysis: AIAnalysis | null
  previousParsed: ParsedData | null
  isNewAnalysis: boolean
}

export async function alertGenerationWorkflow(input: AlertGenerationInput): Promise<number> {
  try {
    // Step 1: Find all linked medicos
    const medicoIds = await findLinkedMedicos(input.patientId)
    if (medicoIds.length === 0) return 0

    // Step 2: Evaluate alert conditions
    const { alerts: baseAlerts } = evaluateAlertConditions(
      input.patientId,
      input.resultId,
      input.patientName,
      input.parsedData,
      input.aiAnalysis,
      input.previousParsed,
      input.isNewAnalysis,
    )

    if (baseAlerts.length === 0) return 0

    // Step 3: Expand to all medicos
    const allAlerts: AlertData[] = baseAlerts.flatMap(alert =>
      expandAlertsToMedicos(alert, medicoIds),
    )

    // Step 4: Deduplicate against existing (24h window)
    const uniqueAlerts = await deduplicateAlerts(allAlerts)

    // Step 5: Batch insert
    const count = await batchCreateAlerts(uniqueAlerts)
    return count
  } catch (err) {
    console.error('[alertGenerationWorkflow] error:', err instanceof Error ? err.message : err)
    return 0
  }
}
