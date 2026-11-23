import assert from 'node:assert/strict'
import fs from 'node:fs'

const supabaseData = fs.readFileSync(new URL('./supabaseData.ts', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
const migrationUrl = new URL('../supabase/fix-realtime-horarios-publicos.sql', import.meta.url)

assert.match(
  supabaseData,
  /export function suscribirseAReservas\(\s*alCambiar: \(\) => void,\s*cliente: SupabaseClient \| null = supabase,\s*\): \(\) => void/,
  'La suscripción debe aceptar el cliente Supabase que corresponde a cada superficie',
)
assert.match(
  supabaseData,
  /\.on\('broadcast', \{ event: 'horarios_actualizados' \}, notificarCambio\)/,
  'El canal debe escuchar el aviso público de horarios actualizados',
)
assert.match(
  supabaseData,
  /const canal = cliente\s*\n\s*\.channel\('reservas-en-tiempo-real'\)/,
  'El canal debe crearse con el cliente inyectado',
)
assert.match(app, /import[\s\S]*supabasePublic[\s\S]*from ['"]\.\/supabase['"]/, 'App debe importar el cliente público')
assert.match(
  app,
  /suscribirseAReservas\(\(\) => \{[\s\S]*?\}, supabasePublic\)/,
  'La página pública debe escuchar con supabasePublic',
)
assert.doesNotMatch(supabaseData, /table: ['"]horarios_bloqueados['"]/, 'No se debe suscribir al público a la tabla administrativa')

assert.equal(fs.existsSync(migrationUrl), true, 'Debe existir la migración de Realtime para horarios públicos')
const migration = fs.readFileSync(migrationUrl, 'utf8')
assert.match(migration, /create or replace function public\.notificar_horarios_publicos\(\)/i)
assert.match(
  migration,
  /realtime\.send\([\s\S]*jsonb_build_object\(\s*'tipo',\s*'horarios_actualizados'\s*\)[\s\S]*'horarios_actualizados'[\s\S]*'reservas-en-tiempo-real'[\s\S]*false/i,
  'La señal debe ser mínima, pública y usar el contrato del cliente',
)
assert.match(
  migration,
  /after insert or update or delete on public\.horarios_bloqueados\s+for each statement/i,
  'La señal debe emitirse una vez por sentencia y no una vez por bloque',
)
assert.match(migration, /current_setting\('app\.horarios_publicos_notificado',\s*true\)/i)
assert.match(migration, /set_config\('app\.horarios_publicos_notificado',\s*'1',\s*true\)/i)
assert.doesNotMatch(migration, /grant[^;]*horarios_bloqueados[^;]*anon/i, 'La migración no debe abrir la tabla administrativa al público')

console.log('✔ realtimeHorarios.check.ts OK')
