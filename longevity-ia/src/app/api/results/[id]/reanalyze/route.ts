export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    // Obtener el lab result con datos del paciente (join)
    const { data: result, error: resultError } = await supabase
      .from('lab_results')
      .select('id, parsed_data, patients!inner(id, name, age, gender, weight, height, clinical_history, user_id)')
      .eq('id', params.id)
      .eq('patients.user_id', user.id)
      .single()

    if (resultError || !result) {
      return NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 })
    }

    if (!result.parsed_data) {
      return NextResponse.json({ error: 'Este resultado no tiene datos de laboratorio extraídos' }, { status: 400 })
    }

    const patient = result.patients as {
      id: string
      name: string
      age: number
      gender: string
      weight: number | null
      height: number | null
      clinical_history: Record<string, unknown> | null
    }

    if (!patient.clinical_history) {
      return NextResponse.json({ error: 'El paciente no tiene historia clínica registrada' }, { status: 400 })
    }

    // Re-analizar con la historia clínica (sin re-procesar archivos)
    const patientContext = {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      weight: patient.weight,
      height: patient.height,
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
