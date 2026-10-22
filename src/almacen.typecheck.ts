import type { Cliente, Reserva, ReservaNueva } from './types.js'
import {
  actualizarCliente,
  buscarPorCelular,
  cancelarReserva,
  cargarReservas,
  crearReserva,
  guardarYo,
  leerReservas,
  leerYo,
  limpiarDatosLocales,
  olvidarYo,
  registrarCliente,
} from './almacen.js'

const cliente: Cliente = { alias: 'Equipo Jaguar', celular: '987654321' }
const nueva: ReservaNueva = {
  canchaId: 1,
  fecha: '2026-10-21',
  inicio: 20,
  horas: 1,
  ...cliente,
}

const reservas: Reserva[] = leerReservas()
const carga = cargarReservas()
const creada = crearReserva(nueva)
const cancelada = cancelarReserva('reserva-1')
const encontrada = buscarPorCelular(cliente.celular)
const registrada = registrarCliente(cliente.alias, cliente.celular)
const actualizada = actualizarCliente(cliente.celular, cliente.alias, cliente.celular)
const yo: Cliente | null = leerYo()
const guardar: void = guardarYo(cliente)
const olvidar: void = olvidarYo()
const limpiar: void = limpiarDatosLocales()

void [reservas, carga, creada, cancelada, encontrada, registrada, actualizada, yo, guardar, olvidar, limpiar]
