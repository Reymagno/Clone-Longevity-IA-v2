/**
 * LONGEVITY IA — Generación automática de alertas para médicos
 *
 * Se invoca después de que un análisis se completa o actualiza.
 * Genera alertas para todos los médicos vinculados al paciente.
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface AlertInput {
  alert_type: string
  level: string
  title: string
  detail: string
  metadata?: Record<string, unknown>
}

/**
 * Genera alertas para los médicos vinculados a un paciente.
 * Llama después de INSERT o UPDATE en lab_results.ai_analysis.
 */
export async function generateAlertsForResult(
  supabase: SupabaseClient,
  patientId: string,
  resultId: string,
  parsedData: Record<string, unknown> | null,
  aiAnalysis: Record<string, unknown> | null,
  isNewAnalysis: boolean
) {
  try {
    // Get linked medicos for this patient
    const { data: links } = await supabase
      .from('patient_medico_links')
      .select('medico_user_id')
      .eq('patient_id', patientId)
      .eq('status', 'active')

    // Also get the medico who owns this patient (if created by a medico)
    const { data: patient } = await supabase
      .from('patients')
      .select('user_id, name')
      .eq('id', patientId)
      .maybeSingle()

    let ownerMedicoId: string | null = null
    if (patient?.user_id) {
      // Check if the owner is a medico by checking if they have a medicos record
      const { data: medicoRecord } = await supabase
        .from('medicos')
        .select('user_id')
        .eq('user_id', patient.user_id)
        .maybeSingle()
      if (medicoRecord) ownerMedicoId = medicoRecord.user_id
    }

    const medicoIds = new Set<string>()
    if (links) for (const l of links) medicoIds.add(l.medico_user_id)
    if (ownerMedicoId) medicoIds.add(ownerMedicoId)

    if (medicoIds.size === 0) return

    const patientName = patient?.name ?? 'Paciente'
    const alerts: AlertInput[] = []

    // 1. New analysis alert
    if (isNewAnalysis) {
      alerts.push({
        alert_type: 'new_analysis',
        level: 'info',
        title: `${patientName} subio un nuevo analisis`,
        detail: 'Se subio un nuevo estudio de laboratorio. Revisa los resultados en el dashboard.',
      })
    }

    // 2. Check for DANGER biomarkers
    if (parsedData) {
      const dangerBiomarkers: string[] = []
      for (const [section, sectionData] of Object.entries(parsedData)) {
        if (!sectionData || typeof sectionData !== 'object') continue
        for (const [key, bm] of Object.entries(sectionData as Record<string, unknown>)) {
          if (!bm || typeof bm !== 'object') continue
          const biomarker = bm as { value?: number; status?: string; unit?: string }
          if (biomarker.status === 'danger' && biomarker.value != null) {
            dangerBiomarkers.push(`${key}: ${biomarker.value} ${biomarker.unit ?? ''}`)
          }
        }
      }

      if (dangerBiomarkers.length > 0) {
        alerts.push({
          alert_type: 'biomarker_danger',
          level: dangerBiomarkers.length >= 3 ? 'critical' : 'danger',
          title: `${patientName}: ${dangerBiomarkers.length} biomarcador${dangerBiomarkers.length > 1 ? 'es' : ''} en rango critico`,
          detail: dangerBiomarkers.slice(0, 5).join(', '),
          metadata: { biomarkers: dangerBiomarkers },
        })
      }
    }

    // 3. Check for worsened biomarkers (>20% change)
    // Get previous result for this patient
    if (parsedData) {
      const { data: prevResults } = await supabase
        .from('lab_results')
        .select('parsed_data')
        .eq('patient_id', patientId)
        .neq('id', resultId)
        .not('parsed_data', 'is', null)
        .order('result_date', { ascending: false })
        .limit(1)

      if (prevResults && prevResults.length > 0 && prevResults[0].parsed_data) {
        const prevParsed = prevResults[0].parsed_data as Record<string, unknown>
        const worsened: string[] = []

        const LOWER_IS_BETTER: Record<string, boolean> = {
          ldl: true, triglycerides: true, glucose: true, creatinine: true,
          uricAcid: true, alt: true, ast: true, ggt: true, crp: true,
          homocysteine: true, hba1c: true, insulin: true, rdw: true,
          totalCholesterol: true,
        }

        for (const [section, sectionData] of Object.entries(parsedData)) {
          if (!sectionData || typeof sectionData !== 'object') continue
          const prevSection = prevParsed[section] as Record<string, unknown> | undefined
          if (!prevSection) continue

          for (const [key, bm] of Object.entries(sectionData as Record<string, unknown>)) {
            if (!bm || typeof bm !== 'object') continue
            const current = (bm as { value?: number }).value
            const prevBm = prevSection[key] as { value?: number } | null | undefined
            const previous = prevBm?.value

            if (current == null || previous == null || previous === 0) continue

            const changePct = ((current - previous) / Math.abs(previous)) * 100
            const lowerBetter = LOWER_IS_BETTER[key] ?? false
            const isWorse = lowerBetter ? changePct > 20 : changePct < -20

            if (isWorse) {
              worsened.push(`${key}: ${previous} → ${current} (${changePct > 0 ? '+' : ''}${changePct.toFixed(0)}%)`)
            }
          }
        }

        if (worsened.length > 0) {
          alerts.push({
            alert_type: 'biomarker_worsened',
            level: worsened.length >= 3 ? 'danger' : 'warning',
            title: `${patientName}: ${worsened.length} biomarcador${worsened.length > 1 ? 'es' : ''} empeoraron >20%`,
            detail: worsened.slice(0, 5).join(', '),
            metadata: { worsened },
          })
        }
      }
    }

    // 4. Check overall score drop
    if (aiAnalysis?.overallScore != null) {
      const score = aiAnalysis.overallScore as number
      if (score < 40) {
        alerts.push({
          alert_type: 'biomarker_danger',
          level: 'critical',
          title: `${patientName}: Score General critico (${score}/100)`,
          detail: 'El score general indica estado critico que requiere intervencion urgente.',
          metadata: { overallScore: score },
        })
      }
    }

    // Insert alerts for each linked medico
    if (alerts.length > 0) {
      const rows = []
      for (const medicoId of Array.from(medicoIds)) {
        for (const alert of alerts) {
          rows.push({
            medico_user_id: medicoId,
            patient_id: patientId,
            result_id: resultId,
            ...alert,
          })
        }
      }
      await supabase.from('medico_alerts').insert(rows)
    }
  } catch (e) {
    console.error('Error generating alerts:', e)
  }
}
