import assert from 'node:assert/strict'
import {
  filtrarAlertasCanceladas,
  finDeReserva,
  ordenarPorFin,
  patronAlarma,
  reservaDePrueba,
  reservasDePrueba,
  reservasTerminadasParaAlerta,
} from './alarmaTurno'
import type { Reserva } from '../types'

const reserva = (id: string, inicio: number, horas: number): Reserva => ({
  id,
  canchaId: 1,
  fecha: '2026-10-22',
  inicio,
  horas,
  alias: 'Equipo Prueba',
  celular: '999999999',
  estado: 'finalizado',
})

const turno = reserva('turno-1', 14, 2)
const fin = finDeReserva(turno)

assert.equal(fin.getFullYear(), 2026)
assert.equal(fin.getMonth(), 9)
assert.equal(fin.getDate(), 22)
assert.equal(fin.getHours(), 16)
const mediaTurno = reserva('turno-media', 14, 1.5)
const finMediaTurno = finDeReserva(mediaTurno)
assert.equal(finMediaTurno.getHours(), 15)
assert.equal(finMediaTurno.getMinutes(), 30)
assert.deepEqual(
  ordenarPorFin([reserva('tarde', 18, 1), reserva('primero', 10, 1), reserva('medio', 14, 1)]).map(({ id }) => id),
  ['primero', 'medio', 'tarde'],
)

const prueba = reservaDePrueba(new Date(2026, 9, 22, 16, 30))
assert.equal(prueba.alias, 'Prueba de alarma')
assert.equal(finDeReserva(prueba).getHours(), 16)
assert.match(prueba.id, /^alarma-prueba-/)

assert.deepEqual(patronAlarma, {
  frecuenciaGrave: 440,
  frecuenciaAguda: 784,
  cambioDeTonoEn: 0.2,
  duracion: 0.7,
  intervalo: 2000,
})

const pruebas = reservasDePrueba(new Date(2026, 9, 22, 18, 30))
assert.equal(pruebas.length, 3)
assert.deepEqual(ordenarPorFin(pruebas).map(({ alias }) => alias), [
  'Prueba de alarma 1',
  'Prueba de alarma 2',
  'Prueba de alarma 3',
])

const instanteFin = new Date(2026, 9, 22, 16, 1).getTime()
const reservaActiva = { ...reserva('activa', 14, 2), estado: 'activo' as const }
const reservaCancelada = { ...reserva('cancelada', 14, 2), estado: 'cancelado' as const }
assert.deepEqual(
  reservasTerminadasParaAlerta([reservaActiva, reservaCancelada], new Set(), instanteFin).map(({ id }) => id),
  ['activa'],
)
assert.deepEqual(
  filtrarAlertasCanceladas([reservaActiva, reservaCancelada], [reservaActiva, reservaCancelada]).map(({ id }) => id),
  ['activa'],
)

console.log('✔ alarmaTurno.check.ts OK')
