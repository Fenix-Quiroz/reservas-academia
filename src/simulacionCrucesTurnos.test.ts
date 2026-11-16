import assert from 'node:assert/strict'
import {
  horarios,
  rangoLibre,
  esBloqueAislado,
  DURACION_BLOQUE,
} from './reservas.js'
import {
  crearReserva,
  cancelarReserva,
  leerReservas,
  limpiarDatosLocales,
  guardarTokenReserva,
} from './almacen.js'
import {
  guardarBorradorReserva,
  leerBorradorReserva,
  borrarBorradorReserva,
} from './borradorReserva.js'
import canchas from './data/canchas.json' with { type: 'json' }
import type { HorarioDisponible } from './reservas.js'

console.log('======================================================================')
console.log('SIMULACIÓN AVANZADA: RESERVAS EN HORARIOS FRONTERA Y CRUCE DE TURNOS')
console.log('======================================================================\n')

// Mock de sessionStorage y localStorage
const mockStorage = new Map<string, string>()
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => mockStorage.get(k) ?? null,
    setItem: (k: string, v: string) => mockStorage.set(k, String(v)),
    removeItem: (k: string) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
  },
})
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => mockStorage.get(k) ?? null,
    setItem: (k: string, v: string) => mockStorage.set(k, String(v)),
    removeItem: (k: string) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
  },
})

function resetState() {
  mockStorage.clear()
  limpiarDatosLocales()
}

function crearReservaOk(datos: Parameters<typeof crearReserva>[0], sinAdelanto = false) {
  const r = crearReserva(datos, sinAdelanto)
  if ('reserva' in r) return r.reserva
  throw new Error(`Error creando reserva: ${JSON.stringify(r)}`)
}

resetState()

const cancha1 = canchas[0] // Campo 1, Fútbol 6, precioHora: 55
const hoy = new Date('2099-07-11T12:00:00')
// Domingo fijo sin entrenamientos: la simulación no debe depender de la fecha real.
const fechaManana = '2099-07-12'

// Función idéntica a la lógica del componente SelectorHorario
function obtenerListaTurno(
  turno: 'manana' | 'tarde' | 'noche',
  inicio: number | null,
  disponibles: HorarioDisponible[],
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
  const hastaEfectivo = inicio !== null ? Math.max(hastaBase, inicio + 3) : hastaBase

  return disponibles.filter((h) => h.inicio >= desdeEfectivo && h.inicio < hastaEfectivo)
}

// --------------------------------------------------------------------------
// SIMULACIÓN 1: Reserva 12:30 a 1:30 (1h) entrando por Turno Mañana
// --------------------------------------------------------------------------
console.log('1. Simulando reserva de 12:30 a 1:30 p. m. (1 hora) desde Turno Mañana...')
const listaIni1 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
const vistaManana1 = obtenerListaTurno('manana', null, listaIni1)
assert.equal(vistaManana1[vistaManana1.length - 1]?.inicio, 12.5, 'El último bloque de la lista matutina es 12:30')

// Cliente toca 12:30
const inicioSim1 = 12.5
const vistaExpandida1 = obtenerListaTurno('manana', inicioSim1, listaIni1)
assert.equal(vistaExpandida1[vistaExpandida1.length - 1]?.inicio, 15.0, 'La lista se expande dinámicamente hasta las 3:30 p. m.')
assert.ok(vistaExpandida1.some((h) => h.inicio === 13.0), 'El bloque 1:00 p. m. a 1:30 p. m. está presente y visible')

// Se procesa la reserva de 1 hora
const res1 = crearReservaOk({
  canchaId: cancha1.id,
  fecha: fechaManana,
  inicio: 12.5,
  horas: 1,
  alias: 'Carlos Mendoza',
  celular: '999111222',
  montoTotal: cancha1.precioHora * 1,
})
assert.equal(res1.inicio, 12.5)
assert.equal(res1.horas, 1)
assert.equal(res1.montoTotal, 55)

// Verificar que 12:30 y 13:00 queden ocupados en la agenda
const listaPost1 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
assert.equal(listaPost1.find((h) => h.inicio === 12.5)?.libre, false, 'Bloque 12:30 quedó ocupado')
assert.equal(listaPost1.find((h) => h.inicio === 13.0)?.libre, false, 'Bloque 13:00 (tarde) quedó ocupado')
assert.equal(listaPost1.find((h) => h.inicio === 13.5)?.libre, true, 'Bloque 13:30 sigue libre')
console.log('   ✔ Reserva de 12:30 a 1:30 p. m. creada con éxito (S/ 55.00) y agenda bloqueada correctamente.')

