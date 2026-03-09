import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isProtected = request.nextUrl.pathname.startsWith('/patients')

  // Si ruta protegida y sin sesión → redirige a login
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si ya tiene sesión y va al login → redirige a pacientes
  if (isLoginPage && user) {
    return NextResponse.redirect(new URL('/patients', request.url))
  }

  return response
}

export const config = {
  matcher: ['/patients/:path*', '/login'],
}
