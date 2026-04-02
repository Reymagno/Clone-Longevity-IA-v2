export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generatePatientCode } from '@/lib/utils'

// GET /api/clinica/patients — listar pacientes de la clínica
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.user_metadata?.role
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

  // Filtro opcional por médico
  const medicoUserId = request.nextUrl.searchParams.get('medico_user_id')

  let query = supabase
    .from('patients')
    .select('*')
    .eq('clinica_id', clinic.id)
    .order('created_at', { ascending: false })

  if (medicoUserId) {
    query = query.eq('user_id', medicoUserId)
  }

  const { data: patients, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ patients: patients ?? [] })
}

// POST /api/clinica/patients — crear paciente asignado a un médico de la clínica
export async function POST(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.user_metadata?.role
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

  // Verificar que el médico pertenece a esta clínica
  const { data: medico, error: medicoError } = await supabase
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

  const admin = getSupabaseAdmin()
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
      { error: `Error al crear paciente: ${insertError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ patient }, { status: 201 })
}
