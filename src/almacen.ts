// Fallback de la demo. Con Supabase activo, las reservas y clientes vienen de la base remota.
import demo from './data/reservas-demo.json' with { type: 'json' }
import type { Cliente, EstadoReserva, Reserva, ReservaNueva } from './types.js'
import { normalizarReserva, puedeCambiarEstado } from './estadoReserva.js'
import { chocan, activa, fechaISO, sumarDias, sePuedeCancelar, MAX_ACTIVAS } from './reservas.js'
import { supabaseFaltaEnProduccion, supabaseConfigurado } from './supabase.js'
import { normalizarAlias, normalizarCelular, validarAlias, validarCelular } from './validacionCliente.js'
import type {
  ResultadoCancelacion,
  ResultadoCliente,
  ResultadoEstado,
  ResultadoReserva,
} from './supabaseData.js'
import {
  leerReservasRemotas,
  crearReservaPublicaRemota,
  cancelarReservaPublicaRemota,
  cancelarReservaAdminRemota,
  actualizarEstadoReservaRemota,
} from './supabaseData.js'

type ReservaDemo = Omit<Reserva, 'id' | 'fecha' | 'estado'> & { dia: number }
type ReservaGuardada = Omit<Reserva, 'estado'> & { estado?: unknown }
type ResultadoClienteLocal = ResultadoCliente | { error: 'celular'; alias: string }
type TokensReserva = Record<string, string>
const CLAVE_TOKENS_RESERVA = 'reserva-tokens'

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
  (demo as ReservaDemo[]).map(({ dia, ...r }, i) => ({ ...r, id: `demo-${i}`, fecha: fechaISO(sumarDias(dia)), estado: 'activo' as const }))

export const leerReservas = (): Reserva[] => supabaseConfigurado || supabaseFaltaEnProduccion
  ? []
  : [...reservasDemo(), ...leer<ReservaGuardada[]>('reservas', []).map(normalizarReserva)]

export const cargarReservas = (): Reserva[] | Promise<Reserva[]> =>
  supabaseFaltaEnProduccion ? [] : supabaseConfigurado ? leerReservasRemotas() : leerReservas()

export function limpiarDatosLocales(): void {
  for (const clave of ['reservas', 'clientes', 'yo', CLAVE_TOKENS_RESERVA]) {
    try {
      localStorage.removeItem(clave)
    } catch {
      // El modo privado puede impedir borrar el almacenamiento.
    }
  }
}

export function leerTokensReservas(): string[] {
  const guardados = leer<TokensReserva>(CLAVE_TOKENS_RESERVA, {})
  return [...new Set(Object.values(guardados).filter((token) => /^[0-9a-f]{48}$/.test(token)))]
}

export function tokenReserva(id: string): string | undefined {
  const guardados = leer<TokensReserva>(CLAVE_TOKENS_RESERVA, {})
  const token = guardados[id]
  return typeof token === 'string' && /^[0-9a-f]{48}$/.test(token) ? token : undefined
}

export function guardarTokenReserva(id: string, token: string): void {
  if (!id || !/^[0-9a-f]{48}$/.test(token)) return
  const guardados = leer<TokensReserva>(CLAVE_TOKENS_RESERVA, {})
  guardar(CLAVE_TOKENS_RESERVA, { ...guardados, [id]: token })
}

// Vuelve a leer justo antes de guardar: si otra pestaña reservó primero, lo detectamos
export function crearReserva(nueva: ReservaNueva): ResultadoReserva | Promise<ResultadoReserva> {
  if (supabaseFaltaEnProduccion) return { error: 'conexion' }
  if (supabaseConfigurado) return crearReservaPublicaRemota(nueva)

  const todas = leerReservas()
  if (todas.some((r) => r.estado !== 'cancelado' && chocan(r, nueva))) return { error: 'ocupado' }
  if (todas.filter((r) => r.celular === nueva.celular && activa(r)).length >= MAX_ACTIVAS)
    return { error: 'limite' }

  const reserva: Reserva = { ...nueva, id: crypto.randomUUID(), estado: 'activo' }
  guardar('reservas', [...leer<Reserva[]>('reservas', []), reserva])
  return { reserva }
}

