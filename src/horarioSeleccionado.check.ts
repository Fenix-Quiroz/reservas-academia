import assert from 'node:assert/strict'
import fs from 'node:fs'
import { horarioSeleccionadoValido } from './reservas.js'

const horarios = [
  { inicio: 18, libre: true },
  { inicio: 18.5, libre: true },
  { inicio: 19, libre: false },
]

assert.equal(horarioSeleccionadoValido(horarios, null, 1), true)
assert.equal(horarioSeleccionadoValido(horarios, 18, 1), true)
assert.equal(horarioSeleccionadoValido(horarios, 18, 1.5), false)

const app = fs.readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
assert.match(app, /horarioSeleccionadoValido\(actuales, inicio, horas\)/)

console.log('✔ horarioSeleccionado.check.ts OK')
