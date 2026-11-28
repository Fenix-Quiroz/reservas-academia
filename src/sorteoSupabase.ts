import type { SupabaseClient } from '@supabase/supabase-js'
import type { TicketSorteo } from './sorteoDemo.js'
import { supabase } from './supabase.js'

export type EstadoSorteo = 'preparando' | 'ejecutado' | 'cancelado'

export interface ResumenSorteo {
  id: string
  numero: number
  estado: EstadoSorteo
  desde: string | null
  hasta: string
  totalReservas: number
  totalTickets: number
  ejecutadoAt?: string
}

export interface ResultadoSorteoRemoto {
  sorteo: ResumenSorteo
  tickets: TicketSorteo[]
  ganador: TicketSorteo
}

type Registro = Record<string, unknown>

function registro(valor: unknown, nombre: string): Registro {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error(`${nombre}-invalido`)
  return valor as Registro
}

function texto(valor: unknown, nombre: string): string {
  if (typeof valor !== 'string' || !valor) throw new Error(`${nombre}-invalido`)
  return valor
}

function entero(valor: unknown, nombre: string): number {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  if (!Number.isInteger(numero)) throw new Error(`${nombre}-invalido`)
  return numero
}

function normalizarTicket(valor: unknown): TicketSorteo {
  const ticket = registro(valor, 'ticket')
  return {
    id: texto(ticket.id, 'ticket-id'),
    clienteId: texto(ticket.clienteId, 'ticket-cliente'),
    nombre: texto(ticket.nombre, 'ticket-nombre'),
    celular: texto(ticket.celular, 'ticket-celular'),
    ticketIndex: entero(ticket.ticketIndex, 'ticket-index'),
    totalTickets: entero(ticket.totalTickets, 'ticket-total'),
    numeroGlobal: entero(ticket.numeroGlobal, 'ticket-numero'),
  }
}

function normalizarResumen(valor: unknown): ResumenSorteo {
  const sorteo = registro(valor, 'sorteo')
  const estado = texto(sorteo.estado, 'sorteo-estado')
  if (!['preparando', 'ejecutado', 'cancelado'].includes(estado)) throw new Error('sorteo-estado-invalido')
  const desde = sorteo.desde === null || sorteo.desde === undefined ? null : texto(sorteo.desde, 'sorteo-desde')
  return {
    id: texto(sorteo.id, 'sorteo-id'),
    numero: entero(sorteo.numero, 'sorteo-numero'),
    estado: estado as EstadoSorteo,
    desde,
    hasta: texto(sorteo.hasta, 'sorteo-hasta'),
    totalReservas: entero(sorteo.totalReservas, 'sorteo-reservas'),
    totalTickets: entero(sorteo.totalTickets, 'sorteo-tickets'),
    ...(typeof sorteo.ejecutadoAt === 'string' ? { ejecutadoAt: sorteo.ejecutadoAt } : {}),
  }
}

export function normalizarResultadoSorteo(valor: unknown): ResultadoSorteoRemoto {
  const resultado = registro(valor, 'resultado-sorteo')
  const ticketsValor = resultado.tickets
  if (!Array.isArray(ticketsValor)) throw new Error('sorteo-tickets-invalidos')
  return {
    sorteo: normalizarResumen(resultado.sorteo),
    tickets: ticketsValor.map(normalizarTicket),
    ganador: normalizarTicket(resultado.ganador),
  }
}

function clienteSupabase(): SupabaseClient {
  if (!supabase) throw new Error('supabase-no-configurado')
  return supabase
}

function normalizarFilaSorteo(fila: unknown): ResumenSorteo {
  const registroFila = registro(fila, 'sorteo')
  return normalizarResumen({
    id: registroFila.id,
    numero: registroFila.numero,
    estado: registroFila.estado,
    desde: registroFila.desde,
    hasta: registroFila.hasta,
    totalReservas: registroFila.total_reservas,
    totalTickets: registroFila.total_tickets,
    ejecutadoAt: registroFila.ejecutado_at,
  })
}

export async function leerUltimoSorteoRemoto(): Promise<ResumenSorteo | null> {
  const { data, error } = await clienteSupabase()
    .from('sorteos')
    .select('id, numero, estado, desde, hasta, total_reservas, total_tickets, ejecutado_at')
    .eq('estado', 'ejecutado')
    .order('ejecutado_at', { ascending: false })
    .order('hasta', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? normalizarFilaSorteo(data) : null
}

export async function leerUltimoResultadoRemoto(): Promise<TicketSorteo | null> {
  const { data, error } = await clienteSupabase()
    .from('sorteo_resultados')
    .select('ticket_id, numero, alias, celular')
    .order('seleccionado_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const resultado = registro(data, 'resultado-sorteo')
  const ticketId = texto(resultado.ticket_id, 'resultado-ticket')
  const { data: ticketData, error: ticketError } = await clienteSupabase()
    .from('sorteo_tickets')
    .select('cliente_key, ticket_index, total_tickets_cliente')
    .eq('id', ticketId)
    .maybeSingle()

  if (ticketError) throw ticketError
  if (!ticketData) throw new Error('resultado-ticket-inexistente')

  const ticket = registro(ticketData, 'ticket')
  return normalizarTicket({
    id: ticketId,
    clienteId: ticket.cliente_key,
    nombre: resultado.alias,
    celular: resultado.celular,
    ticketIndex: ticket.ticket_index,
    totalTickets: ticket.total_tickets_cliente,
    numeroGlobal: resultado.numero,
  })
}

export async function ejecutarSorteoRemoto(): Promise<ResultadoSorteoRemoto> {
  const { data, error } = await clienteSupabase().rpc('ejecutar_sorteo')
  if (error) throw error
  return normalizarResultadoSorteo(data)
}
