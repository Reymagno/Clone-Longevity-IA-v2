/**
 * Query steps para pacientes.
 * Responde: pacientes críticos, por score de sistema, por biomarcador,
 * sin análisis reciente, tendencias de biomarcadores.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { resolveClinicPatientIds, resolveClinicMedicoIds } from './resolve-clinic'
import type { ParsedData, AIAnalysis, BiomarkerValue } from '@/types'

// ── Types ───────────────────────────────────────────────────────────

type SystemName = 'cardiovascular' | 'metabolic' | 'hepatic' | 'renal' | 'immune' | 'hematologic' | 'inflammatory' | 'vitamins'
type BiomarkerStatus = 'optimal' | 'normal' | 'warning' | 'danger'
type ScoreOperator = 'lt' | 'gt' | 'eq' | 'lte' | 'gte'

export interface CriticalPatientResult {
  patient_id: string
  patient_name: string
  age: number
  gender: string
  medico_user_id: string | null
  danger_biomarkers: { name: string; value: number | null; unit: string; system: string }[]
  system_scores: { [key: string]: number }
  overall_score: number
  last_analysis_date: string | null
}

export interface BiomarkerTrendPoint {
  date: string
  value: number | null
  status: BiomarkerStatus | null
}

export interface PatientBiomarkerTrends {
  patient_id: string
  patient_name: string
  biomarkers: Record<string, BiomarkerTrendPoint[]>
}

export interface PatientQueryFilters {
  clinica_id?: string
  medico_user_id?: string
  score_system?: string
  score_operator?: string
  score_value?: number
  biomarker_status?: string
  has_unread_alerts?: boolean
  age_min?: number
  age_max?: number
  last_analysis_days?: number
  limit?: number
}

// ── Helpers ─────────────────────────────────────────────────────────

function compareScore(actual: number, operator: string, target: number): boolean {
  switch (operator) {
    case 'lt': return actual < target
    case 'gt': return actual > target
    case 'eq': return actual === target
    case 'lte': return actual <= target
    case 'gte': return actual >= target
    default: return false
  }
}

function extractAllBiomarkers(parsed: ParsedData): { name: string; value: number | null; unit: string; status: string | null; system: string }[] {
  const result: { name: string; value: number | null; unit: string; status: string | null; system: string }[] = []
  const systems = ['hematology', 'metabolic', 'lipids', 'liver', 'vitamins', 'hormones', 'inflammation', 'urinalysis'] as const

  for (const system of systems) {
    const section = parsed[system]
    if (!section || typeof section !== 'object') continue
    for (const [key, bio] of Object.entries(section)) {
      const b = bio as BiomarkerValue | null
      if (b && b.status) {
        result.push({ name: key, value: b.value, unit: b.unit ?? '', status: b.status, system })
      }
    }
  }
  return result
}

// ── Query: Critical patients (danger biomarkers, low scores) ────────

export async function queryCriticalPatients(
  clinicaId: string,
  criteria: 'danger_biomarkers' | 'low_system_score' | 'critical_alerts' | 'no_recent_analysis',
  options: {
    system?: SystemName
    threshold?: number
    medico_user_id?: string
  } = {},
): Promise<CriticalPatientResult[]> {
  const admin = getSupabaseAdmin()

  // Resolver pacientes de la clínica
  let patientIds: string[]
  if (options.medico_user_id) {
    // Filtrar solo pacientes de un médico específico
    const [ownedRes, linkedRes] = await Promise.all([
      admin.from('patients').select('id').eq('user_id', options.medico_user_id),
      admin.from('patient_medico_links').select('patient_id').eq('medico_user_id', options.medico_user_id).eq('status', 'active'),
    ])
    const ids = new Set<string>()
    for (const p of ownedRes.data ?? []) ids.add(p.id)
    for (const l of linkedRes.data ?? []) if (l.patient_id) ids.add(l.patient_id)
    patientIds = Array.from(ids)
  } else {
    patientIds = await resolveClinicPatientIds(clinicaId)
  }

  if (patientIds.length === 0) return []

  // Para "no_recent_analysis" — buscar pacientes sin análisis reciente
  if (criteria === 'no_recent_analysis') {
    const days = options.threshold ?? 90
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: patients } = await admin
      .from('patients')
      .select('id, name, age, gender, user_id')
      .in('id', patientIds)

    const { data: recentResults } = await admin
      .from('lab_results')
      .select('patient_id')
      .in('patient_id', patientIds)
      .gte('created_at', cutoff)

    const recentPatientIds = new Set((recentResults ?? []).map(r => r.patient_id))

    return (patients ?? [])
      .filter(p => !recentPatientIds.has(p.id))
      .map(p => ({
        patient_id: p.id,
        patient_name: p.name,
        age: p.age,
        gender: p.gender,
        medico_user_id: p.user_id,
        danger_biomarkers: [],
        system_scores: {},
        overall_score: 0,
        last_analysis_date: null,
      }))
  }

  // Para "critical_alerts" — pacientes con alertas nivel critical/danger sin leer
  if (criteria === 'critical_alerts') {
    const medicoIds = await resolveClinicMedicoIds(clinicaId)

    const { data: alerts } = await admin
      .from('medico_alerts')
      .select('patient_id, level, title, detail')
      .in('medico_user_id', medicoIds)
      .in('level', ['critical', 'danger'])
      .eq('dismissed', false)
      .eq('read', false)

    if (!alerts || alerts.length === 0) return []

    const criticalPatientIds = Array.from(new Set(alerts.map(a => a.patient_id)))

    const { data: patients } = await admin
      .from('patients')
      .select('id, name, age, gender, user_id')
      .in('id', criticalPatientIds)

    const patientMap = new Map((patients ?? []).map(p => [p.id, p]))

    return criticalPatientIds.map(pid => {
      const p = patientMap.get(pid)
      return {
        patient_id: pid,
        patient_name: p?.name ?? 'Desconocido',
        age: p?.age ?? 0,
        gender: p?.gender ?? '',
        medico_user_id: p?.user_id ?? null,
        danger_biomarkers: [],
        system_scores: {},
        overall_score: 0,
        last_analysis_date: null,
      }
    })
  }

  // Para "danger_biomarkers" y "low_system_score" — necesitamos los últimos lab_results
  // Traer el resultado más reciente de cada paciente
  const { data: allResults } = await admin
    .from('lab_results')
    .select('patient_id, parsed_data, ai_analysis, created_at')
    .in('patient_id', patientIds)
    .order('created_at', { ascending: false })

  // Quedarnos solo con el más reciente por paciente
  const latestByPatient = new Map<string, { parsed_data: ParsedData; ai_analysis: AIAnalysis; created_at: string }>()
  for (const r of allResults ?? []) {
    if (!latestByPatient.has(r.patient_id) && r.parsed_data && r.ai_analysis) {
      latestByPatient.set(r.patient_id, {
        parsed_data: r.parsed_data as ParsedData,
        ai_analysis: r.ai_analysis as AIAnalysis,
        created_at: r.created_at,
      })
    }
  }

  // Traer datos de pacientes
  const relevantPatientIds = Array.from(latestByPatient.keys())
  if (relevantPatientIds.length === 0) return []

  const { data: patients } = await admin
    .from('patients')
    .select('id, name, age, gender, user_id')
    .in('id', relevantPatientIds)

  const patientMap = new Map((patients ?? []).map(p => [p.id, p]))
  const results: CriticalPatientResult[] = []

  latestByPatient.forEach((result, patientId) => {
    const patient = patientMap.get(patientId)
    if (!patient) return

    const analysis = result.ai_analysis
    const scores = analysis.systemScores ?? {}

    if (criteria === 'danger_biomarkers') {
      const allBiomarkers = extractAllBiomarkers(result.parsed_data)
      const dangerOnes = allBiomarkers.filter(b => b.status === 'danger')
      if (dangerOnes.length === 0) return

      results.push({
        patient_id: patientId,
        patient_name: patient.name,
        age: patient.age,
        gender: patient.gender,
        medico_user_id: patient.user_id,
        danger_biomarkers: dangerOnes.map(b => ({ name: b.name, value: b.value, unit: b.unit, system: b.system })),
        system_scores: { ...scores },
        overall_score: analysis.overallScore ?? 0,
        last_analysis_date: result.created_at,
      })
    }

    if (criteria === 'low_system_score') {
      const system = options.system
      const threshold = options.threshold ?? 50

      if (system) {
        const score = scores[system]
        if (score === undefined || score >= threshold) return
      } else {
        if ((analysis.overallScore ?? 100) >= threshold) return
      }

      const dangerBiomarkers = extractAllBiomarkers(result.parsed_data).filter(b => b.status === 'danger')

      results.push({
        patient_id: patientId,
        patient_name: patient.name,
        age: patient.age,
        gender: patient.gender,
        medico_user_id: patient.user_id,
        danger_biomarkers: dangerBiomarkers.map(b => ({ name: b.name, value: b.value, unit: b.unit, system: b.system })),
        system_scores: { ...scores },
        overall_score: analysis.overallScore ?? 0,
        last_analysis_date: result.created_at,
      })
    }
  })

  // Ordenar por overall_score ascendente (más críticos primero)
  results.sort((a, b) => a.overall_score - b.overall_score)

  return results
}

// ── Query: Biomarker trends for a patient ───────────────────────────

export async function queryBiomarkerTrends(
  patientId: string,
  biomarkerNames: string[],
  periodMonths: number = 6,
): Promise<PatientBiomarkerTrends> {
  const admin = getSupabaseAdmin()
  const since = new Date()
  since.setMonth(since.getMonth() - periodMonths)

  const { data: patient } = await admin
    .from('patients')
    .select('name')
    .eq('id', patientId)
    .single()

  const { data: results } = await admin
    .from('lab_results')
    .select('parsed_data, created_at')
    .eq('patient_id', patientId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  const trends: Record<string, BiomarkerTrendPoint[]> = {}
  for (const name of biomarkerNames) {
    trends[name] = []
  }

  for (const result of results ?? []) {
    const parsed = result.parsed_data as ParsedData | null
    if (!parsed) continue

    // Buscar cada biomarcador en todas las secciones
    for (const name of biomarkerNames) {
      const bio = findBiomarkerInParsed(parsed, name)
      if (bio) {
        trends[name].push({
          date: result.created_at,
          value: bio.value,
          status: bio.status as BiomarkerStatus | null,
        })
      }
    }
  }

  return {
    patient_id: patientId,
    patient_name: patient?.name ?? 'Desconocido',
    biomarkers: trends,
  }
}

function findBiomarkerInParsed(parsed: ParsedData, name: string): BiomarkerValue | null {
  const sections = ['hematology', 'metabolic', 'lipids', 'liver', 'vitamins', 'hormones', 'inflammation', 'urinalysis'] as const
  for (const section of sections) {
    const s = parsed[section] as unknown as Record<string, BiomarkerValue | null> | undefined
    if (s && s[name] && s[name]!.value !== null) {
      return s[name]!
    }
  }
  return null
}

// ── Query: Patients by flexible filters ─────────────────────────────

export async function queryPatientsByFilters(
  filters: PatientQueryFilters,
): Promise<CriticalPatientResult[]> {
  const admin = getSupabaseAdmin()

  // Resolver universo de pacientes
  let patientIds: string[]
  if (filters.medico_user_id) {
    const [ownedRes, linkedRes] = await Promise.all([
      admin.from('patients').select('id').eq('user_id', filters.medico_user_id),
      admin.from('patient_medico_links').select('patient_id').eq('medico_user_id', filters.medico_user_id).eq('status', 'active'),
    ])
    const ids = new Set<string>()
    for (const p of ownedRes.data ?? []) ids.add(p.id)
    for (const l of linkedRes.data ?? []) if (l.patient_id) ids.add(l.patient_id)
    patientIds = Array.from(ids)
  } else if (filters.clinica_id) {
    patientIds = await resolveClinicPatientIds(filters.clinica_id)
  } else {
    return []
  }

  if (patientIds.length === 0) return []

  // Traer pacientes con filtros de edad/género
  let patientsQuery = admin.from('patients').select('id, name, age, gender, user_id').in('id', patientIds)
  if (filters.age_min) patientsQuery = patientsQuery.gte('age', filters.age_min)
  if (filters.age_max) patientsQuery = patientsQuery.lte('age', filters.age_max)

  const { data: patients } = await patientsQuery
  if (!patients || patients.length === 0) return []

  const filteredPatientIds = patients.map(p => p.id)

  // Traer último resultado por paciente
  const { data: allResults } = await admin
    .from('lab_results')
    .select('patient_id, parsed_data, ai_analysis, created_at')
    .in('patient_id', filteredPatientIds)
    .order('created_at', { ascending: false })

  const latestByPatient = new Map<string, { parsed_data: ParsedData; ai_analysis: AIAnalysis; created_at: string }>()
  for (const r of allResults ?? []) {
    if (!latestByPatient.has(r.patient_id) && r.parsed_data && r.ai_analysis) {
      latestByPatient.set(r.patient_id, {
        parsed_data: r.parsed_data as ParsedData,
        ai_analysis: r.ai_analysis as AIAnalysis,
        created_at: r.created_at,
      })
    }
  }

  const patientMap = new Map(patients.map(p => [p.id, p]))
  const results: CriticalPatientResult[] = []
  const limit = filters.limit ?? 20

  latestByPatient.forEach((result, patientId) => {
    if (results.length >= limit) return
    const patient = patientMap.get(patientId)
    if (!patient) return

    const analysis = result.ai_analysis
    const scores = analysis.systemScores ?? {}

    // Filtro por score de sistema
    if (filters.score_system && filters.score_operator && filters.score_value !== undefined) {
      const score = (scores as unknown as Record<string, number>)[filters.score_system]
      if (score === undefined || !compareScore(score, filters.score_operator, filters.score_value)) {
        return
      }
    }

    const dangerBiomarkers = extractAllBiomarkers(result.parsed_data)
      .filter(b => b.status === (filters.biomarker_status ?? 'danger'))

    // Si filtra por status de biomarcador y no hay ninguno, saltar
    if (filters.biomarker_status && dangerBiomarkers.length === 0) return

    results.push({
      patient_id: patientId,
      patient_name: patient.name,
      age: patient.age,
      gender: patient.gender,
      medico_user_id: patient.user_id,
      danger_biomarkers: dangerBiomarkers.map(b => ({ name: b.name, value: b.value, unit: b.unit, system: b.system })),
      system_scores: { ...scores },
      overall_score: analysis.overallScore ?? 0,
      last_analysis_date: result.created_at,
    })

  })

  results.sort((a, b) => a.overall_score - b.overall_score)
  return results
}
