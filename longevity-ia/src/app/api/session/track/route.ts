export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { trackSession } from '@/lib/session-tracking'

/**
 * POST /api/session/track
 * Endpoint interno llamado desde el middleware (Edge Runtime) para registrar
 * sesiones de usuario. Corre en Node.js runtime donde el admin client funciona.
 */
export async function POST(request: NextRequest) {
  try {
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
