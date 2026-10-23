import type { Reserva } from '../types.js'

export const patronAlarma = {
  frecuenciaGrave: 440,
  frecuenciaAguda: 784,
  cambioDeTonoEn: 0.2,
  duracion: 0.7,
  intervalo: 2000,
} as const

export function finDeReserva(reserva: Pick<Reserva, 'fecha' | 'inicio' | 'horas'>): Date {
  const [anio, mes, dia] = reserva.fecha.split('-').map(Number)
  const finMinutos = Math.round((reserva.inicio + reserva.horas) * 60)
  return new Date(anio, mes - 1, dia, Math.floor(finMinutos / 60), finMinutos % 60)
}

export function ordenarPorFin<T extends Pick<Reserva, 'fecha' | 'inicio' | 'horas'>>(
  reservas: readonly T[],
): T[] {
  return [...reservas].sort((a, b) => finDeReserva(a).getTime() - finDeReserva(b).getTime())
}

export function reservasTerminadasParaAlerta(
  reservas: readonly Reserva[],
  emitidas: ReadonlySet<string>,
  instante: number,
): Reserva[] {
  return reservas.filter((reserva) => (
    reserva.estado !== 'cancelado'
    && !emitidas.has(reserva.id)
    && finDeReserva(reserva).getTime() <= instante
  ))
}

export function filtrarAlertasCanceladas(
  alertas: readonly Reserva[],
  reservas: readonly Reserva[],
): Reserva[] {
  const canceladas = new Set(reservas.filter((reserva) => reserva.estado === 'cancelado').map(({ id }) => id))
  return alertas.filter(({ id }) => !canceladas.has(id))
}

export function reservaDePrueba(ahora: Date = new Date()): Reserva {
  const fecha = [ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate()]
    .map((parte, indice) => indice === 0 ? String(parte) : String(parte).padStart(2, '0'))
    .join('-')

  return {
    id: `alarma-prueba-${ahora.getTime()}`,
    canchaId: 1,
    fecha,
    inicio: ahora.getHours() - 1,
    horas: 1,
    alias: 'Prueba de alarma',
    celular: '000000000',
    estado: 'finalizado',
  }
}

export function reservasDePrueba(ahora: Date = new Date()): Reserva[] {
  const horaBase = new Date(ahora)
  horaBase.setMinutes(0, 0, 0)

  return [3, 2, 1].map((horasAntes, indice) => {
    const fin = new Date(horaBase)
    fin.setHours(fin.getHours() - horasAntes)

    return {
      ...reservaDePrueba(fin),
      id: `alarma-prueba-${indice + 1}-${fin.getTime()}`,
      alias: `Prueba de alarma ${indice + 1}`,
    }
  })
}
