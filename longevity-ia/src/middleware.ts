import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Si faltan las variables de entorno, dejar pasar sin bloquear
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
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

    const { data: { user } } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl
    const isLoginPage = pathname === '/login'
    const isProtected =
      pathname.startsWith('/patients') || pathname.startsWith('/onboarding')

    // Si ruta protegida y sin sesión → redirige a login
    if (isProtected && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Si ya tiene sesión y va al login → redirige a pacientes
    if (isLoginPage && user) {
      return NextResponse.redirect(new URL('/patients', request.url))
    }
  } catch (error) {
    // Si el middleware falla (error de red, Supabase caído, etc.),
    // dejar pasar la request para no bloquear a los usuarios
    console.error('[middleware] Error:', error)
  }

  return response
}

export const config = {
  matcher: ['/patients/:path*', '/onboarding', '/login'],
}
