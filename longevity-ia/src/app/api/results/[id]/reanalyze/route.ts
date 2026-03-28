export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { reanalyzeWithClinicalHistory } from '@/lib/anthropic/analyzer'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // 1. Obtener el lab result
    const { data: result, error: resultError } = await supabase
      .from('lab_results')
      .select('id, parsed_data, patient_id')
      .eq('id', params.id)
      .single()

    if (resultError || !result) {
      return NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 })
    }

    if (!result.parsed_data) {
      return NextResponse.json({ error: 'Este resultado no tiene datos de laboratorio extraídos' }, { status: 400 })
    }

    // 2. Verificar que el paciente pertenece al usuario y obtener su historia clínica
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, age, gender, weight, height, clinical_history')
      .eq('id', result.patient_id)
      .eq('user_id', user.id)
      .single()

    if (patientError || !patient) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!patient.clinical_history) {
      return NextResponse.json({ error: 'El paciente no tiene historia clínica registrada' }, { status: 400 })
    }

    // Re-analizar con la historia clínica (sin re-procesar archivos)
    const patientContext = {
      name: patient.name as string,
      age: patient.age as number,
      gender: patient.gender as string,
      weight: patient.weight as number | null,
      height: patient.height as number | null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clinical_history: patient.clinical_history as any,
    }

    const newAiAnalysis = await Promise.race([
      reanalyzeWithClinicalHistory(result.parsed_data, patientContext),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('El re-análisis tardó demasiado. Intenta de nuevo.')), 300_000)
      ),
    ])

    // Actualizar el resultado con el nuevo análisis
    const { data: updated, error: updateError } = await supabase
      .from('lab_results')
      .update({ ai_analysis: newAiAnalysis })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: `Error al guardar: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, resultId: params.id, result: updated })
  } catch (error) {
    console.error('Error en re-análisis:', error)
    const message = error instanceof Error ? error.message : 'Error al procesar el re-análisis.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
