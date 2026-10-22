import type { RefObject } from 'react'
import type { Campo, Reserva } from '../../types.js'
import ReservaCompletada from './ReservaCompletada.js'

const reserva: Reserva = {
  id: 'reserva-1',
  canchaId: 1,
  fecha: '2026-10-22',
  inicio: 18,
  horas: 1,
  alias: 'Juan',
  celular: '987654321',
  estado: 'finalizado',
}
const cancha: Campo = {
  id: 1,
  nombre: 'Campo 1',
  deporte: 'Fútbol 5',
  jugadores: 5,
  precioHora: 60,
  color: '#a97818',
  imagen: '/campos/campo-1-futbol-5.webp',
  oferta: 'Alquila este campo y recibe 1 agua de 625 ml',
}

const vista = ReservaCompletada({
  reserva,
  cancha,
  dia: 0,
  onFinish: () => undefined,
  onViewBookings: () => undefined,
  tituloRef: { current: null } satisfies RefObject<HTMLHeadingElement | null>,
})

void vista
