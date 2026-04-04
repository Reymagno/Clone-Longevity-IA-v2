import { getSupabaseAdmin } from '@/lib/supabase/admin'

// Umbral para considerar una nueva sesión (30 minutos sin actividad)
const SESSION_GAP_SECONDS = 30 * 60

/**
 * Registra o actualiza la sesión activa de un usuario.
 * - Si existe una sesión con last_seen_at < 30 min → la actualiza
 * - Si no → crea una nueva sesión (nuevo login/retorno)
 *
 * Fire-and-forget: nunca lanza excepciones ni bloquea el request.
 */
export function trackSession(
  userId: string,
  role: string,
  ipAddress: string | null,
  userAgent: string | null,
): void {
  try {
    const admin = getSupabaseAdmin()
    const threshold = new Date(Date.now() - SESSION_GAP_SECONDS * 1000).toISOString()

    // Buscar sesión activa reciente
    admin
      .from('user_sessions')
      .select('id, started_at')
      .eq('user_id', userId)
      .gte('last_seen_at', threshold)
      .order('last_seen_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const now = new Date()

        if (data && data.length > 0) {
          // Actualizar sesión existente
          const session = data[0]
          const startedAt = new Date(session.started_at).getTime()
          const durationSeconds = Math.floor((now.getTime() - startedAt) / 1000)

          admin
            .from('user_sessions')
            .update({
              last_seen_at: now.toISOString(),
              duration_seconds: durationSeconds,
            })
            .eq('id', session.id)
            .then(({ error }) => {
              if (error) console.error('[session-tracking] update error:', error.message)
            })
        } else {
          // Crear nueva sesión
          admin
            .from('user_sessions')
            .insert({
              user_id: userId,
              user_role: role,
              started_at: now.toISOString(),
              last_seen_at: now.toISOString(),
              duration_seconds: 0,
              ip_address: ipAddress,
              user_agent: userAgent,
            })
            .then(({ error }) => {
              if (error) console.error('[session-tracking] insert error:', error.message)
            })

          // Registrar login en audit_logs
          admin
            .from('audit_logs')
            .insert({
              user_id: userId,
              user_role: role,
              action: 'login',
              resource_type: 'session',
              ip_address: ipAddress,
              user_agent: userAgent,
            })
            .then(({ error }) => {
              if (error) console.error('[session-tracking] audit login error:', error.message)
            })
        }
      })
  } catch (err) {
    console.error('[session-tracking] failed:', err instanceof Error ? err.message : err)
  }
}
