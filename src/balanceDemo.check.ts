import assert from 'node:assert/strict'
import reservasDemoJson from './data/reservasBalanceDemo.json'
import { construirBalanceMensual } from './balanceMensual.js'
import type { Campo, Reserva } from './types.js'

const canchas: Campo[] = [
  { id: 1, nombre: 'Campo 1', deporte: 'Fútbol 5', jugadores: 5, precioHora: 55, color: '#a97818', imagen: '', oferta: '' },
  { id: 2, nombre: 'Campo 2', deporte: 'Fútbol 5', jugadores: 5, precioHora: 50, color: '#c58b1d', imagen: '', oferta: '' },
  { id: 3, nombre: 'Campo 3', deporte: 'Fútbol 7', jugadores: 7, precioHora: 60, color: '#e0a72f', imagen: '', oferta: '' },
  { id: 4, nombre: 'Campo de vóley', deporte: 'Vóley', jugadores: 6, precioHora: 30, color: '#8f6416', imagen: '', oferta: '' },
]

const reservasDemo = reservasDemoJson as readonly Reserva[]
assert.equal(reservasDemo.length, 45)
assert.ok(reservasDemo.every((reserva) => reserva.estado === 'finalizado'))
assert.deepEqual([...new Set(reservasDemo.map((reserva) => reserva.fecha.slice(0, 7)))], ['2026-08', '2026-09', '2026-10'])
assert.deepEqual([...new Set(reservasDemo.map((reserva) => reserva.canchaId))], [1, 2, 3, 4])

for (const mes of ['2026-08', '2026-09', '2026-10']) {
  const balance = construirBalanceMensual(mes, reservasDemo, canchas)
  assert.equal(balance.reservasFinalizadas, 15)
  assert.equal(balance.horasAlquiladas, 25.5)
  assert.equal(balance.ingresosTotales, 1245)
  assert.equal(balance.porDia.length, 15)
}

console.log('✔ balanceDemo.check.ts OK')
