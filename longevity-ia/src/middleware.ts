import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
  } catch (error) {
    console.error('[middleware] Error:', error)
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
  matcher: ['/patients/:path*', '/onboarding', '/login'],
}
