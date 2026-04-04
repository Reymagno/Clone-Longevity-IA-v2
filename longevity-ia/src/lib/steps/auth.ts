/**
 * Steps de autenticación y autorización.
 * Extraídos del patrón repetido en 20+ route handlers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface AuthContext {
  supabase: SupabaseClient
  user: User
  role: string
  email: string
}

/**
 * Autentica al usuario desde el request.
 * Retorna AuthContext si válido, o NextResponse con error si no.
 */
export async function authenticateUser(
  request: NextRequest,
): Promise<AuthContext | NextResponse> {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  return {
    supabase,
    user,
    // SECURITY: usar app_metadata (no modificable por el usuario) con fallback a user_metadata
    role: user.app_metadata?.role ?? user.user_metadata?.role ?? 'paciente',
    email: user.email ?? '',
  }
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Retorna null si autorizado, o NextResponse con error 403.
 */
export function authorizeRole(
  auth: AuthContext,
  allowedRoles: string[],
): NextResponse | null {
  if (!allowedRoles.includes(auth.role)) {
    return NextResponse.json(
      { error: `Acceso denegado. Se requiere rol: ${allowedRoles.join(' o ')}` },
      { status: 403 },
    )
  }
  return null
}

/**
 * Helper: autentica + autoriza en un solo paso.
 */
export async function authenticateAndAuthorize(
  request: NextRequest,
  allowedRoles: string[],
): Promise<AuthContext | NextResponse> {
  const result = await authenticateUser(request)
  if (result instanceof NextResponse) return result

  const roleCheck = authorizeRole(result, allowedRoles)
  if (roleCheck) return roleCheck

  return result
}

/** Type guard para distinguir AuthContext de NextResponse */
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
