/**
 * WF-3: Patient Intake Workflow
 *
 * Flujo completo de creación de paciente:
 *   validate → detectDuplicate → createPatient → [autoLink + alert] → audit
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { detectDuplicatePatient, createPatient, type CreatePatientData } from '@/lib/steps/patient'
import { createPatientMedicoLink } from '@/lib/steps/links'
import { createAlert } from '@/lib/steps/alerts'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'

export interface PatientIntakeInput {
  supabase: SupabaseClient
  userId: string
  userEmail: string
  userRole: string
  name: string
  age: number
  gender: string
  weight?: number
  height?: number
  notes?: string
  medico_user_id?: string  // When clinic assigns patient to a doctor
  clinica_id?: string
  request?: NextRequest
}

export interface PatientIntakeResult {
  success: boolean
  patientId?: string
  patientCode?: string
  isDuplicate?: boolean
  duplicateId?: string
  error?: string
}

export async function patientIntakeWorkflow(input: PatientIntakeInput): Promise<PatientIntakeResult> {
  try {
    // Step 1: Detect duplicates
    const { isDuplicate, existingId } = await detectDuplicatePatient(
      input.name,
      input.age,
      { clinicaId: input.clinica_id, medicoUserId: input.medico_user_id ?? input.userId },
    )

    if (isDuplicate) {
      return {
        success: false,
        isDuplicate: true,
        duplicateId: existingId,
        error: `Ya existe un paciente similar: ${input.name}, ${input.age} años`,
      }
    }

    // Step 2: For non-medicos, check they don't already have a patient
    if (input.userRole !== 'medico' && input.userRole !== 'clinica') {
      const { data: existing } = await input.supabase
        .from('patients')
        .select('id')
        .eq('user_id', input.userId)
        .limit(1)

      if (existing && existing.length > 0) {
        return { success: false, error: 'Ya tienes un perfil de paciente creado' }
      }
    }

    // Step 3: Create patient
    const ownerUserId = input.medico_user_id ?? input.userId
    const patientData: CreatePatientData = {
      name: input.name,
      age: input.age,
      gender: input.gender,
      weight: input.weight,
      height: input.height,
      notes: input.notes,
      user_id: ownerUserId,
      clinica_id: input.clinica_id,
    }

    const { patient, error: createError } = await createPatient(input.supabase, patientData)
    if (createError || !patient) {
      return { success: false, error: createError?.message ?? 'Error al crear paciente' }
    }

    // Step 4: Post-create actions in PARALLEL
    const postCreatePromises: Promise<void>[] = []

    // 4a: Auto-link medico if assigned
    if (input.medico_user_id && input.medico_user_id !== input.userId) {
      const { data: medico } = await input.supabase
        .from('medicos')
        .select('email')
        .eq('user_id', input.medico_user_id)
        .single()

      if (medico) {
        postCreatePromises.push(
          createPatientMedicoLink(
            input.supabase, patient.id, input.medico_user_id, medico.email, 'active',
          ).then(() => {}).catch(err => console.error('[patient-intake.wf] link error:', err)),
        )
      }
    }

    // 4b: Alert medico about new patient
    if (input.medico_user_id) {
      postCreatePromises.push(
        createAlert({
          medico_user_id: input.medico_user_id,
          patient_id: patient.id,
          alert_type: 'new_patient',
          level: 'info',
          title: `Nuevo paciente asignado: ${input.name}`,
          detail: `${input.age} años, ${input.gender}. ${input.notes ? `Notas: ${input.notes}` : ''}`.trim(),
        }).catch(err => console.error('[patient-intake.wf] alert error:', err)),
      )
    }

    // 4c: Audit
    postCreatePromises.push(
      Promise.resolve(logAudit({
        userId: input.userId, email: input.userEmail, role: input.userRole,
        action: 'create_patient', resourceType: 'patient',
        resourceId: patient.id, patientId: patient.id,
        details: { medico_user_id: input.medico_user_id },
      }, input.request)),
    )

    await Promise.allSettled(postCreatePromises)

    return { success: true, patientId: patient.id, patientCode: patient.code }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error interno' }
  }
}
