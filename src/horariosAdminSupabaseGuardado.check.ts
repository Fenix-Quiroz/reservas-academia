import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  crearPayloadHorariosAdmin,
  type PayloadHorariosEntrenamientoAdmin,
} from './horariosAdminSupabaseGuardado'
import { crearConfiguracionHorariosAdmin } from './horariosAdmin'

const configuracion = crearConfiguracionHorariosAdmin([
  { canchaId: 2, diaSemana: 2, inicioMinuto: 600, finMinuto: 660 },
  { canchaId: 1, diaSemana: 1, inicioMinuto: 420, finMinuto: 480 },
])

const payload: PayloadHorariosEntrenamientoAdmin = crearPayloadHorariosAdmin(configuracion)
assert.deepEqual(payload, {
  version: 1,
  horarios: [
    { cancha_id: 1, dia_semana: 1, inicio_minuto: 420, fin_minuto: 480 },
    { cancha_id: 2, dia_semana: 2, inicio_minuto: 600, fin_minuto: 660 },
  ],
}, 'el payload RPC debe transformar la configuración a snake_case')

const configuracionConRangosAntiguos = crearConfiguracionHorariosAdmin([
  { canchaId: 1, diaSemana: 1, inicioMinuto: 1050, finMinuto: 1135 },
  { canchaId: 2, diaSemana: 1, inicioMinuto: 960, finMinuto: 1045 },
])

const payloadNormalizado: PayloadHorariosEntrenamientoAdmin = crearPayloadHorariosAdmin(configuracionConRangosAntiguos)
assert.deepEqual(payloadNormalizado, {
  version: 1,
  horarios: [
    { cancha_id: 1, dia_semana: 1, inicio_minuto: 1050, fin_minuto: 1140 },
    { cancha_id: 2, dia_semana: 1, inicio_minuto: 960, fin_minuto: 1050 },
  ],
}, 'el payload debe alinear los rangos antiguos a bloques de 30 minutos')

const guardado = fs.readFileSync(new URL('./horariosAdminSupabaseGuardado.ts', import.meta.url), 'utf8')
assert.match(guardado, /rpc\(['"]guardar_horarios_entrenamiento_admin['"]\s*,/)
assert.match(guardado, /p_configuracion/)
assert.match(guardado, /export async function guardarHorariosEntrenamientoAdminRemoto/)
assert.doesNotMatch(guardado, /\.insert\(/)
assert.doesNotMatch(guardado, /\.update\(/)
assert.doesNotMatch(guardado, /\.delete\(/)

console.log('✔ horariosAdminSupabaseGuardado.check.ts OK')
