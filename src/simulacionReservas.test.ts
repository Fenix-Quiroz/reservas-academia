import assert from 'node:assert/strict'
import {
  esRangoEventoValido,
  validarEventoEspecial,
  buscarConflictosEvento,
  eventoBloquea,
  eventoChocaConReserva,
  type EventoEspecialNuevo,
} from './eventos.js'
import {
  crearReserva,
  crearEventoEspecialLocal,
  cancelarEventoEspecialLocal,
  limpiarDatosLocales,
  leerBloqueosEventos,
} from './almacen.js'
import { horarios } from './reservas.js'
import { horaVisible, rangoVisible } from './utils/fechasReserva.js'
import type { Campo, Reserva } from './types.js'

console.log('--- INICIANDO SIMULACIONES DE RESERVA Y EVENTOS ESPECIALES ---\n')

const mockLocalStorage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (clave: string) => mockLocalStorage.get(clave) ?? null,
    setItem: (clave: string, valor: string) => mockLocalStorage.set(clave, String(valor)),
    removeItem: (clave: string) => mockLocalStorage.delete(clave),
    clear: () => mockLocalStorage.clear(),
  },
})

const canchas: Campo[] = [
  { id: 1, nombre: 'Campo 1 (Fútbol 7)', deporte: 'Fútbol 7', precioHora: 70, jugadores: 7, color: '#000', imagen: '', oferta: '' },
  { id: 2, nombre: 'Campo 2 (Fútbol 6)', deporte: 'Fútbol 6', precioHora: 60, jugadores: 6, color: '#000', imagen: '', oferta: '' },
  { id: 3, nombre: 'Campo 3 (Fútbol 5)', deporte: 'Fútbol 5', precioHora: 50, jugadores: 5, color: '#000', imagen: '', oferta: '' },
  { id: 4, nombre: 'Campo 4 (Vóley)', deporte: 'Vóley', precioHora: 40, jugadores: 6, color: '#000', imagen: '', oferta: '' },
]

limpiarDatosLocales()

// --------------------------------------------------------------------------
// SIMULACIÓN 1: Validación de rangos con medias horas y duración mínima de 2 horas
// --------------------------------------------------------------------------
console.log('Simulación 1: Rangos con medias horas y duración mínima...')

// 9:30 a 11:30 (2 horas exactas) -> VÁLIDO
assert.equal(esRangoEventoValido(9.5, 11.5), true)
assert.equal(horaVisible(9.5), '9:30 a. m.')
assert.equal(horaVisible(11.5), '11:30 a. m.')
assert.equal(rangoVisible(9.5, 2), '9:30 a. m. a 11:30 a. m.')

// 7:00 a 9:00 (2 horas) -> VÁLIDO
assert.equal(esRangoEventoValido(7, 9), true)

// 18:30 a 20:30 (6:30 p. m. a 8:30 p. m.) -> VÁLIDO
assert.equal(esRangoEventoValido(18.5, 20.5), true)
assert.equal(horaVisible(18.5), '6:30 p. m.')
assert.equal(horaVisible(20.5), '8:30 p. m.')

// 22:30 a 25:00 (10:30 p. m. a 1:00 a. m. -> 2.5 horas) -> VÁLIDO
assert.equal(esRangoEventoValido(22.5, 25), true)
assert.equal(horaVisible(22.5), '10:30 p. m.')
assert.equal(horaVisible(25), '1 a. m.')

console.log('  ✔ Validación de formatos de media hora y duración correcta OK.')

// --------------------------------------------------------------------------
// SIMULACIÓN 2: Creación de Evento Especial de 9:30 a. m. a 11:30 a. m.
// --------------------------------------------------------------------------
console.log('\nSimulación 2: Creación de un evento especial con inicio 9:30 a. m. y fin 11:30 a. m....')

const nuevoEvento: EventoEspecialNuevo = {
  canchaIds: [1],
  fecha: '2099-06-10',
  inicio: 9.5, // 9:30 a. m.
  fin: 11.5,   // 11:30 a. m. (2 horas)
  nombre: 'Torneo Relámpago Mañana',
  celular: '987654321',
  notas: 'Evento especial con media hora',
  tipo: 'individual',
  precioCobrado: 150,
}