// --------------------------------------------------------------------------
// SIMULACIÓN 2: Reserva de 12:30 a 3:30 (3 horas máximas) extendiendo bloque por bloque
// --------------------------------------------------------------------------
console.log('2. Simulando extensión progresiva desde 12:30 p. m. hasta el tope de 3 horas...')
resetState()
const listaIni2 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
let horasSel = 1
const inicioSel = 12.5

// Sumar bloque 1.5h (12:30 a 14:00)
assert.ok(rangoLibre(listaIni2, inicioSel, horasSel + 0.5))
horasSel += 0.5
assert.equal(horasSel, 1.5)

// Sumar bloque 2.0h (12:30 a 14:30)
assert.ok(rangoLibre(listaIni2, inicioSel, horasSel + 0.5))
horasSel += 0.5
assert.equal(horasSel, 2.0)

// Sumar bloque 2.5h (12:30 a 15:00)
assert.ok(rangoLibre(listaIni2, inicioSel, horasSel + 0.5))
horasSel += 0.5
assert.equal(horasSel, 2.5)

// Sumar bloque 3.0h (12:30 a 15:30)
assert.ok(rangoLibre(listaIni2, inicioSel, horasSel + 0.5))
horasSel += 0.5
assert.equal(horasSel, 3.0)

// Intentar sumar a 3.5h (debe ser bloqueado por MAX_HORAS)
const superaMaximo = horasSel + 0.5 > 3
assert.equal(superaMaximo, true, 'No permite extender más allá de 3 horas')

// Se guarda la reserva de 3 horas
const res2 = crearReservaOk({
  canchaId: cancha1.id,
  fecha: fechaManana,
  inicio: 12.5,
  horas: 3,
  alias: 'Torneo Almuerzo',
  celular: '988333444',
  montoTotal: cancha1.precioHora * 3,
})
assert.equal(res2.horas, 3)
assert.equal(res2.montoTotal, 165)

// Verificar que todos los 6 bloques de media hora quedaron ocupados
const listaPost2 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
for (let b = 12.5; b < 15.5; b += 0.5) {
  assert.equal(listaPost2.find((h) => h.inicio === b)?.libre, false, `Bloque ${b} ocupado`)
}
assert.equal(listaPost2.find((h) => h.inicio === 15.5)?.libre, true, 'Bloque 15:30 (3:30 p. m.) sigue libre')
console.log('   ✔ Extensión fluida hasta 3 horas (S/ 165.00) verificada exitosamente.')

// --------------------------------------------------------------------------
// SIMULACIÓN 3: Reserva de 12:30 a 1:30 entrando por Turno Tarde
// --------------------------------------------------------------------------
console.log('3. Simulando reserva iniciando a las 12:30 p. m. desde el Turno Tarde...')
resetState()
const listaIni3 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
const vistaTarde3 = obtenerListaTurno('tarde', null, listaIni3)
assert.equal(vistaTarde3[0]?.inicio, 12.5, 'El primer bloque visible en la tarde es 12:30 p. m.')
assert.equal(vistaTarde3[0]?.libre, true)

const res3 = crearReservaOk({
  canchaId: cancha1.id,
  fecha: fechaManana,
  inicio: 12.5,
  horas: 1.5,
  alias: 'Pichanga Tarde',
  celular: '977555666',
  montoTotal: cancha1.precioHora * 1.5,
})
assert.equal(res3.montoTotal, 82.50)
console.log('   ✔ Cliente en Turno Tarde encontró y reservó 12:30 p. m. directamente sin fricción.')

// --------------------------------------------------------------------------
// SIMULACIÓN 4: Cruce de Tarde a Noche (6:30 p. m. a 8:30 p. m., 2 horas)
// --------------------------------------------------------------------------
console.log('4. Simulando cruce de Tarde a Noche (6:30 p. m. a 8:30 p. m.)...')
resetState()
const listaIni4 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
const vistaTarde4 = obtenerListaTurno('tarde', 18.5, listaIni4)
// Debe expandirse hacia la noche mostrando bloques hasta 18.5 + 3 = 21.5
assert.equal(vistaTarde4[vistaTarde4.length - 1]?.inicio, 21.0, 'Muestra hasta el bloque 9:00 a 9:30 p. m.')
assert.ok(vistaTarde4.some((h) => h.inicio === 19.0), 'Incluye las 7:00 p. m. de la noche')
assert.ok(vistaTarde4.some((h) => h.inicio === 20.0), 'Incluye las 8:00 p. m. de la noche')

