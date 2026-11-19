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
