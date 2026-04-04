/**
 * Query steps para actividad operativa de la clínica.
 * Responde: análisis generados, consultas, notas, alertas por periodo,
 * agrupados por médico o por día.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { resolveClinicMedicoIds, resolveClinicMedicos, resolveClinicPatientIds } from './resolve-clinic'

// ── Types ───────────────────────────────────────────────────────────

export type Period = 'today' | 'week' | 'month' | 'quarter'
export type GroupBy = 'medico' | 'day' | 'week' | 'none'
export type ActivityMetric =
  | 'analyses_count'
  | 'consultations_count'
  | 'patients_created'
  | 'voice_notes_count'
  | 'clinical_notes_count'
  | 'alerts_generated'
  | 'alerts_resolved'

export interface ActivityResult {
  period: Period
  since: string
  metrics: Record<ActivityMetric, number>
  by_medico?: Record<string, Record<ActivityMetric, number> & { full_name: string }>
  by_day?: Record<string, Record<ActivityMetric, number>>
}

export interface DoctorPerformance {
  medico_user_id: string
  full_name: string
  specialty: string
  patients_total: number
  analyses_count: number
  consultations_count: number
  clinical_notes_count: number
  alerts_pending: number
  alerts_resolved: number
  avg_response_hours: number | null
}

// ── Helpers ─────────────────────────────────────────────────────────

function periodStart(period: Period): string {
  const now = new Date()
  switch (period) {
    case 'today': {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return d.toISOString()
    }
    case 'week': {
      const d = new Date(now)
      d.setDate(d.getDate() - d.getDay())
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3
      return new Date(now.getFullYear(), q, 1).toISOString()
    }
  }
}

// ── Query: Clinic activity metrics ──────────────────────────────────

export async function queryClinicActivity(
  clinicaId: string,
  period: Period,
  metrics: ActivityMetric[],
  groupBy: GroupBy = 'none',
): Promise<ActivityResult> {
  const admin = getSupabaseAdmin()
  const since = periodStart(period)

  const [medicoIds, medicos, patientIds] = await Promise.all([
    resolveClinicMedicoIds(clinicaId),
    resolveClinicMedicos(clinicaId),
    resolveClinicPatientIds(clinicaId),
  ])

  const medicoNameMap = new Map(medicos.map(m => [m.user_id, m.full_name]))

  // Ejecutar queries en paralelo según las métricas solicitadas
  type Row = { user_id?: string; date?: string; count: number }
  const queries: Record<string, PromiseLike<Row[]>> = {}

  if (metrics.includes('analyses_count') && medicoIds.length > 0) {
    // Usar audit_logs en vez de lab_results para saber QUÉ médico ejecutó el análisis
    queries.analyses_count = admin
      .from('audit_logs')
      .select('user_id, created_at')
      .eq('action', 'analyze_lab')
      .in('user_id', medicoIds)
      .gte('created_at', since)
      .then(({ data }): Row[] => (data ?? []).map(r => ({ user_id: r.user_id, date: r.created_at?.slice(0, 10), count: 1 })))
  }

  if (metrics.includes('consultations_count') && medicoIds.length > 0) {
    queries.consultations_count = admin
      .from('consultations')
      .select('medico_user_id, created_at')
      .in('medico_user_id', medicoIds)
      .gte('created_at', since)
      .then(({ data }): Row[] => (data ?? []).map(r => ({ user_id: r.medico_user_id, date: r.created_at?.slice(0, 10), count: 1 })))
  }

  if (metrics.includes('clinical_notes_count') && medicoIds.length > 0) {
    queries.clinical_notes_count = admin
      .from('clinical_notes')
      .select('medico_user_id, created_at')
      .in('medico_user_id', medicoIds)
      .gte('created_at', since)
      .then(({ data }): Row[] => (data ?? []).map(r => ({ user_id: r.medico_user_id, date: r.created_at?.slice(0, 10), count: 1 })))
  }

  if (metrics.includes('voice_notes_count') && medicoIds.length > 0) {
    queries.voice_notes_count = admin
      .from('voice_notes')
      .select('user_id, created_at')
      .in('user_id', medicoIds)
      .gte('created_at', since)
      .then(({ data }): Row[] => (data ?? []).map(r => ({ user_id: r.user_id, date: r.created_at?.slice(0, 10), count: 1 })))
  }

  if (metrics.includes('alerts_generated') && medicoIds.length > 0) {
    queries.alerts_generated = admin
      .from('medico_alerts')
      .select('medico_user_id, created_at')
      .in('medico_user_id', medicoIds)
      .gte('created_at', since)
      .then(({ data }): Row[] => (data ?? []).map(r => ({ user_id: r.medico_user_id, date: r.created_at?.slice(0, 10), count: 1 })))
  }

  if (metrics.includes('alerts_resolved') && medicoIds.length > 0) {
    queries.alerts_resolved = admin
      .from('medico_alerts')
      .select('medico_user_id, created_at')
      .in('medico_user_id', medicoIds)
      .gte('created_at', since)
      .or('read.eq.true,dismissed.eq.true')
      .then(({ data }): Row[] => (data ?? []).map(r => ({ user_id: r.medico_user_id, date: r.created_at?.slice(0, 10), count: 1 })))
  }

  if (metrics.includes('patients_created') && medicoIds.length > 0) {
    queries.patients_created = admin
      .from('audit_logs')
      .select('user_id, created_at')
      .eq('action', 'create_patient')
      .in('user_id', medicoIds)
      .gte('created_at', since)
      .then(({ data }): Row[] => (data ?? []).map(r => ({ user_id: r.user_id, date: r.created_at?.slice(0, 10), count: 1 })))
  }

  // Esperar todos los queries
  const entries = Object.entries(queries)
  const resolvedValues = await Promise.all(entries.map(([, promise]) => promise))

  const resolved: Record<string, { user_id?: string; date?: string; count: number }[]> = {}
  entries.forEach(([key], i) => {
    resolved[key] = resolvedValues[i]
  })

  // Calcular totales
  const totals: Record<ActivityMetric, number> = {
    analyses_count: 0,
    consultations_count: 0,
    patients_created: 0,
    voice_notes_count: 0,
    clinical_notes_count: 0,
    alerts_generated: 0,
    alerts_resolved: 0,
  }

  for (const metric of metrics) {
    totals[metric] = (resolved[metric] ?? []).reduce((sum, r) => sum + r.count, 0)
  }

  const result: ActivityResult = { period, since, metrics: totals }

  // Agrupar por médico si se solicita
  if (groupBy === 'medico') {
    const byMedico: Record<string, Record<ActivityMetric, number> & { full_name: string }> = {}

    for (const medicoId of medicoIds) {
      byMedico[medicoId] = {
        full_name: medicoNameMap.get(medicoId) ?? 'Desconocido',
        analyses_count: 0,
        consultations_count: 0,
        patients_created: 0,
        voice_notes_count: 0,
        clinical_notes_count: 0,
        alerts_generated: 0,
        alerts_resolved: 0,
      }
    }

    for (const metric of metrics) {
      for (const row of resolved[metric] ?? []) {
        if (row.user_id && byMedico[row.user_id]) {
          byMedico[row.user_id][metric] += row.count
        }
      }
    }

    result.by_medico = byMedico
  }

  // Agrupar por día si se solicita
  if (groupBy === 'day') {
    const byDay: Record<string, Record<ActivityMetric, number>> = {}

    for (const metric of metrics) {
      for (const row of resolved[metric] ?? []) {
        const day = row.date ?? 'unknown'
        if (!byDay[day]) {
          byDay[day] = {
            analyses_count: 0, consultations_count: 0, patients_created: 0,
            voice_notes_count: 0, clinical_notes_count: 0, alerts_generated: 0, alerts_resolved: 0,
          }
        }
        byDay[day][metric] += row.count
      }
    }

    result.by_day = byDay
  }

  return result
}

// ── Query: Doctor performance ───────────────────────────────────────

export async function queryDoctorPerformance(
  clinicaId: string,
  period: Period,
): Promise<DoctorPerformance[]> {
  const admin = getSupabaseAdmin()
  const since = periodStart(period)
  const medicos = await resolveClinicMedicos(clinicaId)

  if (medicos.length === 0) return []

  const medicoIds = medicos.map(m => m.user_id)

  // Queries en paralelo
  const [
    patientsRes,
    linkedPatientsRes,
    analysesRes,
    consultationsRes,
    notesRes,
    pendingAlertsRes,
    resolvedAlertsRes,
  ] = await Promise.all([
    // Pacientes directos por médico
    admin.from('patients').select('id, user_id').in('user_id', medicoIds),
    // Pacientes vinculados
    admin.from('patient_medico_links').select('medico_user_id, patient_id').in('medico_user_id', medicoIds).eq('status', 'active'),
    // Análisis del periodo (via audit_logs para saber qué médico lo hizo)
    admin.from('audit_logs').select('user_id').eq('action', 'analyze_lab').in('user_id', medicoIds).gte('created_at', since),
    // Consultas
    admin.from('consultations').select('medico_user_id').in('medico_user_id', medicoIds).gte('created_at', since),
    // Notas clínicas
    admin.from('clinical_notes').select('medico_user_id').in('medico_user_id', medicoIds).gte('created_at', since),
    // Alertas pendientes
    admin.from('medico_alerts').select('medico_user_id').in('medico_user_id', medicoIds).eq('read', false).eq('dismissed', false),
    // Alertas resueltas en el periodo
    admin.from('medico_alerts').select('medico_user_id').in('medico_user_id', medicoIds).gte('created_at', since).or('read.eq.true,dismissed.eq.true'),
  ])

  // Contar pacientes por médico (directos + vinculados)
  const patientCountByMedico = new Map<string, Set<string>>()
  for (const id of medicoIds) patientCountByMedico.set(id, new Set())
  for (const p of patientsRes.data ?? []) {
    patientCountByMedico.get(p.user_id)?.add(p.id)
  }
  for (const l of linkedPatientsRes.data ?? []) {
    if (l.medico_user_id && l.patient_id) {
      patientCountByMedico.get(l.medico_user_id)?.add(l.patient_id)
    }
  }

  // Contar métricas por médico
  function countByUser(data: { medico_user_id?: string; user_id?: string }[] | null): Map<string, number> {
    const map = new Map<string, number>()
    for (const row of data ?? []) {
      const id = row.medico_user_id ?? row.user_id ?? ''
      map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }

  const analysesByMedico = countByUser(analysesRes.data)
  const consultationsByMedico = countByUser(consultationsRes.data)
  const notesByMedico = countByUser(notesRes.data)
  const pendingByMedico = countByUser(pendingAlertsRes.data)
  const resolvedByMedico = countByUser(resolvedAlertsRes.data)

  const medicoMap = new Map(medicos.map(m => [m.user_id, m]))

  return medicos.map(m => ({
    medico_user_id: m.user_id,
    full_name: m.full_name,
    specialty: m.specialty,
    patients_total: patientCountByMedico.get(m.user_id)?.size ?? 0,
    analyses_count: analysesByMedico.get(m.user_id) ?? 0,
    consultations_count: consultationsByMedico.get(m.user_id) ?? 0,
    clinical_notes_count: notesByMedico.get(m.user_id) ?? 0,
    alerts_pending: pendingByMedico.get(m.user_id) ?? 0,
    alerts_resolved: resolvedByMedico.get(m.user_id) ?? 0,
    avg_response_hours: null, // Requiere timestamps de lectura — implementar después
  })).sort((a, b) => b.analyses_count - a.analyses_count)
}
