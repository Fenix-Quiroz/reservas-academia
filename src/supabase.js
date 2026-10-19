import { createClient } from '@supabase/supabase-js'

const env = import.meta.env ?? {}

export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
export const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

export const supabase = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null
