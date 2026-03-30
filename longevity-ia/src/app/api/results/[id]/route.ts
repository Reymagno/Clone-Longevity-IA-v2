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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar propiedad del resultado
  const { data: result, error: fetchError } = await supabase
    .from('lab_results')
    .select('id, file_urls, patient_id, patients!inner(user_id)')
    .eq('id', params.id)
    .eq('patients.user_id', user.id)
    .single()

  if (fetchError || !result) {
    return NextResponse.json({ error: 'Resultado no encontrado o no autorizado' }, { status: 404 })
  }

  // Eliminar archivos de storage
  const fileUrls: string[] = (result.file_urls as string[]) ?? []
  if (fileUrls.length > 0) {
    const paths = fileUrls
      .map(url => {
        const marker = '/lab-files/'
        const idx = url.indexOf(marker)
        return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
      })
      .filter(Boolean) as string[]

    if (paths.length > 0) {
      await supabase.storage.from('lab-files').remove(paths)
    }
  }

  // Eliminar registro de la base de datos
  const { error: deleteError } = await supabase
    .from('lab_results')
    .delete()
    .eq('id', params.id)

  if (deleteError) {
    return NextResponse.json({ error: `Error al eliminar: ${deleteError.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, patientId: result.patient_id })
}
