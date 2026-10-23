import assert from 'node:assert/strict'

const datos = new Map<string, string>()
globalThis.localStorage = {
  getItem: (clave: string) => datos.get(clave) ?? null,
  setItem: (clave: string, valor: string) => { datos.set(clave, valor) },
  removeItem: (clave: string) => { datos.delete(clave) },
  clear: () => datos.clear(),
} as unknown as Storage

const {
  agregarNumeroConfiable,
  bloquearNumero,
  desbloquearNumero,
  leerNumerosBloqueados,
  leerNumerosConfiables,
  quitarNumeroConfiable,
} = await import('./almacen')

assert.deepEqual(leerNumerosBloqueados(), [])
assert.deepEqual(leerNumerosConfiables(), [])

assert.deepEqual(bloquearNumero('987654321', 'Dos inasistencias'), {})
assert.deepEqual(leerNumerosBloqueados(), [{
  celular: '987654321',
  motivo: 'Dos inasistencias',
  inasistencias: 2,
  activo: true,
}])
assert.deepEqual(bloquearNumero('987654321', 'Nuevo motivo'), {})
assert.equal(leerNumerosBloqueados()[0].motivo, 'Nuevo motivo')
assert.deepEqual(desbloquearNumero('987654321'), {})
assert.equal(leerNumerosBloqueados()[0].activo, false)

assert.deepEqual(agregarNumeroConfiable('912345678', 'Los Fijos'), {})
assert.deepEqual(leerNumerosConfiables(), [{ celular: '912345678', alias: 'Los Fijos', activo: true }])
assert.deepEqual(quitarNumeroConfiable('912345678'), {})
assert.equal(leerNumerosConfiables()[0].activo, false)

assert.deepEqual(bloquearNumero('123456789', 'Inválido'), { error: 'celular-invalido' })
assert.deepEqual(agregarNumeroConfiable('123456789', 'Inválido'), { error: 'celular-invalido' })

console.log('✔ controlClientes.check.ts OK')
