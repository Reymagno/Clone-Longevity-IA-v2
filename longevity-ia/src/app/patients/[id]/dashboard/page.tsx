export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase/server'
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

    // Verificar ownership o vínculo médico
    const { data: ownPatient } = await supabase
      .from('patients').select('id').eq('id', patientId).eq('user_id', user.id).maybeSingle()
    if (!ownPatient) {
      const { data: linked } = await supabase
        .from('medico_patients').select('id').eq('patient_id', patientId).eq('medico_user_id', user.id).maybeSingle()
      if (!linked) return { patient: null, result: null, allResults: [], viewerRole }
    }

    const [patientRes, resultsRes, allResultsRes] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).maybeSingle(),
      resultId
        ? supabase.from('lab_results').select('*').eq('id', resultId).maybeSingle()
        : supabase
            .from('lab_results')
            .select('*')
            .eq('patient_id', patientId)
            .order('result_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
      supabase
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
