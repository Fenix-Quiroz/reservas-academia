import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizarResultadoSorteo } from './sorteoSupabase.js'

const resultado = normalizarResultadoSorteo({
  sorteo: {
    id: 'sorteo-1',
    numero: 1,
    estado: 'ejecutado',
    desde: null,
    hasta: '2026-11-27T12:00:00.000Z',
    totalReservas: 2,
    totalTickets: 2,
    ejecutadoAt: '2026-11-27T12:00:01.000Z',
  },
  tickets: [{
    id: 'ticket-1',
    reservaId: 'reserva-1',
    numeroGlobal: 1,
    clienteId: 'cliente-1',
    ticketIndex: 1,
    totalTickets: 1,
    nombre: 'Ana Rojas',
    celular: '931283181',
  }],
  ganador: {
    id: 'ticket-1',
    reservaId: 'reserva-1',
    numeroGlobal: 1,
    clienteId: 'cliente-1',
    ticketIndex: 1,
    totalTickets: 1,
    nombre: 'Ana Rojas',
    celular: '931283181',
  },
})

assert.equal(resultado.sorteo.id, 'sorteo-1')
assert.equal(resultado.tickets[0]?.id, 'ticket-1')
assert.equal(resultado.ganador.nombre, 'Ana Rojas')

const source = fs.readFileSync(new URL('./sorteoSupabase.ts', import.meta.url), 'utf8')
assert.match(source, /\.from\('sorteos'\)/)
assert.match(source, /leerUltimoResultadoRemoto/)
assert.match(source, /\.rpc\('ejecutar_sorteo'\)/)

const supabaseDataSource = fs.readFileSync(new URL('./supabaseData.ts', import.meta.url), 'utf8')
assert.match(supabaseDataSource, /\.range\(/)

console.log('✔ sorteoSupabase.check.ts OK')
