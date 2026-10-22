import type { Campo } from '../types.js'
import { fechaISO, sumarDias } from '../reservas.js'

export interface NombreDiaCorto {
  titulo: string
  detalle: string
}

type CampoParaTexto = Pick<Campo, 'jugadores'> & {
  deporte?: string | null
}

export const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

export function nombreDiaCorto(dia: number): NombreDiaCorto {
  const d = sumarDias(dia)
  const semana = d.toLocaleDateString('es-PE', { weekday: 'short' }).replace(/\.$/, '')
  const mes = d.toLocaleDateString('es-PE', { month: 'short' }).replace(/\.$/, '')
  return {
    titulo: dia === 0 ? 'Hoy' : dia === 1 ? 'Mañana' : capital(semana),
    detalle: `${d.getDate()} ${mes}`,
  }
}

// Corto para frases y botones; largo siempre incluye el mes para evitar fechas ambiguas.
export function nombreDia(dia: number, largo = false): string {
  const d = sumarDias(dia)
  const semana = d.toLocaleDateString('es-PE', { weekday: largo ? 'long' : 'short' }).replace(/\.$/, '')
  if (!largo) return nombreDiaCorto(dia).titulo
  const mes = d.toLocaleDateString('es-PE', { month: 'long' })
  const prefijo = dia === 0 ? 'hoy' : dia === 1 ? 'mañana' : 'el'
  return `${prefijo} ${semana} ${d.getDate()} de ${mes}`
}

export function horaVisible(hora: number): string {
  const horaDelDia = hora % 24
  const hora12 = ((horaDelDia + 11) % 12) + 1
  const periodo = horaDelDia < 12 ? 'a. m.' : 'p. m.'
  return `${hora12} ${periodo}`
}

export function rangoVisible(inicio: number, horas: number): string {
  return `${horaVisible(inicio)} a ${horaVisible(inicio + horas)}`
}

// '2026-10-18' → 1 si es mañana (para reutilizar nombreDia)
export const diaDe = (fecha: string): number =>
  Math.round((new Date(`${fecha}T00:00`).getTime() - new Date(`${fechaISO(new Date())}T00:00`).getTime()) / 86400000)

export const tipoCampo = (cancha: CampoParaTexto): string => cancha.deporte ?? `Fútbol ${cancha.jugadores}`
