import assert from 'node:assert/strict'
import { crearBloqueoAccion } from './accionUnica'

const bloqueo = crearBloqueoAccion()

assert.equal(bloqueo.adquirir(), true, 'la primera ejecución debe adquirir el bloqueo')
assert.equal(bloqueo.adquirir(), false, 'una segunda ejecución inmediata debe rechazarse')

bloqueo.liberar()
assert.equal(bloqueo.adquirir(), true, 'el bloqueo debe poder reutilizarse después de finalizar')

console.log('Bloqueo de acciones: ok')
