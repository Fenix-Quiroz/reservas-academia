import assert from 'node:assert/strict'
import fs from 'node:fs'
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

const notificacionesPush = fs.readFileSync(new URL('./notificacionesPush.ts', import.meta.url), 'utf8')
const adminNotificaciones = fs.readFileSync(new URL('./components/admin/AdminNotificaciones.tsx', import.meta.url), 'utf8')
const serviceWorker = fs.readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8')
const adminApp = fs.readFileSync(new URL('./AdminApp.tsx', import.meta.url), 'utf8')
const adminCabecera = fs.readFileSync(new URL('./components/admin/AdminCabecera.tsx', import.meta.url), 'utf8')

assert.match(notificacionesPush, /serviceWorker\.register\(['"]\/service-worker\.js['"]/)
assert.match(notificacionesPush, /Notification\.requestPermission\(\)/)
assert.match(notificacionesPush, /admin_push_subscriptions/)
assert.match(adminNotificaciones, /ETIQUETA_BOTON_ACTIVAR_NOTIFICACIONES/)
assert.match(adminNotificaciones, /aria-live|role=/)
assert.match(adminApp, /AdminNotificaciones|AdminCabecera/)
assert.match(adminCabecera, /AdminNotificaciones|onNotificaciones|notificaciones/)
assert.match(serviceWorker, /addEventListener\(['"]push['"]|addEventListener\(['"]push['"]/) 
assert.match(serviceWorker, /addEventListener\(['"]notificationclick['"]|addEventListener\(['"]notificationclick['"]/) 
assert.match(serviceWorker, /\/admin/)

console.log('✔ notificacionesPush.check.ts OK')
