import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cliente, EstadoReserva, Reserva, ReservaNueva } from './types.js'
import { normalizarReserva, puedeCambiarEstado } from './estadoReserva.js'
import { activa, MAX_ACTIVAS, sePuedeCancelar } from './reservas.js'
import { supabase } from './supabase.js'

export type ErrorReserva =
  | 'ocupado'
  | 'limite'
  | 'celular'
  | 'conexion'
  | 'no-existe'
  | 'tarde'
  | 'alias-invalido'
  | 'celular-invalido'

export type ResultadoError = { error: ErrorReserva }
export type ResultadoReserva = { reserva: Reserva } | ResultadoError
export type ResultadoCliente = { cliente: Cliente } | ResultadoError
export type ResultadoCancelacion = Record<string, never> | ResultadoError
export type ErrorEstado = ErrorReserva | 'estado-invalido'
export type ResultadoEstado = Record<string, never> | { error: ErrorEstado }

interface FilaReserva {
  id?: string
  cancha_id: number | string
  fecha: string
  inicio: number | string
  horas: number | string
  alias: string
  celular: string
  estado?: unknown
  monto_total?: number | string | null
}

interface FilaCliente {
  alias: string
  celular: string
}

interface FilaCelular {
  celular: string
}

interface ErrorSupabase {
  code?: string
  message?: string
}

export const deReserva = (fila: FilaReserva): Reserva => {
  const montoTotal = Number(fila.monto_total)
  return normalizarReserva({
    id: fila.id as string,
    canchaId: Number(fila.cancha_id),
    fecha: fila.fecha,
    inicio: Number(fila.inicio),
    horas: Number(fila.horas),
    alias: fila.alias,
    celular: fila.celular,
    estado: fila.estado,
    ...(Number.isFinite(montoTotal) ? { montoTotal } : {}),
  })
}

export const aReserva = (reserva: Reserva | ReservaNueva): FilaReserva => {
  const fila: FilaReserva = {
    cancha_id: reserva.canchaId,
    fecha: reserva.fecha,
    inicio: reserva.inicio,
    horas: reserva.horas,
    alias: reserva.alias,
    celular: reserva.celular,
    estado: ('estado' in reserva ? reserva.estado : 'activo') as EstadoReserva,
  }
  if ('montoTotal' in reserva && typeof reserva.montoTotal === 'number' && Number.isFinite(reserva.montoTotal)) {
    fila.monto_total = reserva.montoTotal
  }
  if ('id' in reserva && reserva.id) fila.id = reserva.id
  return fila
}

export function errorDeSupabase(error?: ErrorSupabase): ErrorReserva {
  if (error?.code === '23P01') return 'ocupado'
  if (error?.code === '23505' && String(error.message).includes('celular')) return 'celular'
  return 'conexion'
}

function clienteSupabase(): SupabaseClient {
  if (!supabase) throw new Error('supabase-no-configurado')
  return supabase
}

export async function leerReservasRemotas(): Promise<Reserva[]> {
  const cliente = clienteSupabase()
  const { data, error } = await cliente
    .from('reservas')
    .select('id, cancha_id, fecha, inicio, horas, alias, celular, estado, monto_total')
    .order('fecha')
    .order('inicio')

  if (error) throw error
  return (data as FilaReserva[]).map(deReserva)
}

export async function crearReservaRemota(reserva: ReservaNueva): Promise<ResultadoReserva | { error: 'limite' }> {
  const cliente = clienteSupabase()
  const { data: pendientes, error: limiteError } = await cliente
    .from('reservas')
    .select('fecha, inicio, horas, cancha_id, alias, celular, estado, monto_total')
    .eq('celular', reserva.celular)
  if (limiteError) return { error: 'conexion' }
  if ((pendientes as FilaReserva[]).map(deReserva).filter((r) => activa(r)).length >= MAX_ACTIVAS) return { error: 'limite' }

  const { data, error } = await cliente
    .from('reservas')
    .insert(aReserva(reserva))
    .select('id, cancha_id, fecha, inicio, horas, alias, celular, estado, monto_total')
    .single()

  if (error) return { error: errorDeSupabase(error) }
  return { reserva: deReserva(data as FilaReserva) }
}