assert.equal(validarEventoEspecial(nuevoEvento), true)

const resultadoCrear = crearEventoEspecialLocal(nuevoEvento, [])
assert.ok('eventos' in resultadoCrear, 'El evento debe haberse creado con éxito')
assert.equal(resultadoCrear.eventos.length, 1)
const eventoGuardado = resultadoCrear.eventos[0]
assert.equal(eventoGuardado.inicio, 9.5)
assert.equal(eventoGuardado.fin, 11.5)
assert.equal(eventoGuardado.nombre, 'Torneo Relámpago Mañana')
console.log(`  ✔ Evento creado correctamente: ${eventoGuardado.nombre} (${horaVisible(eventoGuardado.inicio)} – ${horaVisible(eventoGuardado.fin)})`)

// --------------------------------------------------------------------------
// SIMULACIÓN 3: Verificación del bloqueo de reservas de clientes
// --------------------------------------------------------------------------
console.log('\nSimulación 3: Cliente intenta reservar en horarios que chocan con el evento (9:30 a 11:30)...')

// Caso A: Cliente intenta reservar 9:00 a 10:00 (choca en 9:30 a 10:00)
const chocaInicio = eventoBloquea(eventoGuardado, 1, '2099-06-10', 9, 1)
assert.equal(chocaInicio, true, 'Debe bloquear la reserva de 9:00 a 10:00 porque invade de 9:30 a 10:00')
console.log('  ✔ Reserva 9:00 a 10:00 bloqueda correctamente (solapa a partir de 9:30).')

// Caso B: Cliente intenta reservar 10:00 a 11:00 (completamente dentro del evento)
const chocaAdentro = eventoBloquea(eventoGuardado, 1, '2099-06-10', 10, 1)
assert.equal(chocaAdentro, true, 'Debe bloquear la reserva de 10:00 a 11:00')
console.log('  ✔ Reserva 10:00 a 11:00 bloqueda correctamente (dentro del evento).')

// Caso C: Cliente intenta reservar 11:00 a 12:00 (choca en 11:00 a 11:30)
const chocaFin = eventoBloquea(eventoGuardado, 1, '2099-06-10', 11, 1)
assert.equal(chocaFin, true, 'Debe bloquear la reserva de 11:00 a 12:00 porque invade de 11:00 a 11:30')
console.log('  ✔ Reserva 11:00 a 12:00 bloqueda correctamente (solapa hasta 11:30).')

// Caso D: Cliente intenta reservar 8:00 a 9:30 (1.5 horas, termina EXACTO a las 9:30)
const contiguaAntes = eventoBloquea(eventoGuardado, 1, '2099-06-10', 8, 1.5)
assert.equal(contiguaAntes, false, '8:00 a 9:30 debe ser LIBRE porque termina cuando inicia el evento')
console.log('  ✔ Reserva contigua previa 8:00 a 9:30 está PERMITIDA (termina justo cuando inicia el evento).')

// Caso E: Cliente intenta reservar 11:30 a 12:30 (1 hora, inicia EXACTO a las 11:30)
const contiguaDespues = eventoBloquea(eventoGuardado, 1, '2099-06-10', 11.5, 1)
assert.equal(contiguaDespues, false, '11:30 a 12:30 debe ser LIBRE porque empieza cuando termina el evento')
console.log('  ✔ Reserva contigua posterior 11:30 a 12:30 está PERMITIDA (empieza justo cuando finaliza el evento).')

// --------------------------------------------------------------------------
// SIMULACIÓN 4: Vista de horarios del cliente con el evento activo
// --------------------------------------------------------------------------
console.log('\nSimulación 4: Verificación de la agenda de horarios disponibles para el cliente...')

const bloquesCliente = horarios(
  [], // sin reservas normales
  1,  // cancha 1
  '2099-06-10',
  0.5, // bloques de media hora
  new Date('2090-01-01T12:00:00'),
  [eventoGuardado], // evento activo
)

