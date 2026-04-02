export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
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

  // Inicio del mes actual (UTC)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Ejecutar conteos en paralelo
  const [medicosRes, patientsRes, analysesRes, alertsRes] = await Promise.all([
    // Total de médicos
    supabase
      .from('medicos')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinic.id),

    // Total de pacientes
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinic.id),

    // Análisis (lab_results) este mes — unir via patients de la clínica
    supabase
      .from('lab_results')
      .select('id, patients!inner(clinica_id)', { count: 'exact', head: true })
      .eq('patients.clinica_id', clinic.id)
      .gte('created_at', monthStart),

    // Alertas pendientes (no leídas, no descartadas) de médicos de la clínica
    supabase
      .from('medico_alerts')
      .select('id, medicos!inner(clinica_id)', { count: 'exact', head: true })
      .eq('medicos.clinica_id', clinic.id)
      .eq('read', false)
      .eq('dismissed', false),
  ])

  const stats: ClinicStats = {
    total_medicos: medicosRes.count ?? 0,
    total_patients: patientsRes.count ?? 0,
    analyses_this_month: analysesRes.count ?? 0,
    pending_alerts: alertsRes.count ?? 0,
  }

  return NextResponse.json({ stats })
}
