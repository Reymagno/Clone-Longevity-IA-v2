export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, isAuthError } from '@/lib/steps/auth'
import { checkSubscription } from '@/lib/steps/subscription'

export async function GET(request: NextRequest) {
  const auth = await authenticateUser(request)
  if (isAuthError(auth)) return auth

  const check = await checkSubscription(auth.user.id, auth.role)

  // Set subscription status cookie for middleware
  const response = NextResponse.json({
    ...check,
    subscription: check.hasSubscription ? {
      status: check.status,
      plan_tier: check.planTier,
      seat_limit: check.seatLimit,
    } : null,
  })

  // Cookie for lightweight middleware check
  response.cookies.set('_sub', check.isActive ? 'active' : check.status, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400, // 24h
    path: '/',
  })

  return response
}
