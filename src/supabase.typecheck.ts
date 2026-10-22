import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  supabase,
  supabaseConfigurado,
} from './supabase.js'

const url: string = SUPABASE_URL
const key: string = SUPABASE_PUBLISHABLE_KEY
const configurado: boolean = supabaseConfigurado
const cliente: SupabaseClient | null = supabase

void [url, key, configurado, cliente]
