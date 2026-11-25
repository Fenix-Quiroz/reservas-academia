import { rangoHablado } from './reservas.js'
import type { Campo, ComprobanteAdmin, Reserva } from './types.js'

export interface FilaDatosReserva {
  reservaId: string
  campoId: number
  campo: Campo
  nombre: string
  celular: string
  fecha: string
  inicio: number
  horario: string
  horas: number
  comprobante?: ComprobanteAdmin
}

function claveClienteDatos(celular: string, nombre: string): string {
  const numero = celular.trim()
  return numero || `sin-celular:${nombre.trim().toLocaleLowerCase()}`
}

function claveCliente(reserva: Reserva): string {
  return claveClienteDatos(reserva.celular, reserva.alias)
}

function compararFechas(a: FilaDatosReserva, b: FilaDatosReserva): number {
  return a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio || a.reservaId.localeCompare(b.reservaId)
}

export function prepararFilasDatosReservas(
  reservas: readonly Reserva[],
  canchas: readonly Campo[],
  comprobantes: readonly ComprobanteAdmin[] = [],
): FilaDatosReserva[] {
  const canchaPorId = new Map(canchas.map((cancha) => [cancha.id, cancha]))
  const comprobantePorReserva = new Map(comprobantes.map((comprobante) => [comprobante.reservaId, comprobante]))
  const cantidadPorCampoYCliente = new Map<number, Map<string, number>>()

  for (const reserva of reservas) {
    const porCliente = cantidadPorCampoYCliente.get(reserva.canchaId) ?? new Map<string, number>()
    const cliente = claveCliente(reserva)
    porCliente.set(cliente, (porCliente.get(cliente) ?? 0) + 1)
    cantidadPorCampoYCliente.set(reserva.canchaId, porCliente)
  }

  const filas = reservas.map((reserva): FilaDatosReserva => {
    const campo = canchaPorId.get(reserva.canchaId) ?? {
      id: reserva.canchaId,
      nombre: `Campo ${reserva.canchaId}`,
      deporte: 'Sin deporte',
      jugadores: 0,
      precioHora: 0,
      color: '',
      imagen: '',
      oferta: '',
    }
    return {
      reservaId: reserva.id,
      campoId: reserva.canchaId,
      campo,
      nombre: reserva.nombre?.trim() || reserva.alias,
      celular: reserva.celular,
      fecha: reserva.fecha,
      inicio: reserva.inicio,
      horario: rangoHablado(reserva.inicio, reserva.horas),
      horas: reserva.horas,
      comprobante: comprobantePorReserva.get(reserva.id),
    }
  })

  const ordenCampo = new Map(canchas.map((cancha, indice) => [cancha.id, indice]))
  return filas.sort((a, b) => {
    const campoA = ordenCampo.get(a.campoId) ?? Number.MAX_SAFE_INTEGER
    const campoB = ordenCampo.get(b.campoId) ?? Number.MAX_SAFE_INTEGER
    if (campoA !== campoB) return campoA - campoB
    if (a.campoId !== b.campoId) return a.campoId - b.campoId

    const cantidadA = cantidadPorCampoYCliente.get(a.campoId)?.get(claveClienteDatos(a.celular, a.nombre)) ?? 0
    const cantidadB = cantidadPorCampoYCliente.get(b.campoId)?.get(claveClienteDatos(b.celular, b.nombre)) ?? 0
    if (cantidadA !== cantidadB) return cantidadB - cantidadA
    return compararFechas(a, b)
  })
}
