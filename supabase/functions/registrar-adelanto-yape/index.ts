import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'

const BUCKET = 'comprobantes-pago'
const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024
const ADELANTO_YAPE = 15
const REVISION_MINUTOS = 30
const TOKEN_RE = /^[0-9a-f]{48}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IDEMPOTENCIA_RE = /^[A-Za-z0-9_-]{8,128}$/

const MIME_EXTENSION: Record<string, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ResultadoError = {
  error: 'archivo_invalido'
    | 'reserva_no_autorizada'
    | 'pago_expirado'
    | 'pago_ya_confirmado'
    | 'idempotencia_repetida'
    | 'pago_no_registrado'
    | 'configuracion_invalida'
}

interface ReservaPago {
  id: string
  token_hash: string | null
  estado: string
  pago_estado: string
  pago_expira_at: string | null
}

function respuesta(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function errorRespuesta(error: ResultadoError['error'], status: number): Response {
  return respuesta({ error }, status)
}

async function sha256Hex(valor: string | Uint8Array): Promise<string> {
  const bytes = typeof valor === 'string' ? new TextEncoder().encode(valor) : valor
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function detectarMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'image/png'
  if (
    bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp'
  return null
}

async function tokenCoincide(token: string, hashGuardado: string | null): Promise<boolean> {
  if (!hashGuardado) return false
  const hashRecibido = await sha256Hex(token)
  return hashRecibido === hashGuardado
}

function textoFormulario(formulario: FormData, nombre: string): string | null {
  const valor = formulario.get(nombre)
  return typeof valor === 'string' ? valor.trim() : null
}

function archivoValido(archivo: File | null): archivo is File {
  return Boolean(
    archivo
    && archivo.size > 0
    && archivo.size <= MAX_COMPROBANTE_BYTES
    && Object.hasOwn(MIME_EXTENSION, archivo.type),
  )
}

function esEstadoNoConfirmado(estado: string): boolean {
  return estado === 'no_requerido' || estado === 'pendiente' || estado === 'rechazado'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return errorRespuesta('archivo_invalido', 405)

  let formulario: FormData
  try {
    formulario = await request.formData()
  } catch {
    return errorRespuesta('archivo_invalido', 400)
  }

  const reservaId = textoFormulario(formulario, 'reserva_id')
  const token = textoFormulario(formulario, 'token')
  const idempotencia = textoFormulario(formulario, 'idempotencia')
  const valorArchivo = formulario.get('comprobante')
  const archivo = valorArchivo instanceof File ? valorArchivo : null

  if (
    !reservaId || !UUID_RE.test(reservaId)
    || !token || !TOKEN_RE.test(token)
    || !idempotencia || !IDEMPOTENCIA_RE.test(idempotencia)
    || !archivoValido(archivo)
  ) return errorRespuesta('archivo_invalido', 400)

  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const mimeDetectado = detectarMime(bytes)
  const mimeType = archivo.type
  if (bytes.length !== archivo.size || mimeDetectado !== mimeType) return errorRespuesta('archivo_invalido', 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return errorRespuesta('configuracion_invalida', 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: reserva, error: reservaError } = await admin
    .from('reservas')
    .select('id, token_hash, estado, pago_estado, pago_expira_at')
    .eq('id', reservaId)
    .maybeSingle()

  if (reservaError) {
    console.error('[Pago] No se pudo leer la reserva', reservaError.code ?? 'sin-codigo')
    return errorRespuesta('pago_no_registrado', 500)
  }

  const reservaPago = reserva as ReservaPago | null
  if (
    !reservaPago
    || !(await tokenCoincide(token, reservaPago.token_hash))
    || reservaPago.estado !== 'activo'
  ) {
    return errorRespuesta('reserva_no_autorizada', 403)
  }

  if (reservaPago.pago_estado === 'no_requerido') return errorRespuesta('reserva_no_autorizada', 403)

  const { data: pagoExistente, error: pagoExistenteError } = await admin
    .from('pagos_reserva')
    .select('id, reserva_id, estado')
    .eq('idempotencia', idempotencia)
    .maybeSingle()

  if (pagoExistenteError) {
    console.error('[Pago] No se pudo comprobar idempotencia', pagoExistenteError.code ?? 'sin-codigo')
    return errorRespuesta('pago_no_registrado', 500)
  }
  if (pagoExistente) {
    const { data: comprobanteExistente } = await admin
      .from('pago_comprobantes')
      .select('id, storage_path')
      .eq('pago_id', pagoExistente.id)
      .maybeSingle()
    if (comprobanteExistente && pagoExistente.reserva_id === reservaId) {
      return respuesta({ ok: true, reserva_id: reservaId, pago_id: pagoExistente.id })
    }
    if (pagoExistente.reserva_id !== reservaId) return errorRespuesta('idempotencia_repetida', 409)
  }

  if (reservaPago.pago_estado === 'confirmado') return errorRespuesta('pago_ya_confirmado', 409)
  if (reservaPago.pago_expira_at && new Date(reservaPago.pago_expira_at).getTime() <= Date.now()) {
    const { error: liberarExpiradaError } = await admin.rpc('liberar_reserva_pago_expirada', {
      p_reserva_id: reservaId,
    })
    if (liberarExpiradaError) console.error('[Pago] No se pudo liberar la reserva expirada', liberarExpiradaError.code ?? 'sin-codigo')
    return errorRespuesta('pago_expirado', 409)
  }
  if (!esEstadoNoConfirmado(reservaPago.pago_estado)) return errorRespuesta('reserva_no_autorizada', 403)

  // El plazo único comienza con el clic final de aseguramiento y cubre la
  // carga del comprobante más la revisión administrativa.
  const pagoExpiraAt = reservaPago.pago_estado === 'pendiente' && reservaPago.pago_expira_at
    ? reservaPago.pago_expira_at
    : new Date(Date.now() + REVISION_MINUTOS * 60 * 1000).toISOString()
  const { data: actualizada, error: actualizarError } = await admin
    .from('reservas')
    .update({ pago_estado: 'pendiente', pago_requerido: ADELANTO_YAPE, pago_expira_at: pagoExpiraAt })
    .eq('id', reservaId)
    .eq('estado', 'activo')
    .in('pago_estado', ['no_requerido', 'pendiente', 'rechazado'])
    .select('id')
    .maybeSingle()

  if (actualizarError || !actualizada) {
    console.error('[Pago] No se pudo iniciar el adelanto', actualizarError?.code ?? 'sin-cambio')
    return errorRespuesta('reserva_no_autorizada', 409)
  }

  let pagoId = pagoExistente?.id ?? crypto.randomUUID()
  const extension = MIME_EXTENSION[mimeType]
  const sha256 = await sha256Hex(bytes)
  let storagePath = ''
  let archivoSubido = false

  try {
    if (!pagoExistente) {
      const { error: pagoError } = await admin.from('pagos_reserva').insert({
        id: pagoId,
        reserva_id: reservaId,
        tipo: 'adelanto',
        metodo: 'yape',
        monto: ADELANTO_YAPE,
        moneda: 'PEN',
        estado: 'pendiente',
        idempotencia,
      })
      if (pagoError) {
        const { data: pagoTrasCarrera, error: lecturaCarreraError } = await admin
          .from('pagos_reserva')
          .select('id, reserva_id, estado')
          .eq('idempotencia', idempotencia)
          .maybeSingle()
        if (lecturaCarreraError || !pagoTrasCarrera || pagoTrasCarrera.reserva_id !== reservaId) throw pagoError
        pagoId = pagoTrasCarrera.id
      }
    }

    storagePath = `${reservaId}/${pagoId}.${extension}`
    const { error: subidaError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: false,
    })
    if (subidaError) {
      const { data: archivoExistente, error: lecturaArchivoError } = await admin.storage
        .from(BUCKET)
        .download(storagePath)
      if (lecturaArchivoError || !archivoExistente) throw subidaError
      const hashArchivoExistente = await sha256Hex(new Uint8Array(await archivoExistente.arrayBuffer()))
      if (hashArchivoExistente !== sha256) throw subidaError
    } else {
      archivoSubido = true
    }

    const { error: comprobanteError } = await admin.from('pago_comprobantes').insert({
      pago_id: pagoId,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: bytes.length,
      sha256,
    })
    if (comprobanteError) {
      const { data: comprobanteTrasCarrera } = await admin
        .from('pago_comprobantes')
        .select('id, storage_path')
        .eq('pago_id', pagoId)
        .maybeSingle()
      if (!comprobanteTrasCarrera) throw comprobanteError
      if (archivoSubido && comprobanteTrasCarrera.storage_path !== storagePath) {
        await admin.storage.from(BUCKET).remove([storagePath])
      }
    }
  } catch (error) {
    if (archivoSubido) await admin.storage.from(BUCKET).remove([storagePath])
    console.error('[Pago] No se pudo registrar el comprobante', error instanceof Error ? error.message : 'error-desconocido')
    return errorRespuesta('pago_no_registrado', 500)
  }

  return respuesta({ ok: true, reserva_id: reservaId, pago_id: pagoId })
})
