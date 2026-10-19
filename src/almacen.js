// Fallback de la demo. Con Supabase activo, las reservas y clientes vienen de la base remota.
import demo from './data/reservas-demo.json' with { type: 'json' }
import { chocan, activa, fechaISO, sumarDias, sePuedeCancelar, MAX_ACTIVAS } from './reservas.js'
import { supabaseConfigurado } from './supabase.js'
import {
  leerReservasRemotas,
  crearReservaRemota,
  cancelarReservaRemota,
  buscarClienteRemoto,
  registrarClienteRemoto,
  actualizarClienteRemoto,
} from './supabaseData.js'

function leer(clave, porDefecto) {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? porDefecto
  } catch {
    return porDefecto
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // modo privado o almacenamiento lleno: la demo sigue funcionando en memoria
  }
}

function limpiarDatosDemoLocales() {
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
const reservasDemo = () =>
  demo.map(({ dia, ...r }, i) => ({ ...r, id: `demo-${i}`, fecha: fechaISO(sumarDias(dia)) }))

export const leerReservas = () => supabaseConfigurado ? [] : [...reservasDemo(), ...leer('reservas', [])]

export const cargarReservas = () => supabaseConfigurado ? leerReservasRemotas() : leerReservas()

export function limpiarDatosLocales() {
  for (const clave of ['reservas', 'clientes', 'yo']) {
    try {
      localStorage.removeItem(clave)
    } catch {
      // El modo privado puede impedir borrar el almacenamiento.
    }
  }
}

// Vuelve a leer justo antes de guardar: si otra pestaña reservó primero, lo detectamos
export function crearReserva(nueva) {
  if (supabaseConfigurado) return crearReservaRemota(nueva)

  const todas = leerReservas()
  if (todas.some((r) => chocan(r, nueva))) return { error: 'ocupado' }
  if (todas.filter((r) => r.celular === nueva.celular && activa(r)).length >= MAX_ACTIVAS)
    return { error: 'limite' }

  const reserva = { ...nueva, id: crypto.randomUUID() }
  guardar('reservas', [...leer('reservas', []), reserva])
  return { reserva }
}

// Las reservas de la demo no están guardadas, así que no se pueden cancelar
export function cancelarReserva(id) {
  if (supabaseConfigurado) return cancelarReservaRemota(id)

  const guardadas = leer('reservas', [])
  const reserva = guardadas.find((r) => r.id === id)
  if (!reserva) return { error: 'no-existe' }
  if (!sePuedeCancelar(reserva)) return { error: 'tarde' }
  guardar('reservas', guardadas.filter((r) => r.id !== id))
  return {}
}

// "Tabla" de clientes: los de la demo + los creados en este navegador
const clientes = () => {
  const demoClientes = demo.map(({ alias, celular }) => ({ alias, celular }))
  return [...demoClientes, ...leer('clientes', [])]
}

export const buscarPorCelular = (celular) => supabaseConfigurado
  ? buscarClienteRemoto(celular)
  : clientes().find((c) => c.celular === celular)

export function registrarCliente(alias, celular) {
  if (supabaseConfigurado) return registrarClienteRemoto(alias, celular)

  const porCelular = buscarPorCelular(celular)
  if (porCelular) return { error: 'celular', alias: porCelular.alias }

  const cliente = { alias: alias.trim(), celular }
  guardar('clientes', [...leer('clientes', []), cliente])
  return { cliente }
}

export function actualizarCliente(actualCelular, alias, celular) {
  if (supabaseConfigurado) return actualizarClienteRemoto(actualCelular, alias, celular)

  const nuevoAlias = alias.trim()
  if (nuevoAlias.length < 2) return { error: 'alias-invalido' }
  if (!/^9\d{8}$/.test(celular)) return { error: 'celular-invalido' }

  const otros = clientes().filter((c) => c.celular !== actualCelular)
  if (otros.some((c) => c.celular === celular)) return { error: 'celular' }

  const cliente = { alias: nuevoAlias, celular }
  const guardados = leer('clientes', [])
  const existe = guardados.some((c) => c.celular === actualCelular)
  guardar('clientes', existe
    ? guardados.map((c) => (c.celular === actualCelular ? cliente : c))
    : [...guardados, cliente])

  guardar('reservas', leer('reservas', []).map((r) => (
    r.celular === actualCelular ? { ...r, alias: cliente.alias, celular: cliente.celular } : r
  )))
  guardarYo(cliente)
  return { cliente }
}

// El cliente recordado en este dispositivo
export const leerYo = () => leer('yo', null)
export const guardarYo = (cliente) => guardar('yo', cliente)
export const olvidarYo = () => guardar('yo', null)
