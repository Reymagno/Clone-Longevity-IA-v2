import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import OpenAI from 'openai'

export const maxDuration = 300 // consultas pueden ser largas

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error('OPENAI_API_KEY no configurada')
    _openai = new OpenAI({ apiKey: key })
  }
  return _openai
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const language = (formData.get('language') as string) || 'es'

    if (!audioFile) {
      return NextResponse.json({ error: 'No se recibio archivo de audio' }, { status: 400 })
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const file = new File([buffer], 'consultation.webm', { type: audioFile.type || 'audio/webm' })

    // Transcribir con gpt-4o-transcribe (mejor calidad para consultas largas)
    const transcription = await getOpenAI().audio.transcriptions.create({
      file,
      model: 'gpt-4o-transcribe',
      language,
      prompt: 'Transcripcion de consulta medica entre doctor y paciente. Medicina de longevidad, biomarcadores, diagnosticos, medicamentos, sintomas, antecedentes, peptidos, protocolos, celulas madre, exosomas.',
    })

    return NextResponse.json({
      transcript: transcription.text,
      language,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en transcripcion'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
