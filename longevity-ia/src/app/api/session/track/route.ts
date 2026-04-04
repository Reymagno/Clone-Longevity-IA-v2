export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { trackSession } from '@/lib/session-tracking'

// Secret compartido entre middleware y este endpoint para prevenir llamadas externas
// Se genera automáticamente si no está configurado
const INTERNAL_SESSION_SECRET = process.env.INTERNAL_API_SECRET ?? 'longevity-internal-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(-12)

/**
 * POST /api/session/track
 * Endpoint interno llamado desde el middleware (Edge Runtime) para registrar
 * sesiones de usuario. Corre en Node.js runtime donde el admin client funciona.
 *
 * SECURITY: Protegido con header X-Internal-Secret para prevenir llamadas externas.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar secret interno
    const secret = request.headers.get('x-internal-secret')
    if (!secret || secret !== INTERNAL_SESSION_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, role, ip, ua } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role required' }, { status: 400 })
    }

    trackSession(userId, role, ip ?? null, ua ?? null)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
