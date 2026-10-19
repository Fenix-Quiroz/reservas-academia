import { activa, fechaISO } from './reservas.js'

const texto = (valor) => String(valor ?? '').trim().toLowerCase()

export const precioDeReserva = (reserva, canchas) => {
  const cancha = canchas.find((c) => c.id === reserva.canchaId)
  return (cancha?.precioHora ?? 0) * reserva.horas
}

export const ordenarReservas = (a, b) =>
  a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio || a.canchaId - b.canchaId

export function filtrarReservas(reservas, filtros = {}, canchas = [], ahora = new Date()) {
  const { vista = 'proximas', fecha = 'todas', canchaId = 'todas', buscar = '' } = filtros
  const termino = texto(buscar)

  return reservas
    .filter((r) => vista !== 'proximas' || activa(r, ahora))
    .filter((r) => fecha === 'todas' || r.fecha === fecha)
    .filter((r) => canchaId === 'todas' || String(r.canchaId) === String(canchaId))
    .filter((r) => {
      if (!termino) return true
      const cancha = canchas.find((c) => c.id === r.canchaId)
      return [r.alias, r.nombre, r.celular, cancha?.nombre].some((valor) => texto(valor).includes(termino))
    })
    .sort(ordenarReservas)
}

export function resumenAdmin(reservas, ahora = new Date()) {
  const proximas = reservas.filter((r) => activa(r, ahora))
  const hoy = fechaISO(ahora)

  return {
    proximas: proximas.length,
    hoy: proximas.filter((r) => r.fecha === hoy).length,
  }
}
