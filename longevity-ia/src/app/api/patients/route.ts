export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { generatePatientCode } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0') || 0)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50') || 50))
  const from = page * limit
  const to = from + limit - 1

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Un solo perfil por usuario
  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Ya tienes un perfil creado. Solo se permite uno por cuenta.' },
      { status: 409 }
    )
  }

  const body = await request.json()
  const { name, age, gender, weight, height, notes } = body

  if (!name || !age || !gender) {
    return NextResponse.json({ error: 'Nombre, edad y género son requeridos' }, { status: 400 })
  }

  const ageNum = parseInt(age)
  if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
    return NextResponse.json({ error: 'Edad inválida (debe ser entre 1 y 120)' }, { status: 400 })
  }
  if (!['male', 'female', 'other'].includes(gender)) {
    return NextResponse.json({ error: 'Género inválido' }, { status: 400 })
  }
  if (weight !== undefined && weight !== null && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
    return NextResponse.json({ error: 'Peso inválido' }, { status: 400 })
  }
  if (height !== undefined && height !== null && (isNaN(parseFloat(height)) || parseFloat(height) <= 0)) {
    return NextResponse.json({ error: 'Talla inválida' }, { status: 400 })
  }

  const code = generatePatientCode()

  const { data, error } = await supabase
    .from('patients')
    .insert({ name, code, age, gender, weight, height, notes, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
