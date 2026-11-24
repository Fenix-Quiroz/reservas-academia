import type { Reserva } from './types.js'

export function esTicket(reserva: Reserva): boolean {
  return reserva.estado === 'finalizado'
    && (reserva.pagoEstado === 'confirmado' || reserva.pagoEstado === 'no_requerido')
}

export function contarTickets(reservas: readonly Reserva[], celular: string): number {
  return reservas.filter((reserva) => reserva.celular === celular && esTicket(reserva)).length
}
