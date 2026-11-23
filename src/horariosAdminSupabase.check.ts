import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migracion = readFileSync(
  new URL('../supabase/horarios-entrenamiento-admin.sql', import.meta.url),
  'utf8',
)

assert.match(migracion, /create or replace function public\.guardar_horarios_entrenamiento_admin\(\s*p_configuracion jsonb\s*\)/i)
assert.match(migracion, /security definer/i)
assert.match(migracion, /set search_path\s*=\s*public,\s*pg_temp/i)
assert.match(migracion, /auth\.jwt\(\).*app_metadata.*role.*admin/i)
assert.match(migracion, /jsonb_array_elements/i)
assert.match(migracion, /version.*1/i)
assert.match(migracion, /cancha_id.*between 1 and 4/i)
assert.match(migracion, /dia_semana.*between 0 and 6/i)
assert.match(migracion, /inicio_minuto.*420/i)
assert.match(migracion, /fin_minuto.*1320/i)
assert.match(migracion, /%\s*30/i)
assert.match(migracion, /overlap|solapamiento|inicio_minuto\s*<.*fin_minuto/i)
assert.match(migracion, /pg_advisory_xact_lock/i)
assert.match(migracion, /motivo\s*=\s*'Entrenamiento de academia'/i)
assert.match(migracion, /update\s+public\.horarios_bloqueados/i)
assert.match(migracion, /insert\s+into\s+public\.horarios_bloqueados/i)
assert.match(migracion, /return query/i)
assert.match(migracion, /revoke all on function public\.guardar_horarios_entrenamiento_admin/i)
assert.match(migracion, /grant execute on function public\.guardar_horarios_entrenamiento_admin\(jsonb\)\s+to authenticated/i)
assert.doesNotMatch(migracion, /delete\s+from\s+public\.reservas/i)
assert.doesNotMatch(migracion, /update\s+public\.reservas/i)
assert.doesNotMatch(migracion, /delete\s+from\s+public\.bloqueos_eventos/i)

console.log('✔ horariosAdminSupabase.check.ts OK')
