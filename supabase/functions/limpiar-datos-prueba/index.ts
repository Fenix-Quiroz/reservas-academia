import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'

const BUCKET = 'comprobantes-pago'
const TAMANO_LOTE = 100
const UUID_VACIO = '00000000-0000-0000-0000-000000000000'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ResultadoLimpieza = {
  ok: true
  eliminados: Record<string, number>
}

function respuesta(payload: ResultadoLimpieza | { error: string }, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function lotes<T>(valores: T[], tamano: number): T[][] {
  const resultado: T[][] = []
  for (let inicio = 0; inicio < valores.length; inicio += tamano) {
    resultado.push(valores.slice(inicio, inicio + tamano))
  }
  return resultado
}

async function borrarTabla(
  admin: SupabaseClient,
  tabla: string,
  columna: string,
  valorDistinto: string,
): Promise<number> {
  const { count, error } = await admin
    .from(tabla)
    .delete({ count: 'exact' })
    .neq(columna, valorDistinto)
  if (error) throw error
  return count ?? 0
}

async function rutasDelBucket(admin: SupabaseClient): Promise<string[]> {
  const almacenamiento = admin.storage.from(BUCKET)
  const { data: entradas, error: errorRaiz } = await almacenamiento.list('', { limit: 1000 })
  if (errorRaiz) throw errorRaiz

  const rutas: string[] = []
  for (const entrada of entradas ?? []) {
    if (entrada.id) {
      rutas.push(entrada.name)
      continue
    }

    const { data: archivos, error: errorCarpeta } = await almacenamiento.list(entrada.name, { limit: 1000 })
    if (errorCarpeta) throw errorCarpeta
    for (const archivo of archivos ?? []) {
      if (archivo.id) rutas.push(`${entrada.name}/${archivo.name}`)
    }
  }
  return rutas
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return respuesta({ error: 'metodo_no_permitido' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return respuesta({ error: 'configuracion_invalida' }, 500)

  const authorization = request.headers.get('Authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  if (!token) return respuesta({ error: 'no_autorizado' }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: usuario, error: errorUsuario } = await admin.auth.getUser(token)
  if (errorUsuario || usuario.user?.app_metadata?.role !== 'admin') {
    return respuesta({ error: 'no_autorizado' }, 403)
  }

  try {
    const rutas = await rutasDelBucket(admin)

    for (const lote of lotes(rutas, TAMANO_LOTE)) {
      const { error } = await admin.storage.from(BUCKET).remove(lote)
      if (error) throw error
    }

    const eliminados: Record<string, number> = {}
    eliminados.pago_comprobantes = await borrarTabla(admin, 'pago_comprobantes', 'id', UUID_VACIO)
    eliminados.pagos_reserva = await borrarTabla(admin, 'pagos_reserva', 'id', UUID_VACIO)
    eliminados.reservas = await borrarTabla(admin, 'reservas', 'id', UUID_VACIO)
    eliminados.clientes = await borrarTabla(admin, 'clientes', 'id', UUID_VACIO)
    eliminados.bloqueos_eventos = await borrarTabla(admin, 'bloqueos_eventos', 'id', UUID_VACIO)
    eliminados.numeros_bloqueados = await borrarTabla(admin, 'numeros_bloqueados', 'celular', '__ninguno__')
    eliminados.numeros_confiables = await borrarTabla(admin, 'numeros_confiables', 'celular', '__ninguno__')
    eliminados.reserva_rate_limits = await borrarTabla(admin, 'reserva_rate_limits', 'celular_hash', '__ninguno__')

    return respuesta({ ok: true, eliminados })
  } catch (error) {
    console.error('[limpiar-datos-prueba]', error)
    return respuesta({ error: 'limpieza_fallida' }, 500)
  }
})
