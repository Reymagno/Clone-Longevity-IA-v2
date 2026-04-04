export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// GET /api/clinica/invitations — list invitations for the clinic
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'clinica') {
    return NextResponse.json({ error: 'Solo clinicas pueden ver invitaciones' }, { status: 403 })
  }

  // Get clinica id
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clinica) return NextResponse.json({ error: 'Clinica no encontrada' }, { status: 404 })

  // Get all links for this clinic
  const { data, error } = await supabase
    .from('clinica_medico_links')
    .select('*')
    .eq('clinica_id', clinica.id)
    .neq('status', 'revoked')
    .order('invited_at', { ascending: false })

  if (error) {
    console.error('[invitations] Query error:', error.message)
    return NextResponse.json({ error: 'Error al obtener invitaciones' }, { status: 500 })
  }

  // Enrich with medico info
  const medicoUserIds = (data ?? []).map(d => d.medico_user_id)
  let medicoMap: Record<string, { name: string; specialty: string; email: string }> = {}

  if (medicoUserIds.length > 0) {
    const { data: medicos } = await supabase
      .from('medicos')
      .select('user_id, full_name, specialty, email')
      .in('user_id', medicoUserIds)

    if (medicos) {
      medicos.forEach(m => {
        medicoMap[m.user_id] = { name: m.full_name, specialty: m.specialty, email: m.email }
      })
    }
  }

  const enriched = (data ?? []).map(link => ({
    ...link,
    medico_name: medicoMap[link.medico_user_id]?.name ?? 'Medico',
    medico_specialty: medicoMap[link.medico_user_id]?.specialty ?? '',
    medico_email: medicoMap[link.medico_user_id]?.email ?? '',
  }))

  return NextResponse.json({ invitations: enriched })
}

// POST /api/clinica/invitations — medico sends invitation to join clinic by code
export async function POST(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'medico') {
    return NextResponse.json({ error: 'Solo medicos pueden solicitar vinculacion' }, { status: 403 })
  }

  const body = await request.json()
  const { code } = body as { code: string }

  if (!code || !code.trim()) {
    return NextResponse.json({ error: 'Codigo de clinica requerido' }, { status: 400 })
  }

  const trimmed = code.trim().toUpperCase()

  // Look up clinica by code (usar admin: RLS de clinicas solo permite al dueño leer)
  const admin = getSupabaseAdmin()
  const { data: clinica } = await admin
    .from('clinicas')
    .select('id, clinic_name')
    .eq('code', trimmed)
    .maybeSingle()

  if (!clinica) {
    return NextResponse.json({ error: 'No se encontro una clinica con ese codigo' }, { status: 404 })
  }

  // Check if link already exists (usar admin para leer cross-user)
  const { data: existing } = await admin
    .from('clinica_medico_links')
    .select('id, status')
    .eq('clinica_id', clinica.id)
    .eq('medico_user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'active') {
      return NextResponse.json({ error: 'Ya estas vinculado a esta clinica' }, { status: 409 })
    }
    if (existing.status === 'pending') {
      return NextResponse.json({ error: 'Ya tienes una solicitud pendiente con esta clinica' }, { status: 409 })
    }
    // If revoked, allow re-request by updating
    const { error: updateError } = await admin
      .from('clinica_medico_links')
      .update({ status: 'pending', invited_at: new Date().toISOString(), confirmed_at: null })
      .eq('id', existing.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ invitation: { id: existing.id, clinic_name: clinica.clinic_name, status: 'pending' } })
  }

  // Insert new link
  const { data: newLink, error } = await admin
    .from('clinica_medico_links')
    .insert({
      clinica_id: clinica.id,
      medico_user_id: user.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return NextResponse.json({ error: 'Ya existe una solicitud con esta clinica' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invitation: { id: newLink.id, clinic_name: clinica.clinic_name, status: 'pending' } })
}

// PATCH /api/clinica/invitations — clinic accepts/rejects a medico invitation
export async function PATCH(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role !== 'clinica') {
    return NextResponse.json({ error: 'Solo clinicas pueden gestionar invitaciones' }, { status: 403 })
  }

  const body = await request.json()
  const { invitation_id, action } = body as { invitation_id: string; action: 'accept' | 'reject' }

  if (!invitation_id || !['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'invitation_id y action (accept|reject) requeridos' }, { status: 400 })
  }

  // Verify the invitation belongs to this clinic
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clinica) return NextResponse.json({ error: 'Clinica no encontrada' }, { status: 404 })

  const { data: link } = await supabase
    .from('clinica_medico_links')
    .select('id, medico_user_id, clinica_id')
    .eq('id', invitation_id)
    .eq('clinica_id', clinica.id)
    .maybeSingle()

  if (!link) return NextResponse.json({ error: 'Invitacion no encontrada' }, { status: 404 })

  if (action === 'accept') {
    const admin = getSupabaseAdmin()

    // Update link status (admin: RLS bloquea cross-user writes)
    const { error: linkError } = await admin
      .from('clinica_medico_links')
      .update({ status: 'active', confirmed_at: new Date().toISOString() })
      .eq('id', invitation_id)

    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

    // Update medicos.clinica_id (admin: la clínica no es user_id del médico)
    const { error: medicoError } = await admin
      .from('medicos')
      .update({ clinica_id: clinica.id })
      .eq('user_id', link.medico_user_id)

    if (medicoError) {
      console.error('Error updating medicos.clinica_id:', medicoError.message)
    }
  } else {
    // Reject/revoke: set status to revoked and clear clinica_id
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('clinica_medico_links')
      .update({ status: 'revoked' })
      .eq('id', invitation_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Limpiar clinica_id del médico
    await admin
      .from('medicos')
      .update({ clinica_id: null })
      .eq('user_id', link.medico_user_id)
      .eq('clinica_id', clinica.id)
  }

  return NextResponse.json({ success: true })
}
