// Fallback de la demo. Con Supabase activo, las reservas y clientes vienen de la base remota.
import demo from './data/reservas-demo.json' with { type: 'json' }
import type { BloqueoEvento, Cliente, EstadoReserva, Reserva, ReservaNueva } from './types.js'
import { eventoChocaConEntrenamiento, eventoChocaConReserva, eventoBloquea, validarBloqueoEvento, type BloqueoEventoNuevo, type ResultadoCancelacionEvento, type ResultadoEvento } from './eventos.js'
import type { NumeroBloqueado, NumeroConfiable, ResultadoControlCliente } from './controlClientes.js'
import { INASISTENCIAS_PARA_BLOQUEAR } from './controlClientes.js'
import { normalizarReserva, puedeCambiarEstado } from './estadoReserva.js'
import { chocan, activa, esDuracionValida, fechaISO, sumarDias, sePuedeCancelar, MAX_ACTIVAS } from './reservas.js'
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
type TokenReservaGuardado = { token: string; celular: string }
type TokensReserva = Record<string, TokenReservaGuardado>
const CLAVE_TOKENS_RESERVA = 'reserva-tokens'
const CLAVE_NUMEROS_BLOQUEADOS = 'numeros-bloqueados'
const CLAVE_NUMEROS_CONFIABLES = 'numeros-confiables'
const CLAVE_BLOQUEOS_EVENTOS = 'bloqueos-eventos'
const FORMATO_TOKEN_RESERVA = /^[0-9a-f]{48}$/

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
  for (const clave of [
    'reservas', 'clientes', 'yo', CLAVE_TOKENS_RESERVA,
    CLAVE_NUMEROS_BLOQUEADOS, CLAVE_NUMEROS_CONFIABLES, CLAVE_BLOQUEOS_EVENTOS,
  ]) {
    try {
      localStorage.removeItem(clave)
    } catch {
      // El modo privado puede impedir borrar el almacenamiento.
    }
  }
}

function numeroValido(celular: string): boolean {
  return validarCelular(normalizarCelular(celular)) === null
}

export function leerNumerosBloqueados(): NumeroBloqueado[] {
  return leer<NumeroBloqueado[]>(CLAVE_NUMEROS_BLOQUEADOS, [])
    .filter((numero) => numeroValido(numero.celular))
    .map((numero) => ({
      celular: normalizarCelular(numero.celular),
      motivo: numero.motivo?.trim() || 'Bloqueado por administración',
      inasistencias: Math.max(0, Number(numero.inasistencias) || 0),
      activo: numero.activo !== false,
      ...(numero.createdAt ? { createdAt: numero.createdAt } : {}),
    }))
}

export function bloquearNumero(
  celular: string,
  motivo = 'Bloqueado por administración',
  inasistencias = INASISTENCIAS_PARA_BLOQUEAR,
): ResultadoControlCliente {
  const celularNormalizado = normalizarCelular(celular)
  if (!numeroValido(celularNormalizado)) return { error: 'celular-invalido' }
  const guardados = leerNumerosBloqueados()
  const existente = guardados.find((numero) => numero.celular === celularNormalizado)
  const actualizado: NumeroBloqueado = {
    celular: celularNormalizado,
    motivo: motivo.trim() || 'Bloqueado por administración',
    inasistencias: Math.max(existente?.inasistencias ?? 0, inasistencias),
    activo: true,
    ...(existente?.createdAt ? { createdAt: existente.createdAt } : {}),
  }
  guardar(CLAVE_NUMEROS_BLOQUEADOS, [
    ...guardados.filter((numero) => numero.celular !== celularNormalizado),
    actualizado,
  ])
  return {}
}

export function desbloquearNumero(celular: string): ResultadoControlCliente {
  const celularNormalizado = normalizarCelular(celular)
  const guardados = leerNumerosBloqueados()
  if (!guardados.some((numero) => numero.celular === celularNormalizado)) return { error: 'no-existe' }
  guardar(CLAVE_NUMEROS_BLOQUEADOS, guardados.map((numero) => (
    numero.celular === celularNormalizado ? { ...numero, activo: false } : numero
  )))
  return {}
}

