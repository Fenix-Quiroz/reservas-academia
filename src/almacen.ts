// Fallback de la demo. Con Supabase activo, las reservas y clientes vienen de la base remota.
import demo from './data/reservas-demo.json' with { type: 'json' }
import type { Cliente, Reserva, ReservaNueva } from './types.js'
import { chocan, activa, fechaISO, sumarDias, sePuedeCancelar, MAX_ACTIVAS } from './reservas.js'
import { supabaseConfigurado } from './supabase.js'
import type {
  ResultadoCancelacion,
  ResultadoCliente,
  ResultadoReserva,
} from './supabaseData.js'
import {
  leerReservasRemotas,
  crearReservaRemota,
  cancelarReservaRemota,
  buscarClienteRemoto,
  registrarClienteRemoto,
  actualizarClienteRemoto,
} from './supabaseData.js'

type ReservaDemo = Omit<Reserva, 'id' | 'fecha'> & { dia: number }
type ResultadoClienteLocal = ResultadoCliente | { error: 'celular'; alias: string }

function leer<T>(clave: string, porDefecto: T): T {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? 'null') as T ?? porDefecto
  } catch {
    return porDefecto
  }
}

function guardar<T>(clave: string, valor: T): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // modo privado o almacenamiento lleno: la demo sigue funcionando en memoria
  }
}

function limpiarDatosDemoLocales(): void {
  for (const clave of ['reservas', 'clientes']) {
    try {
      localStorage.removeItem(clave)
    } catch {
      // El modo privado puede impedir borrar el almacenamiento.
    }
  }
}

// Evita que datos creados antes de conectar Supabase aparezcan o se mezclen con los remotos.
if (supabaseConfigurado) limpiarDatosDemoLocales()

// Las reservas de prueba se calculan siempre desde hoy, así la grilla nunca se ve vacía
const reservasDemo = (): Reserva[] =>
  (demo as ReservaDemo[]).map(({ dia, ...r }, i) => ({ ...r, id: `demo-${i}`, fecha: fechaISO(sumarDias(dia)) }))

export const leerReservas = (): Reserva[] => supabaseConfigurado ? [] : [...reservasDemo(), ...leer<Reserva[]>('reservas', [])]

export const cargarReservas = (): Reserva[] | Promise<Reserva[]> =>
  supabaseConfigurado ? leerReservasRemotas() : leerReservas()

export function limpiarDatosLocales(): void {
  for (const clave of ['reservas', 'clientes', 'yo']) {
    try {
      localStorage.removeItem(clave)
    } catch {
      // El modo privado puede impedir borrar el almacenamiento.
    }
  }
}

// Vuelve a leer justo antes de guardar: si otra pestaña reservó primero, lo detectamos
export function crearReserva(nueva: ReservaNueva): ResultadoReserva | Promise<ResultadoReserva> {
  if (supabaseConfigurado) return crearReservaRemota(nueva)

  const todas = leerReservas()
  if (todas.some((r) => chocan(r, nueva))) return { error: 'ocupado' }
  if (todas.filter((r) => r.celular === nueva.celular && activa(r)).length >= MAX_ACTIVAS)
    return { error: 'limite' }

  const reserva: Reserva = { ...nueva, id: crypto.randomUUID() }
  guardar('reservas', [...leer<Reserva[]>('reservas', []), reserva])
  return { reserva }
}

// Las reservas de la demo no están guardadas, así que no se pueden cancelar
export function cancelarReserva(id: string): ResultadoCancelacion | Promise<ResultadoCancelacion> {
  if (supabaseConfigurado) return cancelarReservaRemota(id)

  const guardadas = leer<Reserva[]>('reservas', [])
  const reserva = guardadas.find((r) => r.id === id)
  if (!reserva) return { error: 'no-existe' }
  if (!sePuedeCancelar(reserva)) return { error: 'tarde' }
  guardar('reservas', guardadas.filter((r) => r.id !== id))
  return {}
}

// "Tabla" de clientes: los de la demo + los creados en este navegador
const clientes = (): Cliente[] => {
  const demoClientes = (demo as Array<Pick<Reserva, 'alias' | 'celular'>>).map(({ alias, celular }) => ({ alias, celular }))
  return [...demoClientes, ...leer<Cliente[]>('clientes', [])]
}

export const buscarPorCelular = (celular: string): Cliente | undefined | Promise<Cliente | null> => supabaseConfigurado
  ? buscarClienteRemoto(celular)
  : clientes().find((c) => c.celular === celular)

export function registrarCliente(alias: string, celular: string): ResultadoClienteLocal | Promise<ResultadoCliente> {
  if (supabaseConfigurado) return registrarClienteRemoto(alias, celular)

  const porCelular = clientes().find((c) => c.celular === celular)
  if (porCelular) return { error: 'celular', alias: porCelular.alias }

  const cliente: Cliente = { alias: alias.trim(), celular }
  guardar('clientes', [...leer<Cliente[]>('clientes', []), cliente])
  return { cliente }
}

export function actualizarCliente(
  actualCelular: string,
  alias: string,
  celular: string,
): ResultadoCliente | Promise<ResultadoCliente> {
  if (supabaseConfigurado) return actualizarClienteRemoto(actualCelular, alias, celular)

  const nuevoAlias = alias.trim()
  if (nuevoAlias.length < 2) return { error: 'alias-invalido' }
  if (!/^9\d{8}$/.test(celular)) return { error: 'celular-invalido' }

  const otros = clientes().filter((c) => c.celular !== actualCelular)
  if (otros.some((c) => c.celular === celular)) return { error: 'celular' }

  const cliente: Cliente = { alias: nuevoAlias, celular }
  const guardados = leer<Cliente[]>('clientes', [])
  const existe = guardados.some((c) => c.celular === actualCelular)
  guardar('clientes', existe
    ? guardados.map((c) => (c.celular === actualCelular ? cliente : c))
    : [...guardados, cliente])

  guardar('reservas', leer<Reserva[]>('reservas', []).map((r) => (
    r.celular === actualCelular ? { ...r, alias: cliente.alias, celular: cliente.celular } : r
  )))
  guardarYo(cliente)
  return { cliente }
}

// El cliente recordado en este dispositivo
export const leerYo = (): Cliente | null => leer<Cliente | null>('yo', null)
export const guardarYo = (cliente: Cliente | null): void => guardar('yo', cliente)
export const olvidarYo = (): void => guardar('yo', null)
