export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────
// Deep-merge parcial de historia clínica
// ─────────────────────────────────────────────────────────────────

const VALID_SECTIONS = new Set([
  'anthropometric', 'allergies', 'diet', 'physical_activity',
  'sleep', 'mental_health', 'cardiovascular', 'medical_history',
  'family_history',
])

const ARRAY_FIELDS = new Set([
  'medical_history.chronic_conditions',
  'family_history.conditions',
])

function deepMergeClinical(
  existing: Record<string, unknown> | null,
  update: Record<string, unknown>,
): Record<string, unknown> {
  const base: Record<string, unknown> = existing ? { ...existing } : {}

  for (const [section, fields] of Object.entries(update)) {
    if (!VALID_SECTIONS.has(section)) continue
    if (!fields || typeof fields !== 'object') continue

    const currentSection = (base[section] && typeof base[section] === 'object')
      ? { ...(base[section] as Record<string, unknown>) }
      : {}

    for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
      if (value === null || value === undefined) continue

      const fieldPath = `${section}.${key}`
      if (ARRAY_FIELDS.has(fieldPath) && Array.isArray(value)) {
        const existingArr = Array.isArray(currentSection[key]) ? currentSection[key] as string[] : []
        const newItems = value.filter((v: unknown) => typeof v === 'string' && !existingArr.includes(v))
        currentSection[key] = [...existingArr, ...newItems]
      } else {
        currentSection[key] = value
      }
    }

    base[section] = currentSection
  }

  base.completed_at = new Date().toISOString()
  return base
}

// ─────────────────────────────────────────────────────────────────
// POST /api/patients/[id]/clinical-update
// Acepta datos parciales y los merge con la historia existente
// ─────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let body: { data: Record<string, unknown> }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!body.data || typeof body.data !== 'object') {
      return NextResponse.json({ error: 'data es requerido' }, { status: 400 })
    }

    // Fetch current patient
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select('clinical_history')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    // Deep merge
    const merged = deepMergeClinical(
      patient.clinical_history as Record<string, unknown> | null,
      body.data,
    )

    // Save
    const { error: updateError } = await supabase
      .from('patients')
      .update({ clinical_history: merged })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, clinical_history: merged })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
