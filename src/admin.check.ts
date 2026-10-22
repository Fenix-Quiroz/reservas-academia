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
]

const resumen = resumenAdmin(reservas, ahora)
assert.equal(resumen.proximas, 2)
assert.equal(resumen.hoy, 1)
assert.equal('ingresos' in resumen, false)

assert.equal(filtrarReservas(reservas, { vista: 'proximas' }, canchas, ahora).length, 2)
assert.equal(filtrarReservas(reservas, { vista: 'todas', fecha: '2026-10-17' }, canchas, ahora).length, 1)
assert.equal(filtrarReservas(reservas, { vista: 'todas', canchaId: '2' }, canchas, ahora)[0].id, 'b')
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
assert.equal(filtrarReservas([...reservas, reservaCancelada], { vista: 'todas' }, canchas, ahora).some((r) => r.id === 'cancelada'), true)
assert.equal(filtrarReservas([
  { id: 'd', canchaId: 1, fecha: '2026-10-18', inicio: 12, horas: 1, alias: 'David', nombre: 'David', celular: '944444444', estado: 'activo' },
], { vista: 'todas', buscar: 'david' }, canchas, ahora)[0].id, 'd')

console.log('✔ admin.check.ts OK')
