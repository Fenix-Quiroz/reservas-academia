import type { Campo } from '../types.js'
import {
  capital,
  diaDe,
  horaVisible,
  nombreDia,
  nombreDiaCorto,
  rangoVisible,
  tipoCampo,
} from './fechasReserva.js'

const campo = {
  id: 1,
  nombre: 'Campo 1',
  deporte: 'Fútbol 5',
  jugadores: 5,
  precioHora: 60,
  color: '#a97818',
  imagen: '/campos/campo-1-futbol-5.webp',
  oferta: 'Alquila este campo y recibe 1 agua de 625 ml',
} satisfies Campo

const corto = nombreDiaCorto(0)
const capitalizado: string = capital('campo')
const dia: string = nombreDia(1, true)
const hora: string = horaVisible(20)
const rango: string = rangoVisible(20, 1)
const diferencia: number = diaDe('2026-10-21')
const deporte: string = tipoCampo(campo)

const resultado: [string, string, string, string, number, string] = [
  corto.titulo,
  capitalizado,
  dia,
  hora,
  diferencia,
  deporte,
]

void [resultado, rango]
