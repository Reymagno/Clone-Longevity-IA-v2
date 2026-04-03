export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const ALLOWED_BUCKETS = ['lab-files', 'voice-notes', 'consultation-audio']

export async function POST(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { bucket, path } = await request.json()
  if (!bucket || !path) {
    return NextResponse.json({ error: 'bucket y path requeridos' }, { status: 400 })
  }

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: 'Bucket no permitido' }, { status: 403 })
  }

  // Validate the user owns the patient whose files are being accessed
  // The path format is "{patientId}/{timestamp}-{filename}"
  const patientId = path.split('/')[0]
  if (patientId) {
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .maybeSingle()

    if (!patient) {
      return NextResponse.json({ error: 'No autorizado para este archivo' }, { status: 403 })
    }
  }

  const admin = getSupabaseAdmin()
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, 3600) // 1 hour expiry

  if (!data?.signedUrl) {
    return NextResponse.json({ error: 'No se pudo generar URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
