import type { ClienteFrecuente } from './clientesFrecuentes.js'
import { esTicket } from './tickets.js'
import type { Reserva } from './types.js'
import type { ParticipanteSorteo, TicketSorteo } from './sorteoDemo.js'

export interface PreparacionSorteoReal {
  participantes: ParticipanteSorteo[]
  tickets: TicketSorteo[]
  reservasElegibles: Reserva[]
}

function tiempoDeCreacion(reserva: Reserva): number | null {
  if (!reserva.createdAt) return null
  const tiempo = Date.parse(reserva.createdAt)
  return Number.isFinite(tiempo) ? tiempo : null
}

export function filtrarReservasSorteo(
  reservas: readonly Reserva[],
  desde: string | null | undefined,
  hasta: string,
): Reserva[] {
  const desdeMs = desde ? Date.parse(desde) : null
  const hastaMs = Date.parse(hasta)
  if ((desdeMs !== null && !Number.isFinite(desdeMs)) || !Number.isFinite(hastaMs)) return []

  return reservas
    .filter((reserva) => {
      if (!esTicket(reserva)) return false
      const creadoMs = tiempoDeCreacion(reserva)
      if (creadoMs === null) return false
      return (desdeMs === null || creadoMs > desdeMs) && creadoMs <= hastaMs
    })
    .sort((a, b) => {
      const tiempoA = tiempoDeCreacion(a) ?? 0
      const tiempoB = tiempoDeCreacion(b) ?? 0
      return tiempoA - tiempoB || a.id.localeCompare(b.id)
    })
}

function claveCliente(reserva: Reserva): string {
  return reserva.clienteId ?? reserva.celular
}

function crearCliente(clienteKey: string, reservas: readonly Reserva[]): ClienteFrecuente {
  const ordenadas = [...reservas].sort((a, b) => (tiempoDeCreacion(b) ?? 0) - (tiempoDeCreacion(a) ?? 0))
  const ultima = ordenadas[0] ?? reservas[0]
  const totalHoras = reservas.reduce((total, reserva) => total + reserva.horas, 0)
  return {
    id: `cliente-${clienteKey}`,
    nombre: ultima?.alias ?? 'Cliente sin nombre',
    celular: ultima?.celular ?? '',
    reservasTotal: reservas.length,
    reservasMes: reservas.length,
    horasTotales: totalHoras,
    ultimaReserva: ultima?.fecha ?? '',
    canchaFavorita: ultima ? `Cancha ${ultima.canchaId}` : '—',
  }
}

function ordenarParticipantes(a: ParticipanteSorteo, b: ParticipanteSorteo): number {
  return b.tickets - a.tickets
    || a.cliente.nombre.localeCompare(b.cliente.nombre, 'es', { sensitivity: 'base' })
    || a.cliente.celular.localeCompare(b.cliente.celular)
}

function agregarProbabilidades(
  participantesBase: Array<Omit<ParticipanteSorteo, 'probabilidad'>>,
): ParticipanteSorteo[] {
  const totalTickets = participantesBase.reduce((total, participante) => total + participante.tickets, 0)
  let probabilidadAcumulada = 0

  return participantesBase.map((participante, index) => {
    const probabilidad = index === participantesBase.length - 1
      ? Math.max(0, Math.round((100 - probabilidadAcumulada) * 10) / 10)
      : totalTickets > 0
        ? Math.round((participante.tickets / totalTickets) * 1000) / 10
        : 0
    probabilidadAcumulada += probabilidad
    return { ...participante, probabilidad }
  }).sort(ordenarParticipantes)
}

export function prepararSorteoReal(
  reservas: readonly Reserva[],
  desde: string | null | undefined,
  hasta: string,
): PreparacionSorteoReal {
  const reservasElegibles = filtrarReservasSorteo(reservas, desde, hasta)
  const porCliente = new Map<string, Reserva[]>()

  for (const reserva of reservasElegibles) {
    const clienteKey = claveCliente(reserva)
    const actuales = porCliente.get(clienteKey) ?? []
    actuales.push(reserva)
    porCliente.set(clienteKey, actuales)
  }

  const grupos = [...porCliente.entries()]
    .map(([clienteKey, reservasCliente]) => ({ clienteKey, reservas: reservasCliente }))
    .sort((a, b) => a.clienteKey.localeCompare(b.clienteKey))

  const participantes = agregarProbabilidades(grupos.map((grupo) => ({
    cliente: crearCliente(grupo.clienteKey, grupo.reservas),
    tickets: grupo.reservas.length,
  })))

  const participantesPorCliente = new Map(participantes.map((participante) => [participante.cliente.id, participante]))
  const ticketsPorCliente = new Map<string, number>()
  const tickets = reservasElegibles.map((reserva, index) => {
    const clienteKey = claveCliente(reserva)
    const clienteId = `cliente-${clienteKey}`
    const participante = participantesPorCliente.get(clienteId)
    const ticketIndex = (ticketsPorCliente.get(clienteKey) ?? 0) + 1
    ticketsPorCliente.set(clienteKey, ticketIndex)
    return {
      id: reserva.id,
      clienteId: participante?.cliente.id ?? clienteId,
      nombre: participante?.cliente.nombre ?? reserva.alias,
      celular: reserva.celular,
      ticketIndex,
      totalTickets: participante?.tickets ?? 1,
      numeroGlobal: index + 1,
    }
  })

  return { participantes, tickets, reservasElegibles }
}

export function crearParticipantesDesdeTickets(tickets: readonly TicketSorteo[]): ParticipanteSorteo[] {
  const porCliente = new Map<string, TicketSorteo[]>()

  for (const ticket of tickets) {
    const actuales = porCliente.get(ticket.clienteId) ?? []
    actuales.push(ticket)
    porCliente.set(ticket.clienteId, actuales)
  }

  return agregarProbabilidades([...porCliente.entries()].map(([clienteId, ticketsCliente]) => {
    const ultimoTicket = ticketsCliente[ticketsCliente.length - 1] ?? ticketsCliente[0]
    const cliente: ClienteFrecuente = {
      id: clienteId,
      nombre: ultimoTicket?.nombre ?? 'Cliente sin nombre',
      celular: ultimoTicket?.celular ?? '',
      reservasTotal: ticketsCliente.length,
      reservasMes: ticketsCliente.length,
      horasTotales: 0,
      ultimaReserva: '',
      canchaFavorita: '—',
    }
    return { cliente, tickets: ticketsCliente.length }
  }))
}
