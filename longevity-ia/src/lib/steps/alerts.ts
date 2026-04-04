/**
 * Steps de alertas médicas.
 * Creación, deduplicación, batch insert y escalamiento.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ───────────────────────────────────────────────────────────

export interface AlertData {
  medico_user_id: string
  patient_id: string
  result_id?: string
  alert_type: string
  level: 'info' | 'warning' | 'danger' | 'critical'
  title: string
  detail: string
  metadata?: Record<string, unknown>
}

// ── Find linked medicos for a patient ───────────────────────────────

export async function findLinkedMedicos(patientId: string): Promise<string[]> {
  const admin = getSupabaseAdmin()
  const medicoIds = new Set<string>()

  // Via patient_medico_links
  const { data: links } = await admin
    .from('patient_medico_links')
    .select('medico_user_id')
    .eq('patient_id', patientId)
    .eq('status', 'active')

  for (const l of links ?? []) {
    if (l.medico_user_id) medicoIds.add(l.medico_user_id)
  }

  // Via patient owner (if owner is a medico)
  const { data: patient } = await admin
    .from('patients')
    .select('user_id')
    .eq('id', patientId)
    .single()

  if (patient?.user_id) {
    const { data: medico } = await admin
      .from('medicos')
      .select('user_id')
      .eq('user_id', patient.user_id)
      .single()
    if (medico) medicoIds.add(medico.user_id)
  }

  return Array.from(medicoIds)
}

// ── Create single alert ─────────────────────────────────────────────

export async function createAlert(alert: AlertData): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.from('medico_alerts').insert(alert)
  if (error) console.error('[alerts] create error:', error.message)
}

// ── Batch create alerts ─────────────────────────────────────────────

export async function batchCreateAlerts(alerts: AlertData[]): Promise<number> {
  if (alerts.length === 0) return 0
  const admin = getSupabaseAdmin()
  const { error } = await admin.from('medico_alerts').insert(alerts)
  if (error) {
    console.error('[alerts] batch create error:', error.message)
    return 0
  }
  return alerts.length
}

// ── Deduplicate against existing alerts ─────────────────────────────

export async function deduplicateAlerts(
  newAlerts: AlertData[],
  hoursWindow: number = 24,
): Promise<AlertData[]> {
  if (newAlerts.length === 0) return []
  const admin = getSupabaseAdmin()

  const since = new Date(Date.now() - hoursWindow * 60 * 60 * 1000).toISOString()
  const patientIds = Array.from(new Set(newAlerts.map(a => a.patient_id)))
  const medicoIds = Array.from(new Set(newAlerts.map(a => a.medico_user_id)))

  const { data: existing } = await admin
    .from('medico_alerts')
    .select('medico_user_id, patient_id, alert_type')
    .in('patient_id', patientIds)
    .in('medico_user_id', medicoIds)
    .gte('created_at', since)

  const existingKeys = new Set(
    (existing ?? []).map(e => `${e.medico_user_id}:${e.patient_id}:${e.alert_type}`),
  )

  return newAlerts.filter(a => {
    const key = `${a.medico_user_id}:${a.patient_id}:${a.alert_type}`
    return !existingKeys.has(key)
  })
}

// ── Expand alerts to all linked medicos ─────────────────────────────

export function expandAlertsToMedicos(
  baseAlert: Omit<AlertData, 'medico_user_id'>,
  medicoIds: string[],
): AlertData[] {
  return medicoIds.map(medicoId => ({
    ...baseAlert,
    medico_user_id: medicoId,
  }))
}

// ── Escalate alert ──────────────────────────────────────────────────

export async function escalateAlert(
  alertId: string,
  targetUserId: string,
  escalationNote: string,
): Promise<void> {
  const admin = getSupabaseAdmin()

  // Get original alert
  const { data: original } = await admin
    .from('medico_alerts')
    .select('*')
    .eq('id', alertId)
    .single()

  if (!original) return

  // Create escalated copy for target
  await admin.from('medico_alerts').insert({
    medico_user_id: targetUserId,
    patient_id: original.patient_id,
    result_id: original.result_id,
    alert_type: 'escalated',
    level: original.level,
    title: `[ESCALADA] ${original.title}`,
    detail: `${original.detail}\n\nNota de escalamiento: ${escalationNote}`,
    metadata: { ...original.metadata, escalated_from: alertId },
  })
}
