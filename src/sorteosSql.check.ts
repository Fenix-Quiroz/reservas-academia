import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql = fs.readFileSync(new URL('../supabase/fix-sorteos-reales.sql', import.meta.url), 'utf8')

assert.match(sql, /create table if not exists public\.sorteos/i)
assert.match(sql, /create table if not exists public\.sorteo_tickets/i)
assert.match(sql, /create table if not exists public\.sorteo_resultados/i)
assert.match(sql, /estado text not null[\s\S]*check \(estado in \('preparando', 'ejecutado', 'cancelado'\)\)/i)
assert.match(sql, /unique \(sorteo_id, reserva_id\)/i)
assert.match(sql, /create or replace function public\.ejecutar_sorteo\(\)/i)
assert.match(sql, /security definer/i)
assert.match(sql, /pg_advisory_xact_lock/i)
assert.match(sql, /gen_random_bytes/i)
assert.match(sql, /4294967296/i)
assert.match(sql, /auth\.jwt\(\).*app_metadata.*role/i)
assert.match(sql, /estado = 'finalizado'/i)
assert.match(sql, /pago_estado in \('confirmado', 'no_requerido'\)/i)
assert.match(sql, /reserva\.cliente_id/i)
assert.match(sql, /partition by coalesce\(reserva\.cliente_id::text, reserva\.celular\)/i)
assert.match(sql, /created_at > v_desde/i)
assert.match(sql, /created_at <= v_hasta/i)
assert.match(sql, /grant execute on function public\.ejecutar_sorteo\(\) to authenticated/i)

console.log('✔ sorteosSql.check.ts OK')
