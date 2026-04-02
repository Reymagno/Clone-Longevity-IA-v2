export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import type { Patient, LabResult } from '@/types'
import Link from 'next/link'
import { Upload, ArrowLeft } from 'lucide-react'

interface ResultSummary {
  id: string
  result_date: string
}

async function getServerData(
  patientId: string,
  resultId?: string
): Promise<{
  patient: Patient | null
  result: LabResult | null
  allResults: ResultSummary[]
  viewerRole: string
}> {
  try {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { patient: null, result: null, allResults: [], viewerRole: 'paciente' }
    const viewerRole = user?.user_metadata?.role ?? 'paciente'

    // Para clínicas: usar admin client (RLS bloquea cross-user reads)
    // Para pacientes/médicos: usar supabase con RLS normal
    const isClinica = viewerRole === 'clinica'
    let db = supabase

    if (isClinica) {
      // Verificar que el paciente pertenece a un médico de esta clínica
      const admin = getSupabaseAdmin()
      const { data: clinic } = await supabase.from('clinicas').select('id').eq('user_id', user.id).maybeSingle()
      if (clinic) {
        const { data: medicos } = await admin.from('medicos').select('user_id').eq('clinica_id', clinic.id)
        const medicoIds = (medicos ?? []).map(m => m.user_id)
        const { data: pat } = await admin.from('patients').select('user_id').eq('id', patientId).maybeSingle()
        if (!pat || !medicoIds.includes(pat.user_id)) {
          return { patient: null, result: null, allResults: [], viewerRole }
        }
      }
      db = admin as typeof supabase
    }

    const [patientRes, resultsRes, allResultsRes] = await Promise.all([
      db.from('patients').select('*').eq('id', patientId).maybeSingle(),
      resultId
        ? db.from('lab_results').select('*').eq('id', resultId).maybeSingle()
        : db
            .from('lab_results')
            .select('*')
            .eq('patient_id', patientId)
            .order('result_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
      db
        .from('lab_results')
        .select('id, result_date, created_at')
        .eq('patient_id', patientId)
        .order('result_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

    return {
      patient: (patientRes.data as Patient) ?? null,
      result: (resultsRes.data as LabResult) ?? null,
      allResults: (allResultsRes.data as ResultSummary[]) ?? [],
      viewerRole,
    }
  } catch {
    return { patient: null, result: null, allResults: [], viewerRole: 'paciente' }
  }
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { tab?: string; resultId?: string }
}) {
  const { patient, result, allResults, viewerRole } = await getServerData(params.id, searchParams.resultId)

  if (!patient) notFound()

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center animate-float">
          <Upload size={32} className="text-accent" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground mb-2">Sin resultados aun</p>
          <p className="text-muted-foreground max-w-xs">
            {patient.name} no tiene estudios de laboratorio subidos todavia.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 border border-border text-foreground font-medium px-5 py-2.5 rounded-xl hover:bg-white/5 transition-all text-sm"
          >
            <ArrowLeft size={16} />
            Volver
          </Link>
          <Link
            href={`/patients/${params.id}/upload`}
            className="inline-flex items-center gap-2 bg-accent text-background font-medium px-5 py-2.5 rounded-xl hover:bg-accent/90 transition-all text-sm shadow-accent/20 shadow-lg"
          >
            <Upload size={16} />
            Subir Estudio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Cargando dashboard...</div>}>
      <DashboardTabs patient={patient} result={result} allResults={allResults} viewerRole={viewerRole} />
    </Suspense>
  )
}
