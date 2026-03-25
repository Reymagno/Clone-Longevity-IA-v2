export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar que el resultado pertenece a un paciente del usuario autenticado
  const { data, error } = await supabase
    .from('lab_results')
    .select('*, patients!inner(user_id)')
    .eq('id', params.id)
    .eq('patients.user_id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 })
  }

  return NextResponse.json(data)
}
