export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

// ─── GET /api/profile ────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (user.app_metadata?.role ?? user.user_metadata?.role as string) ?? 'paciente'

  try {
    if (role === 'medico') {
      const { data, error } = await supabase
        .from('medicos')
        .select('full_name, specialty, license_number, code, email, avatar_url')
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return NextResponse.json({ role, ...data })
    }

    if (role === 'clinica') {
      const { data, error } = await supabase
        .from('clinicas')
        .select('clinic_name, rfc, contact_email, phone, address, director_name, avatar_url')
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return NextResponse.json({ role, email: data.contact_email, ...data })
    }

    // paciente — read from profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('id', user.id)
      .single()
    if (error) throw error
    return NextResponse.json({ role, ...data })
  } catch (err) {
    console.error('[GET /api/profile]', err)
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 })
  }
}

// ─── PATCH /api/profile ──────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (user.app_metadata?.role ?? user.user_metadata?.role as string) ?? 'paciente'
  const body = await request.json()

  try {
    if (role === 'medico') {
      const allowed: Record<string, unknown> = {}
      if (body.full_name !== undefined) allowed.full_name = body.full_name
      if (body.specialty !== undefined) allowed.specialty = body.specialty
      if (body.license_number !== undefined) allowed.license_number = body.license_number
      if (body.avatar_url !== undefined) {
        // SECURITY: solo aceptar URLs HTTPS
        if (typeof body.avatar_url === 'string' && body.avatar_url.startsWith('https://')) {
          allowed.avatar_url = body.avatar_url
        }
      }

      const { data, error } = await supabase
        .from('medicos')
        .update(allowed)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error

      // Sync full_name to auth metadata
      if (body.full_name) {
        await supabase.auth.updateUser({ data: { full_name: body.full_name } })
      }

      logAudit({ userId: user.id, email: user.email ?? undefined, role, action: 'update_profile', resourceType: 'medico', details: { fields: Object.keys(allowed) } }, request)
      return NextResponse.json({ role, ...data })
    }

    if (role === 'clinica') {
      const allowed: Record<string, unknown> = {}
      if (body.clinic_name !== undefined) allowed.clinic_name = body.clinic_name
      if (body.director_name !== undefined) allowed.director_name = body.director_name
      if (body.rfc !== undefined) allowed.rfc = body.rfc
      if (body.phone !== undefined) allowed.phone = body.phone
      if (body.address !== undefined) allowed.address = body.address
      if (body.avatar_url !== undefined) {
        if (typeof body.avatar_url === 'string' && body.avatar_url.startsWith('https://')) {
          allowed.avatar_url = body.avatar_url
        }
      }

      const { data, error } = await supabase
        .from('clinicas')
        .update(allowed)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error

      // Sync clinic_name to auth metadata
      if (body.clinic_name) {
        await supabase.auth.updateUser({ data: { full_name: body.clinic_name } })
      }

      logAudit({ userId: user.id, email: user.email ?? undefined, role, action: 'update_profile', resourceType: 'clinica', details: { fields: Object.keys(allowed) } }, request)
      return NextResponse.json({ role, ...data })
    }

    // paciente
    const allowed: Record<string, unknown> = {}
    if (body.full_name !== undefined) allowed.full_name = body.full_name
    if (body.avatar_url !== undefined) {
      if (typeof body.avatar_url === 'string' && body.avatar_url.startsWith('https://')) {
        allowed.avatar_url = body.avatar_url
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(allowed)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error

    if (body.full_name) {
      await supabase.auth.updateUser({ data: { full_name: body.full_name } })
    }

    logAudit({ userId: user.id, email: user.email ?? undefined, role, action: 'update_profile', resourceType: 'profile', details: { fields: Object.keys(allowed) } }, request)
    return NextResponse.json({ role, ...data })
  } catch (err) {
    console.error('[PATCH /api/profile]', err)
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })
  }
}
