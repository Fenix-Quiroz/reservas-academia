import assert from 'node:assert/strict'
import fs from 'node:fs'
import { deReserva, aReserva, errorDeSupabase } from './supabaseData'

const fila = {
  id: '11111111-1111-1111-1111-111111111111',
  cancha_id: 3,
  fecha: '2099-05-15',
  inicio: 19,
  horas: 2,
  alias: 'LosPibes',
  celular: '955555555',
  estado: 'activo',
}

assert.deepEqual(deReserva(fila), {
  id: fila.id,
  canchaId: 3,
  fecha: '2099-05-15',
  inicio: 19,
  horas: 2,
  alias: 'LosPibes',
  celular: '955555555',
  estado: 'activo',
})

assert.deepEqual(aReserva(deReserva(fila)), fila)
const filaConMonto = { ...fila, monto_total: '120.00' }
assert.equal(deReserva(filaConMonto).montoTotal, 120)
assert.equal(aReserva(deReserva(filaConMonto)).monto_total, 120)
assert.equal(errorDeSupabase({ code: '23P01' }), 'ocupado')
assert.equal(errorDeSupabase({ code: '23505', message: 'clientes_celular_key' }), 'celular')
assert.equal(errorDeSupabase({ code: '23505', message: 'clientes_alias_lower_key' }), 'conexion')

const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
const almacen = fs.readFileSync(new URL('./almacen.ts', import.meta.url), 'utf8')
assert.match(schema, /clientes_celular_key/)
assert.match(schema, /drop index if exists public\.clientes_alias_lower_key/)
assert.doesNotMatch(schema, /create unique index if not exists clientes_alias_lower_key/)
assert.match(schema, /estado text not null default 'activo'/)
assert.match(schema, /monto_total numeric\(10, 2\)/)
assert.match(schema, /where \(estado <> 'cancelado'\)/)
assert.match(schema, /revoke delete on public\.reservas/)
assert.match(almacen, /limpiarDatosDemoLocales\(\)/)
assert.match(almacen, /supabaseConfigurado\s*\?\s*\[\]/)

console.log('✔ supabase.check.ts OK')
