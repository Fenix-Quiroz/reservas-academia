import assert from 'node:assert/strict'
import { eventoBloquea, eventoChocaConEntrenamiento, esRangoEventoValido } from './eventos'
import { horarios } from './reservas'
import { cancelarEventoEspecialLocal, crearBloqueoEventoLocal, crearEventoEspecialLocal, crearReserva, leerBloqueosEventos, limpiarDatosLocales } from './almacen'
import type { BloqueoEvento } from './types'

const evento: BloqueoEvento = {
  id: 'evento-1',
  canchaId: 1,
  fecha: '2099-01-04',
  inicio: 10,
  fin: 15,
  nombre: 'Torneo escolar',
  celular: '',
  notas: '',
  estado: 'activo',
}

assert.equal(esRangoEventoValido(7, 12), true)
assert.equal(esRangoEventoValido(20, 25), true)
assert.equal(esRangoEventoValido(7, 11), false)
assert.equal(esRangoEventoValido(23, 26), false)
assert.equal(eventoBloquea(evento, 1, '2099-01-04', 9, 1), false)
assert.equal(eventoBloquea(evento, 1, '2099-01-04', 9.5, 1), true)
assert.equal(eventoBloquea({ ...evento, estado: 'cancelado' }, 1, '2099-01-04', 10, 3), false)
assert.equal(eventoChocaConEntrenamiento({ ...evento, fecha: '2099-01-05', inicio: 16, fin: 21 }), true)

const disponibles = horarios(
  [],
  1,
  '2099-01-04',
  1,
  new Date('2090-01-01T12:00:00'),
  [evento],
)
assert.equal(disponibles.find((hora) => hora.inicio === 10)?.libre, false)
assert.equal(disponibles.find((hora) => hora.inicio === 15)?.libre, true)

const datosLocales = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (clave: string) => datosLocales.get(clave) ?? null,
    setItem: (clave: string, valor: string) => datosLocales.set(clave, valor),
    removeItem: (clave: string) => datosLocales.delete(clave),
  },
})
limpiarDatosLocales()
assert.ok(!('error' in crearBloqueoEventoLocal({
  canchaId: 1,
  fecha: evento.fecha,
  inicio: evento.inicio,
  fin: evento.fin,
  nombre: evento.nombre,
  celular: '',
  notas: '',
})))
assert.deepEqual(crearBloqueoEventoLocal({
  canchaId: 1,
  fecha: '2099-01-08',
  inicio: 7,
  fin: 25,
  nombre: 'Evento con entrenamiento',
  celular: '',
  notas: '',
}), {
  error: 'entrenamiento-ocupado',
  entrenamiento: { inicioMinuto: 930, finMinuto: 1195 },
})
assert.deepEqual(crearReserva({
  canchaId: 1,
  fecha: evento.fecha,
  inicio: 11,
  horas: 1,
  alias: 'Prueba',
  celular: '912345678',
}), { error: 'ocupado' })

const eventoEspecial = crearEventoEspecialLocal({
  canchaIds: [1, 2, 3],
  fecha: '2099-01-10',
  inicio: 7,
  fin: 12,
  nombre: 'Torneo de fútbol',
  celular: '',
  notas: '',
  tipo: 'todos_los_campos',
  precioCobrado: 900.5,
}, [])
assert.ok('eventos' in eventoEspecial)
assert.equal(eventoEspecial.eventos.length, 3)
assert.deepEqual(eventoEspecial.eventos.map((item) => item.canchaId), [1, 2, 3])
assert.equal(new Set(eventoEspecial.eventos.map((item) => item.grupoId)).size, 1)
assert.ok(eventoEspecial.eventos.every((item) => item.tipo === 'todos_los_campos' && item.precioCobrado === 900.5))
const grupoId = eventoEspecial.eventos[0]?.grupoId
assert.equal(typeof grupoId, 'string')
assert.deepEqual(cancelarEventoEspecialLocal(grupoId ?? ''), {})
assert.ok(leerBloqueosEventos().filter((item) => item.grupoId === grupoId).every((item) => item.estado === 'cancelado'))
assert.deepEqual(crearEventoEspecialLocal({
  canchaIds: [1],
  fecha: '2099-01-11',
  inicio: 7,
  fin: 12,
  nombre: 'Precio inválido',
  celular: '',
  notas: '',
  tipo: 'individual',
  precioCobrado: -1,
}, []), { error: 'datos-invalidos' })

console.log('✔ eventos.check.ts OK')
