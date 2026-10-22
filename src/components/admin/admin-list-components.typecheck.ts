import type { Campo, EstadoReserva, FiltrosAdmin, Reserva } from '../../types.js'
import AdminFiltros from './AdminFiltros.js'
import AdminListado from './AdminListado.js'
import AdminReservaCard from './AdminReservaCard.js'

const cancha: Campo = {
  id: 1,
  nombre: 'Campo 1',
  deporte: 'Fútbol 5',
  jugadores: 5,
  precioHora: 60,
  color: '#996400',
  imagen: '/campos/campo-1-futbol-5.webp',
  oferta: 'Agua incluida',
}

const reserva: Reserva = {
  id: 'reserva-1',
  canchaId: cancha.id,
  fecha: '2026-10-22',
  inicio: 18,
  horas: 1,
  alias: 'Luis',
  celular: '999999999',
  estado: 'activo',
}

const filtros: FiltrosAdmin = {
  vista: 'proximas',
  fecha: 'todas',
  canchaId: 'todas',
  buscar: '',
}

const filtrosNode = AdminFiltros({
  filtros,
  canchas: [cancha],
  onChange: (_siguiente: Partial<FiltrosAdmin>) => undefined,
})

const listadoNode = AdminListado({
  visibles: [reserva],
  cargando: false,
  canchas: [cancha],
  porCancelar: null,
  cancelando: null,
  onRequestCancel: (_id: string) => undefined,
  onCancel: async (_id: string) => undefined,
  onCancelRequest: () => undefined,
  onStatus: async (_id: string, _estado: EstadoReserva) => undefined,
  actualizandoEstado: null,
})

const cardNode = AdminReservaCard({
  reserva,
  cancha,
  puedeCancelar: true,
  porCancelar: null,
  cancelando: null,
  onRequestCancel: () => undefined,
  onCancel: async (_id: string) => undefined,
  onCancelRequest: () => undefined,
  onStatus: async (_id: string, _estado: EstadoReserva) => undefined,
  actualizandoEstado: null,
})

void [filtrosNode, listadoNode, cardNode]
