import assert from 'node:assert/strict'
import {
  cancelarReserva,
  crearReserva,
  actualizarEstadoReserva,
  leerReservas,
  registrarCliente,
  buscarPorCelular,
  limpiarDatosLocales,
  actualizarCliente,
} from './almacen'
import { horarios, masCercana } from './reservas'
import type { Cliente, Reserva } from './types'
import type { ResultadoCliente, ResultadoReserva } from './supabaseData'

let datos = new Map<string, string>()

function conReserva(resultado: Awaited<ResultadoReserva | Promise<ResultadoReserva>>): { reserva: Reserva } {
  assert.ok('reserva' in resultado)
  return resultado
}

function conError<T>(resultado: T): T & { error: string } {
  assert.ok(typeof resultado === 'object' && resultado !== null && 'error' in resultado)
  return resultado as T & { error: string }
}

function conCliente(resultado: Awaited<ResultadoCliente | Promise<ResultadoCliente>>): { cliente: Cliente } {
  assert.ok('cliente' in resultado)
  return resultado
}

function resetStorage(seed: Record<string, string> = {}) {
  datos = new Map(Object.entries(seed))
  globalThis.localStorage = {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => { datos.set(clave, String(valor)) },
    removeItem: (clave: string) => { datos.delete(clave) },
    clear: () => datos.clear(),
  } as unknown as Storage
}

function reserva(overrides: Partial<Omit<Reserva, 'id'>> & { id?: string } = {}): Reserva {
  const { id = 'reserva-prueba', ...datosReserva } = overrides
  return {
    id,
    canchaId: 2,
    fecha: '2099-05-15',
    inicio: 10,
    horas: 1,
    alias: 'Equipo Prueba',
    celular: '955555555',
    estado: 'activo',
    ...datosReserva,
  }
}

// Una reserva nueva se guarda cuando no se cruza con otra.
resetStorage()
const creada = conReserva(await crearReserva(reserva()))
assert.equal(creada.reserva.alias, 'Equipo Prueba')
assert.equal(creada.reserva.fecha, '2099-05-15')
assert.equal(leerReservas().some((r) => r.id === creada.reserva.id), true)

// Dos reservas en la misma cancha y horario se bloquean, pero una contigua sí se permite.
resetStorage()
const primera = conReserva(await crearReserva(reserva({ celular: '955555551' })))
const solapada = conError(await crearReserva(reserva({ inicio: 10, celular: '955555552' })))
const contigua = conReserva(await crearReserva(reserva({ inicio: 11, celular: '955555553' })))
assert.equal(solapada.error, 'ocupado')
assert.equal(contigua.reserva.inicio, 11)
assert.ok(primera.reserva.id)

// Si todas las horas posibles están ocupadas, no se ofrece una alternativa.
const todasOcupadas = Array.from({ length: 15 }, (_, i) => ({
  canchaId: 1,
  fecha: '2099-05-17',
  inicio: 7 + i,
  horas: 1,
}))
const todasOcupadasHastaLaUna = Array.from({ length: 3 }, (_, i) => ({
  canchaId: 1,
  fecha: '2099-05-17',
  inicio: 22 + i,
  horas: 1,
}))
const sinDisponibilidad = horarios(
  [...todasOcupadas, ...todasOcupadasHastaLaUna],
  1,
  '2099-05-17',
  1,
)
assert.equal(sinDisponibilidad.some((h) => h.libre), false)
assert.equal(masCercana(sinDisponibilidad, 14), undefined)

// Un cliente no puede superar dos reservas activas, aunque cambie de cancha y día.
resetStorage()
await crearReserva(reserva({ celular: '955555554', fecha: '2099-05-15', canchaId: 1 }))
await crearReserva(reserva({ celular: '955555554', fecha: '2099-05-16', canchaId: 3 }))
const tercera = conError(await crearReserva(reserva({ celular: '955555554', fecha: '2099-05-17', canchaId: 2 })))
assert.equal(tercera.error, 'limite')

const duracionInvalida = conError(await crearReserva(reserva({ horas: 3.5, celular: '955555556' })))
assert.equal(duracionInvalida.error, 'duracion-invalida')

// Registrar, buscar y rechazar celulares duplicados conserva el primer registro; los alias pueden repetirse.
resetStorage()
const cliente = conCliente(await registrarCliente('Equipo Luna', '966666666'))
assert.deepEqual(cliente.cliente, { alias: 'Equipo Luna', celular: '966666666' })
assert.equal((await buscarPorCelular('966666666'))?.alias, 'Equipo Luna')
assert.equal(conError(await registrarCliente('Otro nombre', '966666666')).error, 'celular')
assert.deepEqual(conCliente(await registrarCliente(' equipo luna ', '977777777')).cliente, { alias: 'equipo luna', celular: '977777777' })

// Una reserva futura se puede cancelar y conserva su histórico con estado cancelado.
resetStorage()
const cancelable = conReserva(await crearReserva(reserva({ fecha: '2099-06-01', celular: '988888881' })))
assert.deepEqual(await cancelarReserva(cancelable.reserva.id), {})
const cancelada = leerReservas().find((r) => r.id === cancelable.reserva.id)
assert.equal(cancelada?.id, cancelable.reserva.id)
assert.equal(cancelada?.estado, 'cancelado')

// Las reservas inexistentes no se cancelan, pero las que ya pasaron sí.
resetStorage()
assert.equal((await cancelarReserva('reserva-que-no-existe')).error, 'no-existe')
const pasada = { ...reserva({ id: 'reserva-pasada', fecha: '2000-01-01' }) }
localStorage.setItem('reservas', JSON.stringify([pasada]))
assert.deepEqual(await cancelarReserva('reserva-pasada'), {})
assert.equal(leerReservas().find((r) => r.id === 'reserva-pasada')?.estado, 'cancelado')

// El encargado puede iniciar y finalizar una reserva, pero no devolverla a un estado anterior.
resetStorage()
const transicionable = conReserva(await crearReserva(reserva({ fecha: '2099-07-01', celular: '988888882' })))
assert.deepEqual(await actualizarEstadoReserva(transicionable.reserva.id, 'iniciado'), {})
assert.equal(leerReservas().find((r) => r.id === transicionable.reserva.id)?.estado, 'iniciado')
assert.deepEqual(await actualizarEstadoReserva(transicionable.reserva.id, 'finalizado'), {})
assert.equal(leerReservas().find((r) => r.id === transicionable.reserva.id)?.estado, 'finalizado')
assert.equal((await actualizarEstadoReserva(transicionable.reserva.id, 'activo')).error, 'estado-invalido')
assert.equal((await cancelarReserva(transicionable.reserva.id)).error, 'tarde')

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
const actualizado = conCliente(await actualizarCliente('955555555', 'David', '944444444'))
assert.deepEqual(actualizado.cliente, { alias: 'David', celular: '944444444' })
assert.equal(leerReservas().find((r) => r.id === 'local-2')!.alias, 'David')
assert.equal(leerReservas().find((r) => r.id === 'local-2')!.celular, '944444444')

console.log('✔ reservas.scenarios.check.ts OK')
