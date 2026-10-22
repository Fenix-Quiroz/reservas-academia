import type { EstadoReserva, Reserva } from './types.js'

export const ESTADOS_RESERVA = ['activo', 'iniciado', 'finalizado', 'cancelado'] as const satisfies readonly EstadoReserva[]

export function esEstadoReserva(valor: unknown): valor is EstadoReserva {
  return typeof valor === 'string' && ESTADOS_RESERVA.includes(valor as EstadoReserva)
}

export function normalizarEstado(valor: unknown): EstadoReserva {
  return esEstadoReserva(valor) ? valor : 'activo'
}

type ReservaConEstadoOpcional = Omit<Reserva, 'estado'> & { estado?: unknown }

export function normalizarReserva(reserva: ReservaConEstadoOpcional): Reserva {
  return {
    ...reserva,
    estado: normalizarEstado(reserva.estado),
  }
}

export function puedeCambiarEstado(actual: EstadoReserva, siguiente: EstadoReserva): boolean {
  if (actual === 'activo') return siguiente === 'iniciado' || siguiente === 'cancelado'
  if (actual === 'iniciado') return siguiente === 'finalizado' || siguiente === 'cancelado'
  return false
}
