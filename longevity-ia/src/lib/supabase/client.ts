import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Lazy singleton: el cliente real solo se crea cuando se accede por primera vez.
// Evita que createBrowserClient() se ejecute en tiempo de build (donde las env vars no existen).
let _instance: ReturnType<typeof createClient> | undefined

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop: string) {
    if (!_instance) _instance = createClient()
    const client = _instance as unknown as Record<string, unknown>
    const val = client[prop]
    return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(_instance) : val
  },
})

export default supabase