// Bloques a verificar
const b9_00 = bloquesCliente.find((b) => b.inicio === 9)
const b9_30 = bloquesCliente.find((b) => b.inicio === 9.5)
const b10_00 = bloquesCliente.find((b) => b.inicio === 10)
const b10_30 = bloquesCliente.find((b) => b.inicio === 10.5)
const b11_00 = bloquesCliente.find((b) => b.inicio === 11)
const b11_30 = bloquesCliente.find((b) => b.inicio === 11.5)

assert.equal(b9_00?.libre, true, '9:00 a. m. debe estar libre')
assert.equal(b9_30?.libre, false, '9:30 a. m. debe estar ocupado por el evento')
assert.equal(b10_00?.libre, false, '10:00 a. m. debe estar ocupado por el evento')
assert.equal(b10_30?.libre, false, '10:30 a. m. debe estar ocupado por el evento')
assert.equal(b11_00?.libre, false, '11:00 a. m. debe estar ocupado por el evento')
assert.equal(b11_30?.libre, true, '11:30 a. m. debe estar libre')

console.log('  ✔ Agenda cliente: 9:00 (libre), 9:30-11:00 (OCUPADOS), 11:30 (libre).')

// --------------------------------------------------------------------------
// SIMULACIÓN 5: Intento de reserva que el sistema debe rechazar
// --------------------------------------------------------------------------
console.log('\nSimulación 5: Intento real de guardar reserva de cliente que invade 9:30 a 10:30...')

const reservaInvalida: Omit<Reserva, 'id'> = {
  canchaId: 1,
  fecha: '2099-06-10',
  inicio: 9.5,
  horas: 1,
  alias: 'Juan Pérez',
  celular: '911222333',
  estado: 'activo',
}

const resultadoReserva = crearReserva(reservaInvalida)
assert.ok('error' in resultadoReserva)
assert.equal(resultadoReserva.error, 'ocupado')
console.log('  ✔ El sistema rechazó la reserva con error "ocupado", protegiendo el evento.')

// --------------------------------------------------------------------------
// SIMULACIÓN 6: Detección de conflictos al crear un evento sobre una reserva existente
// --------------------------------------------------------------------------
console.log('\nSimulación 6: Admin intenta crear un evento que choca con una reserva de cliente ya existente...')

// Supongamos que en la Cancha 2 hay una reserva existente de 16:00 a 17:30 (4:00 p. m. a 5:30 p. m.)
const reservaExistente: Reserva = {
  id: 'reserva-existente-1',
  canchaId: 2,
  fecha: '2099-06-10',
  inicio: 16,
  horas: 1.5,
  alias: 'Los Galácticos',
  celular: '999888777',
  estado: 'activo',
}

// Admin intenta crear un evento especial en Cancha 2 de 15:30 a 18:00 (3:30 p. m. a 6:00 p. m.)
const conflictos = buscarConflictosEvento(
  [2],
  '2099-06-10',
  15.5, // 3:30 p. m.
  18,   // 6:00 p. m.
  [reservaExistente],
  [],
  canchas,
)

assert.equal(conflictos.reservas.length, 1)
assert.equal(conflictos.reservas[0].cliente, 'Los Galácticos')
assert.equal(conflictos.reservas[0].horarioTexto, '4 p. m. a 5:30 p. m.')
console.log(`  ✔ Conflicto detectado con precisión: ${conflictos.reservas[0].cliente} (${conflictos.reservas[0].horarioTexto})`)

// --------------------------------------------------------------------------
// SIMULACIÓN 7: Cancelación del evento y liberación de los horarios
// --------------------------------------------------------------------------
console.log('\nSimulación 7: Cancelación del evento especial y liberación inmediata de horarios...')

const resultadoCancelar = cancelarEventoEspecialLocal(eventoGuardado.grupoId ?? eventoGuardado.id)
assert.ok(!('error' in resultadoCancelar))

const eventosTrasCancelacion = leerBloqueosEventos()
const eventoCancelado = eventosTrasCancelacion.find((e) => e.id === eventoGuardado.id)
assert.equal(eventoCancelado?.estado, 'cancelado')

