export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

// GET /api/medico/alerts — obtener alertas del médico
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.user_metadata?.role
  if (role !== 'medico') return NextResponse.json({ error: 'Solo médicos' }, { status: 403 })

  const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
  const patientId = request.nextUrl.searchParams.get('patientId')

  let query = supabase
    .from('medico_alerts')
    .select('*')
    .eq('medico_user_id', user.id)
    .eq('dismissed', false)
    .order('created_at', { ascending: false })
    .limit(100)

  if (unreadOnly) query = query.eq('read', false)
  if (patientId) query = query.eq('patient_id', patientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquecer con nombres de pacientes
  const patientIds = Array.from(new Set((data ?? []).map(a => a.patient_id)))
  let patientNames: Record<string, string> = {}
  if (patientIds.length > 0) {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name')
      .in('id', patientIds)
    if (patients) {
      patientNames = Object.fromEntries(patients.map(p => [p.id, p.name]))
    }
  }

  const enriched = (data ?? []).map(alert => ({
    ...alert,
    patient_name: patientNames[alert.patient_id] ?? 'Paciente',
  }))

  return NextResponse.json(enriched)
}

// PATCH /api/medico/alerts — marcar alertas como leídas/dismissed
export async function PATCH(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { alertIds, action } = body as { alertIds: string[]; action: 'read' | 'dismiss' | 'dismiss_all' }

  if (action === 'dismiss_all') {
    await supabase
      .from('medico_alerts')
      .update({ dismissed: true })
      .eq('medico_user_id', user.id)
      .eq('dismissed', false)
    logAudit({ userId: user.id, email: user.email ?? undefined, role: 'medico', action: 'dismiss_all_alerts', resourceType: 'medico_alert' }, request)
    return NextResponse.json({ ok: true })
  }

  if (!alertIds?.length) return NextResponse.json({ error: 'alertIds requeridos' }, { status: 400 })

  const update = action === 'dismiss' ? { dismissed: true } : { read: true }
  const { error } = await supabase
    .from('medico_alerts')
    .update(update)
    .in('id', alertIds)
    .eq('medico_user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const auditAction = action === 'dismiss' ? 'dismiss_alert' : 'read_alert'
  logAudit({ userId: user.id, email: user.email ?? undefined, role: 'medico', action: auditAction, resourceType: 'medico_alert', details: { alertIds, count: alertIds.length } }, request)

  return NextResponse.json({ ok: true })
}