// Las reservas de la demo no están guardadas, así que no se pueden cancelar
export function cancelarReserva(id: string): ResultadoCancelacion | Promise<ResultadoCancelacion> {
  if (supabaseFaltaEnProduccion) return { error: 'conexion' }
  if (supabaseConfigurado) {
    const token = tokenReserva(id)
    return token ? cancelarReservaPublicaRemota(id, token) : { error: 'no-existe' }
  }

  const guardadas = leer<ReservaGuardada[]>('reservas', []).map(normalizarReserva)
  const reserva = guardadas.find((r) => r.id === id)
  if (!reserva) return { error: 'no-existe' }
  if (!sePuedeCancelar(reserva)) return { error: 'tarde' }
  guardar('reservas', guardadas.map((r) => r.id === id ? { ...r, estado: 'cancelado' as const } : r))
  return {}
}

export function cancelarReservaAdmin(id: string): ResultadoCancelacion | Promise<ResultadoCancelacion> {
  if (supabaseFaltaEnProduccion) return { error: 'conexion' }
  if (supabaseConfigurado) return cancelarReservaAdminRemota(id)
  return cancelarReserva(id)
}

export function actualizarEstadoReserva(id: string, estado: EstadoReserva): ResultadoEstado | Promise<ResultadoEstado> {
  if (supabaseConfigurado) return actualizarEstadoReservaRemota(id, estado)

  const guardadas = leer<ReservaGuardada[]>('reservas', []).map(normalizarReserva)
  const reserva = guardadas.find((r) => r.id === id)
  if (!reserva) return { error: 'no-existe' }
  if (!puedeCambiarEstado(reserva.estado, estado)) return { error: 'estado-invalido' }
  guardar('reservas', guardadas.map((r) => r.id === id ? { ...r, estado } : r))
  return {}
}

// "Tabla" de clientes: los de la demo + los creados en este navegador
const clientes = (): Cliente[] => {
  const demoClientes = (demo as Array<Pick<Reserva, 'alias' | 'celular'>>).map(({ alias, celular }) => ({ alias, celular }))
  return [...demoClientes, ...leer<Cliente[]>('clientes', [])]
}

export const buscarPorCelular = (celular: string): Cliente | undefined => supabaseConfigurado
  ? undefined
  : clientes().find((c) => c.celular === normalizarCelular(celular))

export function registrarCliente(alias: string, celular: string): ResultadoClienteLocal | Promise<ResultadoCliente> {
  const nuevoAlias = normalizarAlias(alias)
  const nuevoCelular = normalizarCelular(celular)
  const errorAlias = validarAlias(nuevoAlias)
  if (errorAlias) return { error: errorAlias }
  const errorCelular = validarCelular(nuevoCelular)
  if (errorCelular) return { error: errorCelular }
  if (supabaseConfigurado || supabaseFaltaEnProduccion) return { error: 'conexion' }

  const porCelular = clientes().find((c) => c.celular === nuevoCelular)
  if (porCelular) return { error: 'celular', alias: porCelular.alias }

  const cliente: Cliente = { alias: nuevoAlias, celular: nuevoCelular }
  guardar('clientes', [...leer<Cliente[]>('clientes', []), cliente])
  return { cliente }
}

export function actualizarCliente(
  actualCelular: string,
  alias: string,
  celular: string,
): ResultadoCliente | Promise<ResultadoCliente> {
  if (supabaseConfigurado || supabaseFaltaEnProduccion) return { error: 'conexion' }

  const nuevoAlias = normalizarAlias(alias)
  const nuevoCelular = normalizarCelular(celular)
  const errorAlias = validarAlias(nuevoAlias)
  if (errorAlias) return { error: errorAlias }
  const errorCelular = validarCelular(nuevoCelular)
  if (errorCelular) return { error: errorCelular }

  const otros = clientes().filter((c) => c.celular !== actualCelular)
  if (otros.some((c) => c.celular === nuevoCelular)) return { error: 'celular' }

  const cliente: Cliente = { alias: nuevoAlias, celular: nuevoCelular }
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
