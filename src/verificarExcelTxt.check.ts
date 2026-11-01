import assert from 'node:assert/strict'
import { construirBalanceMensual } from './balanceMensual.js'
import { crearLibroBalance } from './exportarBalance.js'
import type { BloqueoEvento, Campo, Reserva } from './types.js'

const canchas: Campo[] = [
  { id: 1, nombre: 'Campo 1', deporte: 'Fútbol 6', jugadores: 6, precioHora: 55, color: '', imagen: '', oferta: '' },
  { id: 2, nombre: 'Campo 2', deporte: 'Fútbol 6', jugadores: 6, precioHora: 55, color: '', imagen: '', oferta: '' },
  { id: 3, nombre: 'Campo 3', deporte: 'Fútbol 7', jugadores: 7, precioHora: 70, color: '', imagen: '', oferta: '' },
  { id: 4, nombre: 'Campo de vóley', deporte: 'Vóley', jugadores: 12, precioHora: 40, color: '', imagen: '', oferta: '' },
]

const reservas: Reserva[] = []

const eventos: BloqueoEvento[] = [
  {
    id: 'ev-voley',
    canchaId: 4,
    fecha: '2026-10-31',
    inicio: 19.5,
    fin: 25,
    nombre: 'BLOQUEO DE HORAS',
    celular: '',
    notas: 'Estas horas se bloquearon por que no hay luz.',
    estado: 'activo',
    tipo: 'individual',
    precioCobrado: 1.0,
  },
  {
    id: 'ev-futbol-1',
    canchaId: 1,
    fecha: '2026-10-31',
    inicio: 19.5,
    fin: 25,
    nombre: 'BLOQUEO DE HORAS',
    celular: '',
    notas: 'Estas horas se bloquearon por que no hay luz.',
    estado: 'activo',
    grupoId: 'grupo-futbol',
    tipo: 'todos_los_campos',
    precioCobrado: 1.0,
  },
  {
    id: 'ev-futbol-2',
    canchaId: 2,
    fecha: '2026-10-31',
    inicio: 19.5,
    fin: 25,
    nombre: 'BLOQUEO DE HORAS',
    celular: '',
    notas: 'Estas horas se bloquearon por que no hay luz.',
    estado: 'activo',
    grupoId: 'grupo-futbol',
    tipo: 'todos_los_campos',
    precioCobrado: 1.0,
  },
  {
    id: 'ev-futbol-3',
    canchaId: 3,
    fecha: '2026-10-31',
    inicio: 19.5,
    fin: 25,
    nombre: 'BLOQUEO DE HORAS',
    celular: '',
    notas: 'Estas horas se bloquearon por que no hay luz.',
    estado: 'activo',
    grupoId: 'grupo-futbol',
    tipo: 'todos_los_campos',
    precioCobrado: 1.0,
  },
]

const ahora = new Date('2026-11-01T06:47:00-05:00')
const balance = construirBalanceMensual('2026-10', reservas, canchas, eventos, ahora)

const libro = await crearLibroBalance(balance, canchas)
const hoja = libro.Sheets['Resumen mensual']

// Verificar encabezado
assert.equal(hoja['A1'].v, 'POLIDEPORTIVO EL JAGUAR')
assert.equal(hoja['A2'].v, 'REPORTE Y BALANCE MENSUAL')
assert.ok(hoja['A3'].v.includes('OCTUBRE DE 2026'))

// 1. Resumen Global
assert.equal(hoja['A5'].v, '1. RESUMEN GLOBAL')
assert.equal(hoja['A7'].v, 'Total de reservas finalizadas')
assert.equal(hoja['C7'].v, '0 turnos')
assert.equal(hoja['A8'].v, 'Total de horas alquiladas')
assert.equal(hoja['C8'].v, '0.0 horas')
assert.equal(hoja['A9'].v, 'Ingresos por reservas (S/)')
assert.equal(hoja['C9'].v, 0)
assert.equal(hoja['A10'].v, 'Ingresos eventos especiales (S/)')
assert.equal(hoja['C10'].v, 2)
assert.equal(hoja['A11'].v, 'TOTAL GENERAL INGRESOS (S/)')
assert.equal(hoja['C11'].v, 2)

// 2. Eventos Especiales / Torneos
assert.equal(hoja['A13'].v, '2. EVENTOS ESPECIALES / TORNEOS')
assert.equal(hoja['A14'].v, 'Fecha')
assert.equal(hoja['B14'].v, 'Día')
assert.equal(hoja['C14'].v, 'Evento / Torneo')
assert.equal(hoja['D14'].v, 'Campos bloqueados')
assert.equal(hoja['E14'].v, 'Horario')
assert.equal(hoja['I14'].v, 'Monto cobrado (S/)')

// Primer evento (bloqueo vóley o fútbol)
assert.ok(hoja['C15'].v === 'BLOQUEO DE HORAS')
assert.equal(hoja['I15'].v, 1)

// Segundo evento
assert.ok(hoja['C16'].v === 'BLOQUEO DE HORAS')
assert.equal(hoja['I16'].v, 1)

// Total eventos
assert.equal(hoja['A17'].v, 'TOTAL EVENTOS ESPECIALES (S/)')
assert.equal(hoja['I17'].v, 2)

// 3. Actividad Diaria Individual por Campo
assert.equal(hoja['A19'].v, '3. ACTIVIDAD DIARIA INDIVIDUAL POR CAMPO')

// Campo 1
assert.equal(hoja['A21'].v, '[ CAMPO 1 - Fútbol 6 ]')
assert.equal(hoja['A23'].v, '(Sin reservas registradas en este mes)')
assert.equal(hoja['A24'].v, 'SUBTOTAL')
assert.equal(hoja['C24'].v, '0 turnos')
assert.equal(hoja['D24'].v, '0.0 h')
assert.equal(hoja['E24'].v, 0)

// Campo 2
assert.equal(hoja['A26'].v, '[ CAMPO 2 - Fútbol 6 ]')
assert.equal(hoja['A28'].v, '(Sin reservas registradas en este mes)')
assert.equal(hoja['A29'].v, 'SUBTOTAL')
assert.equal(hoja['C29'].v, '0 turnos')
assert.equal(hoja['D29'].v, '0.0 h')
assert.equal(hoja['E29'].v, 0)

// Campo 3
assert.equal(hoja['A31'].v, '[ CAMPO 3 - Fútbol 7 ]')
assert.equal(hoja['A33'].v, '(Sin reservas registradas en este mes)')
assert.equal(hoja['A34'].v, 'SUBTOTAL')
assert.equal(hoja['C34'].v, '0 turnos')
assert.equal(hoja['D34'].v, '0.0 h')
assert.equal(hoja['E34'].v, 0)

// Campo de vóley
assert.equal(hoja['A36'].v, '[ CAMPO DE VÓLEY - Vóley ]')
assert.equal(hoja['A38'].v, '(Sin reservas registradas en este mes)')
assert.equal(hoja['A39'].v, 'SUBTOTAL')
assert.equal(hoja['C39'].v, '0 turnos')
assert.equal(hoja['D39'].v, '0.0 h')
assert.equal(hoja['E39'].v, 0)

console.log('✔ verificarExcelTxt.check.ts OK: La estructura del Excel replica exactamente el TXT con secciones separadas!')
