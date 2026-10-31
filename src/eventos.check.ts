import assert from 'node:assert/strict'
import { eventoBloquea, eventoChocaConEntrenamiento, esRangoEventoValido, validarEventoEspecial, buscarConflictosEvento, eventoYaTermino } from './eventos'
import { horarios } from './reservas'
import { actualizarEventoEspecialLocal, cancelarEventoEspecialLocal, crearBloqueoEventoLocal, crearEventoEspecialLocal, crearReserva, leerBloqueosEventos, limpiarDatosLocales } from './almacen'
import type { BloqueoEvento, Campo, Reserva } from './types'

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
assert.equal(esRangoEventoValido(7, 11), true)
assert.equal(esRangoEventoValido(7, 10), true)
assert.equal(esRangoEventoValido(7, 7), false)
assert.equal(esRangoEventoValido(7.5, 11.5), true)
assert.equal(esRangoEventoValido(7.2, 11), false)
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

// Pruebas específicas para Campo 4 (Vóley)
const eventoVoleyValido = {
  canchaIds: [4] as const,
  fecha: '2099-01-11', // Domingo
  inicio: 8,
  fin: 13,
  nombre: 'Torneo Relámpago de Vóley',
  celular: '987654321',
  notas: 'Torneo privado 6 equipos',
  tipo: 'individual' as const,
  precioCobrado: 350,
}
assert.equal(validarEventoEspecial(eventoVoleyValido), true)

const creacionVoley = crearEventoEspecialLocal(eventoVoleyValido, [])
assert.ok('eventos' in creacionVoley)
assert.equal(creacionVoley.eventos.length, 1)
assert.equal(creacionVoley.eventos[0]?.canchaId, 4)
assert.equal(creacionVoley.eventos[0]?.precioCobrado, 350)
const voleyGrupoId = creacionVoley.eventos[0]?.grupoId ?? ''
assert.deepEqual(cancelarEventoEspecialLocal(voleyGrupoId), {})

// Campo 4 choca con entrenamiento de vóley en sábado de 9:00 a 12:00 (540 a 720 min)
const choqueEntrenamientoVoley = crearEventoEspecialLocal({
  ...eventoVoleyValido,
  fecha: '2099-01-10', // Sábado (día 6)
  inicio: 9,
  fin: 13,
}, [])
assert.deepEqual(choqueEntrenamientoVoley, {
  error: 'entrenamiento-ocupado',
  entrenamiento: { inicioMinuto: 540, finMinuto: 720 },
})


// Pruebas de detección inteligente de conflictos (Choque a ciegas resuelto)
const canchasTest = [
  { id: 1, nombre: 'Campo 1 (Fútbol 6)', deporte: 'Fútbol 6', jugadores: '6 vs 6', precioHora: 55, imagen: '' },
  { id: 2, nombre: 'Campo 2 (Fútbol 7)', deporte: 'Fútbol 7', jugadores: '7 vs 7', precioHora: 70, imagen: '' },
  { id: 3, nombre: 'Campo 3 (Fútbol 5)', deporte: 'Fútbol 5', jugadores: '5 vs 5', precioHora: 45, imagen: '' },
  { id: 4, nombre: 'Campo 4 (Vóley)', deporte: 'Vóley', jugadores: '6 vs 6', precioHora: 40, imagen: '' },
] as unknown as Campo[]
const reservasTest: Reserva[] = [
  {
    id: 'res-conflicto-1',
    canchaId: 2,
    fecha: '2099-01-15',
    inicio: 18,
    horas: 1,
    alias: 'Roberto Carlos',
    celular: '998877665',
    estado: 'activo',
    montoTotal: 70,
  },
]

