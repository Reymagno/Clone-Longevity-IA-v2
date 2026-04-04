/**
 * Steps de vínculos paciente-médico y clínica-médico.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ── Patient-Medico links ────────────────────────────────────────────

export async function createPatientMedicoLink(
  supabase: SupabaseClient,
  patientId: string,
  medicoUserId: string,
  medicoEmail: string,
  status: 'pending' | 'active' = 'pending',
): Promise<{ id: string | null; error?: string }> {
  const { data, error } = await supabase
    .from('patient_medico_links')
    .insert({
      patient_id: patientId,
      medico_user_id: medicoUserId,
      medico_email: medicoEmail,
      status,
      invited_at: new Date().toISOString(),
      confirmed_at: status === 'active' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) return { id: null, error: error.message }
  return { id: data.id }
}

export async function acceptLink(
  supabase: SupabaseClient,
  linkId: string,
  medicoUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('patient_medico_links')
    .update({ status: 'active', confirmed_at: new Date().toISOString() })
    .eq('id', linkId)
    .eq('medico_user_id', medicoUserId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function rejectLink(
  supabase: SupabaseClient,
  linkId: string,
  medicoUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('patient_medico_links')
    .update({ status: 'revoked' })
    .eq('id', linkId)
    .eq('medico_user_id', medicoUserId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Clinica-Medico links ────────────────────────────────────────────

export async function createClinicaMedicoLink(
  clinicaId: string,
  medicoUserId: string,
  status: 'pending' | 'active' = 'active',
): Promise<{ id: string | null; error?: string }> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('clinica_medico_links')
    .insert({
      clinica_id: clinicaId,
      medico_user_id: medicoUserId,
      status,
      invited_at: new Date().toISOString(),
      confirmed_at: status === 'active' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) return { id: null, error: error.message }
  return { id: data.id }
}

// ── Expire stale links ──────────────────────────────────────────────

export async function expireStaleLinks(
  olderThanDays: number = 30,
): Promise<number> {
  const admin = getSupabaseAdmin()
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await admin
    .from('patient_medico_links')
    .update({ status: 'revoked' })
    .eq('status', 'pending')
    .lt('invited_at', cutoff)
    .select('id')

  const { data: clinicaData } = await admin
    .from('clinica_medico_links')
    .update({ status: 'revoked' })
    .eq('status', 'pending')
    .lt('invited_at', cutoff)
    .select('id')

  return (data?.length ?? 0) + (clinicaData?.length ?? 0)
}