export function leerNumerosConfiables(): NumeroConfiable[] {
  return leer<NumeroConfiable[]>(CLAVE_NUMEROS_CONFIABLES, [])
    .filter((numero) => numeroValido(numero.celular))
    .map((numero) => ({
      celular: normalizarCelular(numero.celular),
      alias: numero.alias?.trim() || 'Cliente confiable',
      activo: numero.activo !== false,
      ...(numero.createdAt ? { createdAt: numero.createdAt } : {}),
    }))
}

export function agregarNumeroConfiable(celular: string, alias = 'Cliente confiable'): ResultadoControlCliente {
  const celularNormalizado = normalizarCelular(celular)
  if (!numeroValido(celularNormalizado)) return { error: 'celular-invalido' }
  const aliasNormalizado = normalizarAlias(alias) || 'Cliente confiable'
  if (validarAlias(aliasNormalizado)) return { error: 'alias-invalido' }
  const guardados = leerNumerosConfiables()
  const existente = guardados.find((numero) => numero.celular === celularNormalizado)
  const actualizado: NumeroConfiable = {
    celular: celularNormalizado,
    alias: aliasNormalizado,
    activo: true,
    ...(existente?.createdAt ? { createdAt: existente.createdAt } : {}),
  }
  guardar(CLAVE_NUMEROS_CONFIABLES, [
    ...guardados.filter((numero) => numero.celular !== celularNormalizado),
    actualizado,
  ])
  return {}
}

export function quitarNumeroConfiable(celular: string): ResultadoControlCliente {
  const celularNormalizado = normalizarCelular(celular)
  const guardados = leerNumerosConfiables()
  if (!guardados.some((numero) => numero.celular === celularNormalizado)) return { error: 'no-existe' }
  guardar(CLAVE_NUMEROS_CONFIABLES, guardados.map((numero) => (
    numero.celular === celularNormalizado ? { ...numero, activo: false } : numero
  )))
  return {}
}

export function leerBloqueosEventos(): BloqueoEvento[] {
  return leer<BloqueoEvento[]>(CLAVE_BLOQUEOS_EVENTOS, [])
    .filter((evento) => (
      typeof evento.id === 'string'
      && typeof evento.fecha === 'string'
      && typeof evento.nombre === 'string'
      && typeof evento.inicio === 'number'
      && typeof evento.fin === 'number'
      && (evento.estado === 'activo' || evento.estado === 'cancelado')
    ))
    .map((evento) => ({
      ...evento,
      nombre: evento.nombre.trim(),
      celular: evento.celular?.trim() ?? '',
      notas: evento.notas?.trim() ?? '',
    }))
}

export function crearBloqueoEventoLocal(
  nuevo: BloqueoEventoNuevo,
  reservas: readonly Reserva[] = leerReservas(),
): ResultadoEvento {
  if (!validarBloqueoEvento(nuevo)) return { error: 'datos-invalidos' }
  const evento: BloqueoEvento = {
    ...nuevo,
    id: crypto.randomUUID(),
    nombre: nuevo.nombre.trim(),
    celular: nuevo.celular.trim(),
    notas: nuevo.notas.trim(),
    estado: 'activo',
  }
  if (eventoChocaConEntrenamiento(evento)) return { error: 'ocupado' }
  if (reservas.some((reserva) => eventoChocaConReserva(evento, reserva))) return { error: 'ocupado' }
  if (leerBloqueosEventos().some((existente) => eventoBloquea(existente, evento.canchaId, evento.fecha, evento.inicio, evento.fin - evento.inicio))) {
    return { error: 'ocupado' }
  }
  guardar(CLAVE_BLOQUEOS_EVENTOS, [...leerBloqueosEventos(), evento])
  return { evento }
}

export function cancelarBloqueoEventoLocal(id: string): ResultadoCancelacionEvento {
  const eventos = leerBloqueosEventos()
  if (!eventos.some((evento) => evento.id === id && evento.estado === 'activo')) return { error: 'no-existe' }
  guardar(CLAVE_BLOQUEOS_EVENTOS, eventos.map((evento) => (
    evento.id === id ? { ...evento, estado: 'cancelado' as const } : evento
  )))
  return {}
}

