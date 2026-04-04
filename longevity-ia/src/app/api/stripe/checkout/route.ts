export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getStripePriceId, getPlanConfig, isValidTier } from '@/lib/stripe/server'
import { authenticateUser, isAuthError } from '@/lib/steps/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const schema = z.object({
  planTier: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const auth = await authenticateUser(request)
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'planTier requerido' }, { status: 400 })
  }

  const { planTier } = parsed.data
  if (!isValidTier(planTier)) {
    return NextResponse.json({ error: 'Plan no válido' }, { status: 400 })
  }

  const plan = getPlanConfig(planTier)!
  if (plan.role !== auth.role) {
    return NextResponse.json({ error: 'Este plan no corresponde a tu rol' }, { status: 403 })
  }

  const stripe = getStripe()
  const admin = getSupabaseAdmin()

  // Check existing subscription
  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id, status')
    .eq('user_id', auth.user.id)
    .single()

  let customerId: string

  if (existingSub?.stripe_customer_id) {
    customerId = existingSub.stripe_customer_id

    // Already active → redirect to portal for upgrade/downgrade
    if (existingSub.status === 'active' || existingSub.status === 'trialing') {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${request.nextUrl.origin}/patients`,
      })
      return NextResponse.json({ url: portal.url, via: 'portal' })
    }
  } else {
    const customer = await stripe.customers.create({
      email: auth.email,
      metadata: { user_id: auth.user.id, role: auth.role },
    })
    customerId = customer.id
  }

  const priceId = getStripePriceId(planTier)
  const origin = request.nextUrl.origin

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        user_id: auth.user.id,
        role: auth.role,
        plan_tier: planTier,
        seat_limit: String(plan.seatLimit),
      },
    },
    success_url: `${origin}/patients?subscription=success`,
    cancel_url: `${origin}/pricing?canceled=true`,
    locale: 'es',
    currency: 'mxn',
    metadata: {
      user_id: auth.user.id,
      role: auth.role,
      plan_tier: planTier,
    },
  })

  return NextResponse.json({ url: session.url })
}
