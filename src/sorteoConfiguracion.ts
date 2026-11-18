export const DURACION_GIRO_DEMO_MS = 15000
export const INICIO_DESACELERACION_GIRO_DEMO_MS = 10000
export const DURACION_DESACELERACION_GIRO_DEMO_MS = DURACION_GIRO_DEMO_MS - INICIO_DESACELERACION_GIRO_DEMO_MS
export const PASOS_GIRO_DESACELERACION_DEMO = 24
export const INTERVALO_GIRO_RAPIDO_DEMO_MS = 38
export const INTERVALO_GIRO_LENTO_DEMO_MS = 520

export interface PasoGiroDemo {
  indice: number
  fase: 'desaceleracion'
}

export function calcularIntervaloGiroDemo(progreso: number): number {
  const progresoSeguro = Math.min(1, Math.max(0, progreso))
  const desaceleracion = progresoSeguro ** 2
  const rango = INTERVALO_GIRO_LENTO_DEMO_MS - INTERVALO_GIRO_RAPIDO_DEMO_MS

  return Math.round(INTERVALO_GIRO_RAPIDO_DEMO_MS + rango * desaceleracion)
}

export function calcularSaltoRapidoGiroDemo(totalTickets: number, paso: number): number {
  if (totalTickets <= 1) return 1

  return Math.max(7, Math.floor(totalTickets / 14) + (paso % 4) * 3)
}

export function crearIntervalosDesaceleracionDemo(): number[] {
  const cantidadIntervalos = PASOS_GIRO_DESACELERACION_DEMO - 1
  const intervalos = Array.from({ length: cantidadIntervalos }, (_, index) => {
    const progreso = cantidadIntervalos <= 1 ? 1 : index / (cantidadIntervalos - 1)
    return calcularIntervaloGiroDemo(progreso)
  })
  const diferencia = DURACION_DESACELERACION_GIRO_DEMO_MS
    - intervalos.reduce((total, intervalo) => total + intervalo, 0)

  intervalos[intervalos.length - 1] += diferencia
  return intervalos
}

export function crearRutaGiroDemo(
  _indiceInicial: number,
  indiceGanador: number,
  totalTickets: number,
): PasoGiroDemo[] {
  if (totalTickets <= 0) return []

  const normalizar = (indice: number): number => ((indice % totalTickets) + totalTickets) % totalTickets
  const ruta: PasoGiroDemo[] = []
  let indiceActual = normalizar(indiceGanador - (PASOS_GIRO_DESACELERACION_DEMO - 1))

  for (let paso = 0; paso < PASOS_GIRO_DESACELERACION_DEMO; paso += 1) {
    ruta.push({ indice: indiceActual, fase: 'desaceleracion' })
    indiceActual = normalizar(indiceActual + 1)
  }

  return ruta
}
