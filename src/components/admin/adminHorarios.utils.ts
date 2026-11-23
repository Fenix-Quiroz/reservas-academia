import type { BloqueoEvento, Reserva } from '../../types'
import {
  convertirHorariosACeldas,
  type ConfiguracionHorariosAdmin,
} from '../../horariosAdmin'

export const NOMBRES_DIAS_ADMIN = Object.freeze([
  { valor: 1, corto: 'Lun', largo: 'Lunes' },
  { valor: 2, corto: 'Mar', largo: 'Martes' },
  { valor: 3, corto: 'Mié', largo: 'Miércoles' },
  { valor: 4, corto: 'Jue', largo: 'Jueves' },
  { valor: 5, corto: 'Vie', largo: 'Viernes' },
  { valor: 6, corto: 'Sáb', largo: 'Sábado' },
  { valor: 0, corto: 'Dom', largo: 'Domingo' },
])

export interface ConflictoHorarioAdmin {
  tipo: 'reserva' | 'evento'
  id: string
  nombre: string
  fecha: string
  canchaId: number
  inicioMinuto: number
  finMinuto: number
}

export function formatearMinutosAdmin(minutos: number): string {
  const hora = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60
  const hora12 = hora % 12 || 12
  const periodo = hora < 12 ? 'a. m.' : 'p. m.'
  return `${hora12}:${String(minutosRestantes).padStart(2, '0')} ${periodo}`
}

export function formatearRangoAdmin(inicioMinuto: number, finMinuto: number): string {
  return `${formatearMinutosAdmin(inicioMinuto)} – ${formatearMinutosAdmin(finMinuto)}`
}

function diaDeFecha(fecha: string): number {
  return new Date(`${fecha}T12:00:00`).getDay()
}

function seCruzan(
  inicioA: number,
  finA: number,
  inicioB: number,
  finB: number,
): boolean {
  return inicioA < finB && inicioB < finA
}

export function obtenerConflictosHorarios(
  configuracion: ConfiguracionHorariosAdmin,
  reservas: readonly Reserva[],
  eventos: readonly BloqueoEvento[],
): ConflictoHorarioAdmin[] {
  const celdasBloqueadas = configuracion.horarios.flatMap((horario) => (
    convertirHorariosACeldas(configuracion.horarios, horario.canchaId)
      .filter((celda) => celda.diaSemana === horario.diaSemana && celda.bloqueado)
  ))
  const conflictos = new Map<string, ConflictoHorarioAdmin>()

  for (const reserva of reservas) {
    if (reserva.estado === 'cancelado') continue
    const inicioMinuto = reserva.inicio * 60
    const finMinuto = (reserva.inicio + reserva.horas) * 60
    const coincide = celdasBloqueadas.some((celda) => (
      celda.canchaId === reserva.canchaId
      && celda.diaSemana === diaDeFecha(reserva.fecha)
      && seCruzan(celda.inicioMinuto, celda.finMinuto, inicioMinuto, finMinuto)
    ))
    if (coincide) {
      conflictos.set(`reserva:${reserva.id}`, {
        tipo: 'reserva',
        id: reserva.id,
        nombre: reserva.nombre ?? reserva.alias,
        fecha: reserva.fecha,
        canchaId: reserva.canchaId,
        inicioMinuto,
        finMinuto,
      })
    }
  }

  for (const evento of eventos) {
    if (evento.estado !== 'activo') continue
    const inicioMinuto = evento.inicio * 60
    const finMinuto = evento.fin * 60
    const coincide = celdasBloqueadas.some((celda) => (
      celda.canchaId === evento.canchaId
      && celda.diaSemana === diaDeFecha(evento.fecha)
      && seCruzan(celda.inicioMinuto, celda.finMinuto, inicioMinuto, finMinuto)
    ))
    if (coincide) {
      conflictos.set(`evento:${evento.id}`, {
        tipo: 'evento',
        id: evento.id,
        nombre: evento.nombre,
        fecha: evento.fecha,
        canchaId: evento.canchaId,
        inicioMinuto,
        finMinuto,
      })
    }
  }

  return [...conflictos.values()].sort((a, b) => (
    a.fecha.localeCompare(b.fecha) || a.inicioMinuto - b.inicioMinuto || a.nombre.localeCompare(b.nombre)
  ))
}
