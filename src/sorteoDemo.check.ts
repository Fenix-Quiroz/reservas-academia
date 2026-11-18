import assert from 'node:assert/strict'
import datosDemo from './data/clientes-frecuentes-demo.json'
import { crearParticipantesDemo, crearTicketsDemo, ventanaSlot } from './sorteoDemo'

const participantes = crearParticipantesDemo(datosDemo)
const tickets = crearTicketsDemo(participantes)

assert.equal(participantes.length, datosDemo.length)
assert.equal(tickets.length, participantes.reduce((total, participante) => total + participante.tickets, 0))
assert.equal(tickets[0]?.numeroGlobal, 1)
assert.equal(tickets.at(-1)?.numeroGlobal, tickets.length)
assert.ok(Math.abs(participantes.reduce((total, participante) => total + participante.probabilidad, 0) - 100) < 0.001)

const ventana = ventanaSlot(tickets, 0)
assert.equal(ventana.length, 5)
assert.equal(ventana[2]?.numeroGlobal, 1)
assert.equal(ventana[0]?.numeroGlobal, tickets.length - 1)
assert.equal(ventana[1]?.numeroGlobal, tickets.length)
assert.equal(ventana[3]?.numeroGlobal, 2)
assert.equal(ventana[4]?.numeroGlobal, 3)

console.log('sorteoDemo.check: ok')
