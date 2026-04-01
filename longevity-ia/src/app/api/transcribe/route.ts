import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import OpenAI from 'openai'

export const maxDuration = 60

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error('OPENAI_API_KEY no configurada. Agrega la variable de entorno para habilitar transcripción por Whisper.')
    _openai = new OpenAI({ apiKey: key })
  }
  return _openai
}

export async function POST(request: NextRequest) {
  try {
    // Autenticación
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const language = (formData.get('language') as string) || 'es'

    if (!audioFile) {
      return NextResponse.json({ error: 'No se recibió archivo de audio' }, { status: 400 })
    }

    // Convertir File a buffer para enviar a Whisper
    const buffer = Buffer.from(await audioFile.arrayBuffer())

    // Crear un File compatible con la API de OpenAI
    const file = new File([buffer], 'recording.webm', { type: audioFile.type || 'audio/webm' })

    const transcription = await getOpenAI().audio.transcriptions.create({
      file,
      model: 'gpt-4o-mini-transcribe',
      language,
      prompt: 'Transcripción médica clínica de longevidad. Biomarcadores, diagnósticos, medicamentos, síntomas, antecedentes, péptidos, protocolos.',
    })

    return NextResponse.json({
      text: transcription.text,
      language,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en transcripción'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