// 1. Detección de conflicto con reserva en Campo 2 al intentar reservar todos los campos de fútbol
const conflictosFutbol = buscarConflictosEvento([1, 2, 3], '2099-01-15', 16, 21, reservasTest, [], canchasTest)
assert.equal(conflictosFutbol.reservas.length, 1)
assert.equal(conflictosFutbol.reservas[0]?.canchaId, 2)
assert.equal(conflictosFutbol.reservas[0]?.cliente, 'Roberto Carlos')
assert.equal(conflictosFutbol.reservas[0]?.celular, '998877665')
assert.equal(conflictosFutbol.reservas[0]?.canchaNombre, 'Campo 2 (Fútbol 7)')

// 2. Sin conflicto en fecha diferente
const sinConflictos = buscarConflictosEvento([1, 2, 3], '2099-01-16', 16, 21, reservasTest, [], canchasTest)
assert.equal(sinConflictos.reservas.length, 0)
assert.equal(sinConflictos.eventos.length, 0)

// 3. Conflicto con otro evento especial existente
const eventoExistenteTest: BloqueoEvento = {
  id: 'evento-existente-1',
  canchaId: 1,
  fecha: '2099-01-15',
  inicio: 10,
  fin: 16,
  nombre: 'Torneo Intercolegial',
  celular: '911223344',
  notas: '',
  estado: 'activo',
}
const conflictosEvento = buscarConflictosEvento([1], '2099-01-15', 12, 18, [], [eventoExistenteTest], canchasTest)
assert.equal(conflictosEvento.eventos.length, 1)
assert.equal(conflictosEvento.eventos[0]?.nombre, 'Torneo Intercolegial')
assert.equal(conflictosEvento.eventos[0]?.canchaNombre, 'Campo 1 (Fútbol 6)')

// 4. Edición de evento especial local (actualizar horario, precio cobrado y cliente)
const resCrear = crearEventoEspecialLocal({
  tipo: 'individual',
  canchaIds: [1],
  fecha: '2099-02-10',
  inicio: 8,
  fin: 11,
  nombre: 'Torneo Inicial',
  celular: '987654321',
  notas: 'Sin arbitro',
  precioCobrado: 300,
}, [])

assert.ok(!('error' in resCrear))
const grupoCreadoId = resCrear.eventos[0].grupoId || resCrear.eventos[0].id

// Actualizar horario de 8-11 a 9-12 y precio de 300 a 450
const resEditar = actualizarEventoEspecialLocal({
  grupoId: grupoCreadoId,
  fecha: '2099-02-10',
  inicio: 9,
  fin: 12,
  nombre: 'Torneo Modificado',
  celular: '987654320',
  notas: 'Con 2 arbitros',
  precioCobrado: 450,
}, [])

assert.ok(!('error' in resEditar))
assert.equal(resEditar.eventos[0].inicio, 9)
assert.equal(resEditar.eventos[0].fin, 12)
assert.equal(resEditar.eventos[0].nombre, 'Torneo Modificado')
assert.equal(resEditar.eventos[0].celular, '987654320')
assert.equal(resEditar.eventos[0].notas, 'Con 2 arbitros')
assert.equal(resEditar.eventos[0].precioCobrado, 450)

// Comprobar que en el almacén local se actualizó correctamente
const eventosEnAlmacen = leerBloqueosEventos()
const eventoActualizado = eventosEnAlmacen.find((e) => e.id === resEditar.eventos[0].id)
assert.equal(eventoActualizado?.inicio, 9)
assert.equal(eventoActualizado?.fin, 12)
assert.equal(eventoActualizado?.precioCobrado, 450)

// Comprobar que no choca consigo mismo al buscar conflictos excluyendo su grupoId
const conflictoPropio = buscarConflictosEvento([1], '2099-02-10', 9, 12, [], eventosEnAlmacen, canchasTest, grupoCreadoId)
assert.equal(conflictoPropio.eventos.length, 0)

