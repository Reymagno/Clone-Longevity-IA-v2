/**
 * WF-10: Clinic Settings Workflow
 *
 * GET + PATCH de configuración de clínica con validación Zod.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'

export interface ClinicSettings {
  clinic_name?: string
  rfc?: string
  contact_email?: string
  phone?: string
  address?: string
  director_name?: string
  logo_url?: string
}

export async function getClinicSettings(
  supabase: SupabaseClient,
  clinicaUserId: string,
): Promise<{ settings: ClinicSettings | null; error?: string }> {
  const { data, error } = await supabase
    .from('clinicas')
    .select('clinic_name, rfc, contact_email, phone, address, director_name, logo_url')
    .eq('user_id', clinicaUserId)
    .single()

  if (error) return { settings: null, error: error.message }
  return { settings: data }
}

export async function updateClinicSettings(
  supabase: SupabaseClient,
  clinicaUserId: string,
  settings: ClinicSettings,
  request?: NextRequest,
): Promise<{ settings: ClinicSettings | null; error?: string }> {
  // Only keep defined fields
  const updateData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) updateData[key] = value
  }

  if (Object.keys(updateData).length === 0) {
    return { settings: null, error: 'No hay campos para actualizar' }
  }

  const { data, error } = await supabase
    .from('clinicas')
    .update(updateData)
    .eq('user_id', clinicaUserId)
    .select('clinic_name, rfc, contact_email, phone, address, director_name, logo_url')
    .single()

  if (error) return { settings: null, error: error.message }

  // Sync auth metadata if clinic_name changed
  if (settings.clinic_name) {
    await supabase.auth.updateUser({
      data: { clinic_name: settings.clinic_name },
    })
  }

  // Audit
  logAudit({
    userId: clinicaUserId, role: 'clinica',
    action: 'update_clinic_settings', resourceType: 'clinica',
    details: { fields: Object.keys(updateData) },
  }, request)

  return { settings: data }
}
