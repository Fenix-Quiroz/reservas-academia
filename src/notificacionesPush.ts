import { supabase, supabaseConfigurado } from './supabase'

export const ETIQUETA_BOTON_ACTIVAR_NOTIFICACIONES = '🔔 Activar notificaciones'
export const TITULO_NOTIFICACION_NUEVA_RESERVA = 'Nueva reserva recibida'
export const CUERPO_NOTIFICACION_NUEVA_RESERVA = 'Ingresa al panel para revisar el comprobante.'

export type PermisoNotificaciones = NotificationPermission | 'unsupported'

export type EstadoNotificacionesPush =
  | 'activadas'
  | 'requiere-permiso'
  | 'bloqueadas'
  | 'sin-configurar'
  | 'no-disponibles'
  | 'error'

export type ResultadoActivarNotificaciones =
  | { ok: true; estado: 'activadas' }
  | { ok: false; estado: Exclude<EstadoNotificacionesPush, 'activadas'>; mensaje: string }

const VAPID_PUBLIC_KEY = typeof import.meta.env?.VITE_VAPID_PUBLIC_KEY === 'string'
  ? import.meta.env.VITE_VAPID_PUBLIC_KEY.trim()
  : ''

const mensajesEstado: Record<Exclude<EstadoNotificacionesPush, 'error'>, string> = {
  activadas: 'Las notificaciones están activadas en este celular.',
  'requiere-permiso': 'Activa las notificaciones para recibir avisos de nuevas reservas.',
  bloqueadas: 'Las notificaciones están bloqueadas. Permítelas en la configuración de Chrome.',
  'sin-configurar': 'Las notificaciones todavía no están configuradas para este sistema.',
  'no-disponibles': 'Este navegador no permite notificaciones push.',
}

function decodificarBase64Url(valor: string): Uint8Array {
  if (!valor || !/^[A-Za-z0-9_-]+$/.test(valor) || valor.length % 4 === 1) {
    throw new Error('clave-vapid-invalida')
  }

  const base64 = `${valor.replace(/-/g, '+').replace(/_/g, '/')}${'='.repeat((4 - (valor.length % 4)) % 4)}`
  let binario: string
  try {
    binario = atob(base64)
  } catch {
    throw new Error('clave-vapid-invalida')
  }

  return Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0))
}

export function convertirClavePublicaVapid(valor: string): Uint8Array {
  const clave = decodificarBase64Url(valor)
  if (clave.byteLength !== 65) throw new Error('clave-vapid-invalida')
  return clave
}

export function estadoNotificacionesPush(
  permiso: PermisoNotificaciones,
  suscripcionActiva: boolean,
  configurado: boolean,
): EstadoNotificacionesPush {
  if (!configurado) return 'sin-configurar'
  if (permiso === 'unsupported') return 'no-disponibles'
  if (permiso === 'denied') return 'bloqueadas'
  if (permiso === 'granted' && suscripcionActiva) return 'activadas'
  return 'requiere-permiso'
}

export function mensajeEstadoNotificaciones(estado: EstadoNotificacionesPush): string {
  return estado === 'error'
    ? 'No pudimos configurar las notificaciones. Inténtalo de nuevo.'
    : mensajesEstado[estado]
}

function soportaNotificacionesPush(): boolean {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

function codificarBase64Url(valor: ArrayBuffer): string {
  const bytes = new Uint8Array(valor)
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function resultadoFallido(estado: Exclude<EstadoNotificacionesPush, 'activadas'>): ResultadoActivarNotificaciones {
  return { ok: false, estado, mensaje: mensajeEstadoNotificaciones(estado) }
}

async function suscripcionRegistrada(usuarioId: string, endpoint: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase
    .from('admin_push_subscriptions')
    .select('id')
    .eq('user_id', usuarioId)
    .eq('endpoint', endpoint)
    .eq('vapid_public_key', VAPID_PUBLIC_KEY)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function leerEstadoNotificacionesPush(): Promise<EstadoNotificacionesPush> {
  if (!supabaseConfigurado || !supabase) return 'sin-configurar'
  if (!soportaNotificacionesPush()) return 'no-disponibles'
  if (!VAPID_PUBLIC_KEY) return 'sin-configurar'

  try {
    if (Notification.permission !== 'granted') {
      return estadoNotificacionesPush(Notification.permission, false, true)
    }
    const { data: usuario, error: errorUsuario } = await supabase.auth.getUser()
    if (errorUsuario || !usuario.user) return 'error'
    const registration = await navigator.serviceWorker.getRegistration('/service-worker.js')
    const subscription = await registration?.pushManager.getSubscription()
    const registrada = subscription
      ? await suscripcionRegistrada(usuario.user.id, subscription.endpoint)
      : false
    return estadoNotificacionesPush('granted', registrada, true)
  } catch {
    return 'error'
  }
}

export async function activarNotificacionesPush(): Promise<ResultadoActivarNotificaciones> {
  if (!supabaseConfigurado || !supabase) return resultadoFallido('sin-configurar')
  if (!soportaNotificacionesPush()) return resultadoFallido('no-disponibles')
  if (!VAPID_PUBLIC_KEY) return resultadoFallido('sin-configurar')
  if (Notification.permission === 'denied') return resultadoFallido('bloqueadas')

  try {
    const permiso = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()
    if (permiso !== 'granted') {
      return resultadoFallido(permiso === 'denied' ? 'bloqueadas' : 'requiere-permiso')
    }

    const { data: usuario, error: errorUsuario } = await supabase.auth.getUser()
    if (errorUsuario || !usuario.user) return resultadoFallido('error')

    await navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (subscription && !(await suscripcionRegistrada(usuario.user.id, subscription.endpoint))) {
      await subscription.unsubscribe()
      subscription = null
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertirClavePublicaVapid(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })
    }

    const p256dh = subscription.getKey('p256dh')
    const auth = subscription.getKey('auth')
    if (!p256dh || !auth) return resultadoFallido('error')

    const { error } = await supabase.from('admin_push_subscriptions').upsert({
      user_id: usuario.user.id,
      endpoint: subscription.endpoint,
      p256dh: codificarBase64Url(p256dh),
      auth: codificarBase64Url(auth),
      vapid_public_key: VAPID_PUBLIC_KEY,
      user_agent: navigator.userAgent,
    }, { onConflict: 'endpoint' })
    if (error) return resultadoFallido('error')

    return { ok: true, estado: 'activadas' }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') return resultadoFallido('bloqueadas')
    return resultadoFallido('error')
  }
}
