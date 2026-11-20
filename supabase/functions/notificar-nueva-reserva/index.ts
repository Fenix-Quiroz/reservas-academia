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

type ResultadoEnvio = 'enviado' | 'omitido' | 'eliminado' | 'fallido' | 'incierto'

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

function esTimeout(error: unknown): boolean {
  return error instanceof Error && /timeout|timed out/i.test(error.message)
}

function endpointPermitido(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    const host = url.hostname
    return url.protocol === 'https:' && (host === 'fcm.googleapis.com'
      || host === 'web.push.apple.com'
      || host === 'push.services.mozilla.com'
      || host.endsWith('.push.services.mozilla.com')
      || host === 'notify.windows.com'
      || host.endsWith('.notify.windows.com'))
  } catch {
    return false
  }
}

async function borrarSuscripcion(supabase: ReturnType<typeof createClient>, id: string): Promise<boolean> {
  const { error } = await supabase.from('admin_push_subscriptions').delete().eq('id', id)
  if (error) {
    console.error('No se pudo borrar la suscripción push.', { subscriptionId: id })
    return false
  }
  return true
}

async function reprogramarEvento(
  supabase: ReturnType<typeof createClient>,
  reservaId: string,
  intentoId: string,
  error: string,
): Promise<void> {
  const { error: errorReprogramacion } = await supabase.rpc('reprogramar_evento_push', {
    p_reserva_id: reservaId,
    p_intento_id: intentoId,
    p_error: error,
  })
  if (errorReprogramacion) console.error('No se pudo reprogramar el evento push.', { reservaId })
}

async function marcarEventoIncierto(
  supabase: ReturnType<typeof createClient>,
  reservaId: string,
  intentoId: string,
  motivo: string,
): Promise<void> {
  const { error } = await supabase.rpc('marcar_evento_push_incierto', {
    p_reserva_id: reservaId,
    p_intento_id: intentoId,
    p_error: motivo,
  })
  if (error) console.error('No se pudo conservar el evento push incierto.', { reservaId })
}

async function marcarEntregaIncierta(
  supabase: ReturnType<typeof createClient>,
  reservaId: string,
  subscriptionId: string,
  intentoId: string,
): Promise<void> {
  const { error } = await supabase
    .from('admin_push_deliveries')
    .update({ estado: 'incierto', updated_at: new Date().toISOString() })
    .eq('reserva_id', reservaId)
    .eq('subscription_id', subscriptionId)
    .eq('intento_id', intentoId)
    .eq('estado', 'enviando')
  if (error) console.error('No se pudo conservar la entrega push incierta.', { subscriptionId })
}

async function procesarSuscripcion(
  supabase: ReturnType<typeof createClient>,
  reservaId: string,
  suscripcion: SuscripcionPush,
  vapidPublicKey: string,
  mensaje: string,
): Promise<ResultadoEnvio> {
  if (suscripcion.vapid_public_key !== vapidPublicKey || !endpointPermitido(suscripcion.endpoint)) {
    return (await borrarSuscripcion(supabase, suscripcion.id)) ? 'eliminado' : 'fallido'
  }

  const { data: reclamada, error: errorReclamo } = await supabase.rpc('reclamar_entrega_push', {
    p_reserva_id: reservaId,
    p_subscription_id: suscripcion.id,
  })
  if (errorReclamo) {
    console.error('No se pudo reclamar una entrega push.', { subscriptionId: suscripcion.id })
    return 'fallido'
  }
  if (reclamada === 'incierta') return 'incierto'
  if (reclamada === 'enviada') return 'omitido'
  if (typeof reclamada !== 'string' || !reclamada) return 'fallido'
  const intentoId = reclamada

  try {
    await webpush.sendNotification({
      endpoint: suscripcion.endpoint,
      keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
    }, mensaje, { timeout: TIEMPO_MAXIMO_ENVIO_MS, TTL: 60, urgency: 'high' })

    const { data: dataMarcada, error: errorMarcado } = await supabase
      .from('admin_push_deliveries')
      .update({ estado: 'enviado', enviado_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('reserva_id', reservaId)
      .eq('subscription_id', suscripcion.id)
      .eq('intento_id', intentoId)
      .select('subscription_id')
    if (!errorMarcado && dataMarcada?.length === 1) return 'enviado'

    await marcarEntregaIncierta(supabase, reservaId, suscripcion.id, intentoId)
    console.error('No se pudo confirmar la entrega push después del envío.', { subscriptionId: suscripcion.id })
    return 'incierto'
  } catch (error) {
    const codigo = codigoError(error)
    if (codigo === 404 || codigo === 410) {
      return (await borrarSuscripcion(supabase, suscripcion.id)) ? 'eliminado' : 'fallido'
    }
    await marcarEntregaIncierta(supabase, reservaId, suscripcion.id, intentoId)
    if (esTimeout(error)) {
      console.error('El envío push quedó incierto por timeout.', { subscriptionId: suscripcion.id })
      return 'incierto'
    }

    console.error('El envío push quedó incierto por una respuesta del proveedor.', { subscriptionId: suscripcion.id, codigo })
    return 'incierto'
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
  const { data: intento, error: errorReclamo } = await supabase.rpc('reclamar_evento_push', {
    p_reserva_id: payload.record.id as string,
  })
  if (errorReclamo) {
    console.error('No se pudo reclamar el evento push.')
    return json({ error: 'event_unavailable' }, 500)
  }
  if (intento === 'enviado' || intento === 'ocupado' || intento === 'incierto') return json({ ok: true, ignored: true }, 202)
  if (typeof intento !== 'string' || !intento) return json({ error: 'event_unavailable' }, 500)
  const intentoId = intento

  const { data: suscripciones, error: errorLectura } = await supabase
    .rpc('obtener_suscripciones_push_admin')

  if (errorLectura) {
    await reprogramarEvento(supabase, payload.record.id as string, intentoId, 'subscriptions_unavailable')
    console.error('No se pudieron leer las suscripciones push.')
    return json({ error: 'subscriptions_unavailable' }, 500)
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  } catch {
    await reprogramarEvento(supabase, payload.record.id as string, intentoId, 'vapid_invalid')
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
  const resumen = { enviados: 0, omitidos: 0, eliminados: 0, fallidos: 0, inciertos: 0 }
  for (const resultado of resultados) {
    const estado: ResultadoEnvio = resultado.status === 'fulfilled' ? resultado.value : 'fallido'
    resumen[`${estado}s` as keyof typeof resumen] += 1
  }

  if (resumen.inciertos > 0) {
    await marcarEventoIncierto(supabase, payload.record.id as string, intentoId, 'push_delivery_incierta')
    return json({ ok: false, total: resultados.length, ...resumen, uncertain: true }, 202)
  }

  if (resumen.fallidos > 0) {
    await reprogramarEvento(supabase, payload.record.id as string, intentoId, 'push_delivery_failed')
    return json({ ok: false, total: resultados.length, ...resumen }, 500)
  }

  const { error: errorMarcado } = await supabase.rpc('marcar_evento_push_enviado', {
    p_reserva_id: payload.record.id as string,
    p_intento_id: intentoId,
  })
  if (errorMarcado) {
    console.error('No se pudo marcar el evento push como enviado.')
    return json({ error: 'event_update_failed' }, 500)
  }

  return json({ ok: true, total: resultados.length, ...resumen })
})