export async function cancelarReservaRemota(id: string): Promise<ResultadoCancelacion> {
  const cliente = clienteSupabase()
  const { data, error: lecturaError } = await cliente
    .from('reservas')
    .select('id, cancha_id, fecha, inicio, horas, alias, celular, estado, monto_total')
    .eq('id', id)
    .maybeSingle()

  if (lecturaError) return { error: 'conexion' }
  if (!data) return { error: 'no-existe' }
  if (!sePuedeCancelar(deReserva(data as FilaReserva))) return { error: 'tarde' }

  const { error } = await cliente
    .from('reservas')
    .update({ estado: 'cancelado' })
    .eq('id', id)
  return error ? { error: errorDeSupabase(error) } : {}
}

export async function actualizarEstadoReservaRemota(id: string, estado: EstadoReserva): Promise<ResultadoEstado> {
  const cliente = clienteSupabase()
  const { data, error: lecturaError } = await cliente
    .from('reservas')
    .select('id, cancha_id, fecha, inicio, horas, alias, celular, estado, monto_total')
    .eq('id', id)
    .maybeSingle()

  if (lecturaError) return { error: 'conexion' }
  if (!data) return { error: 'no-existe' }

  const reserva = deReserva(data as FilaReserva)
  if (!puedeCambiarEstado(reserva.estado, estado)) return { error: 'estado-invalido' }

  const { error } = await cliente.from('reservas').update({ estado }).eq('id', id)
  return error ? { error: errorDeSupabase(error) } : {}
}

export async function buscarClienteRemoto(celular: string): Promise<Cliente | null> {
  const cliente = clienteSupabase()
  const { data, error } = await cliente
    .from('clientes')
    .select('alias, celular')
    .eq('celular', celular)
    .maybeSingle()

  if (error) throw error
  return data as FilaCliente | null
}

export async function registrarClienteRemoto(alias: string, celular: string): Promise<ResultadoCliente> {
  const cliente = clienteSupabase()
  const { data, error } = await cliente
    .from('clientes')
    .insert({ alias: alias.trim(), celular })
    .select('alias, celular')
    .single()

  if (error) return { error: errorDeSupabase(error) }
  return { cliente: data as FilaCliente }
}

export async function actualizarClienteRemoto(
  actualCelular: string,
  alias: string,
  celular: string,
): Promise<ResultadoCliente> {
  const cliente = clienteSupabase()
  const nuevoAlias = alias.trim()
  if (nuevoAlias.length < 2) return { error: 'alias-invalido' }
  if (!/^9\d{8}$/.test(celular)) return { error: 'celular-invalido' }

  const { data: otroCelular, error: celularError } = await cliente
    .from('clientes')
    .select('celular')
    .eq('celular', celular)
    .neq('celular', actualCelular)
    .maybeSingle()
  if (celularError) return { error: 'conexion' }
  if (otroCelular as FilaCelular | null) return { error: 'celular' }

  const { data: clienteActualizado, error } = await cliente
    .from('clientes')
    .update({ alias: nuevoAlias, celular })
    .eq('celular', actualCelular)
    .select('alias, celular')
    .maybeSingle()
  if (error) return { error: errorDeSupabase(error) }

  if (!clienteActualizado) {
    const creado = await registrarClienteRemoto(nuevoAlias, celular)
    if ('error' in creado) return creado
    return creado
  }

  const { error: reservasError } = await cliente
    .from('reservas')
    .update({ alias: nuevoAlias, celular })
    .eq('celular', actualCelular)
  if (reservasError) return { error: 'conexion' }

  return { cliente: clienteActualizado as FilaCliente }
}

export function suscribirseAReservas(alCambiar: () => void): () => void {
  if (!supabase) return () => {}
  const canal = supabase
    .channel('reservas-en-tiempo-real')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => alCambiar())
    .subscribe()

  return () => {
    void canal.unsubscribe()
  }
}
