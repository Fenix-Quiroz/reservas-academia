import type { RefObject } from 'react'
import type { Campo, Cliente, Reserva } from '../../types.js'
import DatosReserva from './DatosReserva.js'

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
const ref: RefObject<HTMLHeadingElement | null> = { current: null }

const vista = DatosReserva({
  cancha,
  dia: 0,
  fecha: '2026-10-21',
  horas: 1,
  inicio: 10,
  onInicioChange: (inicio) => inicio,
  yo: null,
  onRememberClient: (cliente: Cliente) => cliente,
  onForgetClient: () => undefined,
  onBack: () => undefined,
  onViewBookings: () => undefined,
  onReserved: (reserva: Reserva) => reserva,
  tituloRef: ref,
  actions: {
    createClient: async () => ({ cliente: { alias: 'Juan', celular: '987654321' } }),
    findClient: async (): Promise<Cliente | null> => null,
    reserve: async () => ({ reserva: { id: '1', canchaId: 1, fecha: '2026-10-21', inicio: 10, horas: 1, alias: 'Juan', celular: '987654321', estado: 'activo' } }),
  },
})

void vista
