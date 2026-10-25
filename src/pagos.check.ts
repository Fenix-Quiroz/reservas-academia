import assert from 'node:assert/strict'
import fs from 'node:fs'
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

const edgeFunctionUrl = new URL('../supabase/functions/registrar-adelanto-yape/index.ts', import.meta.url)
assert.equal(fs.existsSync(edgeFunctionUrl), true, 'Debe existir la Edge Function de adelanto Yape')
const edgeFunction = fs.readFileSync(edgeFunctionUrl, 'utf8')
assert.match(edgeFunction, /SUPABASE_SERVICE_ROLE_KEY/)
assert.match(edgeFunction, /comprobantes-pago/)
assert.match(edgeFunction, /pago_comprobantes/)
assert.match(edgeFunction, /pagos_reserva/)
assert.match(edgeFunction, /pago_estado[\s\S]*pendiente/)
assert.match(edgeFunction, /EXPIRACION_MINUTOS\s*=\s*15/)
assert.match(edgeFunction, /MAX_COMPROBANTE_BYTES\s*=\s*5\s*\*\s*1024\s*\*\s*1024/)
assert.match(edgeFunction, /image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp/)
assert.match(edgeFunction, /crypto\.subtle\.digest/)
assert.match(edgeFunction, /crypto\.randomUUID\(\)/)
assert.match(edgeFunction, /storagePath[\s\S]*reservaId[\s\S]*fileId/)
assert.match(edgeFunction, /remove\(/)

const supabaseConfigUrl = new URL('../supabase/config.toml', import.meta.url)
assert.equal(fs.existsSync(supabaseConfigUrl), true, 'Debe existir la configuración de Edge Functions')
const supabaseConfig = fs.readFileSync(supabaseConfigUrl, 'utf8')
assert.match(supabaseConfig, /\[functions\.registrar-adelanto-yape\]/)
assert.match(supabaseConfig, /verify_jwt\s*=\s*false/)

console.log('✔ pagos.check.ts OK')
