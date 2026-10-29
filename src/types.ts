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

export type EstadoPago = 'no_requerido' | 'pendiente' | 'confirmado' | 'rechazado'

export type EstadoPagoAdmin = 'pendiente' | 'confirmado' | 'rechazado' | 'anulado'

export interface ComprobanteAdmin {
  pagoId: string
  reservaId: string
  estado: EstadoPagoAdmin
  storagePath: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  sizeBytes: number
  createdAt?: string
}

export type EstadoBloqueoEvento = 'activo' | 'cancelado'
export type TipoEventoEspecial = 'individual' | 'todos_los_campos'

export interface Reserva {
  id: string
  canchaId: number
  fecha: string
  inicio: number
  horas: number
  alias: string
  celular: string
  estado: EstadoReserva
  pagoEstado?: EstadoPago
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
  grupoId?: string
  tipo?: TipoEventoEspecial
  precioCobrado?: number
  createdAt?: string
}

export type ReservaNueva = Omit<Reserva, 'id' | 'estado'>

export type VistaAdmin = 'proximas' | 'en-curso' | 'por-revisar' | 'historial' | 'finalizadas' | 'no-asistieron' | 'canceladas' | 'todas'
export type FiltroFecha = 'todas' | string
export type FiltroCancha = 'todas' | number | string

export interface FiltrosAdmin {
  vista: VistaAdmin
  fecha: FiltroFecha
  canchaId: FiltroCancha
  buscar: string
}