// Ahora el cliente sí puede reservar en 9:30 a 10:30
const reservaDespuesDeCancelar = crearReserva(reservaInvalida)
assert.ok('reserva' in reservaDespuesDeCancelar)
assert.equal(reservaDespuesDeCancelar.reserva.inicio, 9.5)
assert.equal(reservaDespuesDeCancelar.reserva.alias, 'Juan Pérez')
console.log('  ✔ Horario liberado: Juan Pérez reservó con éxito a las 9:30 a. m. tras cancelar el evento.')

// --------------------------------------------------------------------------
// SIMULACIÓN 8: Evento multi-campo (Todos los campos de fútbol) con media hora
// --------------------------------------------------------------------------
console.log('\nSimulación 8: Evento multi-campo en campos 1, 2 y 3 de 19:30 a 22:30 (7:30 p. m. a 10:30 p. m.)...')

const eventoFutbol: EventoEspecialNuevo = {
  canchaIds: [1, 2, 3],
  fecha: '2099-06-14', // Domingo (sin entrenamientos)
  inicio: 19.5, // 7:30 p. m.
  fin: 22.5,   // 10:30 p. m.
  nombre: 'Copa Nocturna Fénix',
  celular: '999111222',
  notas: 'Torneo en todas las canchas de fútbol',
  tipo: 'todos_los_campos',
  precioCobrado: 450,
}

const resultadoFutbol = crearEventoEspecialLocal(eventoFutbol, [])
assert.ok('eventos' in resultadoFutbol)
assert.equal(resultadoFutbol.eventos.length, 3)
assert.deepEqual(resultadoFutbol.eventos.map((e) => e.canchaId), [1, 2, 3])
assert.ok(resultadoFutbol.eventos.every((e) => e.inicio === 19.5 && e.fin === 22.5))
console.log('  ✔ Evento multi-campo creado con éxito en canchas 1, 2 y 3 (7:30 p. m. a 10:30 p. m.).')

// --------------------------------------------------------------------------
// SIMULACIÓN 9: Verificación de las opciones generadas en el selector de admin
// --------------------------------------------------------------------------
console.log('\nSimulación 9: Generación de opciones del selector (paso de 0.5 y mínimo 2 horas)...')

function opcionesHoraTest(desde: number, hasta: number, paso = 0.5): number[] {
  return Array.from(
    { length: Math.max(0, Math.round((hasta - desde) / paso) + 1) },
    (_, indice) => Math.round((desde + indice * paso) * 10) / 10,
  )
}

// Opciones de inicio (7:00 a 23:00)
const opcionesInicio = opcionesHoraTest(7, 23, 0.5)
assert.equal(opcionesInicio[0], 7)       // 7:00 a. m.
assert.equal(opcionesInicio[1], 7.5)     // 7:30 a. m.
assert.equal(opcionesInicio[opcionesInicio.length - 1], 23) // 11:00 p. m.
assert.equal(opcionesInicio.length, 33)

// Si el usuario elige 9.5 (9:30 a. m.), las opciones de fin deben empezar en 11.5 (11:30 a. m.)
const inicioElegido = 9.5
const opcionesFin = opcionesHoraTest(inicioElegido + 2, 25, 0.5)
assert.equal(opcionesFin[0], 11.5) // Primera opción de fin: 11:30 a. m. (mínimo 2 horas)
assert.equal(opcionesFin[1], 12.0) // 12:00 p. m.
assert.equal(opcionesFin[opcionesFin.length - 1], 25) // 1:00 a. m.
assert.ok(opcionesFin.every((h) => h >= inicioElegido + 2), 'Todas las opciones de fin respetan el mínimo de 2 horas')
console.log(`  ✔ Paso 1: 33 opciones de inicio desde ${horaVisible(opcionesInicio[0])} hasta ${horaVisible(opcionesInicio[opcionesInicio.length - 1])}.`)
console.log(`  ✔ Paso 2 para inicio ${horaVisible(inicioElegido)}: fin inicia en ${horaVisible(opcionesFin[0])} (mínimo 2 horas) y termina en ${horaVisible(opcionesFin[opcionesFin.length - 1])}.`)

console.log('\n========================================================')
console.log('✔ TODAS LAS SIMULACIONES PASARON SATISFACTORIAMENTE (9/9)')
console.log('========================================================')
