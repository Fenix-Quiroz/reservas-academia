import assert from 'node:assert/strict'
import {
  normalizarAlias,
  normalizarCelular,
  validarAlias,
  validarCelular,
} from './validacionCliente'

assert.equal(normalizarAlias('  Los   Jaguares  '), 'Los Jaguares')
assert.equal(normalizarCelular('987 654-321'), '987654321')

assert.equal(validarAlias('Juan'), null)
assert.equal(validarAlias('Equipo Jaguar 2'), null)
assert.equal(validarAlias('Los-Jaguares'), null)
assert.equal(validarAlias("D'Angelo"), null)
assert.notEqual(validarAlias('A'), null, 'el alias debe tener al menos 2 caracteres')
assert.notEqual(validarAlias('123Equipo'), null, 'el alias debe empezar con una letra')
assert.notEqual(validarAlias('@Luis'), null, 'el alias no debe empezar con símbolos')
assert.notEqual(validarAlias('Equipo@Jaguar'), null, 'el alias no debe contener símbolos no permitidos')
assert.notEqual(validarAlias('A'.repeat(25)), null, 'el alias no debe superar 24 caracteres')

assert.equal(validarCelular('987654321'), null)
assert.equal(validarCelular('987 654-321'), null)
assert.notEqual(validarCelular('887654321'), null, 'el celular debe empezar con 9')
assert.notEqual(validarCelular('98765432'), null, 'el celular debe tener 9 dígitos exactos')
assert.notEqual(validarCelular('9876543210'), null, 'el celular no debe superar 9 dígitos')
assert.notEqual(validarCelular('98765432A'), null, 'el celular no debe contener letras')

const aliasValidos = [
  'Aa',
  'José',
  'Ñandú',
  'María-José',
  "D'Angelo",
  'Equipo 2',
  `A${'1'.repeat(23)}`,
]
for (const alias of aliasValidos) assert.equal(validarAlias(alias), null, `debe aceptar: ${alias}`)

const entradasAliasPeligrosas = [
  '',
  '   ',
  '1Juan',
  '12Juan',
  '12345678',
  '<script>alert(1)</script>',
  "'; DROP TABLE clientes; --",
  'Juan@ejemplo.com',
  'A'.repeat(25),
  '😀Juan',
]
for (const entrada of entradasAliasPeligrosas) {
  assert.doesNotThrow(() => validarAlias(entrada), `no debe romperse con alias: ${entrada}`)
  assert.notEqual(validarAlias(entrada), null, `debe rechazar: ${entrada}`)
}

const entradasCelularPeligrosas = [
  '',
  '8'.repeat(9),
  '9'.repeat(8),
  '9'.repeat(10),
  '98765432A',
  '+51987654321',
  '987.654.321',
  '<script>alert(1)</script>',
  "'; DROP TABLE clientes; --",
]
for (const entrada of entradasCelularPeligrosas) {
  assert.doesNotThrow(() => validarCelular(entrada), `no debe romperse con celular: ${entrada}`)
  assert.notEqual(validarCelular(entrada), null, `debe rechazar: ${entrada}`)
}

for (const entrada of [null, undefined, 123456789, {}, [], Symbol('entrada')]) {
  assert.doesNotThrow(() => validarAlias(entrada as never), `no debe romperse con alias no texto`)
  assert.doesNotThrow(() => validarCelular(entrada as never), `no debe romperse con celular no texto`)
  assert.notEqual(validarAlias(entrada as never), null)
  assert.notEqual(validarCelular(entrada as never), null)
}

console.log('✔ validacionCliente.check.ts OK')
