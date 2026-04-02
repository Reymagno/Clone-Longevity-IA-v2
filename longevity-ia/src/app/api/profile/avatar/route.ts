export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('avatar') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No se envio ningun archivo' }, { status: 400 })
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de archivo no permitido. Solo imagenes (JPEG, PNG, WebP, GIF).' },
      { status: 400 }
    )
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'El archivo es muy grande. Maximo 2 MB.' },
      { status: 400 }
    )
  }

  const role = (user.user_metadata?.role as string) ?? 'paciente'
  const ext = file.name.split('.').pop() || 'jpg'
  const filePath = `${user.id}/avatar.${ext}`

  try {
    // Delete previous avatar if exists (ignore errors — may not exist)
    const { data: existing } = await supabase.storage.from('avatars').list(user.id)
    if (existing && existing.length > 0) {
      const filesToDelete = existing.map(f => `${user.id}/${f.name}`)
      await supabase.storage.from('avatars').remove(filesToDelete)
    }

    // Upload new avatar
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })
    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const avatar_url = urlData.publicUrl

    // Update the appropriate table
    if (role === 'medico') {
      await supabase.from('medicos').update({ avatar_url }).eq('user_id', user.id)
    } else if (role === 'clinica') {
      await supabase.from('clinicas').update({ avatar_url }).eq('user_id', user.id)
    } else {
      await supabase.from('profiles').update({ avatar_url }).eq('id', user.id)
    }

    return NextResponse.json({ avatar_url })
  } catch (err) {
    console.error('[POST /api/profile/avatar]', err)
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
  }
}
