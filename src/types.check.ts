import type {
  Campo,
  Cliente,
  FiltrosAdmin,
  Reserva,
  ReservaNueva,
} from './types.js'

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

const cliente = {
  alias: 'Equipo Jaguar',
  celular: '987654321',
} satisfies Cliente

const reserva = {
  id: 'reserva-1',
  canchaId: campo.id,
  fecha: '2026-10-21',
  inicio: 20,
  horas: 1,
  alias: cliente.alias,
  celular: cliente.celular,
  estado: 'activo',
} satisfies Reserva

const nuevaReserva = {
  canchaId: reserva.canchaId,
  fecha: reserva.fecha,
  inicio: reserva.inicio,
  horas: reserva.horas,
  alias: reserva.alias,
  celular: reserva.celular,
} satisfies ReservaNueva

const filtros = {
  vista: 'proximas',
  fecha: 'todas',
  canchaId: 'todas',
  buscar: '',
} satisfies FiltrosAdmin

void [campo, cliente, reserva, nuevaReserva, filtros]
