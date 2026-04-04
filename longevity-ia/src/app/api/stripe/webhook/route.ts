export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getStripe, findPlanByPriceId } from '@/lib/stripe/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StripeObj = any

// ── Main handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const admin = getSupabaseAdmin()

  // Step 1: Verify webhook signature
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: { id: string; type: string; data: { object: StripeObj } }
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!) as typeof event
  } catch (err) {
    console.error('[stripe/webhook] Invalid signature:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Step 2: Idempotency — skip if already processed
  const { data: dup } = await admin
    .from('subscription_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()
  if (dup) return NextResponse.json({ received: true, duplicate: true })

  // Step 3: Route by event type
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(admin, stripe, event.data.object)
        break
      case 'customer.subscription.updated':
        await onSubscriptionUpdated(admin, event.data.object)
        break
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(admin, event.data.object)
        break
      case 'invoice.paid':
        await onInvoicePaid(admin, stripe, event.data.object)
        break
      case 'invoice.payment_failed':
        await onInvoicePaymentFailed(admin, event.data.object)
        break
      default:
        break
    }
  } catch (err) {
    console.error(`[stripe/webhook] Error handling ${event.type}:`, err)
  }

  // Step 4: Log event for audit trail
  await logEvent(admin, event)

  return NextResponse.json({ received: true })
}

// ── checkout.session.completed ──────────────────────────────────────

async function onCheckoutCompleted(
  admin: ReturnType<typeof getSupabaseAdmin>,
  stripe: ReturnType<typeof getStripe>,
  session: StripeObj,
) {
  if (session.mode !== 'subscription') return

  const userId = session.metadata?.user_id
  const role = session.metadata?.role
  const planTier = session.metadata?.plan_tier
  if (!userId || !role || !planTier) {
    console.error('[webhook] checkout missing metadata:', session.id)
    return
  }

  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
  const customerId = typeof session.customer === 'string' ? session.customer : null
  if (!subscriptionId || !customerId) return

  const sub = await stripe.subscriptions.retrieve(subscriptionId) as StripeObj
  const seatLimit = parseInt(sub.metadata?.seat_limit ?? session.metadata?.seat_limit ?? '1', 10)

  await admin.from('subscriptions').upsert({
    user_id: userId,
    role,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: sub.items.data[0]?.price.id ?? null,
    plan_tier: planTier,
    seat_limit: seatLimit,
    status: sub.status === 'trialing' ? 'trialing' : 'active',
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

// ── customer.subscription.updated ───────────────────────────────────

async function onSubscriptionUpdated(
  admin: ReturnType<typeof getSupabaseAdmin>,
  sub: StripeObj,
) {
  const priceId = sub.items.data[0]?.price.id
  const plan = priceId ? findPlanByPriceId(priceId) : null

  const statusMap: Record<string, string> = {
    trialing: 'trialing', active: 'active', past_due: 'past_due',
    canceled: 'canceled', unpaid: 'unpaid', paused: 'paused',
    incomplete: 'unpaid', incomplete_expired: 'canceled',
  }

  const updateData: Record<string, unknown> = {
    status: statusMap[sub.status] ?? 'unpaid',
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }

  if (plan) {
    updateData.stripe_price_id = priceId
    updateData.plan_tier = plan.tier
    updateData.seat_limit = plan.seatLimit
  } else if (sub.metadata?.seat_limit) {
    updateData.seat_limit = parseInt(sub.metadata.seat_limit, 10)
  }

  if (sub.metadata?.plan_tier) {
    updateData.plan_tier = sub.metadata.plan_tier
  }

  await admin
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', sub.id)
}

// ── customer.subscription.deleted ───────────────────────────────────

async function onSubscriptionDeleted(
  admin: ReturnType<typeof getSupabaseAdmin>,
  sub: StripeObj,
) {
  await admin
    .from('subscriptions')
    .update({ status: 'canceled', cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', sub.id)
}

// ── invoice.paid ────────────────────────────────────────────────────

async function onInvoicePaid(
  admin: ReturnType<typeof getSupabaseAdmin>,
  stripe: ReturnType<typeof getStripe>,
  invoice: StripeObj,
) {
  const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null
  if (!subId) return

  const sub = await stripe.subscriptions.retrieve(subId) as StripeObj

  await admin
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subId)
}

// ── invoice.payment_failed ──────────────────────────────────────────

async function onInvoicePaymentFailed(
  admin: ReturnType<typeof getSupabaseAdmin>,
  invoice: StripeObj,
) {
  const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null
  if (!subId) return

  await admin
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subId)
}

// ── Log event ───────────────────────────────────────────────────────

async function logEvent(
  admin: ReturnType<typeof getSupabaseAdmin>,
  event: { id: string; type: string; data: { object: StripeObj } },
) {
  const obj = event.data.object as StripeObj
  let subStripeId: string | null = null

  if (event.type.startsWith('customer.subscription')) {
    subStripeId = obj.id as string
  } else if (obj.subscription) {
    subStripeId = typeof obj.subscription === 'string' ? obj.subscription : null
  }

  let subscriptionId: string | null = null
  if (subStripeId) {
    const { data } = await admin
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subStripeId)
      .single()
    subscriptionId = data?.id ?? null
  }

  await admin.from('subscription_events').insert({
    subscription_id: subscriptionId,
    stripe_event_id: event.id,
    event_type: event.type,
    payload: obj,
  }).then(({ error }) => {
    if (error) console.error('[webhook] Event log error:', error.message)
  })
}
