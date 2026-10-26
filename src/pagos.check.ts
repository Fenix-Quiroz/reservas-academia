import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  ADELANTO_YAPE,
  MAX_COMPROBANTE_BYTES,
  NUMERO_YAPE,
  extensionComprobante,
  validarComprobante,
} from './pagos'
import { deReserva } from './supabaseData'

type ArchivoPrueba = { type: string; size: number }

assert.equal(ADELANTO_YAPE, 10)
assert.equal(NUMERO_YAPE, '995933438')
assert.equal(MAX_COMPROBANTE_BYTES, 5 * 1024 * 1024)

assert.equal(validarComprobante(null), 'archivo-requerido')
assert.equal(validarComprobante({ type: 'image/jpeg', size: 1 }), null)
assert.equal(validarComprobante({ type: 'image/png', size: MAX_COMPROBANTE_BYTES }), null)
assert.equal(validarComprobante({ type: 'image/webp', size: 1 }), null)
assert.equal(validarComprobante({ type: 'image/gif', size: 1 }), 'tipo-no-admitido')
assert.equal(validarComprobante({ type: 'image/jpeg', size: MAX_COMPROBANTE_BYTES + 1 }), 'tamano-excedido')

const reservaPendiente = deReserva({
  id: 'reserva-pendiente',
  cancha_id: 1,
  fecha: '2026-10-25',
  inicio: 7,
  horas: 1,
  alias: 'Oscar',
  celular: '999999999',
  estado: 'activo',
  pago_estado: 'pendiente',
})
assert.equal(reservaPendiente.pagoEstado, 'pendiente')

for (const [type, expected] of Object.entries({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
})) {
  assert.equal(extensionComprobante({ type, size: 1 } as ArchivoPrueba), expected)
}

const edgeFunctionUrl = new URL('../supabase/functions/registrar-adelanto-yape/index.ts', import.meta.url)
assert.equal(fs.existsSync(edgeFunctionUrl), true, 'Debe existir la Edge Function de adelanto Yape')
const edgeFunction = fs.readFileSync(edgeFunctionUrl, 'utf8')
const datosReservaUrl = new URL('./components/cliente/DatosReserva.tsx', import.meta.url)
const datosReserva = fs.readFileSync(datosReservaUrl, 'utf8')
assert.match(edgeFunction, /SUPABASE_SERVICE_ROLE_KEY/)
assert.match(edgeFunction, /comprobantes-pago/)
assert.match(edgeFunction, /pago_comprobantes/)
assert.match(edgeFunction, /pagos_reserva/)
assert.match(edgeFunction, /pago_estado[\s\S]*pendiente/)
assert.match(edgeFunction, /reservaPago\.estado !== 'activo'/)
assert.match(edgeFunction, /\.eq\('estado', 'activo'\)/)
assert.match(edgeFunction, /pago_estado === 'pendiente' && reservaPago\.pago_expira_at/)
assert.match(edgeFunction, /upsert: false/)
assert.match(edgeFunction, /\.download\(storagePath\)/)
assert.match(edgeFunction, /pagoTrasCarrera/)
assert.match(edgeFunction, /REVISION_MINUTOS\s*=\s*30/)
assert.doesNotMatch(edgeFunction, /EXPIRACION_MINUTOS\s*=\s*15/)
assert.match(datosReserva, /30 minutos/)
assert.doesNotMatch(datosReserva, /15 minutos/)
assert.match(edgeFunction, /MAX_COMPROBANTE_BYTES\s*=\s*5\s*\*\s*1024\s*\*\s*1024/)
assert.match(edgeFunction, /image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp/)
assert.match(edgeFunction, /crypto\.subtle\.digest/)
assert.match(edgeFunction, /crypto\.randomUUID\(\)/)
assert.match(edgeFunction, /storagePath[\s\S]*reservaId[\s\S]*pagoId/)
assert.match(edgeFunction, /remove\(/)

const supabaseConfigUrl = new URL('../supabase/config.toml', import.meta.url)
assert.equal(fs.existsSync(supabaseConfigUrl), true, 'Debe existir la configuración de Edge Functions')
const supabaseConfig = fs.readFileSync(supabaseConfigUrl, 'utf8')
assert.match(supabaseConfig, /\[functions\.registrar-adelanto-yape\]/)
assert.match(supabaseConfig, /verify_jwt\s*=\s*false/)

console.log('✔ pagos.check.ts OK')
