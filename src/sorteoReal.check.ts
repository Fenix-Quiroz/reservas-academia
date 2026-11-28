import assert from 'node:assert/strict'
import type { Reserva } from './types.js'
import { prepararSorteoReal } from './sorteoReal.js'

const reserva = (cambios: Partial<Reserva> = {}): Reserva => ({
  id: 'reserva-base',
  canchaId: 1,
  fecha: '2026-11-10',
  inicio: 19,
  horas: 1,
  alias: 'Cliente Demo',
  celular: '931283181',
  estado: 'finalizado',
  pagoEstado: 'confirmado',
  createdAt: '2026-11-10T10:00:00.000Z',
  ...cambios,
})

const reservas: Reserva[] = [
  reserva({ id: 'r-1', celular: '931283181', alias: 'Ana Rojas', createdAt: '2026-11-10T10:00:00.000Z' }),
  reserva({ id: 'r-2', celular: '931283181', alias: 'Ana Rojas', createdAt: '2026-11-11T10:00:00.000Z' }),
  reserva({ id: 'r-3', celular: '900000000', alias: 'Luis Perez', createdAt: '2026-11-12T10:00:00.000Z' }),
  reserva({ id: 'r-pendiente', estado: 'finalizado', pagoEstado: 'pendiente', createdAt: '2026-11-13T10:00:00.000Z' }),
  reserva({ id: 'r-activa', estado: 'activo', createdAt: '2026-11-14T10:00:00.000Z' }),
  reserva({ id: 'r-anterior', createdAt: '2026-11-05T10:00:00.000Z' }),
]

const primerSorteo = prepararSorteoReal(
  reservas,
  null,
  '2026-11-12T23:59:59.999Z',
)

assert.deepEqual(primerSorteo.tickets.map((ticket) => ticket.id), ['r-anterior', 'r-1', 'r-2', 'r-3'])
assert.equal(primerSorteo.tickets.length, 4)
assert.equal(primerSorteo.participantes.length, 2)
assert.deepEqual(primerSorteo.participantes.map((participante) => participante.cliente.nombre), ['Ana Rojas', 'Luis Perez'])
assert.deepEqual(primerSorteo.participantes.map((participante) => participante.tickets), [3, 1])
assert.equal(primerSorteo.participantes.find((participante) => participante.cliente.celular === '931283181')?.tickets, 3)
assert.equal(primerSorteo.participantes.find((participante) => participante.cliente.celular === '900000000')?.tickets, 1)
assert.equal(primerSorteo.tickets.every((ticket) => ticket.totalTickets >= 1), true)

const segundoSorteo = prepararSorteoReal(
  reservas,
  '2026-11-12T23:59:59.999Z',
  '2026-11-15T23:59:59.999Z',
)

assert.deepEqual(segundoSorteo.tickets.map((ticket) => ticket.id), [])

const reservaConCliente = (clienteId: string, cambios: Partial<Reserva> = {}): Reserva => Object.assign(
  reserva(cambios),
  { clienteId },
)
const reservaConCelularActualizado = prepararSorteoReal([
  reservaConCliente('cliente-estable', { id: 'cliente-r1', celular: '911111111', createdAt: '2026-11-10T10:00:00.000Z' }),
  reservaConCliente('cliente-estable', { id: 'cliente-r2', celular: '922222222', createdAt: '2026-11-11T10:00:00.000Z' }),
], null, '2026-11-12T23:59:59.999Z')

assert.equal(reservaConCelularActualizado.participantes.length, 1)
assert.equal(reservaConCelularActualizado.participantes[0]?.tickets, 2)
assert.equal(reservaConCelularActualizado.participantes[0]?.cliente.id, 'cliente-cliente-estable')
assert.equal(new Set(reservaConCelularActualizado.tickets.map((ticket) => ticket.clienteId)).size, 1)

console.log('✔ sorteoReal.check.ts OK')
