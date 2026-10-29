import assert from 'node:assert/strict'
import fs from 'node:fs'
import { mantenerDuracionMinima } from './AdminSelectorHorario.js'

const selector = fs.readFileSync(new URL('./AdminSelectorHorario.tsx', import.meta.url), 'utf8')
const eventos = fs.readFileSync(new URL('./AdminEventos.tsx', import.meta.url), 'utf8')

assert.equal(mantenerDuracionMinima(7, 12), 12)
assert.equal(mantenerDuracionMinima(10, 12), 15)
assert.match(selector, /aria-label="Horario"/)
assert.match(selector, /role="dialog"/)
assert.match(selector, /aria-modal="true"/)
assert.match(selector, /Selecciona el horario/)
assert.match(selector, /Desde/)
assert.match(selector, /Hasta/)
assert.match(selector, /Aplicar horario/)
assert.match(selector, /opcionesDesde\.map/)
assert.match(selector, /opcionesHasta\.map/)
assert.match(selector, /onChangeInicio/)
assert.match(selector, /onChangeFin/)
assert.match(selector, /className="admin-selector-horario-columna admin-selector-horario-columna-desde"/)
assert.match(selector, /className="admin-selector-horario-columna admin-selector-horario-columna-hasta"/)
assert.match(selector, /aria-label="Horas de inicio"/)
assert.match(selector, /aria-label="Horas de fin"/)
assert.match(selector, /const enRango = valor > inicioNumero && valor <= finNumero/)
assert.match(eventos, /<AdminSelectorHorario/)
assert.doesNotMatch(eventos, /id="evento-desde"/)
assert.doesNotMatch(eventos, /id="evento-hasta"/)

console.log('✔ admin-horario.check.ts OK')
