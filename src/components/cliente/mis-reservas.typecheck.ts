import type { RefObject } from 'react'
import type { Campo, Cliente, Reserva } from '../../types.js'
import MisReservas from './MisReservas.js'

const cliente: Cliente = { alias: 'Juan', celular: '987654321' }
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
const reserva: Reserva = {
  id: 'reserva-1',
  canchaId: 1,
  fecha: '2026-10-22',
  inicio: 18,
  horas: 1,
  alias: cliente.alias,
  celular: cliente.celular,
}

const vista = MisReservas({
  reservas: [reserva],
  yo: cliente,
  canchas: [cancha],
  onCancel: async () => ({}),
  onUpdateData: async () => ({ cliente }),
  onReserve: () => undefined,
  tituloRef: { current: null } satisfies RefObject<HTMLHeadingElement | null>,
})

void vista
