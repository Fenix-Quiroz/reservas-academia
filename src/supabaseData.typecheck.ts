import type { Cliente, Reserva, ReservaNueva } from './types.js'
import {
  aReserva,
  actualizarClienteRemoto,
  actualizarEstadoReservaRemota,
  buscarClienteRemoto,
  cancelarReservaRemota,
  crearReservaRemota,
  deReserva,
  errorDeSupabase,
  leerReservasRemotas,
  registrarClienteRemoto,
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
const cliente: Promise<Cliente | null> = buscarClienteRemoto(reserva.celular)
const reservas: Promise<Reserva[]> = leerReservasRemotas()
const nuevaRemota = crearReservaRemota(nueva)
const cancelada = cancelarReservaRemota(reserva.id)
const estadoActualizado = actualizarEstadoReservaRemota(reserva.id, 'iniciado')
const registrada = registrarClienteRemoto(reserva.alias, reserva.celular)
const actualizada = actualizarClienteRemoto(reserva.celular, reserva.alias, reserva.celular)
const error = errorDeSupabase({ code: '23P01' })
const dejarDeEscuchar: () => void = suscribirseAReservas(() => {})

void [remota, cliente, reservas, nuevaRemota, cancelada, estadoActualizado, registrada, actualizada, error, dejarDeEscuchar]
