import assert from 'node:assert/strict'
import {
  ADELANTO_YAPE,
  MAX_COMPROBANTE_BYTES,
  NUMERO_YAPE,
  extensionComprobante,
  validarComprobante,
} from './pagos'

type ArchivoPrueba = { name: string; type: string; size: number }

assert.equal(ADELANTO_YAPE, 10)
assert.equal(NUMERO_YAPE, '995933438')
assert.equal(MAX_COMPROBANTE_BYTES, 5 * 1024 * 1024)

assert.equal(validarComprobante(null), 'archivo-requerido')
assert.equal(validarComprobante({ name: 'captura.jpg', type: 'image/jpeg', size: 1 }), null)
assert.equal(validarComprobante({ name: 'captura.png', type: 'image/png', size: MAX_COMPROBANTE_BYTES }), null)
assert.equal(validarComprobante({ name: 'captura.webp', type: 'image/webp', size: 1 }), null)
assert.equal(validarComprobante({ name: 'captura.gif', type: 'image/gif', size: 1 }), 'tipo-no-admitido')
assert.equal(validarComprobante({ name: 'captura.jpg', type: 'image/jpeg', size: MAX_COMPROBANTE_BYTES + 1 }), 'tamano-excedido')

for (const [type, expected] of Object.entries({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
})) {
  assert.equal(extensionComprobante({ name: `archivo.${expected}`, type } as ArchivoPrueba), expected)
}

console.log('✔ pagos.check.ts OK')
