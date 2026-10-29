import type { SupabaseClient } from '@supabase/supabase-js'
import type { BloqueoEvento, Cliente, ComprobanteAdmin, EstadoPago, EstadoReserva, Reserva, ReservaNueva } from './types.js'
import { validarBloqueoEvento, validarEventoEspecial, type BloqueoEventoNuevo, type DetalleEntrenamiento, type ErrorEventoResultado, type EventoEspecialNuevo, type ResultadoCancelacionEvento, type ResultadoEvento, type ResultadoEventoEspecial } from './eventos.js'
import type {
  NumeroBloqueado,
  NumeroConfiable,
  ResultadoControlCliente,
} from './controlClientes.js'
import { normalizarReserva, puedeCambiarEstado } from './estadoReserva.js'
import { DURACION_BLOQUE, ocultarHorariosPasados, sePuedeCancelar, type HorarioDisponible } from './reservas.js'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase, supabasePublic } from './supabase.js'
import { validarComprobante } from './pagos.js'
import { normalizarAlias, normalizarCelular, validarAlias, validarCelular } from './validacionCliente.js'

export type ErrorReserva =
  | 'ocupado'
  | 'limite'
  | 'celular-bloqueado'
  | 'celular'
  | 'conexion'
  | 'no-existe'
  | 'tarde'
  | 'duracion-invalida'
  | 'alias-invalido'
  | 'celular-invalido'
  | 'numero-no-confiable'

export type ResultadoError = { error: ErrorReserva }
export type ErrorReservaPublica = ErrorReserva | 'limite-intentos'
export type ResultadoReserva = { reserva: Reserva; token?: string } | { error: ErrorReservaPublica }
export type ResultadoCliente = { cliente: Cliente } | ResultadoError
export type ResultadoCancelacion = Record<string, never> | ResultadoError
export type ErrorEstado = ErrorReserva | 'estado-invalido'
export type ResultadoEstado = Record<string, never> | { error: ErrorEstado }
export type ErrorPagoAdmin = 'conexion' | 'no-existe' | 'no-confirmable' | 'sin-comprobante' | 'reserva-no-activa' | 'confirmacion-fuera-de-plazo'
export type ResultadoPagoAdmin = Record<string, never> | { error: ErrorPagoAdmin }
export type ResultadoLimpiezaDatos =
  | { eliminados: Record<string, number> }
  | { error: 'conexion' | 'no-autorizado' | 'limpieza-fallida' }
export type ErrorPago =
  | 'archivo-invalido'
  | 'reserva-no-autorizada'
  | 'pago-expirado'
  | 'pago-ya-confirmado'
  | 'idempotencia-repetida'
  | 'conexion'
export type ResultadoPago = Record<string, never> | { error: ErrorPago }

interface FilaReserva {
  id?: string
  cancha_id: number | string
  fecha: string
  inicio: number | string
  horas: number | string
  alias: string
  celular: string
  estado?: unknown
  pago_estado?: unknown
  monto_total?: number | string | null
  token?: unknown
}

interface FilaHorarioPublico {
  inicio: number | string
  libre: boolean
}

interface FilaBloqueoEvento {
  id: string
  evento_especial_id?: string | null
  cancha_id: number | string
  fecha: string
  inicio: number | string
  fin: number | string
  nombre: string
  celular?: string | null
  notas?: string | null
  estado: 'activo' | 'cancelado'
  created_at?: string
  updated_at?: string
  tipo?: unknown
  precio_cobrado?: number | string | null
}

interface FilaComprobanteAdmin {
  id: string
  storage_path: string
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp'
  size_bytes: number | string
  created_at?: string
}

interface FilaPagoAdmin {
  id: string
  reserva_id: string
  estado: ComprobanteAdmin['estado']
  pago_comprobantes?: FilaComprobanteAdmin[] | null
}