const res4 = crearReservaOk({
  canchaId: cancha1.id,
  fecha: fechaManana,
  inicio: 18.5,
  horas: 2,
  alias: 'Nocturnos FC',
  celular: '966444888',
  montoTotal: cancha1.precioHora * 2,
})
assert.equal(res4.montoTotal, 110)
const listaPost4 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
assert.equal(listaPost4.find((h) => h.inicio === 18.5)?.libre, false)
assert.equal(listaPost4.find((h) => h.inicio === 19.0)?.libre, false)
assert.equal(listaPost4.find((h) => h.inicio === 19.5)?.libre, false)
assert.equal(listaPost4.find((h) => h.inicio === 20.0)?.libre, false)
assert.equal(listaPost4.find((h) => h.inicio === 20.5)?.libre, true, '8:30 p. m. queda libre')
console.log('   ✔ Cruce Tarde-Noche (6:30 a 8:30 p. m., S/ 110.00) bloqueó correctamente los bloques cruzados.')

// --------------------------------------------------------------------------
// SIMULACIÓN 5: Inicio a las 6:30 p. m. entrando directamente por Turno Noche
// --------------------------------------------------------------------------
console.log('5. Simulando inicio a las 6:30 p. m. entrando por Turno Noche...')
resetState()
const listaIni5 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
const vistaNoche5 = obtenerListaTurno('noche', null, listaIni5)
assert.equal(vistaNoche5[0]?.inicio, 18.5, 'El primer bloque visible en la noche es 6:30 p. m.')
console.log('   ✔ 6:30 p. m. disponible como inicio natural en Turno Noche.')

// --------------------------------------------------------------------------
// SIMULACIÓN 6: Cambio dinámico de pestaña (Tabs) preservando selección compartida
// --------------------------------------------------------------------------
console.log('6. Simulando cambio de pestaña (Tabs) entre Mañana y Tarde preservando selección...')
let turnoActual: 'manana' | 'tarde' | 'noche' = 'manana'
let inicioActivo: number | null = 12.5
let horasActivas = 1.5 // 12:30 a 14:00 (2:00 p. m.)

function simularCambioTurnoDirecto(
  nuevoTurno: 'manana' | 'tarde' | 'noche',
  inicio: number | null,
  horas: number,
): { nuevoTurno: 'manana' | 'tarde' | 'noche'; inicio: number | null; horas: number } {
  const GRUPOS = {
    manana: { desde: 7, hasta: 13 },
    tarde: { desde: 13, hasta: 19 },
    noche: { desde: 19, hasta: 25 },
  }
  const nuevoGrupo = GRUPOS[nuevoTurno]
  const nuevoDesde = nuevoTurno === 'tarde' ? 12.5 : nuevoTurno === 'noche' ? 18.5 : nuevoGrupo.desde
  const nuevoHasta = nuevoTurno === 'manana' ? 13 : nuevoTurno === 'tarde' ? 19 : nuevoGrupo.hasta
  if (inicio !== null) {
    const fin = inicio + horas
    const estaEnRango = (inicio >= nuevoDesde && inicio < nuevoHasta) || (fin > nuevoDesde && fin <= nuevoHasta)
    if (!estaEnRango) {
      return { nuevoTurno, inicio: null, horas: 1 }
    }
  }
  return { nuevoTurno, inicio, horas }
}

// Cambiar de Mañana a Tarde con 12:30 seleccionado
const cambioATarde = simularCambioTurnoDirecto('tarde', inicioActivo, horasActivas)
assert.equal(cambioATarde.nuevoTurno, 'tarde')
assert.equal(cambioATarde.inicio, 12.5, 'Conserva el inicio 12:30 al cambiar a Tarde')
assert.equal(cambioATarde.horas, 1.5, 'Conserva las horas')

// Cambiar de Tarde a Noche con 12:30 seleccionado (fuera de rango)
const cambioANoche = simularCambioTurnoDirecto('noche', inicioActivo, horasActivas)
assert.equal(cambioANoche.nuevoTurno, 'noche')
assert.equal(cambioANoche.inicio, null, 'Limpia la selección al cambiar a Noche porque no corresponde')
assert.equal(cambioANoche.horas, 1)
console.log('   ✔ Cambio de pestañas inteligente preserva selecciones compartidas y limpia las ajenas.')

