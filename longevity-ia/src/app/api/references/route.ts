export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { searchReferencesForProtocol } from '@/lib/medical-references'

/**
 * POST /api/references
 * Body: { protocol: { molecule: string, evidence: string }[] }
 *
 * Only accessible by medico role. Searches PubMed, Semantic Scholar,
 * and OpenAlex for verified references matching protocol items.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Verify medico role
    const role = user.user_metadata?.role
    if (role !== 'medico') {
      return NextResponse.json({ error: 'Solo disponible para médicos' }, { status: 403 })
    }

    const body = await request.json()
    const protocol = body?.protocol
    if (!Array.isArray(protocol) || protocol.length === 0) {
      return NextResponse.json({ error: 'Protocolo requerido' }, { status: 400 })
    }

    // Extract only molecule + evidence for searching
    const items = protocol.map((p: { molecule?: string; evidence?: string }) => ({
      molecule: p.molecule ?? '',
      evidence: p.evidence ?? '',
    })).filter(p => p.molecule)

    const references = await searchReferencesForProtocol(items)

    return NextResponse.json({ ok: true, references })
  } catch (error) {
    console.error('Error buscando referencias:', error)
    return NextResponse.json(
      { error: 'Error al buscar referencias médicas' },
      { status: 500 }
    )
  }
}
