// Corre con: npm run check
import assert from 'node:assert/strict'
import { chocan, horarios, masCercana, rangoHablado, deCliente, sePuedeCancelar, ocultarHorariosPasados } from './reservas'
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
const lista = horarios([r(19, 2)], 1, '2026-10-20', 1, ahora)
assert.equal(lista[0]!.inicio, 8, 'abre a las 8')
assert.equal(lista.at(-1)!.inicio, 22, 'última hora de 1h empieza a las 10pm')
assert.ok(!lista.find((h) => h.inicio === 20)!.libre, '8pm ocupada por la reserva 7-9')
assert.ok(horarios([r(20, 1, { estado: 'cancelado' })], 1, '2026-10-20', 1, ahora).find((h) => h.inicio === 20)!.libre, 'una cancelada libera la hora')
assert.equal(horarios([], 1, '2026-10-20', 2, ahora).at(-1)!.inicio, 21, 'última de 2h empieza a las 9pm')
assert.ok(horarios([], 1, '2026-10-19', 1, ahora).every((h) => h.inicio > 12), 'hoy no muestra horas pasadas')
assert.equal(masCercana(lista, 19)!.inicio, 18, 'sugiere la libre más cercana')
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
