export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'

// GET /api/medico/invitations — list pending invitations with patient info
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('patient_medico_links')
    .select('id, patient_id, medico_email, status, invited_at, confirmed_at')
    .eq('medico_user_id', user.id)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with patient names
  const patientIds = (data ?? []).map(d => d.patient_id)
  let patientMap: Record<string, { name: string; code: string; age: number; gender: string; weight: number | null; height: number | null; has_clinical_history: boolean; results_count: number }> = {}

  if (patientIds.length > 0) {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, code, age, gender, weight, height, clinical_history')
      .in('id', patientIds)

    if (patients) {
      // Count results per patient
      const { data: resultCounts } = await supabase
        .from('lab_results')
        .select('patient_id')
        .in('patient_id', patientIds)

      const countMap: Record<string, number> = {}
      for (const r of (resultCounts ?? [])) {
        countMap[r.patient_id] = (countMap[r.patient_id] ?? 0) + 1
      }

      patientMap = Object.fromEntries(patients.map(p => [p.id, {
        name: p.name,
        code: p.code,
        age: p.age,
        gender: p.gender,
        weight: p.weight,
        height: p.height,
        has_clinical_history: !!p.clinical_history,
        results_count: countMap[p.id] ?? 0,
      }]))
    }
  }

  const enriched = (data ?? []).map(link => {
    const p = patientMap[link.patient_id]
    return {
      ...link,
      patient_name: p?.name ?? 'Paciente',
      patient_code: p?.code ?? '',
      patient_age: p?.age ?? null,
      patient_gender: p?.gender ?? null,
      patient_weight: p?.weight ?? null,
      patient_height: p?.height ?? null,
      patient_has_clinical_history: p?.has_clinical_history ?? false,
      patient_results_count: p?.results_count ?? 0,
    }
  })

  return NextResponse.json(enriched)
}

// PATCH /api/medico/invitations — confirm or reject an invitation
export async function PATCH(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { linkId, action } = body as { linkId: string; action: 'accept' | 'reject' }

  if (!linkId || !['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'linkId y action (accept|reject) requeridos' }, { status: 400 })
  }

  const newStatus = action === 'accept' ? 'active' : 'revoked'
  const { error } = await supabase
    .from('patient_medico_links')
    .update({
      status: newStatus,
      ...(action === 'accept' ? { confirmed_at: new Date().toISOString() } : {}),
    })
    .eq('id', linkId)
    .eq('medico_user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status: newStatus })
}
