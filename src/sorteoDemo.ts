import type { ClienteFrecuente } from './clientesFrecuentes'
import datosDemo from './data/clientes-frecuentes-demo.json'

export const DATOS_SORTEO_DEMO: readonly ClienteFrecuente[] = datosDemo

export interface ParticipanteSorteo {
  cliente: ClienteFrecuente
  tickets: number
  probabilidad: number
}

export interface TicketSorteo {
  id: string
  clienteId: string
  nombre: string
  celular: string
  ticketIndex: number
  totalTickets: number
  numeroGlobal: number
}

export function crearParticipantesDemo(
  clientes: readonly ClienteFrecuente[],
): ParticipanteSorteo[] {
  const totalTickets = clientes.reduce((total, cliente) => total + Math.max(0, cliente.reservasMes), 0)
  let probabilidadAcumulada = 0

  return clientes.map((cliente, index) => {
    const tickets = Math.max(0, cliente.reservasMes)
    const probabilidad = index === clientes.length - 1
      ? Math.max(0, Math.round((100 - probabilidadAcumulada) * 10) / 10)
      : totalTickets > 0
        ? Math.round((tickets / totalTickets) * 1000) / 10
        : 0

    probabilidadAcumulada += probabilidad
    return { cliente, tickets, probabilidad }
  })
}

export function crearTicketsDemo(
  participantes: readonly ParticipanteSorteo[],
): TicketSorteo[] {
  const colas = participantes
    .filter((participante) => participante.tickets > 0)
    .map((participante) => ({
      clienteId: participante.cliente.id,
      nombre: participante.cliente.nombre,
      celular: participante.cliente.celular,
      totalTickets: participante.tickets,
      restantes: participante.tickets,
    }))
    .sort((a, b) => b.restantes - a.restantes || a.clienteId.localeCompare(b.clienteId))

  const totalTickets = colas.reduce((total, cola) => total + cola.totalTickets, 0)
  const tickets: TicketSorteo[] = []
  let ultimoId = ''
  let penultimoId = ''

  for (let numeroGlobal = 1; numeroGlobal <= totalTickets; numeroGlobal += 1) {
    const cola = colas.find((item) => item.restantes > 0 && item.clienteId !== ultimoId && item.clienteId !== penultimoId)
      ?? colas.find((item) => item.restantes > 0 && item.clienteId !== ultimoId)
      ?? colas.find((item) => item.restantes > 0)

    if (!cola) break

    const ticketIndex = cola.totalTickets - cola.restantes + 1
    tickets.push({
      id: `${cola.clienteId}-t${ticketIndex}`,
      clienteId: cola.clienteId,
      nombre: cola.nombre,
      celular: cola.celular,
      ticketIndex,
      totalTickets: cola.totalTickets,
      numeroGlobal,
    })

    cola.restantes -= 1
    penultimoId = ultimoId
    ultimoId = cola.clienteId
    colas.sort((a, b) => b.restantes - a.restantes || a.clienteId.localeCompare(b.clienteId))
  }

  return tickets
}

export function ventanaSlot(tickets: readonly TicketSorteo[], indice: number): TicketSorteo[] {
  if (tickets.length === 0) return []
  const indiceNormalizado = ((indice % tickets.length) + tickets.length) % tickets.length
  return [-2, -1, 0, 1, 2].map((desplazamiento) => {
    const posicion = (indiceNormalizado + desplazamiento + tickets.length) % tickets.length
    return tickets[posicion]
  })
}
