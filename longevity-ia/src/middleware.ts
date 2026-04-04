import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Debounce: solo trackear sesión cada 5 minutos por usuario
const SESSION_DEBOUNCE_COOKIE = '_st'
const SESSION_DEBOUNCE_SECONDS = 5 * 60

// Secret compartido con /api/session/track para prevenir llamadas externas
const INTERNAL_SESSION_SECRET = process.env.INTERNAL_API_SECRET ?? 'longevity-internal-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(-12)

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    // Sin env vars: bloquear rutas protegidas, dejar pasar el resto
    const { pathname } = request.nextUrl
    const isProtected = pathname.startsWith('/patients') || pathname.startsWith('/onboarding')
    if (isProtected) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl
    const isLoginPage = pathname === '/login'
    const isPricingPage = pathname === '/pricing'
    const isProtected =
      pathname.startsWith('/patients') || pathname.startsWith('/onboarding')

    // Si hay error de auth (usuario eliminado, token inválido) → limpiar sesión y redirigir a login
    if (authError && isProtected) {
      const loginUrl = new URL('/login', request.url)
      const res = NextResponse.redirect(loginUrl)
      // Eliminar cookies de sesión de Supabase
      res.cookies.delete('sb-access-token')
      res.cookies.delete('sb-refresh-token')
      return res
    }

    // Si ruta protegida y sin sesión → redirige a login
    if (isProtected && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Si ya tiene sesión válida y va al login → redirige a pacientes
    if (isLoginPage && user && !authError) {
      return NextResponse.redirect(new URL('/patients', request.url))
    }

    // ── Subscription gating ──────────────────────────────────────
    // SECURITY: allowlist approach — only 'active' and 'trialing' pass
    if (user && isProtected && !isPricingPage) {
      const subCookie = request.cookies.get('_sub')?.value
      const allowedStatuses = ['active', 'trialing']
      if (subCookie && !allowedStatuses.includes(subCookie)) {
        const pricingUrl = new URL('/pricing', request.url)
        pricingUrl.searchParams.set('reason', 'subscription_required')
        return NextResponse.redirect(pricingUrl)
      }
    }

    // ── Session tracking (debounced, via internal API call) ────────
    // Edge Runtime no soporta import() dinámico de módulos Node.js,
    // así que delegamos el tracking a un endpoint interno ligero.
    if (user && isProtected && !request.cookies.get(SESSION_DEBOUNCE_COOKIE)) {
      const role = user.app_metadata?.role ?? user.user_metadata?.role ?? 'paciente'
      const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
      const ua = request.headers.get('user-agent') ?? null

      // Fire-and-forget: llamar endpoint interno que corre en Node.js runtime
      const trackUrl = new URL('/api/session/track', request.url)
      fetch(trackUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SESSION_SECRET,
        },
        body: JSON.stringify({ userId: user.id, role, ip, ua }),
      }).catch(() => {
        // Silencioso — session tracking nunca debe romper el request
      })

      // Setear cookie de debounce para no re-trackear en los próximos 5 min
      response.cookies.set(SESSION_DEBOUNCE_COOKIE, '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DEBOUNCE_SECONDS,
        path: '/',
      })
    }
  } catch (error) {
    console.error('[middleware] Error:', error instanceof Error ? error.message : 'Unknown error')
    // Si falla en ruta protegida, redirigir a login por seguridad
    const { pathname } = request.nextUrl
    const isProtected = pathname.startsWith('/patients') || pathname.startsWith('/onboarding')
    if (isProtected) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/patients/:path*', '/onboarding', '/login', '/pricing'],
}
