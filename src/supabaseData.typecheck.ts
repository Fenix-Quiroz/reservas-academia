import type { Reserva, ReservaNueva } from './types.js'
import {
  aReserva,
  actualizarEstadoReservaRemota,
  crearReservaPublicaRemota,
  deReserva,
  errorDeSupabase,
  leerReservasRemotas,
  suscribirseAReservas,
} from './supabaseData.js'

const reserva: Reserva = {
  id: 'reserva-1',
  canchaId: 1,
  fecha: '2026-10-21',
  inicio: 20,
  horas: 1,
  alias: 'Equipo Jaguar',
  celular: '987654321',
  estado: 'activo',
}

const nueva: ReservaNueva = {
  canchaId: reserva.canchaId,
  fecha: reserva.fecha,
  inicio: reserva.inicio,
  horas: reserva.horas,
  alias: reserva.alias,
  celular: reserva.celular,
}

const fila = aReserva(reserva)
const remota: Reserva = deReserva({
  ...fila,
  id: 'reserva-1',
  cancha_id: fila.cancha_id,
})
const reservas: Promise<Reserva[]> = leerReservasRemotas()
const nuevaRemota = crearReservaPublicaRemota(nueva)
const estadoActualizado = actualizarEstadoReservaRemota(reserva.id, 'iniciado')
const error = errorDeSupabase({ code: '23P01' })
const dejarDeEscuchar: () => void = suscribirseAReservas(() => {})

void [remota, reservas, nuevaRemota, estadoActualizado, error, dejarDeEscuchar]
