import assert from 'node:assert/strict'
import {
  CUERPO_NOTIFICACION_NUEVA_RESERVA,
  ETIQUETA_BOTON_ACTIVAR_NOTIFICACIONES,
  TITULO_NOTIFICACION_NUEVA_RESERVA,
  convertirClavePublicaVapid,
  estadoNotificacionesPush,
} from './notificacionesPush'

const claveValida = Uint8Array.from({ length: 65 }, (_, indice) => indice)
const claveValidaBase64 = Buffer.from(claveValida).toString('base64url')
assert.deepEqual(Array.from(convertirClavePublicaVapid(claveValidaBase64)), Array.from(claveValida))
assert.throws(() => convertirClavePublicaVapid(''))
assert.throws(() => convertirClavePublicaVapid('no-es-base64-url!'))

assert.equal(estadoNotificacionesPush('unsupported', false, true), 'no-disponibles')
assert.equal(estadoNotificacionesPush('default', false, false), 'sin-configurar')
assert.equal(estadoNotificacionesPush('default', false, true), 'requiere-permiso')
assert.equal(estadoNotificacionesPush('denied', false, true), 'bloqueadas')
assert.equal(estadoNotificacionesPush('granted', true, true), 'activadas')
assert.equal(estadoNotificacionesPush('granted', false, true), 'requiere-permiso')

assert.equal(ETIQUETA_BOTON_ACTIVAR_NOTIFICACIONES, '🔔 Activar notificaciones')
assert.equal(TITULO_NOTIFICACION_NUEVA_RESERVA, 'Nueva reserva recibida')
assert.equal(CUERPO_NOTIFICACION_NUEVA_RESERVA, 'Ingresa al panel para revisar el comprobante.')

console.log('✔ notificacionesPush.check.ts OK')
