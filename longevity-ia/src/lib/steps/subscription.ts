/**
 * Step de verificación y enforcement de suscripciones.
 */

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused' | 'none'

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing']

export interface SubscriptionCheck {
  hasSubscription: boolean
  isActive: boolean
  status: SubscriptionStatus
  planTier: string
  seatLimit: number
  seatsUsed: number
}

export async function checkSubscription(
  userId: string,
  role: string,
): Promise<SubscriptionCheck> {
  const admin = getSupabaseAdmin()

  const { data: sub } = await admin
    .from('subscriptions')
    .select('status, plan_tier, seat_limit')
    .eq('user_id', userId)
    .single()

  if (!sub) {
    return { hasSubscription: false, isActive: false, status: 'none', planTier: '', seatLimit: 0, seatsUsed: 0 }
  }

  const seatsUsed = await countSeatsUsed(userId, role)

  return {
    hasSubscription: true,
    isActive: ACTIVE_STATUSES.includes(sub.status as SubscriptionStatus),
    status: sub.status as SubscriptionStatus,
    planTier: sub.plan_tier,
    seatLimit: sub.seat_limit,
    seatsUsed,
  }
}

export async function enforceSeatLimit(
  userId: string,
  role: string,
): Promise<NextResponse | null> {
  const admin = getSupabaseAdmin()

  const { data: sub } = await admin
    .from('subscriptions')
    .select('seat_limit, status')
    .eq('user_id', userId)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Suscripción requerida' }, { status: 403 })
  }

  if (!ACTIVE_STATUSES.includes(sub.status as SubscriptionStatus)) {
    return NextResponse.json(
      { error: 'Suscripción inactiva', subscription_status: sub.status },
      { status: 403 },
    )
  }

  const used = await countSeatsUsed(userId, role)

  if (used >= sub.seat_limit) {
    const entityName = role === 'medico' ? 'pacientes' : 'médicos'
    return NextResponse.json({
      error: `Límite de ${entityName} alcanzado (${used}/${sub.seat_limit}). Actualiza tu plan.`,
      seats_used: used,
      seat_limit: sub.seat_limit,
      upgrade_required: true,
    }, { status: 403 })
  }

  return null
}

export async function enforceActiveSubscription(
  userId: string,
): Promise<NextResponse | null> {
  const admin = getSupabaseAdmin()

  const { data: sub } = await admin
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Suscripción requerida', redirect: '/pricing' }, { status: 403 })
  }

  if (!ACTIVE_STATUSES.includes(sub.status as SubscriptionStatus)) {
    return NextResponse.json(
      { error: 'Suscripción inactiva', subscription_status: sub.status, redirect: '/pricing' },
      { status: 403 },
    )
  }

  return null
}

async function countSeatsUsed(userId: string, role: string): Promise<number> {
  const admin = getSupabaseAdmin()

  if (role === 'medico') {
    const { count } = await admin
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    return count ?? 0
  }

  if (role === 'clinica') {
    const { data: clinica } = await admin
      .from('clinicas')
      .select('id')
      .eq('user_id', userId)
      .single()
    if (!clinica) return 0

    const { count } = await admin
      .from('medicos')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinica.id)
    return count ?? 0
  }

  return 0
}
