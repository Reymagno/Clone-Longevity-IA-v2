/**
 * WF-9: Clinic Stats Workflow
 *
 * Reemplaza el handler de /api/clinica/stats con queries paralelos.
 * Usa los resolvers de resolve-clinic.ts que ya existen.
 */

import { resolveClinicaId, resolveClinicMedicoIds, resolveClinicPatientIds } from '@/lib/steps/resolve-clinic'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export interface ClinicStatsResult {
  total_medicos: number
  total_patients: number
  analyses_this_month: number
  pending_alerts: number
}

export async function clinicStatsWorkflow(clinicaUserId: string): Promise<ClinicStatsResult> {
  const clinicaId = await resolveClinicaId(clinicaUserId)
  if (!clinicaId) {
    return { total_medicos: 0, total_patients: 0, analyses_this_month: 0, pending_alerts: 0 }
  }

  const admin = getSupabaseAdmin()

  // Step 1: Resolve medico IDs and patient IDs in parallel
  const [medicoIds, patientIds] = await Promise.all([
    resolveClinicMedicoIds(clinicaId),
    resolveClinicPatientIds(clinicaId),
  ])

  if (medicoIds.length === 0) {
    return { total_medicos: 0, total_patients: patientIds.length, analyses_this_month: 0, pending_alerts: 0 }
  }

  // Step 2: Count analyses and alerts in parallel
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [analysesRes, alertsRes] = await Promise.all([
    patientIds.length > 0
      ? admin.from('lab_results').select('id', { count: 'exact', head: true })
          .in('patient_id', patientIds).gte('created_at', monthStart)
      : Promise.resolve({ count: 0 }),

    admin.from('medico_alerts').select('id', { count: 'exact', head: true })
      .in('medico_user_id', medicoIds).eq('read', false).eq('dismissed', false),
  ])

  return {
    total_medicos: medicoIds.length,
    total_patients: patientIds.length,
    analyses_this_month: analysesRes.count ?? 0,
    pending_alerts: alertsRes.count ?? 0,
  }
}
