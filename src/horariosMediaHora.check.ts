import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../supabase/fix-horarios-media-hora.sql', import.meta.url), 'utf8')
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
const permissions = readFileSync(new URL('../supabase/permissions.sql', import.meta.url), 'utf8')
const horariosAcademiaFix = readFileSync(new URL('../supabase/fix-horarios-academia.sql', import.meta.url), 'utf8')
const isolatedHalfHourFixUrl = new URL('../supabase/fix-media-hora-aislada.sql', import.meta.url)
assert.equal(readFileSync(isolatedHalfHourFixUrl, 'utf8').length > 0, true, 'Debe existir la migración de media hora aislada')
const isolatedHalfHourFix = readFileSync(isolatedHalfHourFixUrl, 'utf8')

assert.match(sql, /alter column inicio type numeric\(4,1\)/, 'la migración convierte el inicio a horas decimales')
assert.match(sql, /horas in \(0\.5, 1, 1\.5, 2, 2\.5, 3\)/, 'la migración permite media hora y duraciones de hasta 3 horas')
assert.match(sql, /generate_series\(14, floor\(\(25 - p_horas\) \* 2\)::integer\)/, 'la RPC genera inicios de media hora')
assert.match(sql, /p_inicio numeric/, 'las RPC aceptan inicios decimales')
assert.match(sql, /inicio numeric/, 'las RPC devuelven inicios decimales')
assert.match(sql, /inicio \* 2 = trunc\(inicio \* 2\)/, 'la base solo acepta múltiplos de media hora')
assert.match(schema, /horas numeric\(2,1\) not null check \(horas in \(0\.5, 1, 1\.5, 2, 2\.5, 3\)\)/, 'el esquema base incluye media hora')
assert.match(schema, /alter column inicio type numeric\(4,1\)/, 'el esquema convierte instalaciones antiguas a horas decimales')
assert.match(permissions, /alter column inicio type numeric\(4,1\)/, 'permissions convierte instalaciones antiguas a horas decimales')
assert.match(horariosAcademiaFix, /alter column inicio type numeric\(4,1\)/, 'el fix de horarios convierte instalaciones antiguas a horas decimales')
assert.match(isolatedHalfHourFix, /horas in \(0\.5, 1, 1\.5, 2, 2\.5, 3\)/, 'la migración enfocada permite media hora')
assert.match(isolatedHalfHourFix, /p_horas not in \(0\.5, 1, 1\.5, 2, 2\.5, 3\)/, 'la RPC enfocada valida media hora')
assert.match(isolatedHalfHourFix, /create or replace function public\.crear_reserva_publica\(/, 'la migración enfocada actualiza la RPC de reservas')
assert.match(isolatedHalfHourFix, /v_monto_total := v_precio_hora \* p_horas/, 'la migración enfocada calcula el importe en servidor')
assert.match(isolatedHalfHourFix, /grant execute on function public\.crear_reserva_publica\(/, 'la migración enfocada conserva el acceso RPC público')

console.log('✔ horariosMediaHora.check.ts OK')
