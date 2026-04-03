import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { NextRequest } from 'next/server'

interface AuditEntry {
  userId: string
  email?: string
  role?: string
  action: string
  resourceType: string
  resourceId?: string
  patientId?: string
  details?: Record<string, unknown>
}

/**
 * Log an audit entry. This is fire-and-forget: it never throws and
 * never blocks the calling operation.
 */
export function logAudit(entry: AuditEntry, request?: NextRequest): void {
  try {
    const admin = getSupabaseAdmin()
    admin.from('audit_logs').insert({
      user_id: entry.userId,
      user_email: entry.email ?? null,
      user_role: entry.role ?? null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      patient_id: entry.patientId ?? null,
      details: entry.details ?? null,
      ip_address: request?.headers.get('x-forwarded-for') ?? request?.headers.get('x-real-ip') ?? null,
      user_agent: request?.headers.get('user-agent') ?? null,
    }).then(({ error }) => {
      if (error) console.error('Audit log insert error:', error.message)
    })
  } catch (err) {
    console.error('Audit log failed:', err instanceof Error ? err.message : err)
  }
}
