import assert from 'node:assert/strict'

const datos = new Map<string, string>()
globalThis.localStorage = {
  getItem: (clave: string) => datos.get(clave) ?? null,
  setItem: (clave: string, valor: string) => { datos.set(clave, valor) },
  removeItem: (clave: string) => { datos.delete(clave) },
  clear: () => datos.clear(),
} as unknown as Storage

const { guardarTokenReserva, leerTokensReservas, limpiarDatosLocales, tokenReserva } = await import('./almacen')
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

limpiarDatosLocales()
assert.deepEqual(leerTokensReservas('987654321'), [])

console.log('✔ tokensReserva.check.ts OK')