interface ErrorSupabase {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

export const deReserva = (fila: FilaReserva): Reserva => {
  const montoTotal = Number(fila.monto_total)
  const pagoEstado = ['no_requerido', 'pendiente', 'confirmado', 'rechazado'].includes(String(fila.pago_estado))
    ? String(fila.pago_estado) as EstadoPago
    : undefined
  return normalizarReserva({
    id: fila.id as string,
    canchaId: Number(fila.cancha_id),
    fecha: fila.fecha,
    inicio: Number(fila.inicio),
    horas: Number(fila.horas),
    alias: fila.alias,
    celular: fila.celular,
    estado: fila.estado,
    ...(pagoEstado ? { pagoEstado } : {}),
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
  if (error?.message?.includes('celular_bloqueado')) return 'celular-bloqueado'
  if (error?.message?.includes('numero_no_confiable')) return 'numero-no-confiable'
  if (error?.message?.includes('alias_invalido')) return 'alias-invalido'
  if (error?.message?.includes('celular_invalido')) return 'celular-invalido'
  if (error?.message?.includes('hora_pasada')) return 'tarde'
  if (error?.message?.includes('fecha_invalida')) return 'tarde'
  if (error?.message?.includes('horario_invalido')) return 'tarde'
  if (error?.message?.includes('duracion_invalida')) return 'duracion-invalida'
  return 'conexion'
}

export function errorDeSupabaseEvento(error?: ErrorSupabase): ErrorEventoResultado {
  const mensaje = error?.message ?? ''
  const entrenamiento = mensaje.match(/horario_entrenamiento_ocupado(?::(\d+):(\d+))?/)
  if (entrenamiento) {
    const detalle: DetalleEntrenamiento | undefined = entrenamiento[1] && entrenamiento[2]
      ? { inicioMinuto: Number(entrenamiento[1]), finMinuto: Number(entrenamiento[2]) }
      : undefined
    return detalle ? { error: 'entrenamiento-ocupado', entrenamiento: detalle } : { error: 'entrenamiento-ocupado' }
  }
  if (error?.code === '23P01' || mensaje.includes('evento_ocupado')) return { error: 'ocupado' }
  if (error?.code === '22023' && mensaje.includes('evento_invalido')) return { error: 'datos-invalidos' }
  if (mensaje.includes('no_existe')) return { error: 'no-existe' }
  return { error: 'conexion' }
}

export const deBloqueoEvento = (fila: FilaBloqueoEvento): BloqueoEvento => {
  const precioCobrado = Number(fila.precio_cobrado)
  return {
    id: fila.id,
    canchaId: Number(fila.cancha_id),
    fecha: fila.fecha,
    inicio: Number(fila.inicio),
    fin: Number(fila.fin),
    nombre: fila.nombre,
    celular: fila.celular?.trim() ?? '',
    notas: fila.notas?.trim() ?? '',
    estado: fila.estado,
    grupoId: fila.evento_especial_id ?? fila.id,
    tipo: fila.tipo === 'todos_los_campos' ? 'todos_los_campos' : 'individual',
    precioCobrado: Number.isFinite(precioCobrado) && precioCobrado >= 0
      ? Math.round(precioCobrado * 100) / 100
      : 0,
    ...(fila.created_at ? { createdAt: fila.created_at } : {}),
  }
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
    .select('id, cancha_id, fecha, inicio, horas, alias, celular, estado, pago_estado, monto_total')
    .order('fecha')
    .order('inicio')

  if (error) throw error
  return (data as FilaReserva[]).map(deReserva)
}

export async function leerComprobantesAdminRemotos(): Promise<ComprobanteAdmin[]> {
  const cliente = clienteSupabase()
  const { data, error } = await cliente
    .from('pagos_reserva')
    .select('id, reserva_id, estado, pago_comprobantes(id, storage_path, mime_type, size_bytes, created_at)')
    .eq('tipo', 'adelanto')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as FilaPagoAdmin[] | null ?? []).flatMap((pago) => {
    const comprobante = pago.pago_comprobantes?.[0]
    if (!comprobante) return []
    return [{
      pagoId: pago.id,
      reservaId: pago.reserva_id,
      estado: pago.estado,
      storagePath: comprobante.storage_path,
      mimeType: comprobante.mime_type,
      sizeBytes: Number(comprobante.size_bytes),
      ...(comprobante.created_at ? { createdAt: comprobante.created_at } : {}),
    }]
  })
}

export function nombreDescargaComprobante(storagePath: string): string {
  const extension = storagePath.split('.').pop()?.toLowerCase()
  if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'comprobante-pago'
  return `comprobante-pago.${extension}`
}

export async function crearUrlComprobanteAdminRemota(storagePath: string, descargar = false): Promise<string> {
  const opciones = descargar ? { download: nombreDescargaComprobante(storagePath) } : undefined
  const { data, error } = await clienteSupabase().storage
    .from('comprobantes-pago')
    .createSignedUrl(storagePath, 300, opciones)
  if (error || !data?.signedUrl) throw error ?? new Error('url-comprobante-no-creada')
  return data.signedUrl
}

export async function confirmarPagoAdminRemoto(pagoId: string): Promise<ResultadoPagoAdmin> {
  const { data, error } = await clienteSupabase().rpc('confirmar_pago_admin', { p_pago_id: pagoId })
  if (error) {
    const mensaje = error.message ?? ''
    if (mensaje.includes('pago_no_existe')) return { error: 'no-existe' }
    if (mensaje.includes('pago_no_confirmable')) return { error: 'no-confirmable' }
    if (mensaje.includes('comprobante_no_existe')) return { error: 'sin-comprobante' }
    if (mensaje.includes('confirmacion_fuera_de_plazo')) return { error: 'confirmacion-fuera-de-plazo' }
    if (mensaje.includes('reserva_no_activa')) return { error: 'reserva-no-activa' }
    return { error: 'conexion' }
  }
  return data === true ? {} : { error: 'conexion' }
}

export async function limpiarDatosPruebaRemoto(): Promise<ResultadoLimpiezaDatos> {
  try {
    const { data, error } = await clienteSupabase().functions.invoke('limpiar-datos-prueba', { body: {} })
    if (error) return { error: 'conexion' }
    const payload = data as { ok?: unknown; eliminados?: Record<string, unknown>; error?: unknown } | null
    if (payload?.error === 'no_autorizado') return { error: 'no-autorizado' }
    if (payload?.ok !== true || !payload.eliminados) return { error: 'limpieza-fallida' }
    return {
      eliminados: Object.fromEntries(
        Object.entries(payload.eliminados).map(([clave, valor]) => [clave, Number(valor) || 0]),
      ),
    }
  } catch {
    return { error: 'conexion' }
  }
}

export async function leerHorariosRemotos(canchaId: number, fecha: string): Promise<HorarioDisponible[]> {
  const cliente = clienteSupabasePublic()
  const { data, error } = await cliente.rpc('obtener_horarios_publicos', {
    p_cancha_id: canchaId,
    p_fecha: fecha,
    p_horas: DURACION_BLOQUE,
  })

  if (error) throw error
  return ocultarHorariosPasados(
    (data as FilaHorarioPublico[] | null ?? []).map(deHorarioPublico),
    fecha,
  )
}

export async function verificarNumeroConfiableRemoto(celular: string): Promise<boolean> {
  const nuevoCelular = normalizarCelular(celular)
  if (validarCelular(nuevoCelular)) return false
  try {
    const { data, error } = await clienteSupabasePublic().rpc('es_numero_confiable_publico', {
      p_celular: nuevoCelular,
    })
    return !error && data === true
  } catch {
    return false
  }
}

export async function crearReservaPublicaRemota(
  reserva: ReservaNueva,
  sinAdelanto = false,
): Promise<ResultadoReserva> {
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
    p_sin_adelanto: sinAdelanto,
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

const ERRORES_PAGO: readonly ErrorPago[] = [
  'archivo-invalido',
  'reserva-no-autorizada',
  'pago-expirado',
  'pago-ya-confirmado',
  'idempotencia-repetida',
  'conexion',
]

function esErrorPago(valor: unknown): valor is ErrorPago {
  return typeof valor === 'string' && ERRORES_PAGO.includes(valor as ErrorPago)
}

async function errorPagoDesdeFuncion(error: unknown): Promise<ErrorPago> {
  const respuesta = (error as { context?: Response } | null)?.context
  if (respuesta) {
    try {
      const cuerpo = await respuesta.clone().json() as { error?: unknown }
      const errorNormalizado = typeof cuerpo.error === 'string'
        ? cuerpo.error.replaceAll('_', '-')
        : cuerpo.error
      if (esErrorPago(errorNormalizado)) return errorNormalizado
      if (cuerpo.error === 'pago_no_registrado' || cuerpo.error === 'configuracion_invalida') return 'conexion'
    } catch {
      // La función puede responder con un cuerpo no JSON o sin cuerpo.
    }
    if (respuesta.status === 409) return 'pago-expirado'
    if (respuesta.status === 400) return 'archivo-invalido'
    if (respuesta.status === 403) return 'reserva-no-autorizada'
  }
  return 'conexion'
}

export async function registrarAdelantoYapeRemoto(
  reservaId: string,
  token: string,
  comprobante: File,
  idempotencia: string,
): Promise<ResultadoPago> {
  const errorArchivo = validarComprobante(comprobante)
  if (errorArchivo) return { error: 'archivo-invalido' }

  const formulario = new FormData()
  formulario.append('reserva_id', reservaId)
  formulario.append('token', token)
  formulario.append('idempotencia', idempotencia)
  formulario.append('comprobante', comprobante, comprobante.name)

  try {
    const { error } = await clienteSupabasePublic().functions.invoke('registrar-adelanto-yape', {
      body: formulario,
    })
    return error ? { error: await errorPagoDesdeFuncion(error) } : {}
  } catch {
    return { error: 'conexion' }
  }
}

export async function precalentarRegistrarAdelantoYapeRemoto(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/registrar-adelanto-yape`, {
      method: 'OPTIONS',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      cache: 'no-store',
    })
  } catch {
    // El precalentamiento es opcional: el envío real debe seguir funcionando.
  }
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

export async function leerBloqueosEventosRemotos(): Promise<BloqueoEvento[]> {
  const { data, error } = await clienteSupabase().rpc('obtener_bloqueos_eventos_admin')
  if (error) throw error
  return (data as FilaBloqueoEvento[] | null ?? []).map(deBloqueoEvento)
}

export async function crearBloqueoEventoRemoto(nuevo: BloqueoEventoNuevo): Promise<ResultadoEvento> {
  if (!validarBloqueoEvento(nuevo)) return { error: 'datos-invalidos' }
  const { data, error } = await clienteSupabase().rpc('crear_bloqueo_evento_admin', {
    p_cancha_id: nuevo.canchaId,
    p_fecha: nuevo.fecha,
    p_inicio: nuevo.inicio,
    p_fin: nuevo.fin,
    p_nombre: nuevo.nombre,
    p_celular: nuevo.celular,
    p_notas: nuevo.notas,
  })
  if (error) return errorDeSupabaseEvento(error)
  const fila = (Array.isArray(data) ? data[0] : data) as FilaBloqueoEvento | null | undefined
  return fila ? { evento: deBloqueoEvento(fila) } : { error: 'conexion' }
}

export async function crearEventoEspecialRemoto(nuevo: EventoEspecialNuevo): Promise<ResultadoEventoEspecial> {
  if (!validarEventoEspecial(nuevo)) return { error: 'datos-invalidos' }
  const { data, error } = await clienteSupabase().rpc('crear_evento_especial_admin', {
    p_cancha_ids: nuevo.canchaIds,
    p_fecha: nuevo.fecha,
    p_inicio: nuevo.inicio,
    p_fin: nuevo.fin,
    p_nombre: nuevo.nombre,
    p_celular: nuevo.celular,
    p_notas: nuevo.notas,
    p_tipo: nuevo.tipo,
    p_precio_cobrado: nuevo.precioCobrado,
  })
  if (error) return errorDeSupabaseEvento(error)
  const filas = (Array.isArray(data) ? data : data ? [data] : []) as FilaBloqueoEvento[]
  const precioCobrado = Math.round(nuevo.precioCobrado * 100) / 100
  const eventos = filas.map((fila) => ({
    ...deBloqueoEvento(fila),
    tipo: nuevo.tipo,
    precioCobrado,
  }))
  return eventos.length > 0 ? { eventos } : { error: 'conexion' }
}

export async function cancelarBloqueoEventoRemoto(id: string): Promise<ResultadoCancelacionEvento> {
  const { data, error } = await clienteSupabase().rpc('cancelar_bloqueo_evento_admin', { p_id: id })
  if (error) return { error: errorDeSupabaseEvento(error).error }
  return data === true ? {} : { error: 'no-existe' }
}

export async function cancelarEventoEspecialRemoto(grupoId: string): Promise<ResultadoCancelacionEvento> {
  const { data, error } = await clienteSupabase().rpc('cancelar_evento_especial_admin', {
    p_evento_especial_id: grupoId,
  })
  if (error) return { error: errorDeSupabaseEvento(error).error }
  if (data === true) return {}

  // Los eventos creados antes de la migración no tienen grupo principal.
  // Se mantienen cancelables como un bloqueo individual.
  return cancelarBloqueoEventoRemoto(grupoId)
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

  let temporizador: ReturnType<typeof setTimeout> | null = null
  const notificarCambio = () => {
    if (temporizador !== null) return
    temporizador = setTimeout(() => {
      temporizador = null
      alCambiar()
    }, 150)
  }

  const canal = supabase
    .channel('reservas-en-tiempo-real')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, notificarCambio)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_reserva' }, notificarCambio)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pago_comprobantes' }, notificarCambio)
    .subscribe()

  return () => {
    if (temporizador !== null) {
      clearTimeout(temporizador)
      temporizador = null
    }
    void canal.unsubscribe()
  }
}

interface FilaNumeroBloqueado {
  celular: string
  motivo: string
  inasistencias: number
  activo: boolean
  created_at?: string
}

interface FilaNumeroConfiable {
  celular: string
  alias: string
  activo: boolean
  created_at?: string
}

const deNumeroBloqueado = (fila: FilaNumeroBloqueado): NumeroBloqueado => ({
  celular: fila.celular,
  motivo: fila.motivo,
  inasistencias: Number(fila.inasistencias) || 0,
  activo: fila.activo,
  ...(fila.created_at ? { createdAt: fila.created_at } : {}),
})

const deNumeroConfiable = (fila: FilaNumeroConfiable): NumeroConfiable => ({
  celular: fila.celular,
  alias: fila.alias,
  activo: fila.activo,
  ...(fila.created_at ? { createdAt: fila.created_at } : {}),
})

export async function leerNumerosBloqueadosRemotos(): Promise<NumeroBloqueado[]> {
  const { data, error } = await clienteSupabase()
    .from('numeros_bloqueados')
    .select('celular, motivo, inasistencias, activo, created_at')
    .order('activo', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as FilaNumeroBloqueado[] | null ?? []).map(deNumeroBloqueado)
}

export async function bloquearNumeroRemoto(
  celular: string,
  motivo: string,
  inasistencias = 2,
): Promise<ResultadoControlCliente> {
  const nuevoCelular = normalizarCelular(celular)
  if (validarCelular(nuevoCelular)) return { error: 'celular-invalido' }
  const { error } = await clienteSupabase()
    .from('numeros_bloqueados')
    .upsert({
      celular: nuevoCelular,
      motivo: motivo.trim() || 'Bloqueado por administración',
      inasistencias: Math.max(0, inasistencias),
      activo: true,
    }, { onConflict: 'celular' })
  return error ? { error: 'conexion' } : {}
}

export async function desbloquearNumeroRemoto(celular: string): Promise<ResultadoControlCliente> {
  const nuevoCelular = normalizarCelular(celular)
  const { data, error } = await clienteSupabase()
    .from('numeros_bloqueados')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('celular', nuevoCelular)
    .select('celular')
    .maybeSingle()

  if (error) return { error: 'conexion' }
  if (!data) return { error: 'no-existe' }
  return {}
}

export async function leerNumerosConfiablesRemotos(): Promise<NumeroConfiable[]> {
  const { data, error } = await clienteSupabase()
    .from('numeros_confiables')
    .select('celular, alias, activo, created_at')
    .order('activo', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as FilaNumeroConfiable[] | null ?? []).map(deNumeroConfiable)
}

export async function agregarNumeroConfiableRemoto(
  celular: string,
  alias: string,
): Promise<ResultadoControlCliente> {
  const nuevoCelular = normalizarCelular(celular)
  const nuevoAlias = normalizarAlias(alias) || 'Cliente confiable'
  if (validarCelular(nuevoCelular)) return { error: 'celular-invalido' }
  if (validarAlias(nuevoAlias)) return { error: 'alias-invalido' }
  const { error } = await clienteSupabase()
    .from('numeros_confiables')
    .upsert({ celular: nuevoCelular, alias: nuevoAlias, activo: true }, { onConflict: 'celular' })
  return error ? { error: 'conexion' } : {}
}

export async function quitarNumeroConfiableRemoto(celular: string): Promise<ResultadoControlCliente> {
  const nuevoCelular = normalizarCelular(celular)
  const { error } = await clienteSupabase()
    .from('numeros_confiables')
    .update({ activo: false })
    .eq('celular', nuevoCelular)
  return error ? { error: 'conexion' } : {}
}
