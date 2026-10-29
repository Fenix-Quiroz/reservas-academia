import type { Campo } from './types.js'
import { ABRE, CIERRA, esDuracionValida } from './reservas.js'

const CLAVE_BORRADOR_RESERVA = 'reserva-borrador'
const VERSION_BORRADOR_RESERVA = 1
const DIAS_RESERVA = 21

export type PasoReservaPersistible = 2 | 3
export type EtapaHorario = 'dia' | 'turno' | 'horario'
export type TurnoHorario = 'manana' | 'tarde' | 'noche'

export interface BorradorReservaGuardado {
  paso: PasoReservaPersistible
  canchaId: number
  fecha: string
  horas: number
  inicio: number | null
  etapa: EtapaHorario
  turno: TurnoHorario | null
  semana: number
}

export interface BorradorReservaRestaurado extends BorradorReservaGuardado {
  dia: number
}

type BorradorPersistido = Omit<BorradorReservaGuardado, 'etapa' | 'turno' | 'semana'>
  & Partial<Pick<BorradorReservaGuardado, 'etapa' | 'turno' | 'semana'>>
  & { version: typeof VERSION_BORRADOR_RESERVA }

function almacenamiento(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaConstruida = new Date(anio, mes - 1, dia)
  return fechaConstruida.getFullYear() === anio
    && fechaConstruida.getMonth() === mes - 1
    && fechaConstruida.getDate() === dia
}

function diaCalendario(fecha: Date): number {
  return Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
}

function diaDesdeHoy(fecha: string, ahora: Date): number | null {
  if (!esFechaValida(fecha)) return null
  const objetivo = new Date(`${fecha}T12:00:00`)
  return Math.round((diaCalendario(objetivo) - diaCalendario(ahora)) / 86_400_000)
}

function inicioValido(inicio: number | null, horas: number): boolean {
  return inicio === null || (
    Number.isFinite(inicio)
    && inicio >= ABRE
    && inicio + horas <= CIERRA
    && Math.round(inicio * 2) === inicio * 2
  )
}

function esBorradorPersistido(valor: unknown): valor is BorradorPersistido {
  if (!valor || typeof valor !== 'object') return false
  const borrador = valor as Partial<BorradorPersistido>
  return borrador.version === VERSION_BORRADOR_RESERVA
    && (borrador.paso === 2 || borrador.paso === 3)
    && Number.isInteger(borrador.canchaId)
    && typeof borrador.fecha === 'string'
    && typeof borrador.horas === 'number'
    && (borrador.inicio === null || typeof borrador.inicio === 'number')
    && (borrador.etapa === undefined || borrador.etapa === 'dia' || borrador.etapa === 'turno' || borrador.etapa === 'horario')
    && (borrador.turno === undefined || borrador.turno === null || borrador.turno === 'manana' || borrador.turno === 'tarde' || borrador.turno === 'noche')
    && (borrador.semana === undefined || (
      typeof borrador.semana === 'number'
      && Number.isInteger(borrador.semana)
      && borrador.semana >= 0
      && borrador.semana < 3
    ))
}

export function guardarBorradorReserva(borrador: BorradorReservaGuardado): void {
  const almacenamientoActual = almacenamiento()
  if (!almacenamientoActual) return
  try {
    const valor: BorradorPersistido = {
      ...borrador,
      version: VERSION_BORRADOR_RESERVA,
    }
    almacenamientoActual.setItem(CLAVE_BORRADOR_RESERVA, JSON.stringify(valor))
  } catch {
    // Si el navegador no permite guardar, el flujo continúa en memoria.
  }
}

export function leerBorradorReserva(
  campos: readonly Campo[],
  ahora: Date = new Date(),
): BorradorReservaRestaurado | null {
  const almacenamientoActual = almacenamiento()
  if (!almacenamientoActual) return null

  try {
    const texto = almacenamientoActual.getItem(CLAVE_BORRADOR_RESERVA)
    if (!texto) return null
    const valor: unknown = JSON.parse(texto)
    if (!esBorradorPersistido(valor)) return null
    if (!campos.some((campo) => campo.id === valor.canchaId)) return null
    if (!esDuracionValida(valor.horas) || !inicioValido(valor.inicio, valor.horas)) return null
    if (valor.paso === 3 && valor.inicio === null) return null
    const etapa = valor.etapa ?? 'dia'
    const turno = valor.turno ?? null
    const semana = valor.semana ?? 0
    if (etapa === 'horario' && turno === null) return null
    if (etapa !== 'horario' && turno !== null) return null

    const dia = diaDesdeHoy(valor.fecha, ahora)
    if (dia === null || dia < 0 || dia >= DIAS_RESERVA) return null

    const { version: _version, etapa: _etapa, turno: _turno, semana: _semana, ...borrador } = valor
    return { ...borrador, etapa, turno, semana, dia }
  } catch {
    return null
  }
}

export function borrarBorradorReserva(): void {
  try {
    almacenamiento()?.removeItem(CLAVE_BORRADOR_RESERVA)
  } catch {
    // El modo privado puede impedir borrar el almacenamiento.
  }
}
