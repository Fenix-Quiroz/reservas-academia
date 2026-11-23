import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  convertirFilasHorariosAdmin,
  type FilaHorarioEntrenamientoAdmin,
} from './horariosAdminSupabase'

const filas: FilaHorarioEntrenamientoAdmin[] = [
  {
    cancha_id: 2,
    dia_semana: 2,
    inicio_minuto: 600,
    fin_minuto: 660,
    motivo: 'Entrenamiento de academia',
    activo: true,
  },
  {
    cancha_id: 1,
    dia_semana: 1,
    inicio_minuto: 420,
    fin_minuto: 480,
    motivo: 'Entrenamiento de academia',
    activo: true,
  },
  {
    cancha_id: 1,
    dia_semana: 1,
    inicio_minuto: 480,
    fin_minuto: 510,
    motivo: 'Entrenamiento de academia',
    activo: false,
  },
  {
    cancha_id: 1,
    dia_semana: 1,
    inicio_minuto: 480,
    fin_minuto: 510,
    motivo: 'Reserva manual',
    activo: true,
  },
]

assert.deepEqual(
  convertirFilasHorariosAdmin(filas),
  {
    version: 1,
    horarios: [
      { canchaId: 1, diaSemana: 1, inicioMinuto: 420, finMinuto: 480 },
      { canchaId: 2, diaSemana: 2, inicioMinuto: 600, finMinuto: 660 },
    ],
  },
  'la lectura debe conservar solo bloqueos activos de entrenamiento y mapear snake_case',
)

const adapter = fs.readFileSync(new URL('./horariosAdminSupabase.ts', import.meta.url), 'utf8')
assert.match(adapter, /from\(['"]horarios_bloqueados['"]\)/)
assert.match(adapter, /select\(/)
assert.match(adapter, /eq\(['"]activo['"], true\)/)
assert.match(adapter, /const MOTIVO_ENTRENAMIENTO = ['"]Entrenamiento de academia['"];?/)
assert.match(adapter, /eq\(['"]motivo['"], MOTIVO_ENTRENAMIENTO\)/)
assert.match(adapter, /export async function leerHorariosEntrenamientoAdminRemotos/)
assert.doesNotMatch(adapter, /\.insert\(/)
assert.doesNotMatch(adapter, /\.update\(/)
assert.doesNotMatch(adapter, /\.delete\(/)
assert.doesNotMatch(adapter, /\.rpc\(/)

console.log('✔ horariosAdminSupabaseAdapter.check.ts OK')
