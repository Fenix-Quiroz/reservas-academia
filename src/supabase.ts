import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = import.meta.env ?? {}

export const SUPABASE_URL: string = (env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
export const SUPABASE_PUBLISHABLE_KEY: string = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
export const supabaseConfigurado: boolean = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)
export const supabaseFaltaEnProduccion: boolean = Boolean(env.PROD && !supabaseConfigurado)

const fetchSupabase: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers)
  if (!headers.has('apikey')) headers.set('apikey', SUPABASE_PUBLISHABLE_KEY)

  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  if (import.meta.env.DEV) {
    console.info('[Supabase request]', { url, hasApiKey: headers.has('apikey') })
  }

  const response = await fetch(input, { ...init, headers })
  if (import.meta.env.DEV && url.includes('/rest/v1/')) {
    console.info('[Supabase response]', { url, status: response.status })
  }
  return response
}

const opcionesGlobales = {
  // supabase-js normalmente añade esta cabecera en su fetch interno.
  // La declaramos también aquí para que PostgREST la reciba incluso si
  // el navegador conserva un bundle antiguo durante el desarrollo.
  global: {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
    fetch: fetchSupabase,
  },
}

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    ...opcionesGlobales,
  })
  : null

// La vista pública usa RPC y no necesita iniciar sesión. Separar este cliente
// evita que reutilice un access token viejo guardado por el panel administrador.
export const supabasePublic: SupabaseClient | null = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    ...opcionesGlobales,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  : null
