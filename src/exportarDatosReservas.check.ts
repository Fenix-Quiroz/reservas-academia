import assert from 'node:assert/strict'
import { prepararFilasDatosReservas } from './exportarDatosReservas.js'
import type { Campo, ComprobanteAdmin, Reserva } from './types.js'

const canchas: Campo[] = [
  { id: 1, nombre: 'Campo 1', deporte: 'Fútbol 6', jugadores: 6, precioHora: 55, color: '', imagen: '', oferta: '' },
  { id: 2, nombre: 'Campo 2', deporte: 'Fútbol 7', jugadores: 7, precioHora: 70, color: '', imagen: '', oferta: '' },
]

const reserva = (datos: Partial<Reserva> & Pick<Reserva, 'id' | 'fecha' | 'inicio' | 'alias' | 'celular'>): Reserva => ({
  canchaId: 1,
  horas: 1,
  estado: 'finalizado',
  ...datos,
})

const reservas: Reserva[] = [
  reserva({ id: 'r1', fecha: '2026-11-05', inicio: 20, horas: 1.5, alias: 'Cliente Tres A', celular: '912345678' }),
  reserva({ id: 'r2', fecha: '2026-11-01', inicio: 18, horas: 2, alias: 'Cliente Tres', celular: '912345678' }),
  reserva({ id: 'r3', fecha: '2026-11-03', inicio: 19, alias: 'Cliente Tres B', celular: '912345678' }),
  reserva({ id: 'r4', fecha: '2026-11-02', inicio: 21, alias: 'Cliente Uno', celular: '923456789' }),
  reserva({ id: 'r5', canchaId: 2, fecha: '2026-11-02', inicio: 17, alias: 'Cliente Campo Dos', celular: '934567890' }),
]

const comprobante = (reservaId: string, numero: number): ComprobanteAdmin => ({
  pagoId: `pago-${numero}`,
  reservaId,
  estado: 'confirmado',
  storagePath: `comprobantes/${reservaId}.png`,
  mimeType: 'image/png',
  sizeBytes: 100 + numero,
})

const filas = prepararFilasDatosReservas(reservas, canchas, [
  comprobante('r1', 1),
  comprobante('r2', 2),
  comprobante('r3', 3),
  comprobante('r4', 4),
])

assert.equal(filas.length, reservas.length, 'cada reserva debe conservar su propia fila')
assert.deepEqual(
  filas.map((fila) => fila.reservaId),
  ['r2', 'r3', 'r1', 'r4', 'r5'],
  'el cliente con tres reservas debe aparecer primero y sus filas deben ordenarse por fecha',
)
assert.deepEqual(
  filas.slice(0, 3).map((fila) => fila.comprobante?.storagePath),
  ['comprobantes/r2.png', 'comprobantes/r3.png', 'comprobantes/r1.png'],
  'cada fila debe conservar el comprobante de su reserva',
)
assert.deepEqual(filas.slice(0, 3).map((fila) => fila.celular), ['912345678', '912345678', '912345678'])
assert.deepEqual(filas.slice(0, 3).map((fila) => fila.campoId), [1, 1, 1])
assert.equal(filas[3]?.campoId, 1)
assert.equal(filas[4]?.campoId, 2)

console.log('✔ exportarDatosReservas.check.ts: prepara una fila por reserva y ordena por frecuencia')
