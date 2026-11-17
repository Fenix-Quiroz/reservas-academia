import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ABRE, CIERRA, esHorarioAdminFueraHorarioValido, horariosAdminFueraHorario } from './reservas'

assert.equal(ABRE, 7)
assert.equal(CIERRA, 27)
assert.equal(esHorarioAdminFueraHorarioValido(25, 1.5), true, '1:00 a 2:30 a. m. debe permitirse')
assert.equal(esHorarioAdminFueraHorarioValido(25.5, 1), true, '1:30 a 2:30 a. m. debe permitirse')
assert.equal(esHorarioAdminFueraHorarioValido(26, 0.5), true, '2:00 a 2:30 a. m. debe permitirse')
assert.equal(esHorarioAdminFueraHorarioValido(25, 2), true, '1:00 a 3:00 a. m. debe permitirse')
assert.equal(esHorarioAdminFueraHorarioValido(26.5, 0.5), true, '2:30 a 3:00 a. m. debe permitirse')
assert.equal(esHorarioAdminFueraHorarioValido(24.5, 1.5), false, 'El modo especial empieza después del cierre público')
assert.equal(esHorarioAdminFueraHorarioValido(25, 3.5), false, 'No debe superar las 3:00 a. m.')
assert.equal(esHorarioAdminFueraHorarioValido(25, 1.25), false, 'Solo se permiten bloques de 30 minutos')

assert.deepEqual(
  horariosAdminFueraHorario().map((horario) => horario.inicio),
  [25, 25.5, 26, 26.5],
)
assert.equal(horariosAdminFueraHorario().every((horario) => horario.libre), true)

const migration = fs.readFileSync(new URL('../supabase/fix-reserva-admin-fuera-horario.sql', import.meta.url), 'utf8')
const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
const permissions = fs.readFileSync(new URL('../supabase/permissions.sql', import.meta.url), 'utf8')
const supabaseData = fs.readFileSync(new URL('./supabaseData.ts', import.meta.url), 'utf8')
const adminModal = fs.readFileSync(new URL('./components/admin/AdminModalNuevaReserva.tsx', import.meta.url), 'utf8')
const selectorHorario = fs.readFileSync(new URL('./components/cliente/SelectorHorario.tsx', import.meta.url), 'utf8')

assert.match(migration, /crear_reserva_admin_fuera_horario/)
assert.match(migration, /obtener_horarios_admin_fuera_horario/)
assert.match(migration, /auth\.jwt\(\)[\s\S]*admin_no_autorizado/)
assert.match(migration, /p_inicio < 25/)
assert.match(migration, /p_inicio \+ p_horas > 27/)
assert.match(migration, /numero_no_confiable/)
assert.match(migration, /reserva\.inicio < p_inicio \+ p_horas/)
assert.match(schema, /reservas_inicio_horario_check[\s\S]*inicio between 7 and 27/)
assert.match(permissions, /reservas_inicio_horario_check[\s\S]*inicio between 7 and 27/)
assert.match(schema, /crear_reserva_admin_fuera_horario/)
assert.match(permissions, /crear_reserva_admin_fuera_horario/)
assert.match(supabaseData, /crearReservaAdminFueraHorarioRemota/)
assert.match(supabaseData, /crear_reserva_admin_fuera_horario/)
assert.match(supabaseData, /leerHorariosAdminFueraHorarioRemotos/)
assert.match(adminModal, /clienteInicial/)
assert.doesNotMatch(adminModal, /fuera de horario/i)
assert.doesNotMatch(adminModal, /fueraDeHorario/)
assert.match(selectorHorario, /const esExtensionSiguienteTurno = Boolean\(grupoSeleccionado && h\.inicio >= limiteTurno\)/)
assert.doesNotMatch(selectorHorario, /const esExtensionSiguienteTurno = Boolean\(grupoSeleccionado && h\.inicio >= grupoSeleccionado\.hasta\)/)
assert.doesNotMatch(selectorHorario, /fueraDeHorario|CIERRA_ADMIN_FUERA_HORARIO/)

console.log('✔ reservaAdminFueraHorario.check.ts OK')
