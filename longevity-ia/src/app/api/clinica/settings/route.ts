export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'

// PATCH /api/clinica/settings — actualizar configuración de la clínica
export async function PATCH(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'clinica') {
    return NextResponse.json({ error: 'Acceso exclusivo para clínicas' }, { status: 403 })
  }

  const body = await request.json()

  // Campos permitidos para actualización
  const allowedFields = [
    'clinic_name',
    'rfc',
    'contact_email',
    'phone',
    'address',
    'director_name',
    'logo_url',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No se proporcionaron campos para actualizar' },
      { status: 400 }
    )
  }

  const { data: clinica, error } = await supabase
    .from('clinicas')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: `Error al actualizar clínica: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ clinica })
}
