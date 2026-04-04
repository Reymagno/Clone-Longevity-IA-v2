/**
 * Query steps para sesiones de usuario.
 * Responde: logins por médico, médicos activos, tiempo en plataforma, última actividad.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { resolveClinicMedicos, type ClinicMedicoInfo } from './resolve-clinic'

// ── Types ───────────────────────────────────────────────────────────

export type Period = 'today' | 'week' | 'month' | 'quarter'

export interface MedicoSessionSummary {
  medico_user_id: string
  full_name: string
  specialty: string
  login_count: number
  active_days: number
  total_minutes: number
  last_seen: string | null
}

export interface ActiveMedicosResult {
  period: Period
  total_medicos: number
  active: MedicoSessionSummary[]
  inactive: { medico_user_id: string; full_name: string; specialty: string }[]
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
      d.setDate(d.getDate() - d.getDay()) // domingo
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      return d.toISOString()
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3
      const d = new Date(now.getFullYear(), q, 1)
      return d.toISOString()
    }
  }
}

function countUniqueDays(dates: string[]): number {
  const days = new Set(dates.map(d => d.slice(0, 10)))
  return days.size
}

// ── Query: Sessions for a specific medico ───────────────────────────

export async function queryMedicoSessions(
  medicoUserId: string,
  period: Period,
): Promise<{ login_count: number; active_days: number; total_minutes: number; last_seen: string | null }> {
  const admin = getSupabaseAdmin()
  const since = periodStart(period)

  const { data: sessions } = await admin
    .from('user_sessions')
    .select('started_at, last_seen_at, duration_seconds')
    .eq('user_id', medicoUserId)
    .gte('started_at', since)
    .order('started_at', { ascending: false })

  if (!sessions || sessions.length === 0) {
    return { login_count: 0, active_days: 0, total_minutes: 0, last_seen: null }
  }

  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)

  return {
    login_count: sessions.length,
    active_days: countUniqueDays(sessions.map(s => s.started_at)),
    total_minutes: Math.round(totalSeconds / 60),
    last_seen: sessions[0].last_seen_at,
  }
}

// ── Query: Active/inactive medicos for a clinic ─────────────────────

export async function queryActiveMedicos(
  clinicaId: string,
  period: Period,
): Promise<ActiveMedicosResult> {
  const admin = getSupabaseAdmin()
  const medicos = await resolveClinicMedicos(clinicaId)
  if (medicos.length === 0) {
    return { period, total_medicos: 0, active: [], inactive: [] }
  }

  const since = periodStart(period)
  const medicoIds = medicos.map(m => m.user_id)

  // Traer todas las sesiones del periodo para los médicos de la clínica
  const { data: sessions } = await admin
    .from('user_sessions')
    .select('user_id, started_at, last_seen_at, duration_seconds')
    .in('user_id', medicoIds)
    .gte('started_at', since)
    .order('started_at', { ascending: false })

  // Agrupar por médico
  const sessionsByMedico = new Map<string, typeof sessions>()
  for (const s of sessions ?? []) {
    const arr = sessionsByMedico.get(s.user_id) ?? []
    arr.push(s)
    sessionsByMedico.set(s.user_id, arr)
  }

  const medicoLookup = new Map<string, ClinicMedicoInfo>(medicos.map(m => [m.user_id, m]))

  const active: MedicoSessionSummary[] = []
  const inactive: { medico_user_id: string; full_name: string; specialty: string }[] = []

  for (const medicoId of medicoIds) {
    const info = medicoLookup.get(medicoId)!
    const medicoSessions = sessionsByMedico.get(medicoId)

    if (medicoSessions && medicoSessions.length > 0) {
      const totalSeconds = medicoSessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
      active.push({
        medico_user_id: medicoId,
        full_name: info.full_name,
        specialty: info.specialty,
        login_count: medicoSessions.length,
        active_days: countUniqueDays(medicoSessions.map(s => s.started_at)),
        total_minutes: Math.round(totalSeconds / 60),
        last_seen: medicoSessions[0].last_seen_at,
      })
    } else {
      inactive.push({
        medico_user_id: medicoId,
        full_name: info.full_name,
        specialty: info.specialty,
      })
    }
  }

  // Ordenar activos por login_count descendente
  active.sort((a, b) => b.login_count - a.login_count)

  return {
    period,
    total_medicos: medicos.length,
    active,
    inactive,
  }
}
