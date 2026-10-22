import assert from 'node:assert/strict'
import { normalizarEstado, normalizarReserva, puedeCambiarEstado } from './estadoReserva'

const reservaAntigua = {
  id: 'reserva-antigua',
  canchaId: 1,
  fecha: '2026-10-22',
  inicio: 18,
  horas: 1,
  alias: 'Equipo Prueba',
  celular: '999999999',
}

assert.equal(normalizarEstado(undefined), 'activo')
assert.equal(normalizarEstado('finalizado'), 'finalizado')
assert.equal(normalizarEstado('cancelado'), 'cancelado')
assert.equal(normalizarEstado('estado-invalido'), 'activo')
assert.equal(normalizarReserva(reservaAntigua).estado, 'activo')
assert.equal(normalizarReserva({ ...reservaAntigua, estado: 'iniciado' }).estado, 'iniciado')
assert.equal(puedeCambiarEstado('activo', 'iniciado'), true)
assert.equal(puedeCambiarEstado('iniciado', 'finalizado'), true)
assert.equal(puedeCambiarEstado('activo', 'finalizado'), false)
assert.equal(puedeCambiarEstado('finalizado', 'activo'), false)
assert.equal(puedeCambiarEstado('cancelado', 'iniciado'), false)

console.log('✔ estadoReserva.check.ts OK')
