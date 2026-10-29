import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
const selectorHorario = fs.readFileSync(new URL('./components/cliente/SelectorHorario.tsx', import.meta.url), 'utf8')

assert.match(app, /leerBorradorReserva\(canchas\)/)
assert.match(app, /const estadoInicialReserva = leerBorradorReserva\(canchas\)/)
assert.match(app, /useState\(\(\) => estadoInicialReserva\?\.paso \?\? 1\)/)
assert.match(app, /useState<Campo \| null>\(\(\) => estadoInicialReserva \? canchas\.find\(\(c\) => c\.id === estadoInicialReserva\.canchaId\) \?\? null : null\)/)
assert.match(app, /guardarBorradorReserva\(/)
assert.match(app, /borrarBorradorReserva\(\)/)
assert.match(app, /paso !== 2 && paso !== 3/)
assert.match(app, /paso === 1 \|\| paso === 4/)
assert.match(app, /etapaHorario/)
assert.match(app, /turnoHorario/)
assert.match(app, /semanaHorario/)
assert.match(app, /onEtapaChange/)
assert.match(app, /onTurnoChange/)
assert.match(app, /onSemanaChange/)
assert.match(selectorHorario, /onEtapaChange/)
assert.match(selectorHorario, /onTurnoChange/)
assert.match(selectorHorario, /onSemanaChange/)
assert.match(selectorHorario, /etapa: EtapaHorario/)

console.log('borradorReserva-app.check: ok')
