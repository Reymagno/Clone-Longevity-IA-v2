export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

// ─── GET /api/profile ────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (user.app_metadata?.role ?? user.user_metadata?.role as string) ?? 'paciente'

  try {
    if (role === 'medico') {
      const { data, error } = await supabase
        .from('medicos')
        .select('full_name, specialty, license_number, code, email, avatar_url, years_experience, university, graduation_year, subspecialties, certifications, previous_institutions, procedures_expertise, languages, employment_status, preferred_modality, preferred_locations, salary_expectation_min, salary_expectation_max, available_from, profile_public, bio')
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return NextResponse.json({ role, ...data })
    }

    if (role === 'clinica') {
      const { data, error } = await supabase
        .from('clinicas')
        .select('clinic_name, rfc, contact_email, phone, address, director_name, avatar_url, clinic_type, clinic_size, services_offered, equipment, state, city, zip_code, founded_year, monthly_patients, hiring_active')
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return NextResponse.json({ role, email: data.contact_email, ...data })
    }

    // paciente — read from profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('id', user.id)
      .single()
    if (error) throw error
    return NextResponse.json({ role, ...data })
  } catch (err) {
    console.error('[GET /api/profile]', err)
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 })
  }
}

// ─── PATCH /api/profile ──────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (user.app_metadata?.role ?? user.user_metadata?.role as string) ?? 'paciente'
  const body = await request.json()

  try {
    if (role === 'medico') {
      const allowed: Record<string, unknown> = {}
      // Campos base
      if (body.full_name !== undefined) allowed.full_name = body.full_name
      if (body.specialty !== undefined) allowed.specialty = body.specialty
      if (body.license_number !== undefined) allowed.license_number = body.license_number
      if (body.avatar_url !== undefined) {
        if (typeof body.avatar_url === 'string' && body.avatar_url.startsWith('https://')) {
          allowed.avatar_url = body.avatar_url
        }
      }
      // Campos profesionales (marketplace)
      if (body.years_experience !== undefined) allowed.years_experience = Number(body.years_experience) || null
      if (body.university !== undefined) allowed.university = String(body.university).slice(0, 200)
      if (body.graduation_year !== undefined) allowed.graduation_year = Number(body.graduation_year) || null
      if (body.subspecialties !== undefined && Array.isArray(body.subspecialties)) allowed.subspecialties = body.subspecialties.map(String).slice(0, 10)
      if (body.certifications !== undefined && Array.isArray(body.certifications)) allowed.certifications = body.certifications.slice(0, 20)
      if (body.previous_institutions !== undefined && Array.isArray(body.previous_institutions)) allowed.previous_institutions = body.previous_institutions.slice(0, 20)
      if (body.procedures_expertise !== undefined && Array.isArray(body.procedures_expertise)) allowed.procedures_expertise = body.procedures_expertise.map(String).slice(0, 20)
      if (body.languages !== undefined && Array.isArray(body.languages)) allowed.languages = body.languages.map(String).slice(0, 10)
      if (body.employment_status !== undefined && ['employed', 'looking', 'open_to_offers', 'unavailable'].includes(body.employment_status)) allowed.employment_status = body.employment_status
      if (body.preferred_modality !== undefined && Array.isArray(body.preferred_modality)) allowed.preferred_modality = body.preferred_modality.map(String).slice(0, 5)
      if (body.preferred_locations !== undefined && Array.isArray(body.preferred_locations)) allowed.preferred_locations = body.preferred_locations.map(String).slice(0, 10)
      if (body.salary_expectation_min !== undefined) allowed.salary_expectation_min = Number(body.salary_expectation_min) || null
      if (body.salary_expectation_max !== undefined) allowed.salary_expectation_max = Number(body.salary_expectation_max) || null
      if (body.available_from !== undefined) allowed.available_from = body.available_from || null
      if (body.profile_public !== undefined) allowed.profile_public = Boolean(body.profile_public)
      if (body.bio !== undefined) allowed.bio = String(body.bio).slice(0, 2000)

      const { data, error } = await supabase
        .from('medicos')
        .update(allowed)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error

      // Sync full_name to auth metadata
      if (body.full_name) {
        await supabase.auth.updateUser({ data: { full_name: body.full_name } })
      }

      logAudit({ userId: user.id, email: user.email ?? undefined, role, action: 'update_profile', resourceType: 'medico', details: { fields: Object.keys(allowed) } }, request)
      return NextResponse.json({ role, ...data })
    }

    if (role === 'clinica') {
      const allowed: Record<string, unknown> = {}
      // Campos base
      if (body.clinic_name !== undefined) allowed.clinic_name = body.clinic_name
      if (body.director_name !== undefined) allowed.director_name = body.director_name
      if (body.rfc !== undefined) allowed.rfc = body.rfc
      if (body.phone !== undefined) allowed.phone = body.phone
      if (body.address !== undefined) allowed.address = body.address
      // Campos institucionales (marketplace)
      if (body.clinic_type !== undefined && ['hospital', 'consultorio', 'centro_medico', 'laboratorio'].includes(body.clinic_type)) allowed.clinic_type = body.clinic_type
      if (body.clinic_size !== undefined && ['small', 'medium', 'large'].includes(body.clinic_size)) allowed.clinic_size = body.clinic_size
      if (body.services_offered !== undefined && Array.isArray(body.services_offered)) allowed.services_offered = body.services_offered.map(String).slice(0, 20)
      if (body.equipment !== undefined && Array.isArray(body.equipment)) allowed.equipment = body.equipment.map(String).slice(0, 30)
      if (body.state !== undefined) allowed.state = String(body.state).slice(0, 100)
      if (body.city !== undefined) allowed.city = String(body.city).slice(0, 100)
      if (body.zip_code !== undefined) allowed.zip_code = String(body.zip_code).slice(0, 10)
      if (body.founded_year !== undefined) allowed.founded_year = Number(body.founded_year) || null
      if (body.monthly_patients !== undefined && ['1-50', '51-200', '201-500', '500+'].includes(body.monthly_patients)) allowed.monthly_patients = body.monthly_patients
      if (body.hiring_active !== undefined) allowed.hiring_active = Boolean(body.hiring_active)
      if (body.avatar_url !== undefined) {
        if (typeof body.avatar_url === 'string' && body.avatar_url.startsWith('https://')) {
          allowed.avatar_url = body.avatar_url
        }
      }

      const { data, error } = await supabase
        .from('clinicas')
        .update(allowed)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error

      // Sync clinic_name to auth metadata
      if (body.clinic_name) {
        await supabase.auth.updateUser({ data: { full_name: body.clinic_name } })
      }

      logAudit({ userId: user.id, email: user.email ?? undefined, role, action: 'update_profile', resourceType: 'clinica', details: { fields: Object.keys(allowed) } }, request)
      return NextResponse.json({ role, ...data })
    }

    // paciente
    const allowed: Record<string, unknown> = {}
    if (body.full_name !== undefined) allowed.full_name = body.full_name
    if (body.avatar_url !== undefined) {
      if (typeof body.avatar_url === 'string' && body.avatar_url.startsWith('https://')) {
        allowed.avatar_url = body.avatar_url
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(allowed)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error

    if (body.full_name) {
      await supabase.auth.updateUser({ data: { full_name: body.full_name } })
    }

    logAudit({ userId: user.id, email: user.email ?? undefined, role, action: 'update_profile', resourceType: 'profile', details: { fields: Object.keys(allowed) } }, request)
    return NextResponse.json({ role, ...data })
  } catch (err) {
    console.error('[PATCH /api/profile]', err)
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })
  }
}