// Comprobar que detecta colisión si se intenta editar a un horario con reserva existente
const reservaColision: Reserva = {
  id: 'res-colision-1',
  canchaId: 1,
  fecha: '2099-02-10',
  inicio: 11,
  horas: 1,
  alias: 'Juan Pérez',
  celular: '912345678',
  estado: 'activo',
  montoTotal: 55,
}
const resEditarColision = actualizarEventoEspecialLocal({
  grupoId: grupoCreadoId,
  fecha: '2099-02-10',
  inicio: 10,
  fin: 13,
  nombre: 'Torneo Modificado',
  celular: '987654320',
  notas: '',
  precioCobrado: 450,
}, [reservaColision])

assert.ok('error' in resEditarColision)
assert.equal(resEditarColision.error, 'ocupado')
assert.equal(resEditarColision.detalleReserva?.cliente, 'Juan Pérez')

// Comprobar que detecta choque con entrenamiento de la academia (a las 15:30 en cancha 1 los martes)
const resEditarEntrenamiento = actualizarEventoEspecialLocal({
  grupoId: grupoCreadoId,
  fecha: '2099-02-10',
  inicio: 15,
  fin: 18,
  nombre: 'Torneo Modificado',
  celular: '987654320',
  notas: '',
  precioCobrado: 450,
}, [])

assert.ok('error' in resEditarEntrenamiento)
assert.equal(resEditarEntrenamiento.error, 'entrenamiento-ocupado')

// 4.1 Verificación de medias horas en creación y edición de eventos especiales
const resMediaHoraCrear = crearEventoEspecialLocal({
  tipo: 'individual',
  canchaIds: [1],
  fecha: '2099-02-15', // Domingo (sin entrenamientos)
  inicio: 18.5,
  fin: 20.5,
  nombre: 'Torneo Nocturno 18:30',
  celular: '987654321',
  notas: 'Empieza a las 6:30 pm',
  precioCobrado: 200,
}, [])
assert.ok(!('error' in resMediaHoraCrear), 'Debe permitir crear eventos con medias horas')
assert.equal(resMediaHoraCrear.eventos[0].inicio, 18.5)
assert.equal(resMediaHoraCrear.eventos[0].fin, 20.5)

const grupoMediaHoraId = resMediaHoraCrear.eventos[0].grupoId || resMediaHoraCrear.eventos[0].id
const resMediaHoraEditar = actualizarEventoEspecialLocal({
  grupoId: grupoMediaHoraId,
  fecha: '2099-02-15',
  inicio: 19.5,
  fin: 20.5,
  nombre: 'Torneo Ajustado 19:30',
  celular: '987654321',
  notas: '1 hora de duración exacta',
  precioCobrado: 120,
}, [])
assert.ok(!('error' in resMediaHoraEditar), 'Debe permitir editar eventos con medias horas y duración de 1 hora')
assert.equal(resMediaHoraEditar.eventos[0].inicio, 19.5)
assert.equal(resMediaHoraEditar.eventos[0].fin, 20.5)

// 5. Verificación de evento ya terminado (concluido)
const eventoPasado = { fecha: '2026-10-30', fin: 12 }
const eventoFuturo = { fecha: '2026-11-05', fin: 14 }
const ahoraPrueba = new Date('2026-10-31T10:00:00-05:00')

assert.equal(eventoYaTermino(eventoPasado, ahoraPrueba), true, 'El evento pasado debe considerarse concluido')
assert.equal(eventoYaTermino(eventoFuturo, ahoraPrueba), false, 'El evento futuro no debe considerarse concluido')

// Mismo día antes y después de la hora de fin
const eventoMismoDia = { fecha: '2026-10-31', fin: 12 }
assert.equal(eventoYaTermino(eventoMismoDia, new Date('2026-10-31T11:59:00-05:00')), false)
assert.equal(eventoYaTermino(eventoMismoDia, new Date('2026-10-31T12:00:00-05:00')), true)
assert.equal(eventoYaTermino(eventoMismoDia, new Date('2026-10-31T13:00:00-05:00')), true)

console.log('✔ eventos.check.ts OK')
