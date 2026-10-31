// Corre con: npm run check
import assert from 'node:assert/strict'
import { chocan, horarios, masCercana, rangoHablado, deCliente, sePuedeCancelar, ocultarHorariosPasados, esDuracionValida, esBloqueAislado, fechaISO, sumarDias, DURACION_BLOQUE, rangoLibre } from './reservas'
import { entrenamientoBloquea } from './horariosEntrenamiento'
import { horaVisible, rangoVisible } from './utils/fechasReserva'
import type { Reserva } from './types'

const r = (inicio: number, horas: number, extra: Partial<Reserva> = {}): Reserva => ({
  id: 'reserva-prueba',
  canchaId: 1,
  fecha: '2026-10-20',
  inicio,
  horas,
  alias: 'Equipo Prueba',
  celular: 'sin-celular',
  estado: 'activo',
  ...extra,
})

assert.ok(chocan(r(8, 2), r(9, 1)), '8-10 choca con 9-10')
assert.ok(chocan(r(9, 1), r(8, 2)), 'y al revés también')
assert.ok(chocan(r(8, 1), r(8, 1)), 'misma hora choca')
assert.ok(!chocan(r(8, 1), r(9, 1)), '8-9 NO choca con 9-10')
assert.ok(!chocan(r(8, 1), r(8, 1, { canchaId: 2 })), 'otra cancha no choca')
assert.ok(!chocan(r(8, 1), r(8, 1, { fecha: '2026-10-21' })), 'otro día no choca')

const ahora = new Date('2026-10-19T12:00')
assert.equal(fechaISO(sumarDias(13, new Date('2026-10-24T12:00'))), '2026-11-06', 'el selector puede llegar hasta 13 días después de hoy')
const lista = horarios([r(19, 2)], 1, '2026-10-20', 1, ahora)
assert.equal(lista[0]!.inicio, 7, 'abre a las 7')
assert.equal(lista.at(-1)!.inicio, 24, 'última hora de 1h empieza a medianoche')
assert.ok(!lista.find((h) => h.inicio === 20)!.libre, '8pm ocupada por la reserva 7-9')
assert.ok(horarios([r(20, 1, { estado: 'cancelado' })], 1, '2026-10-20', 1, ahora).find((h) => h.inicio === 20)!.libre, 'una cancelada libera la hora')
assert.equal(horarios([], 1, '2026-10-20', 2, ahora).at(-1)!.inicio, 23, 'última de 2h empieza a las 11pm')
assert.equal(horarios([], 1, '2026-10-25', 3, ahora).at(-1)!.inicio, 22, 'última de 3h empieza a las 10pm')
assert.ok(horarios([], 1, '2026-10-20', 1, ahora).find((h) => h.inicio === 15 && !h.libre), 'el entrenamiento del martes bloquea las 3pm')
assert.ok(horarios([], 1, '2026-10-20', 1, ahora).find((h) => h.inicio === 19 && !h.libre), 'el entrenamiento hasta las 7:55pm bloquea las 7pm')
assert.ok(horarios([], 1, '2026-10-20', 1.5, ahora).find((h) => h.inicio === 19 && !h.libre), 'una duración de 1.5h también cruza el entrenamiento')
assert.ok(horarios([], 1, '2026-10-20', 1, ahora).find((h) => h.inicio === 20 && h.libre), 'las 8pm quedan libres después del entrenamiento')
assert.ok(!horarios([], 1, '2026-10-20', 2, ahora).find((h) => h.inicio === 14)!.libre, 'una reserva de 2h que cruza el entrenamiento queda ocupada')
assert.equal(esDuracionValida(2.5), true, 'acepta una duración de 2.5 horas')
assert.equal(DURACION_BLOQUE, 0.5, 'los horarios se consultan en bloques de media hora')
assert.equal(esDuracionValida(0.5), true, 'una reserva aislada puede durar media hora')
assert.ok(horarios([], 1, '2026-10-25', DURACION_BLOQUE, ahora).some((h) => h.inicio === 7 && h.libre), 'la disponibilidad sí puede consultar bloques de media hora')
assert.equal(rangoLibre([{ inicio: 7, libre: true }], 7, 0.5), true, 'un bloque libre aislado forma una reserva de media hora')
assert.equal(rangoLibre([{ inicio: 7, libre: true }, { inicio: 7.5, libre: true }], 7, 1), true, 'dos bloques libres forman una hora')
assert.equal(rangoLibre([{ inicio: 7, libre: true }, { inicio: 7.5, libre: false }, { inicio: 8, libre: true }], 7, 1.5), false, 'un bloque ocupado rompe la continuidad')
assert.equal(esBloqueAislado([
  { inicio: 7, libre: true },
  { inicio: 7.5, libre: false },
  { inicio: 8, libre: false },
], 7), true, 'un bloque libre al abrir puede reservarse por media hora')
assert.equal(esBloqueAislado([
  { inicio: 23.5, libre: false },
  { inicio: 24, libre: true },
], 24), true, 'un bloque libre al cierre puede reservarse por media hora')
assert.equal(esBloqueAislado([
  { inicio: 10, libre: false },
  { inicio: 10.5, libre: true },
  { inicio: 11, libre: false },
], 10.5), true, 'un bloque libre entre bloques ocupados puede reservarse por media hora')
assert.equal(esBloqueAislado([
  { inicio: 12, libre: true },
  { inicio: 12.5, libre: true },
  { inicio: 13, libre: false },
], 12), false, 'una secuencia libre no debe iniciar como media hora aislada')
assert.deepEqual(
  horarios([], 1, '2026-10-25', 1, ahora).slice(0, 4).map((h) => h.inicio),
  [7, 7.5, 8, 8.5],
  'genera inicios cada 30 minutos',
)
assert.equal(horarios([], 1, '2026-10-25', 2.5, ahora).at(-1)!.inicio, 22.5, '2.5h puede terminar a la 1am')
const reservaMediaHora = horarios([r(9.5, 1, { fecha: '2026-10-25' })], 1, '2026-10-25', 1, ahora)
assert.equal(reservaMediaHora.find((h) => h.inicio === 10)!.libre, false, '10:00 se solapa con 9:30-10:30')
assert.equal(reservaMediaHora.find((h) => h.inicio === 10.5)!.libre, true, '10:30 queda libre después de 9:30-10:30')
const reservaDeOcho = horarios([r(8, 1.5, { fecha: '2026-10-25' })], 1, '2026-10-25', 1.5, ahora)
assert.equal(reservaDeOcho.find((h) => h.inicio === 7.5)!.libre, false, '7:30 se solapa con 8:00-9:30')
assert.equal(reservaDeOcho.find((h) => h.inicio === 8.5)!.libre, false, '8:30 se solapa con 8:00-9:30')
assert.equal(reservaDeOcho.find((h) => h.inicio === 9.5)!.libre, true, '9:30 queda libre al terminar la reserva')
assert.ok(entrenamientoBloquea(4, 0, 21, 1) === false, 'el domingo no tiene entrenamiento de vóley')
assert.ok(entrenamientoBloquea(4, 6, 9, 1), 'el sábado el vóley está bloqueado a las 9am')
assert.ok(entrenamientoBloquea(4, 6, 11.5, 0.5), 'el sábado el vóley está bloqueado hasta las 12pm')
assert.ok(!entrenamientoBloquea(4, 6, 12, 1), 'el sábado el vóley está libre a las 12pm')
assert.ok(!entrenamientoBloquea(4, 6, 21, 1), 'el sábado en la noche el vóley está libre')
assert.ok(horarios([], 1, '2026-10-19', 1, ahora).every((h) => h.inicio > 12), 'hoy no muestra horas pasadas')
assert.equal(masCercana(lista, 19)!.inicio, 21, 'sugiere la libre más cercana')
assert.deepEqual(
  ocultarHorariosPasados(
    [{ inicio: 8, libre: false }, { inicio: 18, libre: false }, { inicio: 19, libre: false }, { inicio: 20, libre: true }],
    '2026-10-22',
    new Date('2026-10-22T23:30:00.000Z'),
  ),
  [{ inicio: 19, libre: false }, { inicio: 20, libre: true }],
  'oculta horas pasadas y conserva las futuras aunque estén ocupadas',
)

