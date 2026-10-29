import assert from 'node:assert/strict'
import fs from 'node:fs'

const datosReserva = fs.readFileSync(new URL('./DatosReserva.tsx', import.meta.url), 'utf8')

assert.doesNotMatch(datosReserva, /className="reserva-sin-adelanto"/)
assert.match(datosReserva, /const sinAdelanto = numeroConfiable === true/)
assert.match(datosReserva, /if \(!sinAdelanto\)[\s\S]*?PagoAdelanto/)

console.log('✔ datos-reserva-visual.check.ts OK')
