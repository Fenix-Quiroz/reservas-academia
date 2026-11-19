import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const TITULO_NOTIFICACION = 'Nueva reserva recibida'
const CUERPO_NOTIFICACION = 'Ingresa al panel para revisar el comprobante.'
const URL_NOTIFICACION = '/admin'

interface WebhookPayload {
  type?: unknown
  table?: unknown
  record?: { id?: unknown } | null
}

interface SuscripcionPush {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function codigoError(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return null
  const valor = error.statusCode
  return typeof valor === 'number' ? valor : null
}

function esEventoReserva(payload: WebhookPayload): boolean {
  return payload.type === 'INSERT'
    && payload.table === 'reservas'
    && typeof payload.record?.id === 'string'
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const secreto = Deno.env.get('NOTIFICACIONES_WEBHOOK_SECRET')
  if (!secreto || request.headers.get('x-notificaciones-secret') !== secreto) {
    return json({ error: 'unauthorized' }, 401)
  }

  let payload: WebhookPayload
  try {
    payload = await request.json() as WebhookPayload
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
    .from('admin_push_subscriptions')
    .select('id, endpoint, p256dh, auth')

  if (errorLectura) {
    console.error('No se pudieron leer las suscripciones push.', errorLectura)
    return json({ error: 'subscriptions_unavailable' }, 500)
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  } catch (error) {
    console.error('Las claves VAPID no son válidas.', error)
    return json({ error: 'vapid_invalid' }, 500)
  }

  const mensaje = JSON.stringify({
    title: TITULO_NOTIFICACION,
    body: CUERPO_NOTIFICACION,
    url: URL_NOTIFICACION,
  })
  let enviados = 0
  let eliminados = 0

  for (const suscripcion of (suscripciones ?? []) as SuscripcionPush[]) {
    try {
      await webpush.sendNotification({
        endpoint: suscripcion.endpoint,
        keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
      }, mensaje)
      enviados += 1
    } catch (error) {
      const codigo = codigoError(error)
      if (codigo === 404 || codigo === 410) {
        const { error: errorBorrado } = await supabase
          .from('admin_push_subscriptions')
          .delete()
          .eq('id', suscripcion.id)
        if (errorBorrado) console.error('No se pudo borrar una suscripción vencida.', errorBorrado)
        else eliminados += 1
      } else {
        console.error('Falló el envío de una notificación push.', error)
      }
    }
  }

  return json({ ok: true, enviados, eliminados, total: suscripciones?.length ?? 0 })
})
