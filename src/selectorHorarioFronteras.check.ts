import assert from 'node:assert/strict'
import { DURACION_BLOQUE, rangoLibre, type HorarioDisponible } from './reservas.js'

const MAX_HORAS = 3

// Simular la lógica de cálculo de bloques de SelectorHorario
function calcularListaTurno(
  turno: 'manana' | 'tarde' | 'noche',
  inicio: number | null,
  horariosDisponibles: HorarioDisponible[],
): HorarioDisponible[] {
  const GRUPOS = {
    manana: { desde: 7, hasta: 13 },
    tarde: { desde: 13, hasta: 19 },
    noche: { desde: 19, hasta: 25 },
  } as const

  const grupo = GRUPOS[turno]
  const desdeBase = turno === 'tarde' ? 12.5 : turno === 'noche' ? 18.5 : grupo.desde
  const desdeEfectivo = inicio !== null ? Math.min(desdeBase, inicio) : desdeBase
  const hastaBase = grupo.hasta
  const hastaEfectivo = inicio !== null ? Math.max(hastaBase, inicio + MAX_HORAS) : hastaBase

  return horariosDisponibles.filter((h) => h.inicio >= desdeEfectivo && h.inicio < hastaEfectivo)
}

// 1. Crear día completo libre de 7:00 a 25:00
const horariosDia: HorarioDisponible[] = []
for (let h = 7; h < 25; h += DURACION_BLOQUE) {
  horariosDia.push({ inicio: h, libre: true })
}

// CASO 1: Turno Mañana sin seleccionar inicio
const mananaInicial = calcularListaTurno('manana', null, horariosDia)
assert.equal(mananaInicial[0]?.inicio, 7.0, 'Mañana empieza a las 7:00 a. m.')
assert.equal(mananaInicial[mananaInicial.length - 1]?.inicio, 12.5, 'El último bloque base de la mañana es 12:30 p. m.')

// CASO 2: En Turno Mañana se selecciona 12:30 p. m. (12.5)
const mananaSeleccionado12_30 = calcularListaTurno('manana', 12.5, horariosDia)
// Debe extenderse hasta inicio + MAX_HORAS = 12.5 + 3 = 15.5
assert.equal(mananaSeleccionado12_30[0]?.inicio, 7.0)
assert.equal(mananaSeleccionado12_30[mananaSeleccionado12_30.length - 1]?.inicio, 15.0, 'Muestra hasta el bloque de 3:00 a 3:30 p. m. (3 horas completas)')
assert.ok(mananaSeleccionado12_30.some((h) => h.inicio === 13.0), 'Incluye 1:00 p. m.')
assert.ok(mananaSeleccionado12_30.some((h) => h.inicio === 13.5), 'Incluye 1:30 p. m.')
assert.ok(rangoLibre(horariosDia, 12.5, 1.0), 'Puede reservar 12:30 a 1:30 (1h)')
assert.ok(rangoLibre(horariosDia, 12.5, 2.0), 'Puede reservar 12:30 a 2:30 (2h)')
assert.ok(rangoLibre(horariosDia, 12.5, 3.0), 'Puede reservar 12:30 a 3:30 (3h max)')

// CASO 3: Turno Tarde inicial incluye 12:30 p. m. para iniciar al mediodía
const tardeInicial = calcularListaTurno('tarde', null, horariosDia)
assert.equal(tardeInicial[0]?.inicio, 12.5, 'Tarde incluye 12:30 p. m. como hora de inicio')
assert.equal(tardeInicial[tardeInicial.length - 1]?.inicio, 18.5, 'Tarde incluye 6:30 p. m.')

// CASO 4: En Turno Tarde se selecciona 6:30 p. m. (18.5)
const tardeSeleccionado18_30 = calcularListaTurno('tarde', 18.5, horariosDia)
// Debe extenderse hasta 18.5 + 3 = 21.5
assert.equal(tardeSeleccionado18_30[tardeSeleccionado18_30.length - 1]?.inicio, 21.0, 'Muestra hasta el bloque de 9:00 a 9:30 p. m. (3 horas completas hacia la noche)')
assert.ok(tardeSeleccionado18_30.some((h) => h.inicio === 19.0), 'Incluye 7:00 p. m.')
assert.ok(rangoLibre(horariosDia, 18.5, 1.0), 'Puede reservar 6:30 a 7:30 (1h)')
assert.ok(rangoLibre(horariosDia, 18.5, 2.5), 'Puede reservar 6:30 a 9:00 (2.5h)')

// CASO 5: Turno Noche inicial incluye 6:30 p. m. para iniciar al atardecer
const nocheInicial = calcularListaTurno('noche', null, horariosDia)
assert.equal(nocheInicial[0]?.inicio, 18.5, 'Noche incluye 6:30 p. m. como hora de inicio')
assert.equal(nocheInicial[nocheInicial.length - 1]?.inicio, 24.5, 'Noche va hasta las 12:30 a 1:00 a. m.')

console.log('✔ selectorHorarioFronteras.check.ts OK')
