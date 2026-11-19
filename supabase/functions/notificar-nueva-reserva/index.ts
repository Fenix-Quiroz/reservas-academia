import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const TITULO_NOTIFICACION = 'Nueva reserva recibida'
const CUERPO_NOTIFICACION = 'Ingresa al panel para revisar el comprobante.'
const URL_NOTIFICACION = '/admin'
const TIEMPO_MAXIMO_ENVIO_MS = 5000

interface WebhookPayload {
  type: unknown
  table: unknown
  schema: unknown
  record: { id?: unknown } | null
}

interface SuscripcionPush {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  vapid_public_key: string | null
}

type ResultadoEnvio = 'enviado' | 'omitido' | 'eliminado' | 'fallido'

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function esEventoReserva(valor: unknown): valor is WebhookPayload {
  if (!esObjeto(valor)) return false
  const record = valor.record
  return valor.type === 'INSERT'
    && valor.table === 'reservas'
    && valor.schema === 'public'
    && esObjeto(record)
    && typeof record.id === 'string'
}

function codigoError(error: unknown): number | null {
  if (!esObjeto(error) || !('statusCode' in error)) return null
  const valor = error.statusCode
  return typeof valor === 'number' ? valor : null
}

function endpointPermitido(endpoint: string): boolean {
  try {
    const host = new URL(endpoint).hostname
    return host === 'fcm.googleapis.com'
      || host === 'web.push.apple.com'
      || host.endsWith('.push.services.mozilla.com')
      || host.endsWith('.notify.windows.com')
  } catch {
    return false
  }
}

async function conTiempoLimite<T>(promesa: Promise<T>, milisegundos: number): Promise<T> {
  let temporizador: number | undefined
  try {
    return await Promise.race([
      promesa,
      new Promise<T>((_, reject) => {
        temporizador = setTimeout(() => reject(new Error('push_timeout')), milisegundos)
      }),
    ])
  } finally {
    if (temporizador !== undefined) clearTimeout(temporizador)
  }
}

async function borrarSuscripcion(supabase: ReturnType<typeof createClient>, id: string): Promise<void> {
  const { error } = await supabase.from('admin_push_subscriptions').delete().eq('id', id)
  if (error) console.error('No se pudo borrar la suscripción push.', { subscriptionId: id })
}

async function procesarSuscripcion(
  supabase: ReturnType<typeof createClient>,
  reservaId: string,
  suscripcion: SuscripcionPush,
  vapidPublicKey: string,
  mensaje: string,
): Promise<ResultadoEnvio> {
  if (suscripcion.vapid_public_key !== vapidPublicKey || !endpointPermitido(suscripcion.endpoint)) {
    await borrarSuscripcion(supabase, suscripcion.id)
    return 'eliminado'
  }

  const { data: reclamada, error: errorReclamo } = await supabase.rpc('reclamar_entrega_push', {
    p_reserva_id: reservaId,
    p_subscription_id: suscripcion.id,
  })
  if (errorReclamo) {
    console.error('No se pudo reclamar una entrega push.', { subscriptionId: suscripcion.id })
    return 'fallido'
  }
  if (reclamada !== true) return 'omitido'

  try {
    await conTiempoLimite(webpush.sendNotification({
      endpoint: suscripcion.endpoint,
      keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
    }, mensaje), TIEMPO_MAXIMO_ENVIO_MS)

    const { error: errorMarcado } = await supabase
      .from('admin_push_deliveries')
      .update({ estado: 'enviado', enviado_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('reserva_id', reservaId)
      .eq('subscription_id', suscripcion.id)
    if (errorMarcado) console.error('No se pudo marcar la entrega push.', { subscriptionId: suscripcion.id })
    return 'enviado'
  } catch (error) {
    const codigo = codigoError(error)
    if (codigo === 404 || codigo === 410) {
      await borrarSuscripcion(supabase, suscripcion.id)
      return 'eliminado'
    }

    await supabase
      .from('admin_push_deliveries')
      .delete()
      .eq('reserva_id', reservaId)
      .eq('subscription_id', suscripcion.id)
    console.error('Falló el envío de una notificación push.', { subscriptionId: suscripcion.id, codigo })
    return 'fallido'
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const secreto = Deno.env.get('NOTIFICACIONES_WEBHOOK_SECRET')
  if (!secreto || request.headers.get('x-notificaciones-secret') !== secreto) {
    return json({ error: 'unauthorized' }, 401)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  if (!esEventoReserva(payload)) return json({ ok: true, ignored: true }, 202)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!supabaseUrl || !serviceRoleKey || !vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    console.error('Faltan secretos para enviar notificaciones Web Push.')
    return json({ error: 'push_not_configured' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data: suscripciones, error: errorLectura } = await supabase
    .rpc('obtener_suscripciones_push_admin')

  if (errorLectura) {
    console.error('No se pudieron leer las suscripciones push.')
    return json({ error: 'subscriptions_unavailable' }, 500)
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  } catch {
    console.error('Las claves VAPID no son válidas.')
    return json({ error: 'vapid_invalid' }, 500)
  }

  const mensaje = JSON.stringify({
    title: TITULO_NOTIFICACION,
    body: CUERPO_NOTIFICACION,
    url: URL_NOTIFICACION,
  })
  const resultados = await Promise.allSettled(
    ((suscripciones ?? []) as SuscripcionPush[]).map((suscripcion) => procesarSuscripcion(
      supabase,
      payload.record?.id as string,
      suscripcion,
      vapidPublicKey,
      mensaje,
    )),
  )
  const resumen = { enviados: 0, omitidos: 0, eliminados: 0, fallidos: 0 }
  for (const resultado of resultados) {
    const estado: ResultadoEnvio = resultado.status === 'fulfilled' ? resultado.value : 'fallido'
    resumen[`${estado}s` as keyof typeof resumen] += 1
  }

  return json({ ok: resumen.fallidos === 0, total: resultados.length, ...resumen }, resumen.fallidos === 0 ? 200 : 500)
})
