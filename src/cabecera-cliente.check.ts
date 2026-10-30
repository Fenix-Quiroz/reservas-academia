import assert from 'node:assert/strict'
import fs from 'node:fs'

const cabecera = fs.readFileSync(new URL('./components/cliente/CabeceraCliente.tsx', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('./index.css', import.meta.url), 'utf8')

assert.match(cabecera, /className="[^"]*cabecera-boton-reservas[^"]*"/)
assert.match(cabecera, /<span>Mis<\/span>/)
assert.match(cabecera, /<span>reservas/)
const app = fs.readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
assert.match(app, /cantidadReservas=\{mias\.filter\(\(r\) => activa\(r\)\)\.length\}/)
assert.match(css, /\.cabecera-reservas-texto\s*\{/)
assert.match(css, /\.cabecera-boton-reservas\s*\{/)
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.cabecera-acciones\s*\{[\s\S]*justify-content:\s*flex-end/)

console.log('✔ cabecera-cliente.check.ts OK')
