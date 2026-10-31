import type { BloqueoEvento, Campo, Reserva, TipoEventoEspecial } from './types.js'
import { rangoVisible } from './utils/fechasReserva.js'
import { horarioEntrenamientoQueBloquea } from './horariosEntrenamiento.js'

export type ErrorEvento = 'ocupado' | 'entrenamiento-ocupado' | 'datos-invalidos' | 'no-existe' | 'conexion' | 'evento_ocupado_reserva'
export interface DetalleEntrenamiento {
  inicioMinuto: number
  finMinuto: number
}
export interface DetalleReservaConflicto {
  canchaId: number
  inicio: number
  cliente: string
}
export type ErrorEventoResultado = {
  error: ErrorEvento
  entrenamiento?: DetalleEntrenamiento
  detalleReserva?: DetalleReservaConflicto
}
export type ResultadoEvento = { evento: BloqueoEvento } | ErrorEventoResultado
export type ResultadoEventoEspecial = { eventos: BloqueoEvento[] } | ErrorEventoResultado
export type ResultadoCancelacionEvento = Record<string, never> | { error: ErrorEvento }
export type BloqueoEventoNuevo = Omit<BloqueoEvento, 'id' | 'estado' | 'createdAt'>
export interface EventoEspecialNuevo {
  canchaIds: readonly number[]
  fecha: string
  inicio: number
  fin: number
  nombre: string
  celular: string
  notas: string
  tipo: TipoEventoEspecial
  precioCobrado: number
}
export interface EventoEspecialActualizado {
  grupoId: string
  fecha: string
  inicio: number
  fin: number
  nombre: string
  celular: string
  notas: string
  precioCobrado: number
}

export function esRangoEventoValido(inicio: number, fin: number): boolean {
  return Number.isFinite(inicio) && Math.round(inicio * 2) === inicio * 2
    && Number.isFinite(fin) && Math.round(fin * 2) === fin * 2
    && inicio >= 7
    && inicio <= 24
    && fin >= 8
    && fin <= 25
    && fin - inicio >= 1
}

export function validarBloqueoEvento(evento: BloqueoEventoNuevo): boolean {
  const celularValido = !evento.celular || evento.celular.trim() === '' || /^9\d{8}$/.test(evento.celular.trim())
  const notasValidas = !evento.notas || evento.notas.trim().length <= 240
  return esRangoEventoValido(evento.inicio, evento.fin)
    && Boolean(evento.fecha)
    && evento.nombre.trim().length >= 2
    && evento.nombre.trim().length <= 80
    && celularValido
    && notasValidas
}

export function validarEventoEspecial(evento: EventoEspecialNuevo): boolean {
  return evento.canchaIds.length > 0
    && new Set(evento.canchaIds).size === evento.canchaIds.length
    && evento.canchaIds.every((canchaId) => Number.isInteger(canchaId) && canchaId >= 1 && canchaId <= 4)
    && Number.isFinite(evento.precioCobrado)
    && evento.precioCobrado >= 0
    && validarBloqueoEvento({
      canchaId: evento.canchaIds[0] ?? 0,
      fecha: evento.fecha,
      inicio: evento.inicio,
      fin: evento.fin,
      nombre: evento.nombre,
      celular: evento.celular,
      notas: evento.notas,
    })
}

export function eventoYaTermino(
  evento: Pick<BloqueoEvento, 'fecha' | 'fin'>,
  ahora: Date = new Date(),
): boolean {
  const mediodiaLima = new Date(`${evento.fecha}T12:00:00-05:00`)
  const horasAdicionales = evento.fin - 12
  mediodiaLima.setTime(mediodiaLima.getTime() + horasAdicionales * 3600 * 1000)
  return mediodiaLima.getTime() <= ahora.getTime()
}

export function eventoBloquea(
  evento: Pick<BloqueoEvento, 'canchaId' | 'fecha' | 'inicio' | 'fin' | 'estado'>,
  canchaId: number,
  fecha: string,
  inicio: number,
  horas: number,
): boolean {
  return evento.estado === 'activo'
    && evento.canchaId === canchaId
    && evento.fecha === fecha
    && evento.inicio < inicio + horas
    && inicio < evento.fin
}

