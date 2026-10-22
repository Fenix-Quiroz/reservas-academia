import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = import.meta.env ?? {}

export const SUPABASE_URL: string = (env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
export const SUPABASE_PUBLISHABLE_KEY: string = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
export const supabaseConfigurado: boolean = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null
