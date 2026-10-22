import type { Reserva } from './types.js'
import {
  ABRE,
  CIERRA,
  MAX_ACTIVAS,
  activa,
  chocan,
  deCliente,
  fechaISO,
  horarios,
  masCercana,
  rango,
  rangoHablado,
  sePuedeCancelar,
  sumarDias,
} from './reservas.js'

const reserva = {
  id: 'reserva-1',
  canchaId: 1,
  fecha: '2026-10-21',
  inicio: 20,
  horas: 1,
  alias: 'Equipo Jaguar',
  celular: '987654321',
} satisfies Reserva

const lista = horarios([reserva], 1, reserva.fecha, 1, new Date('2026-10-20T12:00'))
const cercana = masCercana(lista, 20)

const constantes: [number, number, number] = [ABRE, CIERRA, MAX_ACTIVAS]
const fechas: [string, Date] = [fechaISO(new Date()), sumarDias(1)]
const textos: [string, string] = [rango(20, 1), rangoHablado(20, 1)]
const estados: [boolean, boolean, Reserva[]] = [
  chocan(reserva, reserva),
  activa(reserva),
  deCliente([reserva], reserva.celular),
]
const cancelable: boolean = sePuedeCancelar(reserva)

void [constantes, fechas, textos, estados, cancelable, cercana]
