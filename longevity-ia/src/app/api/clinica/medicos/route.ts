export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateMedicoCode } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

// GET /api/clinica/medicos — listar médicos de la clínica
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'clinica') {
    return NextResponse.json({ error: 'Acceso exclusivo para clínicas' }, { status: 403 })
  }

  // Obtener ID de la clínica
  const { data: clinic, error: clinicError } = await supabase
    .from('clinicas')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (clinicError || !clinic) {
    return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
  }

  // Usar admin para leer médicos cross-user (RLS bloquea)
  const admin = getSupabaseAdmin()

  // Obtener médicos: por clinica_id directo + por invitaciones activas
  const { data: linkedIds } = await admin
    .from('clinica_medico_links')
    .select('medico_user_id')
    .eq('clinica_id', clinic.id)
    .eq('status', 'active')

  const allMedicoUserIds = new Set<string>()
  const { data: directMedicos } = await admin
    .from('medicos')
    .select('*')
    .eq('clinica_id', clinic.id)
    .order('created_at', { ascending: false })

  for (const m of directMedicos ?? []) allMedicoUserIds.add(m.user_id)
  for (const l of linkedIds ?? []) {
    if (l.medico_user_id) allMedicoUserIds.add(l.medico_user_id)
  }

  // Buscar médicos que no están en directMedicos (vinculados solo por invitación)
  const directUserIds = new Set((directMedicos ?? []).map(m => m.user_id))
  const linkedOnlyIds = Array.from(allMedicoUserIds).filter(id => !directUserIds.has(id))

  let linkedMedicos: Record<string, unknown>[] = []
  if (linkedOnlyIds.length > 0) {
    const { data } = await admin.from('medicos').select('*').in('user_id', linkedOnlyIds)
    linkedMedicos = data ?? []
  }

  const medicos = [...(directMedicos ?? []), ...linkedMedicos]
  const error = null

  // Enriquecer con conteo de pacientes por médico
  const medicoUserIds = (medicos ?? []).map(m => m.user_id)
  const patientCounts: Record<string, number> = {}

  if (medicoUserIds.length > 0) {
    const { data: patients } = await admin
      .from('patients')
      .select('user_id')
      .in('user_id', medicoUserIds)

    if (patients) {
      for (const p of patients) {
        patientCounts[p.user_id] = (patientCounts[p.user_id] || 0) + 1
      }
    }
  }

  const enriched = (medicos ?? []).map(m => ({
    ...m,
    patient_count: patientCounts[m.user_id] || 0,
  }))

  return NextResponse.json({ medicos: enriched })
}

// POST /api/clinica/medicos — crear nuevo médico en la clínica
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
  const { email, password, full_name, specialty, license_number } = body

  if (!email || !password || !full_name || !specialty || !license_number) {
    return NextResponse.json(
      { error: 'Todos los campos son requeridos: email, password, full_name, specialty, license_number' },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()

  // 1. Crear usuario en Supabase Auth
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
    app_metadata: { role: 'medico' },
  })

  if (authError) {
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 400 }
    )
  }

  // 2. Insertar registro en tabla medicos
  const code = generateMedicoCode()

  const { data: medico, error: insertError } = await admin
    .from('medicos')
    .insert({
      user_id: newUser.user.id,
      clinica_id: clinic.id,
      code,
      full_name,
      specialty,
      license_number,
      email,
    })
    .select()
    .single()

  if (insertError) {
    // Rollback: eliminar el usuario creado si falla la inserción
    await admin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json(
      { error: 'Error al registrar médico' },
      { status: 500 }
    )
  }

  logAudit({ userId: user.id, email: user.email ?? undefined, role: 'clinica', action: 'create_medico', resourceType: 'medico', resourceId: medico.id, details: { medico_email: email } }, request)

  return NextResponse.json({ medico }, { status: 201 })
}
