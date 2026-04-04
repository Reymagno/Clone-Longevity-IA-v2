/**
 * WF-4: Medico Onboarding Workflow
 *
 * Flujo de alta de médico en una clínica:
 *   validate → createAuthUser → createMedicoRecord → autoLinkClinica → alertDirector → audit
 *
 * Incluye rollback si falla la creación del registro médico.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateMedicoCode } from '@/lib/steps/patient'
import { createClinicaMedicoLink } from '@/lib/steps/links'
import { createAlert } from '@/lib/steps/alerts'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'

export interface MedicoOnboardingInput {
  clinicaId: string
  clinicaUserId: string
  clinicaUserEmail: string
  email: string
  password: string
  fullName: string
  specialty: string
  licenseNumber: string
  request?: NextRequest
}

export interface MedicoOnboardingResult {
  success: boolean
  medicoId?: string
  medicoCode?: string
  error?: string
}

export async function medicoOnboardingWorkflow(input: MedicoOnboardingInput): Promise<MedicoOnboardingResult> {
  const admin = getSupabaseAdmin()

  try {
    // Step 1: Check duplicate email
    const { data: existingMedico } = await admin
      .from('medicos')
      .select('id')
      .eq('email', input.email)
      .single()

    if (existingMedico) {
      return { success: false, error: 'Ya existe un médico con ese email' }
    }

    // Step 2: Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { role: 'medico', full_name: input.fullName },
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message ?? 'Error al crear usuario' }
    }

    const newUserId = authData.user.id
    const code = generateMedicoCode()

    // Step 3: Create medico record
    const { data: medico, error: medicoError } = await admin
      .from('medicos')
      .insert({
        user_id: newUserId,
        clinica_id: input.clinicaId,
        code,
        full_name: input.fullName,
        specialty: input.specialty,
        license_number: input.licenseNumber,
        email: input.email,
      })
      .select('id')
      .single()

    if (medicoError || !medico) {
      // Rollback: delete auth user
      await admin.auth.admin.deleteUser(newUserId)
      return { success: false, error: medicoError?.message ?? 'Error al crear registro médico' }
    }

    // Step 4: Post-create actions in PARALLEL
    const postCreatePromises: Promise<void>[] = []

    // 4a: Auto-link clinica-medico
    postCreatePromises.push(
      createClinicaMedicoLink(input.clinicaId, newUserId, 'active')
        .then(() => {}).catch(err => console.error('[medico-onboarding.wf] link error:', err)),
    )

    // 4b: Alert clinic director
    postCreatePromises.push(
      createAlert({
        medico_user_id: input.clinicaUserId,
        patient_id: medico.id, // Using medico.id as reference
        alert_type: 'new_medico',
        level: 'info',
        title: `Nuevo médico registrado: ${input.fullName}`,
        detail: `Especialidad: ${input.specialty}. Cédula: ${input.licenseNumber}. Email: ${input.email}`,
      }).catch(err => console.error('[medico-onboarding.wf] alert error:', err)),
    )

    // 4c: Audit
    postCreatePromises.push(
      Promise.resolve(logAudit({
        userId: input.clinicaUserId, email: input.clinicaUserEmail, role: 'clinica',
        action: 'create_medico', resourceType: 'medico',
        resourceId: medico.id, details: { medico_email: input.email },
      }, input.request)),
    )

    await Promise.allSettled(postCreatePromises)

    return { success: true, medicoId: medico.id, medicoCode: code }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' }
  }
}
