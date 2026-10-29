import { rangoHablado } from './reservas.js'
import type { BloqueoEvento, Campo, Reserva, TipoEventoEspecial } from './types.js'

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

export interface BalanceEventoEspecial {
  id: string
  fecha: string
  dia: string
  canchaIds: number[]
  campo: string
  tipo: TipoEventoEspecial
  horario: string
  evento: string
  celular: string
  notas: string
  precio: number
}

export interface BalanceMensual {
  mes: string
  reservasFinalizadas: number
  horasAlquiladas: number
  ingresosTotales: number
  ingresosEventosEspeciales: number
  porCampo: BalancePorCampo[]
  porDia: BalancePorDia[]
  detalle: BalanceDetalle[]
  eventosEspeciales: BalanceEventoEspecial[]
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

function diaVisible(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long' })
}

function eventoYaTermino(evento: Pick<BloqueoEvento, 'fecha' | 'fin'>, ahora: Date): boolean {
  const mediodiaLima = new Date(`${evento.fecha}T12:00:00-05:00`)
  mediodiaLima.setUTCHours(mediodiaLima.getUTCHours() + evento.fin - 12)
  return mediodiaLima <= ahora
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
  eventos: readonly BloqueoEvento[] = [],
  ahora: Date = new Date(),
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

  const gruposEventos = new Map<string, BloqueoEvento[]>()
  for (const evento of eventos) {
    if (evento.estado !== 'activo' || !evento.fecha.startsWith(`${mes}-`) || !eventoYaTermino(evento, ahora)) continue
    const grupoId = evento.grupoId?.trim() || evento.id
    const grupo = gruposEventos.get(grupoId) ?? []
    grupo.push(evento)
    gruposEventos.set(grupoId, grupo)
  }
  const eventosEspeciales: BalanceEventoEspecial[] = [...gruposEventos.entries()]
    .map(([id, grupo]) => {
      const principal = grupo[0]
      if (!principal) return null
      const canchaIds = [...new Set(grupo.map((evento) => evento.canchaId))].sort((a, b) => a - b)
      const nombres = canchaIds.map((canchaId) => canchas.find((cancha) => cancha.id === canchaId)?.nombre ?? `Campo ${canchaId}`)
      const tipo: TipoEventoEspecial = principal.tipo === 'todos_los_campos' ? 'todos_los_campos' : 'individual'
      const campo = tipo === 'todos_los_campos' ? 'Todos los campos de fútbol' : nombres.join(', ')
      return {
        id,
        fecha: principal.fecha,
        dia: diaVisible(principal.fecha),
        canchaIds,
        campo,
        tipo,
        horario: rangoHablado(principal.inicio, principal.fin - principal.inicio),
        evento: principal.nombre,
        celular: principal.celular,
        notas: principal.notas,
        precio: redondear(typeof principal.precioCobrado === 'number' && Number.isFinite(principal.precioCobrado)
          ? principal.precioCobrado
          : 0),
      }
    })
    .filter((evento): evento is BalanceEventoEspecial => evento !== null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horario.localeCompare(b.horario) || a.id.localeCompare(b.id))

  return {
    mes,
    reservasFinalizadas: detalle.length,
    horasAlquiladas: detalle.reduce((total, fila) => total + fila.horas, 0),
    ingresosTotales: redondear(
      detalle.reduce((total, fila) => total + fila.monto, 0)
        + eventosEspeciales.reduce((total, evento) => total + evento.precio, 0),
    ),
    ingresosEventosEspeciales: redondear(eventosEspeciales.reduce((total, evento) => total + evento.precio, 0)),
    porCampo,
    porDia: [...porDiaMap.values()],
    detalle,
    eventosEspeciales,
  }
}
