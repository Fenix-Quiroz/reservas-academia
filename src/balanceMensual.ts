import { rangoHablado } from './reservas.js'
import type { Campo, Reserva } from './types.js'

export interface BalancePorCampo {
  campoId: number
  campo: string
  deporte: string
  reservas: number
  horas: number
  ingresos: number
}

export interface BalancePorDia {
  fecha: string
  dia: string
  campoId: number
  campo: string
  reservas: number
  horas: number
  ingresos: number
}

export interface BalanceDetalle {
  id: string
  fecha: string
  dia: string
  campoId: number
  campo: string
  deporte: string
  horario: string
  horas: number
  cliente: string
  celular: string
  estado: 'finalizado'
  monto: number
}

export interface BalanceMensual {
  mes: string
  reservasFinalizadas: number
  horasAlquiladas: number
  ingresosTotales: number
  porCampo: BalancePorCampo[]
  porDia: BalancePorDia[]
  detalle: BalanceDetalle[]
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

function diaVisible(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long' })
}

export function mesActual(ahora: Date = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}`
}

export function montoDeReserva(reserva: Reserva, canchas: readonly Campo[]): number {
  if (typeof reserva.montoTotal === 'number' && Number.isFinite(reserva.montoTotal)) {
    return redondear(reserva.montoTotal)
  }

  const cancha = canchas.find((item) => item.id === reserva.canchaId)
  return redondear((cancha?.precioHora ?? 0) * reserva.horas)
}

export function construirBalanceMensual(
  mes: string,
  reservas: readonly Reserva[],
  canchas: readonly Campo[],
): BalanceMensual {
  const finalizadas = reservas
    .filter((reserva) => reserva.estado === 'finalizado' && reserva.fecha.startsWith(`${mes}-`))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio || a.canchaId - b.canchaId)

  const detalle: BalanceDetalle[] = finalizadas.map((reserva) => {
    const cancha = canchas.find((item) => item.id === reserva.canchaId)
    return {
      id: reserva.id,
      fecha: reserva.fecha,
      dia: diaVisible(reserva.fecha),
      campoId: reserva.canchaId,
      campo: cancha?.nombre ?? 'Campo desconocido',
      deporte: cancha?.deporte ?? 'Sin deporte',
      horario: rangoHablado(reserva.inicio, reserva.horas),
      horas: reserva.horas,
      cliente: reserva.alias,
      celular: reserva.celular,
      estado: 'finalizado',
      monto: montoDeReserva(reserva, canchas),
    }
  })

  const porCampo = canchas
    .map((cancha) => {
      const filas = detalle.filter((fila) => fila.campo === cancha.nombre)
      return {
        campoId: cancha.id,
        campo: cancha.nombre,
        deporte: cancha.deporte,
        reservas: filas.length,
        horas: filas.reduce((total, fila) => total + fila.horas, 0),
        ingresos: redondear(filas.reduce((total, fila) => total + fila.monto, 0)),
      }
    })
    .filter((fila) => fila.horas > 0 || fila.ingresos > 0)

  const porDiaMap = new Map<string, BalancePorDia>()
  for (const fila of detalle) {
    const clave = `${fila.fecha}:${fila.campoId}`
    const actual = porDiaMap.get(clave)
    if (actual) {
      actual.reservas += 1
      actual.horas += fila.horas
      actual.ingresos = redondear(actual.ingresos + fila.monto)
    } else {
      porDiaMap.set(clave, {
        fecha: fila.fecha,
        dia: fila.dia,
        campoId: fila.campoId,
        campo: fila.campo,
        reservas: 1,
        horas: fila.horas,
        ingresos: fila.monto,
      })
    }
  }

  return {
    mes,
    reservasFinalizadas: detalle.length,
    horasAlquiladas: detalle.reduce((total, fila) => total + fila.horas, 0),
    ingresosTotales: redondear(detalle.reduce((total, fila) => total + fila.monto, 0)),
    porCampo,
    porDia: [...porDiaMap.values()],
    detalle,
  }
}
