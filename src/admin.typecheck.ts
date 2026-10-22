import type { Campo, FiltrosAdmin, Reserva } from './types.js'
import {
  filtrarReservas,
  ordenarReservas,
  precioDeReserva,
  resumenAdmin,
} from './admin.js'

const campo = {
  id: 1,
  nombre: 'Campo 1',
  deporte: 'Fútbol 5',
  jugadores: 5,
  precioHora: 60,
  color: '#a97818',
  imagen: '/campos/campo-1-futbol-5.webp',
  oferta: 'Alquila este campo y recibe 1 agua de 625 ml',
} satisfies Campo

const reserva = {
  id: 'reserva-1',
  canchaId: campo.id,
  fecha: '2026-10-21',
  inicio: 20,
  horas: 1,
  alias: 'Equipo Jaguar',
  celular: '987654321',
  estado: 'activo',
} satisfies Reserva

const filtros = {
  vista: 'proximas',
  fecha: 'todas',
  canchaId: 'todas',
  buscar: '',
} satisfies FiltrosAdmin

const precio: number = precioDeReserva(reserva, [campo])
const orden: number = ordenarReservas(reserva, reserva)
const visibles: Reserva[] = filtrarReservas([reserva], filtros, [campo])
const resumen: { proximas: number; hoy: number } = resumenAdmin([reserva])

void [precio, orden, visibles, resumen]