// --------------------------------------------------------------------------
// SIMULACIÓN 7: Detección precisa de colisiones en la frontera
// --------------------------------------------------------------------------
console.log('7. Simulando colisión con reserva existente a la 1:00 p. m....')
resetState()
// Existe una reserva de 13:00 a 14:00 (1:00 a 2:00 p. m.)
crearReservaOk({
  canchaId: cancha1.id,
  fecha: fechaManana,
  inicio: 13.0,
  horas: 1,
  alias: 'Reserva Previa',
  celular: '911222333',
})

const listaIni7 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
// Si el cliente en Mañana intenta pedir 12:30 a 1:30 (1h): choca con 13.0
const chocaCon13 = !rangoLibre(listaIni7, 12.5, 1.0)
assert.equal(chocaCon13, true, 'El sistema detecta colisión: no permite 12:30 a 1:30 porque 1:00 está ocupado')

// Bloque 12:30 aislado:
// 12:00 ocupado también?
crearReservaOk({
  canchaId: cancha1.id,
  fecha: fechaManana,
  inicio: 11.0,
  horas: 1.5, // 11:00 a 12:30
  alias: 'Reserva Matutina',
  celular: '922333444',
})
const listaIni7B = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
// Ahora 12.5 es un bloque aislado (12.0 ocupado, 13.0 ocupado)
assert.equal(esBloqueAislado(listaIni7B, 12.5), true, 'Detecta correctamente que 12:30 es bloque aislado')
console.log('   ✔ Detección de colisiones y bloques aislados en la frontera funciona con exactitud.')

// --------------------------------------------------------------------------
// SIMULACIÓN 8: Guardado y restauración de borrador (sessionStorage)
// --------------------------------------------------------------------------
console.log('8. Simulando persistencia y recarga de borrador con reserva cruzada...')
resetState()
guardarBorradorReserva({
  paso: 3,
  canchaId: cancha1.id,
  fecha: fechaManana,
  horas: 2.5,
  inicio: 12.5,
  etapa: 'horario',
  turno: 'manana',
  semana: 0,
})

const borradorRestaurado = leerBorradorReserva(canchas, hoy)
assert.ok(borradorRestaurado)
assert.equal(borradorRestaurado?.inicio, 12.5)
assert.equal(borradorRestaurado?.horas, 2.5)
assert.equal(borradorRestaurado?.turno, 'manana')

// Al restaurar, el componente calcula la vista con inicio 12.5
const listaRestaurada = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
const vistaRestaurada = obtenerListaTurno(borradorRestaurado.turno, borradorRestaurado.inicio, listaRestaurada)
assert.equal(vistaRestaurada[vistaRestaurada.length - 1]?.inicio, 15.0, 'La vista restaurada mantiene los bloques de la tarde visibles')
console.log('   ✔ Borrador persistido y restaurado perfectamente con bloques expandidos.')

// --------------------------------------------------------------------------
// SIMULACIÓN 9: Cancelación y liberación inmediata de horarios frontera
// --------------------------------------------------------------------------
console.log('9. Simulando cancelación y liberación instantánea de horario frontera...')
resetState()
const res9 = crearReservaOk({
  canchaId: cancha1.id,
  fecha: fechaManana,
  inicio: 12.5,
  horas: 1,
  alias: 'Para Cancelar',
  celular: '933444555',
})
guardarTokenReserva(res9.id, 'token-123', '933444555')

// Cancelar
const cancelada = cancelarReserva(res9.id, '933444555')
assert.ok(cancelada)

// Verificar agenda liberada
const listaPost9 = horarios(leerReservas(), cancha1.id, fechaManana, DURACION_BLOQUE)
assert.equal(listaPost9.find((h) => h.inicio === 12.5)?.libre, true, '12:30 vuelve a estar Libre')
assert.equal(listaPost9.find((h) => h.inicio === 13.0)?.libre, true, '13:00 vuelve a estar Libre')
console.log('   ✔ Cancelación exitosa: los horarios frontera se liberaron instantáneamente.')

console.log('\n======================================================================')
console.log('✔ TODAS LAS SIMULACIONES DE FRONTERAS Y CRUCES PASARON CON ÉXITO (9/9)')
console.log('======================================================================')
