import type { BloqueoEvento, Reserva } from './types.js'
import { horarioEntrenamientoQueBloquea } from './horariosEntrenamiento.js'

export type ErrorEvento = 'ocupado' | 'entrenamiento-ocupado' | 'datos-invalidos' | 'no-existe' | 'conexion'
export interface DetalleEntrenamiento {
  inicioMinuto: number
  finMinuto: number
}
export type ErrorEventoResultado = { error: ErrorEvento; entrenamiento?: DetalleEntrenamiento }
export type ResultadoEvento = { evento: BloqueoEvento } | ErrorEventoResultado
export type ResultadoCancelacionEvento = Record<string, never> | { error: ErrorEvento }
export type BloqueoEventoNuevo = Omit<BloqueoEvento, 'id' | 'estado' | 'createdAt'>

export function esRangoEventoValido(inicio: number, fin: number): boolean {
  return Number.isInteger(inicio)
    && Number.isInteger(fin)
    && inicio >= 7
    && inicio <= 24
    && fin >= 8
    && fin <= 25
    && fin - inicio >= 5
}

export function validarBloqueoEvento(evento: BloqueoEventoNuevo): boolean {
  return esRangoEventoValido(evento.inicio, evento.fin)
    && Boolean(evento.fecha)
    && evento.nombre.trim().length >= 2
    && evento.nombre.trim().length <= 80
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
