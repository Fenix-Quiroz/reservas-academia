import type { Campo, FiltrosAdmin, Reserva } from './types.js'
import { activa, fechaISO } from './reservas.js'

type CanchaAdmin = Pick<Campo, 'id' | 'nombre' | 'precioHora'>

export interface ResumenAdmin {
  proximas: number
  hoy: number
}

const texto = (valor: unknown): string => String(valor ?? '').trim().toLowerCase()

export const precioDeReserva = (reserva: Reserva, canchas: CanchaAdmin[]): number => {
  if (typeof reserva.montoTotal === 'number' && Number.isFinite(reserva.montoTotal)) return reserva.montoTotal
  const cancha = canchas.find((c) => c.id === reserva.canchaId)
  return (cancha?.precioHora ?? 0) * reserva.horas
}

export const ordenarReservas = (a: Reserva, b: Reserva): number =>
  a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio || a.canchaId - b.canchaId

const enCursoPorHora = (reserva: Reserva, ahora: Date): boolean =>
  reserva.fecha === fechaISO(ahora)
  && reserva.inicio <= ahora.getHours() + ahora.getMinutes() / 60
  && reserva.inicio + reserva.horas > ahora.getHours() + ahora.getMinutes() / 60

const esEnCurso = (reserva: Reserva, ahora: Date): boolean =>
  reserva.estado === 'iniciado' || (reserva.estado === 'activo' && enCursoPorHora(reserva, ahora))

const esFinalizada = (reserva: Reserva, ahora: Date): boolean =>
  reserva.estado === 'finalizado'

const esPorRevisar = (reserva: Reserva, ahora: Date): boolean =>
  reserva.estado === 'activo' && !activa(reserva, ahora)

const esProxima = (reserva: Reserva, ahora: Date): boolean =>
  reserva.estado === 'activo' && activa(reserva, ahora) && !esEnCurso(reserva, ahora)

export function filtrarReservas(
  reservas: Reserva[],
  filtros: Partial<FiltrosAdmin> = {},
  canchas: CanchaAdmin[] = [],
  ahora: Date = new Date(),
): Reserva[] {
  const { vista = 'proximas', fecha = 'todas', canchaId = 'todas', buscar = '' } = filtros
  const termino = texto(buscar)

  return reservas
    .filter((r) => {
      if (vista === 'todas') return true
      if (vista === 'proximas') return esProxima(r, ahora)
      if (vista === 'en-curso') return esEnCurso(r, ahora)
      if (vista === 'por-revisar') return esPorRevisar(r, ahora)
      if (vista === 'historial') return esFinalizada(r, ahora) || r.estado === 'no_asistio' || r.estado === 'cancelado'
      if (vista === 'finalizadas') return esFinalizada(r, ahora)
      if (vista === 'no-asistieron') return r.estado === 'no_asistio'
      return r.estado === 'cancelado'
    })
    .filter((r) => fecha === 'todas' || r.fecha === fecha)
    .filter((r) => canchaId === 'todas' || String(r.canchaId) === String(canchaId))
    .filter((r) => {
      if (!termino) return true
      const cancha = canchas.find((c) => c.id === r.canchaId)
      return [r.alias, r.nombre, r.celular, cancha?.nombre].some((valor) => texto(valor).includes(termino))
    })
    .sort(ordenarReservas)
}

export function resumenAdmin(reservas: Reserva[], ahora: Date = new Date()): ResumenAdmin {
  const proximas = reservas.filter((r) => esProxima(r, ahora))
  const hoy = fechaISO(ahora)

  return {
    proximas: proximas.length,
    hoy: proximas.filter((r) => r.fecha === hoy).length,
  }
}
