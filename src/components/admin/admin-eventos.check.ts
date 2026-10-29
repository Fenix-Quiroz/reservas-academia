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

console.log('✔ admin-eventos.check.ts OK')
