import assert from 'node:assert/strict'
import { filtrarReservas, resumenAdmin } from './admin'
import { esAdmin } from './adminAuth'
import type { Reserva } from './types'

assert.equal(esAdmin(null), false)
assert.equal(esAdmin({ app_metadata: { role: 'admin' } }), true)
assert.equal(esAdmin({ user_metadata: { role: 'admin' } }), false)

const ahora = new Date('2026-10-17T10:00:00')
const canchas = [
  { id: 1, nombre: 'Cancha 1', precioHora: 60 },
  { id: 2, nombre: 'Cancha 2', precioHora: 80 },
]
const reservas: Reserva[] = [
  { id: 'a', canchaId: 1, fecha: '2026-10-17', inicio: 12, horas: 1, alias: 'LosPibes', celular: '911111111', estado: 'activo' },
  { id: 'b', canchaId: 2, fecha: '2026-10-18', inicio: 19, horas: 2, alias: 'Tigres', celular: '922222222', estado: 'activo' },
  { id: 'c', canchaId: 1, fecha: '2026-10-16', inicio: 19, horas: 1, alias: 'Ayer', celular: '933333333', estado: 'finalizado' },
  { id: 'd', canchaId: 2, fecha: '2026-10-17', inicio: 9, horas: 1, alias: 'Jugando', celular: '944444444', estado: 'iniciado' },
  { id: 'e', canchaId: 1, fecha: '2026-10-17', inicio: 10, horas: 1, alias: 'Ahora', celular: '966666666', estado: 'activo' },
  { id: 'f', canchaId: 1, fecha: '2026-10-16', inicio: 18, horas: 1, alias: 'Pasada', celular: '977777777', estado: 'activo' },
]

const resumen = resumenAdmin(reservas, ahora)
assert.equal(resumen.proximas, 2)
assert.equal(resumen.hoy, 1)
assert.equal('ingresos' in resumen, false)

assert.equal(filtrarReservas(reservas, { vista: 'proximas' }, canchas, ahora).length, 2)
assert.deepEqual(filtrarReservas(reservas, { vista: 'en-curso' }, canchas, ahora).map((r) => r.id), ['d', 'e'])
const mediaHora = { ...reservas[0], id: 'media-hora', inicio: 9, horas: 1.5 }
assert.equal(filtrarReservas([...reservas, mediaHora], { vista: 'en-curso' }, canchas, new Date('2026-10-17T10:29:00')).some((r) => r.id === 'media-hora'), true)
assert.equal(filtrarReservas([...reservas, mediaHora], { vista: 'en-curso' }, canchas, new Date('2026-10-17T10:30:00')).some((r) => r.id === 'media-hora'), false)
assert.deepEqual(filtrarReservas(reservas, { vista: 'por-revisar' }, canchas, ahora).map((r) => r.id), ['f'])
assert.deepEqual(filtrarReservas(reservas, { vista: 'finalizadas' }, canchas, ahora).map((r) => r.id), ['c'])
assert.equal(filtrarReservas(reservas, { vista: 'todas', fecha: '2026-10-17' }, canchas, ahora).length, 3)
assert.deepEqual(filtrarReservas(reservas, { vista: 'todas', canchaId: '2' }, canchas, ahora).map((r) => r.id), ['d', 'b'])
assert.equal(filtrarReservas(reservas, { vista: 'todas', buscar: 'tigres' }, canchas, ahora)[0].id, 'b')
const reservaCancelada: Reserva = {
  id: 'cancelada',
  canchaId: 1,
  fecha: '2026-10-18',
  inicio: 12,
  horas: 1,
  alias: 'Cancelada',
  celular: '955555555',
  estado: 'cancelado',
}
assert.equal(filtrarReservas([...reservas, reservaCancelada], { vista: 'proximas' }, canchas, ahora).some((r) => r.id === 'cancelada'), false)
assert.deepEqual(filtrarReservas([...reservas, reservaCancelada], { vista: 'canceladas' }, canchas, ahora).map((r) => r.id), ['cancelada'])
assert.deepEqual(filtrarReservas([
  { ...reservaCancelada, id: 'no-asistio', estado: 'no_asistio' },
], { vista: 'no-asistieron' }, canchas, ahora).map((r) => r.id), ['no-asistio'])
assert.equal(filtrarReservas([...reservas, reservaCancelada], { vista: 'todas' }, canchas, ahora).some((r) => r.id === 'cancelada'), true)
assert.equal(filtrarReservas([
  { id: 'd', canchaId: 1, fecha: '2026-10-18', inicio: 12, horas: 1, alias: 'David', nombre: 'David', celular: '944444444', estado: 'activo' },
], { vista: 'todas', buscar: 'david' }, canchas, ahora)[0].id, 'd')

import fs from 'node:fs'
const cardSource = fs.readFileSync(new URL('./components/admin/AdminReservaCard.tsx', import.meta.url), 'utf8')
const alarmaSource = fs.readFileSync(new URL('./components/admin/AdminAlarmaTurno.tsx', import.meta.url), 'utf8')
const adminAppSource = fs.readFileSync(new URL('./AdminApp.tsx', import.meta.url), 'utf8')

assert.match(cardSource, /Iniciar turno/)
assert.match(cardSource, /admin-iniciar/)
assert.match(alarmaSource, /eventos\?: readonly BloqueoEvento\[\]/)
assert.match(adminAppSource, /<AdminAlarmaTurno reservas=\{reservas\} canchas=\{canchas\} eventos=\{eventos\} \/>/)

// Verificación explícita de orden cronológico por hora en el panel admin (ejemplo del usuario):
// Reserva 7am a 9am (inicio: 7), Reserva 2pm a 3pm (inicio: 14), y Reserva intermedia 11am a 1pm (inicio: 11)
const r7am: Reserva = { id: 'r-7am', canchaId: 1, fecha: '2026-11-04', inicio: 7, horas: 2, alias: 'Turno Mañana', celular: '911111111', estado: 'activo' }
const r2pm: Reserva = { id: 'r-2pm', canchaId: 1, fecha: '2026-11-04', inicio: 14, horas: 1, alias: 'Turno Tarde', celular: '922222222', estado: 'activo' }
const r11am: Reserva = { id: 'r-11am', canchaId: 1, fecha: '2026-11-04', inicio: 11, horas: 2, alias: 'Turno Intermedio', celular: '933333333', estado: 'activo' }

const ordenadas = filtrarReservas([r7am, r2pm, r11am], { vista: 'todas', fecha: '2026-11-04' }, canchas, new Date('2026-11-04T05:00:00'))
assert.deepEqual(ordenadas.map((r) => r.id), ['r-7am', 'r-11am', 'r-2pm'], 'La reserva de las 11 a. m. debe ubicarse exactamente en el medio')

console.log('✔ admin.check.ts OK')
