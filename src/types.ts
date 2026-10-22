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

export interface Reserva {
  id: string
  canchaId: number
  fecha: string
  inicio: number
  horas: number
  alias: string
  celular: string
  nombre?: string
}

export type ReservaNueva = Omit<Reserva, 'id'>

export type VistaAdmin = 'proximas' | 'todas'
export type FiltroFecha = 'todas' | string
export type FiltroCancha = 'todas' | number | string

export interface FiltrosAdmin {
  vista: VistaAdmin
  fecha: FiltroFecha
  canchaId: FiltroCancha
  buscar: string
}
