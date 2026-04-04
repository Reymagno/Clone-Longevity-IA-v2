export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generatePatientCode } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

// GET /api/clinica/patients — listar pacientes de la clínica
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'clinica') {
    return NextResponse.json({ error: 'Acceso exclusivo para clínicas' }, { status: 403 })
  }

  const { data: clinic, error: clinicError } = await supabase
    .from('clinicas')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (clinicError || !clinic) {
    return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
  }

  const admin = getSupabaseAdmin()

  // Obtener médicos vinculados: por clinica_id directo + por invitaciones activas
  const [directMedicos, linkedMedicos] = await Promise.all([
    admin.from('medicos').select('user_id').eq('clinica_id', clinic.id),
    admin.from('clinica_medico_links').select('medico_user_id').eq('clinica_id', clinic.id).eq('status', 'active'),
  ])

  const allMedicoIds = new Set<string>()
  for (const m of directMedicos.data ?? []) allMedicoIds.add(m.user_id)
  for (const l of linkedMedicos.data ?? []) allMedicoIds.add(l.medico_user_id)
  const medicoUserIds = Array.from(allMedicoIds)

  // Buscar pacientes de dos fuentes:
  // 1. Creados por el médico (patients.user_id = medico)
  // 2. Vinculados por código MED-XXXXX (patient_medico_links.status = 'active')
  const medicoFilter = request.nextUrl.searchParams.get('medico_user_id')
  const targetMedicoIds = medicoFilter
    ? (medicoUserIds.includes(medicoFilter) ? [medicoFilter] : [])
    : medicoUserIds

  if (medicoFilter && !medicoUserIds.includes(medicoFilter)) {
    return NextResponse.json({ error: 'Médico no pertenece a esta clínica' }, { status: 403 })
  }

  const patientMap = new Map<string, Record<string, unknown>>()

  if (targetMedicoIds.length > 0) {
    // Pacientes creados directamente por los médicos
    const { data: ownedPatients } = await admin
      .from('patients')
      .select('*')
      .in('user_id', targetMedicoIds)
      .order('created_at', { ascending: false })
    for (const p of ownedPatients ?? []) patientMap.set(p.id, p)

    // Pacientes vinculados por código al médico (patient_medico_links)
    const { data: links } = await admin
      .from('patient_medico_links')
      .select('patient_id')
      .in('medico_user_id', targetMedicoIds)
      .eq('status', 'active')

    const linkedPatientIds = (links ?? []).map(l => l.patient_id).filter(id => !patientMap.has(id))
    if (linkedPatientIds.length > 0) {
      const { data: linkedPatients } = await admin
        .from('patients')
        .select('*')
        .in('id', linkedPatientIds)
        .order('created_at', { ascending: false })
      for (const p of linkedPatients ?? []) patientMap.set(p.id, p)
    }
  }

  const patients = Array.from(patientMap.values())
  return NextResponse.json({ patients })
}

// POST /api/clinica/patients — crear paciente asignado a un médico de la clínica
export async function POST(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'clinica') {
    return NextResponse.json({ error: 'Acceso exclusivo para clínicas' }, { status: 403 })
  }

  const { data: clinic, error: clinicError } = await supabase
    .from('clinicas')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (clinicError || !clinic) {
    return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const { name, age, gender, weight, height, notes, medico_user_id } = body

  if (!name || !age || !gender || !medico_user_id) {
    return NextResponse.json(
      { error: 'Campos requeridos: name, age, gender, medico_user_id' },
      { status: 400 }
    )
  }

  const ageNum = parseInt(age)
  if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
    return NextResponse.json({ error: 'Edad inválida (debe ser entre 1 y 120)' }, { status: 400 })
  }

  if (!['male', 'female', 'other'].includes(gender)) {
    return NextResponse.json({ error: 'Género inválido' }, { status: 400 })
  }

  // Verificar que el médico pertenece a esta clínica (usar admin para bypass RLS de medicos)
  const admin = getSupabaseAdmin()
  const { data: medico, error: medicoError } = await admin
    .from('medicos')
    .select('id')
    .eq('user_id', medico_user_id)
    .eq('clinica_id', clinic.id)
    .single()

  if (medicoError || !medico) {
    return NextResponse.json(
      { error: 'El médico especificado no pertenece a esta clínica' },
      { status: 403 }
    )
  }
  const code = generatePatientCode()

  const { data: patient, error: insertError } = await admin
    .from('patients')
    .insert({
      name,
      code,
      age: ageNum,
      gender,
      weight: weight ?? null,
      height: height ?? null,
      notes: notes ?? null,
      user_id: medico_user_id,
      clinica_id: clinic.id,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: 'Error al crear paciente' },
      { status: 500 }
    )
  }

  logAudit({ userId: user.id, email: user.email ?? undefined, role: 'clinica', action: 'create_patient', resourceType: 'patient', resourceId: patient.id, patientId: patient.id, details: { medico_user_id } }, request)

  return NextResponse.json({ patient }, { status: 201 })
}
