import assert from 'node:assert/strict'
import {
  cancelarReserva,
  crearReserva,
  leerReservas,
  registrarCliente,
  buscarPorCelular,
  limpiarDatosLocales,
  actualizarCliente,
} from './almacen.js'
import { horarios, masCercana } from './reservas.js'

let datos

function resetStorage(seed = {}) {
  datos = new Map(Object.entries(seed))
  globalThis.localStorage = {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    clear: () => datos.clear(),
  }
}

function reserva(overrides = {}) {
  return {
    canchaId: 2,
    fecha: '2099-05-15',
    inicio: 10,
    horas: 1,
    alias: 'Equipo Prueba',
    celular: '955555555',
    ...overrides,
  }
}

// Una reserva nueva se guarda cuando no se cruza con otra.
resetStorage()
const creada = crearReserva(reserva())
assert.equal(creada.reserva.alias, 'Equipo Prueba')
assert.equal(creada.reserva.fecha, '2099-05-15')
assert.equal(leerReservas().some((r) => r.id === creada.reserva.id), true)

// Dos reservas en la misma cancha y horario se bloquean, pero una contigua sí se permite.
resetStorage()
const primera = crearReserva(reserva({ celular: '955555551' }))
const solapada = crearReserva(reserva({ inicio: 10, celular: '955555552' }))
const contigua = crearReserva(reserva({ inicio: 11, celular: '955555553' }))
assert.equal(solapada.error, 'ocupado')
assert.equal(contigua.reserva.inicio, 11)
assert.ok(primera.reserva.id)

// Si todas las horas posibles están ocupadas, no se ofrece una alternativa.
const todasOcupadas = Array.from({ length: 15 }, (_, i) => ({
  canchaId: 1,
  fecha: '2099-05-18',
  inicio: 8 + i,
  horas: 1,
}))
const sinDisponibilidad = horarios(todasOcupadas, 1, '2099-05-18', 1)
assert.equal(sinDisponibilidad.some((h) => h.libre), false)
assert.equal(masCercana(sinDisponibilidad, 14), undefined)

// Un cliente no puede superar dos reservas activas, aunque cambie de cancha y día.
resetStorage()
crearReserva(reserva({ celular: '955555554', fecha: '2099-05-15', canchaId: 1 }))
crearReserva(reserva({ celular: '955555554', fecha: '2099-05-16', canchaId: 3 }))
const tercera = crearReserva(reserva({ celular: '955555554', fecha: '2099-05-17', canchaId: 2 }))
assert.equal(tercera.error, 'limite')

// Registrar, buscar y rechazar celulares duplicados conserva el primer registro; los alias pueden repetirse.
resetStorage()
const cliente = registrarCliente('Equipo Luna', '966666666')
assert.deepEqual(cliente.cliente, { alias: 'Equipo Luna', celular: '966666666' })
assert.equal(buscarPorCelular('966666666').alias, 'Equipo Luna')
assert.equal(registrarCliente('Otro nombre', '966666666').error, 'celular')
assert.deepEqual(registrarCliente(' equipo luna ', '977777777').cliente, { alias: 'equipo luna', celular: '977777777' })

// Una reserva futura se puede cancelar y desaparece del almacenamiento.
resetStorage()
const cancelable = crearReserva(reserva({ fecha: '2099-06-01', celular: '988888881' }))
assert.deepEqual(cancelarReserva(cancelable.reserva.id), {})
assert.equal(leerReservas().some((r) => r.id === cancelable.reserva.id), false)

// Las reservas inexistentes no se cancelan, pero las que ya pasaron sí.
resetStorage()
assert.equal(cancelarReserva('reserva-que-no-existe').error, 'no-existe')
const pasada = { ...reserva({ id: 'reserva-pasada', fecha: '2000-01-01' }) }
localStorage.setItem('reservas', JSON.stringify([pasada]))
assert.deepEqual(cancelarReserva('reserva-pasada'), {})
assert.equal(leerReservas().some((r) => r.id === 'reserva-pasada'), false)

// La demo se puede reiniciar y elimina reservas, clientes y usuario recordado.
resetStorage({
  reservas: JSON.stringify([reserva({ id: 'local-1' })]),
  clientes: JSON.stringify([{ alias: 'Equipo Prueba', celular: '955555555' }]),
  yo: JSON.stringify({ alias: 'Equipo Prueba', celular: '955555555' }),
})
limpiarDatosLocales()
assert.equal(leerReservas().some((r) => r.id === 'local-1'), false)
assert.equal(localStorage.getItem('clientes'), null)
assert.equal(localStorage.getItem('yo'), null)

// Editar los datos del cliente actualiza su perfil y sus reservas guardadas.
resetStorage({
  reservas: JSON.stringify([reserva({ id: 'local-2', alias: 'Equipo Prueba', celular: '955555555' })]),
  clientes: JSON.stringify([{ alias: 'Equipo Prueba', celular: '955555555' }]),
})
const actualizado = actualizarCliente('955555555', 'David', '944444444')
assert.deepEqual(actualizado.cliente, { alias: 'David', celular: '944444444' })
assert.equal(leerReservas().find((r) => r.id === 'local-2').alias, 'David')
assert.equal(leerReservas().find((r) => r.id === 'local-2').celular, '944444444')

console.log('✔ reservas.scenarios.check.js OK')
