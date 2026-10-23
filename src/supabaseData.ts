import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cliente, EstadoReserva, Reserva, ReservaNueva } from './types.js'
import { normalizarReserva, puedeCambiarEstado } from './estadoReserva.js'
import { ocultarHorariosPasados, sePuedeCancelar, type HorarioDisponible } from './reservas.js'
import { supabase, supabasePublic } from './supabase.js'
import { normalizarAlias, normalizarCelular, validarAlias, validarCelular } from './validacionCliente.js'

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
export type ErrorReservaPublica = ErrorReserva | 'limite-intentos'
export type ResultadoReserva = { reserva: Reserva; token?: string } | { error: ErrorReservaPublica }
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
  token?: unknown
}

interface FilaHorarioPublico {
  inicio: number | string
  libre: boolean
}

interface ErrorSupabase {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
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

export const deHorarioPublico = (fila: FilaHorarioPublico): HorarioDisponible => ({
  inicio: Number(fila.inicio),
  libre: fila.libre === true,
})

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
  if (error?.message?.includes('limite_reservas')) return 'limite'
  if (error?.message?.includes('alias_invalido')) return 'alias-invalido'
  if (error?.message?.includes('celular_invalido')) return 'celular-invalido'
  if (error?.message?.includes('hora_pasada')) return 'tarde'
  if (error?.message?.includes('fecha_invalida')) return 'tarde'
  if (error?.message?.includes('horario_invalido')) return 'tarde'
  return 'conexion'
}

function clienteSupabase(): SupabaseClient {
  if (!supabase) throw new Error('supabase-no-configurado')
  return supabase
}

function clienteSupabasePublic(): SupabaseClient {
  if (!supabasePublic) throw new Error('supabase-no-configurado')
  return supabasePublic
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

export async function leerHorariosRemotos(canchaId: number, fecha: string, horas: number): Promise<HorarioDisponible[]> {
  const cliente = clienteSupabasePublic()
  const { data, error } = await cliente.rpc('obtener_horarios_publicos', {
    p_cancha_id: canchaId,
    p_fecha: fecha,
    p_horas: horas,
  })

  if (error) throw error
  return ocultarHorariosPasados(
    (data as FilaHorarioPublico[] | null ?? []).map(deHorarioPublico),
    fecha,
  )
}

export async function crearReservaPublicaRemota(reserva: ReservaNueva): Promise<ResultadoReserva> {
  const nuevoAlias = normalizarAlias(reserva.alias)
  const nuevoCelular = normalizarCelular(reserva.celular)
  const errorAlias = validarAlias(nuevoAlias)
  if (errorAlias) return { error: errorAlias }
  const errorCelular = validarCelular(nuevoCelular)
  if (errorCelular) return { error: errorCelular }

  const cliente = clienteSupabasePublic()
  const { data, error } = await cliente.rpc('crear_reserva_publica', {
    p_cancha_id: reserva.canchaId,
    p_fecha: reserva.fecha,
    p_inicio: reserva.inicio,
    p_horas: reserva.horas,
    p_alias: nuevoAlias,
    p_celular: nuevoCelular,
  })

  if (error) {
    if (import.meta.env.DEV) {
      console.error('[Reserva] Error de Supabase', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
    }
    if (error.message?.includes('limite_intentos_reserva')) return { error: 'limite-intentos' }
    return { error: errorDeSupabase(error) }
  }
  const fila = (Array.isArray(data) ? data[0] : data) as FilaReserva | null | undefined
  if (!fila) return { error: 'conexion' }
  const token = typeof fila.token === 'string' ? fila.token : undefined
  return { reserva: deReserva(fila), ...(token ? { token } : {}) }
}

export async function leerMisReservasRemotas(tokens: string[]): Promise<Reserva[]> {
  if (!tokens.length) return []
  const cliente = clienteSupabasePublic()
  const { data, error } = await cliente.rpc('obtener_mis_reservas_publicas', { p_tokens: tokens })

  if (error) throw error
  return (data as FilaReserva[] | null ?? []).map(deReserva)
}

export async function cancelarReservaPublicaRemota(id: string, token: string): Promise<ResultadoCancelacion> {
  const cliente = clienteSupabasePublic()
  const { data, error } = await cliente.rpc('cancelar_reserva_publica', {
    p_reserva_id: id,
    p_token: token,
  })

  if (error) return { error: errorDeSupabase(error) }
  return data === true ? {} : { error: 'no-existe' }
}

export async function cancelarReservaAdminRemota(id: string): Promise<ResultadoCancelacion> {
  const cliente = clienteSupabase()
  const { data, error: lecturaError } = await cliente
    .from('reservas')
    .select('id, cancha_id, fecha, inicio, horas, alias, celular, estado, monto_total')
    .eq('id', id)
    .maybeSingle()

  if (lecturaError) return { error: 'conexion' }
  if (!data) return { error: 'no-existe' }

  const reserva = deReserva(data as FilaReserva)
  if (!sePuedeCancelar(reserva)) return { error: 'tarde' }

  const { data: actualizada, error } = await cliente
    .from('reservas')
    .update({ estado: 'cancelado' })
    .eq('id', id)
    .eq('estado', reserva.estado)
    .select('id')
    .maybeSingle()

  if (error) {
    if (error.message?.includes('transicion_estado_invalida')) return { error: 'tarde' }
    return { error: errorDeSupabase(error) }
  }
  return actualizada ? {} : { error: 'conexion' }
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

  const { data: actualizada, error } = await cliente
    .from('reservas')
    .update({ estado })
    .eq('id', id)
    .eq('estado', reserva.estado)
    .select('id')
    .maybeSingle()
  if (error) {
    return error.message?.includes('transicion_estado_invalida')
      ? { error: 'estado-invalido' }
      : { error: errorDeSupabase(error) }
  }
  return actualizada ? {} : { error: 'estado-invalido' }
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
