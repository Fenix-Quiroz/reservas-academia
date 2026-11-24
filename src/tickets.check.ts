import assert from 'node:assert/strict'
import type { Reserva } from './types.js'
import { contarTickets, esTicket } from './tickets.js'

const base = (cambios: Partial<Reserva> = {}): Reserva => ({
  id: 'reserva-base',
  canchaId: 1,
  fecha: '2026-01-01',
  inicio: 7,
  horas: 1,
  alias: 'Fenix',
  celular: '931283181',
  estado: 'activo',
  ...cambios,
})

assert.equal(esTicket(base({ estado: 'finalizado', pagoEstado: 'confirmado' })), true)
assert.equal(esTicket(base({ estado: 'finalizado', pagoEstado: 'no_requerido' })), true)
assert.equal(esTicket(base({ estado: 'finalizado', pagoEstado: 'pendiente' })), false)
assert.equal(esTicket(base({ estado: 'finalizado', pagoEstado: 'rechazado' })), false)
assert.equal(esTicket(base({ estado: 'activo', pagoEstado: 'confirmado' })), false)
assert.equal(esTicket(base({ estado: 'iniciado', pagoEstado: 'confirmado' })), false)
assert.equal(esTicket(base({ estado: 'cancelado', pagoEstado: 'confirmado' })), false)
assert.equal(esTicket(base({ estado: 'no_asistio', pagoEstado: 'confirmado' })), false)

const reservas: Reserva[] = [
  base({ id: 'valida-1', estado: 'finalizado', pagoEstado: 'confirmado' }),
  base({ id: 'valida-2', estado: 'finalizado', pagoEstado: 'no_requerido' }),
  base({ id: 'valida-3', estado: 'finalizado', pagoEstado: 'confirmado' }),
  base({ id: 'pendiente', estado: 'finalizado', pagoEstado: 'pendiente' }),
  base({ id: 'rechazada', estado: 'finalizado', pagoEstado: 'rechazado' }),
  base({ id: 'otro-cliente', celular: '900000000', estado: 'finalizado', pagoEstado: 'confirmado' }),
]

assert.equal(contarTickets(reservas, '931283181'), 3)
assert.equal(contarTickets(reservas, '900000000'), 1)
assert.equal(contarTickets(reservas, '999999999'), 0)

console.log('✔ tickets.check.ts OK')
