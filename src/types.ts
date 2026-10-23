export interface Campo {
  id: number
  nombre: string
  deporte: string
  jugadores: number
  precioHora: number
  color: string
  imagen: string
  oferta: string
}

export interface Cliente {
  alias: string
  celular: string
}

export type EstadoReserva = 'activo' | 'iniciado' | 'finalizado' | 'cancelado' | 'no_asistio'

export type EstadoBloqueoEvento = 'activo' | 'cancelado'

export interface Reserva {
  id: string
  canchaId: number
  fecha: string
  inicio: number
  horas: number
  alias: string
  celular: string
  estado: EstadoReserva
  montoTotal?: number
  nombre?: string
}

export interface BloqueoEvento {
  id: string
  canchaId: number
  fecha: string
  inicio: number
  fin: number
  nombre: string
  celular: string
  notas: string
  estado: EstadoBloqueoEvento
  createdAt?: string
}

export type ReservaNueva = Omit<Reserva, 'id' | 'estado'>

export type VistaAdmin = 'proximas' | 'en-curso' | 'por-revisar' | 'finalizadas' | 'no-asistieron' | 'canceladas' | 'todas'
export type FiltroFecha = 'todas' | string
export type FiltroCancha = 'todas' | number | string

export interface FiltrosAdmin {
  vista: VistaAdmin
  fecha: FiltroFecha
  canchaId: FiltroCancha
  buscar: string
}
