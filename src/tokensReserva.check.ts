import assert from 'node:assert/strict'

const datos = new Map<string, string>()
globalThis.localStorage = {
  getItem: (clave: string) => datos.get(clave) ?? null,
  setItem: (clave: string, valor: string) => { datos.set(clave, valor) },
  removeItem: (clave: string) => { datos.delete(clave) },
  clear: () => datos.clear(),
} as unknown as Storage

const {
  guardarTokenReserva,
  leerTokensReservas,
  limpiarDatosLocales,
  tokenReserva,
  eliminarTokenReserva,
  limpiarTokensInactivos,
  esReservaVisibleCliente,
  marcarTokenCancelado,
} = await import('./almacen')

const tokenA = 'a'.repeat(48)
const tokenB = 'b'.repeat(48)

guardarTokenReserva('reserva-1', tokenA, '987654321')
guardarTokenReserva('reserva-2', tokenA, '987654321')
guardarTokenReserva('reserva-3', tokenB, '912345678')
guardarTokenReserva('reserva-invalida', 'no-es-un-token', '987654321')

assert.deepEqual(leerTokensReservas('987654321'), [tokenA])
assert.deepEqual(leerTokensReservas('912345678'), [tokenB])
assert.deepEqual(leerTokensReservas(), [])
assert.equal(tokenReserva('reserva-1', '987654321'), tokenA)
assert.equal(tokenReserva('reserva-1', '912345678'), undefined)
assert.equal(tokenReserva('reserva-invalida', '987654321'), undefined)

datos.set('reserva-tokens', JSON.stringify({ legado: tokenA }))
assert.deepEqual(leerTokensReservas(), [])
assert.deepEqual(JSON.parse(datos.get('reserva-tokens') ?? '{}'), {})

// Prueba eliminarTokenReserva directa
guardarTokenReserva('reserva-para-eliminar', tokenA, '987654321')
assert.equal(tokenReserva('reserva-para-eliminar', '987654321'), tokenA)
eliminarTokenReserva('reserva-para-eliminar')
assert.equal(tokenReserva('reserva-para-eliminar', '987654321'), undefined)

// Prueba marcarTokenCancelado y visibilidad 5 horas sincronizada con el token
const ahora = Date.now()
guardarTokenReserva('reserva-cancelada-5h', tokenA, '987654321')
marcarTokenCancelado('reserva-cancelada-5h', ahora)
const reservaCancelada = {
  id: 'reserva-cancelada-5h',
  canchaId: 1,
  fecha: '2026-10-30',
  inicio: 10,
  horas: 1,
  alias: 'Test',
  celular: '987654321',
  estado: 'cancelado' as const,
}

// Dentro de las 5 horas: la tarjeta ES visible y el token SE CONSERVA
assert.equal(esReservaVisibleCliente(reservaCancelada, ahora + 2 * 60 * 60 * 1000), true)
assert.equal(esReservaVisibleCliente(reservaCancelada, ahora + 4.5 * 60 * 60 * 1000), true)
limpiarTokensInactivos([reservaCancelada], ahora + 4.5 * 60 * 60 * 1000)
assert.equal(tokenReserva('reserva-cancelada-5h', '987654321'), tokenA)

// Pasadas las 5 horas: la tarjeta DESAPARECE y el token se ELIMINA de localStorage
assert.equal(esReservaVisibleCliente(reservaCancelada, ahora + 5.1 * 60 * 60 * 1000), false)
limpiarTokensInactivos([reservaCancelada], ahora + 5.1 * 60 * 60 * 1000)
assert.equal(tokenReserva('reserva-cancelada-5h', '987654321'), undefined)

limpiarDatosLocales()
assert.deepEqual(leerTokensReservas('987654321'), [])

console.log('✔ tokensReserva.check.ts OK')
