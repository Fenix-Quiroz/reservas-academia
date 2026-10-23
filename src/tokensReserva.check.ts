import assert from 'node:assert/strict'

const datos = new Map<string, string>()
globalThis.localStorage = {
  getItem: (clave: string) => datos.get(clave) ?? null,
  setItem: (clave: string, valor: string) => { datos.set(clave, valor) },
  removeItem: (clave: string) => { datos.delete(clave) },
  clear: () => datos.clear(),
} as unknown as Storage

const { guardarTokenReserva, leerTokensReservas, limpiarDatosLocales, tokenReserva } = await import('./almacen')
const token = 'a'.repeat(48)

guardarTokenReserva('reserva-1', token)
guardarTokenReserva('reserva-2', token)
guardarTokenReserva('reserva-invalida', 'no-es-un-token')

assert.deepEqual(leerTokensReservas(), [token])
assert.equal(tokenReserva('reserva-1'), token)
assert.equal(tokenReserva('reserva-invalida'), undefined)

limpiarDatosLocales()
assert.deepEqual(leerTokensReservas(), [])

console.log('✔ tokensReserva.check.ts OK')