export function eventoChocaConReserva(
  evento: Pick<BloqueoEvento, 'canchaId' | 'fecha' | 'inicio' | 'fin' | 'estado'>,
  reserva: Pick<Reserva, 'canchaId' | 'fecha' | 'inicio' | 'horas' | 'estado'>,
): boolean {
  return reserva.estado !== 'cancelado'
    && eventoBloquea(evento, reserva.canchaId, reserva.fecha, reserva.inicio, reserva.horas)
}

export function eventoChocaConEntrenamiento(
  evento: Pick<BloqueoEvento, 'canchaId' | 'fecha' | 'inicio' | 'fin'>,
): boolean {
  return Boolean(horarioEntrenamientoQueBloqueaEvento(evento))
}

export function horarioEntrenamientoQueBloqueaEvento(
  evento: Pick<BloqueoEvento, 'canchaId' | 'fecha' | 'inicio' | 'fin'>,
): DetalleEntrenamiento | undefined {
  const diaSemana = new Date(`${evento.fecha}T12:00:00`).getDay()
  const entrenamiento = horarioEntrenamientoQueBloquea(
    evento.canchaId,
    diaSemana,
    evento.inicio,
    evento.fin - evento.inicio,
  )
  return entrenamiento
    ? { inicioMinuto: entrenamiento.inicioMinuto, finMinuto: entrenamiento.finMinuto }
    : undefined
}

export interface ConflictoReservaEvento {
  id: string
  canchaId: number
  canchaNombre: string
  cliente: string
  celular: string
  inicio: number
  horas: number
  horarioTexto: string
  estado: string
}

export interface ConflictoBloqueoEvento {
  id: string
  canchaId: number
  canchaNombre: string
  nombre: string
  inicio: number
  fin: number
  horarioTexto: string
}

export interface ConflictosEventoEspecial {
  reservas: ConflictoReservaEvento[]
  eventos: ConflictoBloqueoEvento[]
}

export function buscarConflictosEvento(
  canchaIds: readonly number[],
  fecha: string,
  inicio: number,
  fin: number,
  reservas: readonly Reserva[] = [],
  eventos: readonly BloqueoEvento[] = [],
  canchas: readonly Campo[] = [],
  eventoIdExcluido?: string,
): ConflictosEventoEspecial {
  const conflictosReservas: ConflictoReservaEvento[] = []
  const conflictosEventos: ConflictoBloqueoEvento[] = []

  for (const canchaId of canchaIds) {
    const cancha = canchas.find((c) => c.id === canchaId)
    const canchaNombre = cancha?.nombre ?? `Campo ${canchaId}`
    const eventoSimulado = { canchaId, fecha, inicio, fin, estado: 'activo' as const }

    for (const reserva of reservas) {
      if (eventoChocaConReserva(eventoSimulado, reserva)) {
        if (!conflictosReservas.some((item) => item.id === reserva.id)) {
          conflictosReservas.push({
            id: reserva.id,
            canchaId,
            canchaNombre,
            cliente: reserva.alias,
            celular: reserva.celular,
            inicio: reserva.inicio,
            horas: reserva.horas,
            horarioTexto: rangoVisible(reserva.inicio, reserva.horas),
            estado: reserva.estado,
          })
        }
      }
    }

    for (const existente of eventos) {
      if (
        eventoIdExcluido
        && (existente.id === eventoIdExcluido || existente.grupoId === eventoIdExcluido)
      ) {
        continue
      }
      if (
        existente.estado === 'activo'
        && existente.canchaId === canchaId
        && existente.fecha === fecha
        && existente.inicio < fin
        && inicio < existente.fin
      ) {
        if (!conflictosEventos.some((item) => item.id === existente.id)) {
          conflictosEventos.push({
            id: existente.id,
            canchaId,
            canchaNombre,
            nombre: existente.nombre,
            inicio: existente.inicio,
            fin: existente.fin,
            horarioTexto: rangoVisible(existente.inicio, existente.fin - existente.inicio),
          })
        }
      }
    }
  }

  return { reservas: conflictosReservas, eventos: conflictosEventos }
}
