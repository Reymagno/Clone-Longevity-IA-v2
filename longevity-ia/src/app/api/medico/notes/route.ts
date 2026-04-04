export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'

// GET /api/medico/notes?patientId=xxx — obtener notas del médico para un paciente
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'medico') return NextResponse.json({ error: 'Solo médicos' }, { status: 403 })

  const patientId = request.nextUrl.searchParams.get('patientId')
  if (!patientId) return NextResponse.json({ error: 'patientId requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('clinical_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('medico_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/medico/notes — crear nota clínica
export async function POST(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'medico') return NextResponse.json({ error: 'Solo médicos' }, { status: 403 })

  const body = await request.json()
  const { patientId, resultId, noteType, subjective, objective, assessment, plan, content, biomarkerKey, protocolAdjustments, diagnoses } = body

  if (!patientId) return NextResponse.json({ error: 'patientId requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('clinical_notes')
    .insert({
      patient_id: patientId,
      medico_user_id: user.id,
      result_id: resultId || null,
      note_type: noteType || 'soap',
      subjective: subjective || null,
      objective: objective || null,
      assessment: assessment || null,
      plan: plan || null,
      content: content || null,
      biomarker_key: biomarkerKey || null,
      protocol_adjustments: protocolAdjustments || null,
      diagnoses: diagnoses || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/medico/notes?noteId=xxx — eliminar nota clínica
export async function DELETE(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'medico') return NextResponse.json({ error: 'Solo médicos' }, { status: 403 })

  const noteId = request.nextUrl.searchParams.get('noteId')
  if (!noteId) return NextResponse.json({ error: 'noteId requerido' }, { status: 400 })

  const { error } = await supabase
    .from('clinical_notes')
    .delete()
    .eq('id', noteId)
    .eq('medico_user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