function leerTokensGuardados(): TokensReserva {
  const crudos = leer<unknown>(CLAVE_TOKENS_RESERVA, {})
  const guardados: TokensReserva = {}

  if (crudos && typeof crudos === 'object' && !Array.isArray(crudos)) {
    for (const [id, valor] of Object.entries(crudos)) {
      if (!valor || typeof valor !== 'object' || Array.isArray(valor)) continue
      const registro = valor as Record<string, unknown>
      if (typeof registro.token !== 'string' || !FORMATO_TOKEN_RESERVA.test(registro.token)) continue
      if (typeof registro.celular !== 'string') continue
      const celular = normalizarCelular(registro.celular)
      if (validarCelular(celular)) continue
      guardados[id] = { token: registro.token, celular }
    }
  }

  // Descarta el formato anterior (id -> token), que no permitía separar personas.
  if (JSON.stringify(crudos) !== JSON.stringify(guardados)) guardar(CLAVE_TOKENS_RESERVA, guardados)
  return guardados
}

export function leerTokensReservas(celular?: string): string[] {
  const guardados = leerTokensGuardados()
  if (!celular) return []
  const celularNormalizado = normalizarCelular(celular)
  return [...new Set(
    Object.values(guardados)
      .filter((registro) => registro.celular === celularNormalizado)
      .map((registro) => registro.token),
  )]
}

export function tokenReserva(id: string, celular?: string): string | undefined {
  if (!celular) return undefined
  const guardado = leerTokensGuardados()[id]
  return guardado?.celular === normalizarCelular(celular) ? guardado.token : undefined
}

export function guardarTokenReserva(id: string, token: string, celular: string): void {
  const celularNormalizado = normalizarCelular(celular)
  if (!id || !FORMATO_TOKEN_RESERVA.test(token) || validarCelular(celularNormalizado)) return
  const guardados = leerTokensGuardados()
  guardar(CLAVE_TOKENS_RESERVA, {
    ...guardados,
    [id]: { token, celular: celularNormalizado },
  })
}

// Vuelve a leer justo antes de guardar: si otra pestaña reservó primero, lo detectamos
export function crearReserva(nueva: ReservaNueva, sinAdelanto = false): ResultadoReserva | Promise<ResultadoReserva> {
  if (supabaseFaltaEnProduccion) return { error: 'conexion' }
  if (supabaseConfigurado) return crearReservaPublicaRemota(nueva, sinAdelanto)
  if (!esDuracionValida(nueva.horas)) return { error: 'duracion-invalida' }

  const todas = leerReservas()
  if (leerBloqueosEventos().some((evento) => eventoBloquea(evento, nueva.canchaId, nueva.fecha, nueva.inicio, nueva.horas))) {
    return { error: 'ocupado' }
  }
  if (leerNumerosBloqueados().some((numero) => numero.celular === nueva.celular && numero.activo)) {
    return { error: 'celular-bloqueado' }
  }
  if (todas.some((r) => r.estado !== 'cancelado' && chocan(r, nueva))) return { error: 'ocupado' }
  if (todas.filter((r) => r.celular === nueva.celular && activa(r)).length >= MAX_ACTIVAS)
    return { error: 'limite' }

  const reserva: Reserva = {
    ...nueva,
    id: crypto.randomUUID(),
    estado: 'activo',
    pagoEstado: sinAdelanto ? 'no_requerido' : 'pendiente',
  }
  guardar('reservas', [...leer<Reserva[]>('reservas', []), reserva])
  return { reserva }
}

// Las reservas de la demo no están guardadas, así que no se pueden cancelar
export function cancelarReserva(id: string, celular?: string): ResultadoCancelacion | Promise<ResultadoCancelacion> {
  if (supabaseFaltaEnProduccion) return { error: 'conexion' }
  if (supabaseConfigurado) {
    const token = tokenReserva(id, celular)
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
  const actualizadas = guardadas.map((r) => r.id === id ? { ...r, estado } : r)
  guardar('reservas', actualizadas)
  if (estado === 'no_asistio') {
    const inasistencias = actualizadas.filter((r) => r.celular === reserva.celular && r.estado === 'no_asistio').length
    if (inasistencias >= INASISTENCIAS_PARA_BLOQUEAR) {
      bloquearNumero(reserva.celular, 'Bloqueado automáticamente después de 2 inasistencias', inasistencias)
    }
  }
  return {}
}

// "Tabla" de clientes: los de la demo + los creados en este navegador
const clientes = (): Cliente[] => {
  const demoClientes = (demo as Array<Pick<Reserva, 'alias' | 'celular'>>).map(({ alias, celular }) => ({ alias, celular }))
  return [...demoClientes, ...leer<Cliente[]>('clientes', [])]
}

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
