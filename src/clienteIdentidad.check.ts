import assert from 'node:assert/strict'

const datos = new Map<string, string>()
globalThis.localStorage = {
  getItem: (clave: string) => datos.get(clave) ?? null,
  setItem: (clave: string, valor: string) => { datos.set(clave, valor) },
  removeItem: (clave: string) => { datos.delete(clave) },
  clear: () => datos.clear(),
} as unknown as Storage

const { guardarClienteId, leerClienteId, limpiarDatosLocales } = await import('./almacen')

const clienteId = '42a38838-5052-407f-8a0a-72666f31aeae'
guardarClienteId(clienteId, '931 283 181')
assert.equal(leerClienteId('931283181'), clienteId)
assert.equal(leerClienteId('912345678'), undefined)

guardarClienteId('no-es-un-uuid', '912345678')
assert.equal(leerClienteId('912345678'), undefined)

limpiarDatosLocales()
assert.equal(leerClienteId('931283181'), undefined)

console.log('✔ clienteIdentidad.check.ts OK')
