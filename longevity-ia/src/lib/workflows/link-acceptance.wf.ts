/**
 * WF-8: Link Acceptance Workflow
 *
 * Cuando un médico acepta una invitación de paciente:
 *   acceptLink → fetchPatientSummary → createAlert(enriched) → audit
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { acceptLink, rejectLink } from '@/lib/steps/links'
import { createAlert } from '@/lib/steps/alerts'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'

export interface LinkAcceptanceInput {
  supabase: SupabaseClient
  userId: string
  userEmail: string
  linkId: string
  action: 'accept' | 'reject'
  request?: NextRequest
}

export interface LinkAcceptanceResult {
  success: boolean
  status: 'active' | 'revoked'
  error?: string
}

export async function linkAcceptanceWorkflow(input: LinkAcceptanceInput): Promise<LinkAcceptanceResult> {
  const { supabase, userId, userEmail, linkId, action } = input

  try {
    if (action === 'reject') {
      const { success, error } = await rejectLink(supabase, linkId, userId)
      if (!success) return { success: false, status: 'revoked', error }

      logAudit({
        userId, email: userEmail, role: 'medico',
        action: 'reject_link', resourceType: 'patient_medico_link', resourceId: linkId,
      }, input.request)

      return { success: true, status: 'revoked' }
    }

    // Accept flow
    const { success, error } = await acceptLink(supabase, linkId, userId)
    if (!success) return { success: false, status: 'active', error }

    // Fetch patient info for enriched alert
    const { data: link } = await supabase
      .from('patient_medico_links')
      .select('patient_id')
      .eq('id', linkId)
      .single()

    if (link?.patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('name, age, gender, clinical_history')
        .eq('id', link.patient_id)
        .single()

      if (patient) {
        const hasCH = patient.clinical_history && typeof patient.clinical_history === 'object'
        const summary = [
          `${patient.age} años`,
          patient.gender === 'male' ? 'masculino' : patient.gender === 'female' ? 'femenino' : 'otro',
          hasCH ? 'con historia clínica' : 'sin historia clínica',
        ].join(', ')

        // Non-blocking alert
        createAlert({
          medico_user_id: userId,
          patient_id: link.patient_id,
          alert_type: 'patient_linked',
          level: 'info',
          title: `Nuevo paciente vinculado: ${patient.name}`,
          detail: summary,
        }).catch(err => console.error('[link-acceptance.wf] alert error:', err))
      }
    }

    logAudit({
      userId, email: userEmail, role: 'medico',
      action: 'accept_link', resourceType: 'patient_medico_link', resourceId: linkId,
    }, input.request)

    return { success: true, status: 'active' }
  } catch (err) {
    return { success: false, status: 'revoked', error: err instanceof Error ? err.message : 'Error interno' }
  }
}
