import {
  DURACION_DESACELERACION_GIRO_DEMO_MS,
  DURACION_GIRO_DEMO_MS,
  INICIO_DESACELERACION_GIRO_DEMO_MS,
  PASOS_GIRO_DESACELERACION_DEMO,
  calcularIntervaloGiroDemo,
  crearIntervalosDesaceleracionDemo,
  crearRutaGiroDemo,
} from './sorteoConfiguracion'

if (DURACION_GIRO_DEMO_MS !== 15000) {
  throw new Error(`La duración del giro demo debe ser 15 s: ${DURACION_GIRO_DEMO_MS} ms`)
}

if (INICIO_DESACELERACION_GIRO_DEMO_MS !== 10000) {
  throw new Error(`La desaceleración debe iniciar a los 10 s: ${INICIO_DESACELERACION_GIRO_DEMO_MS} ms`)
}

if (DURACION_GIRO_DEMO_MS - INICIO_DESACELERACION_GIRO_DEMO_MS !== DURACION_DESACELERACION_GIRO_DEMO_MS) {
  throw new Error('La duración de desaceleración debe completar el giro')
}

const totalTickets = 369
const indiceGanador = 143
const ruta = crearRutaGiroDemo(0, indiceGanador, totalTickets)

if (ruta.length !== PASOS_GIRO_DESACELERACION_DEMO) {
  throw new Error('La fase lenta no tiene la cantidad esperada de tickets')
}

for (let index = 1; index < ruta.length; index += 1) {
  const esperado = (ruta[index - 1].indice + 1) % totalTickets
  if (ruta[index].indice !== esperado) {
    throw new Error('La fase lenta debe avanzar ticket por ticket')
  }
}

if (ruta.at(-1)?.indice !== indiceGanador) {
  throw new Error('La ruta debe terminar exactamente en el ticket ganador')
}

const intervalos = crearIntervalosDesaceleracionDemo()
if (intervalos.length !== PASOS_GIRO_DESACELERACION_DEMO - 1) {
  throw new Error('La desaceleración no tiene los intervalos esperados')
}

if (intervalos.reduce((total, intervalo) => total + intervalo, 0) !== DURACION_DESACELERACION_GIRO_DEMO_MS) {
  throw new Error('Los intervalos no completan los 5 segundos de desaceleración')
}

if (!(calcularIntervaloGiroDemo(0) < calcularIntervaloGiroDemo(0.5)
  && calcularIntervaloGiroDemo(0.5) < calcularIntervaloGiroDemo(1))) {
  throw new Error('El slot demo debe desacelerar progresivamente')
}

console.log('sorteoVelocidad.check: ok')
