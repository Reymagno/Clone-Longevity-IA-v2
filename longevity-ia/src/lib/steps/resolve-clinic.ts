/**
 * Steps de resolución de entidades para clínicas.
 * Resuelve los IDs de médicos y pacientes que pertenecen a una clínica,
 * combinando asignaciones directas y vínculos por código de invitación.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ── Resolve clinic ID from user_id ──────────────────────────────────

export async function resolveClinicaId(clinicaUserId: string): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('clinicas')
    .select('id')
    .eq('user_id', clinicaUserId)
    .single()
  return data?.id ?? null
}

// ── Resolve all medico user_ids for a clinic ────────────────────────

export interface ClinicMedicoInfo {
  user_id: string
  full_name: string
  specialty: string
  email: string
}

export async function resolveClinicMedicos(clinicaId: string): Promise<ClinicMedicoInfo[]> {
  const admin = getSupabaseAdmin()

  const [directRes, linkedRes] = await Promise.all([
    admin.from('medicos').select('user_id, full_name, specialty, email').eq('clinica_id', clinicaId),
    admin.from('clinica_medico_links').select('medico_user_id').eq('clinica_id', clinicaId).eq('status', 'active'),
  ])

  const medicoMap = new Map<string, ClinicMedicoInfo>()

  for (const m of directRes.data ?? []) {
    medicoMap.set(m.user_id, m)
  }

  // Linked medicos que no son directos — buscar sus datos
  const linkedIds = (linkedRes.data ?? [])
    .map(l => l.medico_user_id)
    .filter(id => id && !medicoMap.has(id))

  if (linkedIds.length > 0) {
    const { data: linkedMedicos } = await admin
      .from('medicos')
      .select('user_id, full_name, specialty, email')
      .in('user_id', linkedIds)

    for (const m of linkedMedicos ?? []) {
      medicoMap.set(m.user_id, m)
    }
  }

  return Array.from(medicoMap.values())
}

export async function resolveClinicMedicoIds(clinicaId: string): Promise<string[]> {
  const medicos = await resolveClinicMedicos(clinicaId)
  return medicos.map(m => m.user_id)
}

// ── Resolve all patient IDs for a clinic ────────────────────────────

export async function resolveClinicPatientIds(clinicaId: string): Promise<string[]> {
  const admin = getSupabaseAdmin()
  const medicoIds = await resolveClinicMedicoIds(clinicaId)
  if (medicoIds.length === 0) return []

  const [ownedRes, linkedRes] = await Promise.all([
    admin.from('patients').select('id').in('user_id', medicoIds),
    admin.from('patient_medico_links').select('patient_id').in('medico_user_id', medicoIds).eq('status', 'active'),
  ])

  const patientIds = new Set<string>()
  for (const p of ownedRes.data ?? []) patientIds.add(p.id)
  for (const l of linkedRes.data ?? []) if (l.patient_id) patientIds.add(l.patient_id)

  return Array.from(patientIds)
}
