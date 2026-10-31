import assert from 'node:assert/strict'
import { construirBalanceMensual } from './balanceMensual.js'
import { generarTextoBalance } from './exportarBalanceTexto.js'
import type { BloqueoEvento, Campo, Reserva } from './types.js'

const canchas: Campo[] = [
  { id: 1, nombre: 'Campo 1 (Fútbol 6)', deporte: 'Fútbol 6', jugadores: 6, precioHora: 55, color: '', imagen: '', oferta: '' },
  { id: 2, nombre: 'Campo 2 (Fútbol 7)', deporte: 'Fútbol 7', jugadores: 7, precioHora: 70, color: '', imagen: '', oferta: '' },
]

const reservas: Reserva[] = [
  {
    id: 'r1',
    canchaId: 1,
    fecha: '2026-10-01',
    inicio: 18,
    horas: 1.5,
    alias: 'Juan Pérez',
    celular: '912345678',
    estado: 'finalizado',
    montoTotal: 82.5,
  },
  {
    id: 'r2',
    canchaId: 1,
    fecha: '2026-10-01',
    inicio: 20,
    horas: 1,
    alias: 'Carlos',
    celular: '923456789',
    estado: 'finalizado',
    montoTotal: 55,
  },
  {
    id: 'r3',
    canchaId: 2,
    fecha: '2026-10-02',
    inicio: 19,
    horas: 2,
    alias: 'Pedro',
    celular: '934567890',
    estado: 'finalizado',
    montoTotal: 140,
  },
]

const eventos: BloqueoEvento[] = [
  {
    id: 'ev1',
    canchaId: 1,
    fecha: '2026-10-15',
    inicio: 9,
    fin: 13,
    nombre: 'Torneo Escolar',
    celular: '999888777',
    notas: 'Final deportiva',
    estado: 'activo',
    precioCobrado: 450,
  },
]

const ahora = new Date('2026-10-31T23:59:59-05:00')
const balance = construirBalanceMensual('2026-10', reservas, canchas, eventos, ahora)

const texto = generarTextoBalance(balance, canchas)

// Verificaciones
assert.ok(texto.includes('POLIDEPORTIVO EL JAGUAR'))
assert.ok(texto.includes('OCTUBRE'))

// 1. Resumen global
assert.ok(texto.includes('3 turnos'))
assert.ok(texto.includes('4.5 horas'))
assert.ok(texto.includes('277.50')) // 82.5 + 55 + 140 = 277.5
assert.ok(texto.includes('450.00')) // Evento especial 450
assert.ok(texto.includes('727.50')) // Total general 277.5 + 450 = 727.5

// 2. Eventos especiales
assert.ok(texto.includes('Torneo Escolar'))
assert.ok(texto.includes('15/10/2026'))
assert.ok(texto.includes('450.00'))

// 3. Detalle individual por campo
assert.ok(texto.includes('CAMPO 1 (FÚTBOL 6)'))
assert.ok(texto.includes('01/10/2026'))
assert.ok(texto.includes('2 turnos'))
assert.ok(texto.includes('2.5 h'))
assert.ok(texto.includes('137.50')) // 82.5 + 55 = 137.5
assert.ok(texto.includes('SUBTOTAL     : 2 turnos   | 2.5 h'))

assert.ok(texto.includes('CAMPO 2 (FÚTBOL 7)'))
assert.ok(texto.includes('02/10/2026'))
assert.ok(texto.includes('1 turno'))
assert.ok(texto.includes('2.0 h'))
assert.ok(texto.includes('140.00'))
assert.ok(texto.includes('SUBTOTAL     : 1 turno    | 2.0 h'))

console.log('✔ exportarBalanceTexto.check.ts OK')