assert.equal(rangoHablado(20, 1), 'de 8 a 9 de la noche')
assert.equal(rangoHablado(11, 2), 'de 11 a 1 de la tarde')
assert.equal(horaVisible(9.5), '9:30 a. m.', 'muestra los minutos de una duración de media hora')
assert.equal(horaVisible(24.5), '12:30 a. m.', 'muestra correctamente la medianoche y media')
assert.equal(rangoVisible(22, 3), '10 p. m. a 1 a. m.', 'una reserva de 3 horas puede terminar a la 1 a. m.')

const mio = { celular: '999' }
const mias = deCliente(
  [r(20, 1, mio), r(9, 1, { ...mio, fecha: '2026-10-19' }), r(15, 1, { fecha: '2026-10-21', ...mio }), r(10, 1)],
  '999',
  ahora,
)
assert.deepEqual(mias.map((x) => x.inicio), [20, 15], 'solo las mías y sin las ya jugadas, en orden')
assert.deepEqual(
  deCliente([r(20, 1, { ...mio, estado: 'cancelado' })], '999', ahora),
  [],
  'las canceladas no aparecen entre las reservas del cliente',
)

const a15 = r(15, 1, { fecha: '2026-10-19' }) // ahora son las 12:00 del 19
assert.ok(sePuedeCancelar(a15, ahora), 'antes de empezar: se puede cancelar')
assert.ok(sePuedeCancelar(a15, new Date('2026-10-19T12:01')), 'con poca anticipación: también se puede')
assert.ok(sePuedeCancelar(a15, new Date('2026-10-19T15:00')), 'después de empezar: también se puede cancelar')

console.log('✔ reservas.ts OK')
