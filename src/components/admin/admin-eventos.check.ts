import assert from 'node:assert/strict'
import fs from 'node:fs'
import type { BloqueoEvento } from '../../types.js'
import { agruparEventosEspeciales } from './AdminEventos.js'

const adminEventos = fs.readFileSync(new URL('./AdminEventos.tsx', import.meta.url), 'utf8')
const adminEventoCard = fs.readFileSync(new URL('./AdminEventoCard.tsx', import.meta.url), 'utf8')

assert.match(adminEventos, /label: 'Todos los campos de fútbol'/)
assert.match(adminEventos, /canchaId === 'futbol'/)
assert.match(adminEventos, /cancha\.deporte\.startsWith\('Fútbol'\)/)
assert.match(adminEventos, /for \(const id of idsCanchaSeleccionadas\)/)
assert.match(adminEventos, /useEffect, useMemo, useRef, useState/)
assert.match(adminEventos, /const guardandoRef = useRef\(false\)/)
assert.match(adminEventos, /if \(guardandoRef\.current\) return/)
assert.match(adminEventos, /guardandoRef\.current = true/)
assert.match(adminEventos, /guardandoRef\.current = false/)
assert.match(adminEventos, /disabled=\{procesando \|\| guardando\}/)
assert.match(adminEventos, /precioCobrado/)
assert.match(adminEventos, /onCrear\(nuevo\)/)
assert.match(adminEventos, /function agruparEventosEspeciales/)
assert.match(adminEventos, /const activosAgrupados = agruparEventosEspeciales\(activos\)/)
assert.match(adminEventoCard, /eventos: readonly BloqueoEvento\[\]/)
assert.match(adminEventoCard, /const textoCampos/)
assert.match(adminEventoCard, /onCancel: \(grupoId: string\)/)
assert.match(adminEventoCard, /evento\.grupoId \?\? evento\.id/)
assert.match(adminEventoCard, /Evento concluido/)
assert.match(adminEventoCard, /admin-evento-agenda-concluido-badge/)
assert.match(adminEventos, /Eventos activos/)
assert.match(adminEventos, /Eventos finalizados/)
assert.match(adminEventos, /Cancelados/)
assert.match(adminEventoCard, /Evento cancelado/)
assert.match(adminEventoCard, /admin-evento-agenda-cancelado-badge/)

const eventoBase: BloqueoEvento = {
  id: 'campo-1',
  canchaId: 1,
  fecha: '2026-11-08',
  inicio: 7,
  fin: 22,
  nombre: 'prueba todos los campos',
  celular: '984333546',
  notas: 'pruebaaaa',
  estado: 'activo',
  grupoId: 'grupo-futbol',
  tipo: 'todos_los_campos',
  precioCobrado: 250,
}
const grupos = agruparEventosEspeciales([
  eventoBase,
  { ...eventoBase, id: 'campo-2', canchaId: 2 },
  { ...eventoBase, id: 'campo-3', canchaId: 3 },
  { ...eventoBase, id: 'voley', grupoId: 'grupo-voley', canchaId: 4, nombre: 'otro evento' },
])
assert.equal(grupos.length, 2)
assert.deepEqual(grupos[0]?.map((evento) => evento.canchaId), [1, 2, 3])

// Verificación de orden cronológico en eventos especiales (ejemplo del usuario):
// Evento 7am a 9am (inicio: 7), Evento 2pm a 3pm (inicio: 14), y Evento intermedio 11am a 1pm (inicio: 11)
const ev7am: BloqueoEvento = { id: 'ev-7am', canchaId: 1, fecha: '2026-11-04', inicio: 7, fin: 9, nombre: 'Evento 7am', celular: '911111111', notas: '', estado: 'activo' }
const ev2pm: BloqueoEvento = { id: 'ev-2pm', canchaId: 1, fecha: '2026-11-04', inicio: 14, fin: 15, nombre: 'Evento 2pm', celular: '922222222', notas: '', estado: 'activo' }
const ev11am: BloqueoEvento = { id: 'ev-11am', canchaId: 1, fecha: '2026-11-04', inicio: 11, fin: 13, nombre: 'Evento 11am', celular: '933333333', notas: '', estado: 'activo' }

const gruposEventos = agruparEventosEspeciales([ev7am, ev2pm, ev11am])
gruposEventos.sort((a, b) => (a[0]?.fecha ?? '').localeCompare(b[0]?.fecha ?? '') || (a[0]?.inicio ?? 0) - (b[0]?.inicio ?? 0))
assert.deepEqual(gruposEventos.map((g) => g[0]?.id), ['ev-7am', 'ev-11am', 'ev-2pm'], 'El evento especial de las 11 a. m. debe ubicarse exactamente en el medio')

console.log('✔ admin-eventos.check.ts OK')
