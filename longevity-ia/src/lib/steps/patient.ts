/**
 * Steps de gestión de pacientes.
 * Operaciones atómicas reutilizables para buscar, crear y actualizar pacientes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ── Find patient ────────────────────────────────────────────────────

export async function findPatient(supabase: SupabaseClient, patientId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('id, user_id, name, code, age, gender, weight, height, clinical_history, created_at')
    .eq('id', patientId)
    .single()

  return { patient: data, error }
}

// ── Verify patient ownership ────────────────────────────────────────

export async function verifyPatientOwnership(
  supabase: SupabaseClient,
  patientId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('user_id', userId)
    .single()

  return !!data
}

// ── Verify patient access (owned or linked) ─────────────────────────

export async function verifyPatientAccess(
  supabase: SupabaseClient,
  patientId: string,
  userId: string,
): Promise<boolean> {
  // Check direct ownership
  const owned = await verifyPatientOwnership(supabase, patientId, userId)
  if (owned) return true

  // Check medico link
  const { data: link } = await supabase
    .from('patient_medico_links')
    .select('id')
    .eq('patient_id', patientId)
    .eq('medico_user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single()

  return !!link
}

// ── Generate patient code ───────────────────────────────────────────

export function generatePatientCode(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `PAT-${ts}-${rand}`
}

// ── Generate medico code ────────────────────────────────────────────

export function generateMedicoCode(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MED-${rand}`
}

// ── Detect duplicate patient ────────────────────────────────────────

export async function detectDuplicatePatient(
  name: string,
  age: number,
  clinicaId?: string,
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  const admin = getSupabaseAdmin()
  const normalized = name.toLowerCase().trim().replace(/[%_\\]/g, '\\$&')

  let query = admin.from('patients').select('id, name, age').ilike('name', `%${normalized}%`).eq('age', age).limit(1)
  if (clinicaId) {
    query = query.eq('clinica_id', clinicaId)
  }

  const { data } = await query
  if (data && data.length > 0) {
    return { isDuplicate: true, existingId: data[0].id }
  }
  return { isDuplicate: false }
}

// ── Create patient ──────────────────────────────────────────────────

export interface CreatePatientData {
  name: string
  age: number
  gender: string
  weight?: number
  height?: number
  notes?: string
  user_id: string
  clinica_id?: string
}

export async function createPatient(supabase: SupabaseClient, data: CreatePatientData) {
  const code = generatePatientCode()
  const { data: patient, error } = await supabase
    .from('patients')
    .insert({ ...data, code })
    .select()
    .single()

  return { patient, error }
}

// ── Update clinical history (deep merge) ────────────────────────────

const VALID_SECTIONS = [
  'anthropometric', 'allergies', 'diet', 'physical_activity', 'sleep',
  'mental_health', 'cardiovascular', 'medical_history', 'family_history',
] as const

const ARRAY_FIELDS = ['chronic_conditions', 'conditions'] as const

export async function updateClinicalHistory(
  supabase: SupabaseClient,
  patientId: string,
  newData: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  // Fetch current
  const { data: patient } = await supabase
    .from('patients')
    .select('clinical_history')
    .eq('id', patientId)
    .single()

  const existing = (patient?.clinical_history ?? {}) as Record<string, Record<string, unknown>>
  const merged = { ...existing }

  for (const [section, fields] of Object.entries(newData)) {
    if (!VALID_SECTIONS.includes(section as typeof VALID_SECTIONS[number])) continue
    if (!fields || typeof fields !== 'object') continue

    merged[section] = { ...(merged[section] ?? {}) }

    for (const [field, value] of Object.entries(fields as Record<string, unknown>)) {
      if (ARRAY_FIELDS.includes(field as typeof ARRAY_FIELDS[number]) && Array.isArray(value)) {
        const existing = merged[section][field]
        const existingArr = Array.isArray(existing) ? existing : []
        merged[section][field] = Array.from(new Set([...existingArr, ...value]))
      } else {
        merged[section][field] = value
      }
    }
  }

  ;(merged as Record<string, unknown>).completed_at = new Date().toISOString()

  const { error } = await supabase
    .from('patients')
    .update({ clinical_history: merged })
    .eq('id', patientId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
