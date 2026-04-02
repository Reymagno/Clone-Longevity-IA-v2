export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { ClinicStats } from '@/types'

// GET /api/clinica/stats — estadísticas generales de la clínica
export async function GET(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = user.user_metadata?.role
  if (role !== 'clinica') {
    return NextResponse.json({ error: 'Acceso exclusivo para clínicas' }, { status: 403 })
  }

  const { data: clinic, error: clinicError } = await supabase
    .from('clinicas')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (clinicError || !clinic) {
    return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
  }

  const admin = getSupabaseAdmin()

  // Obtener médicos: por clinica_id directo + por invitaciones activas
  const [directMedicos, linkedMedicos] = await Promise.all([
    admin.from('medicos').select('user_id').eq('clinica_id', clinic.id),
    admin.from('clinica_medico_links').select('medico_user_id').eq('clinica_id', clinic.id).eq('status', 'active'),
  ])
  const allIds = new Set<string>()
  for (const m of directMedicos.data ?? []) allIds.add(m.user_id)
  for (const l of linkedMedicos.data ?? []) allIds.add(l.medico_user_id)
  const medicoUserIds = Array.from(allIds)

  // Inicio del mes actual
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let totalPatients = 0
  let analysesThisMonth = 0
  let pendingAlerts = 0

  if (medicoUserIds.length > 0) {
    // Total pacientes de los médicos de la clínica
    const { count: pCount } = await admin
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .in('user_id', medicoUserIds)
    totalPatients = pCount ?? 0

    // Obtener IDs de pacientes para queries de lab_results y alerts
    const { data: patientRows } = await admin
      .from('patients')
      .select('id')
      .in('user_id', medicoUserIds)
    const patientIds = (patientRows ?? []).map(p => p.id)

    if (patientIds.length > 0) {
      const { count: aCount } = await admin
        .from('lab_results')
        .select('id', { count: 'exact', head: true })
        .in('patient_id', patientIds)
        .gte('created_at', monthStart)
      analysesThisMonth = aCount ?? 0

      const { count: alertCount } = await admin
        .from('medico_alerts')
        .select('id', { count: 'exact', head: true })
        .in('medico_user_id', medicoUserIds)
        .eq('read', false)
        .eq('dismissed', false)
      pendingAlerts = alertCount ?? 0
    }
  }

  const stats: ClinicStats = {
    total_medicos: medicoUserIds.length,
    total_patients: totalPatients,
    analyses_this_month: analysesThisMonth,
    pending_alerts: pendingAlerts,
  }

  return NextResponse.json({ stats })
}
