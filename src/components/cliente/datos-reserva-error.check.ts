import assert from 'node:assert/strict'
import fs from 'node:fs'

const datosReserva = fs.readFileSync(new URL('./DatosReserva.tsx', import.meta.url), 'utf8')
const estilos = fs.readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

assert.match(datosReserva, /const errorRef = useRef<HTMLParagraphElement \| null>\(null\)/)
assert.match(datosReserva, /errorRef\.current\?\.scrollIntoView\(/)
assert.match(datosReserva, /ref=\{errorRef\}/)
assert.match(datosReserva, /role="alert"/)
assert.match(estilos, /\.main-datos \.error\s*\{[\s\S]*?scroll-margin/) 

console.log('✔ datos-reserva-error.check.ts OK')
