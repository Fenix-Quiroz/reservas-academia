import { activa, MAX_ACTIVAS, sePuedeCancelar } from './reservas.js'
import { supabase } from './supabase.js'

export const deReserva = (fila) => ({
  id: fila.id,
  canchaId: Number(fila.cancha_id),
  fecha: fila.fecha,
  inicio: Number(fila.inicio),
  horas: Number(fila.horas),
  alias: fila.alias,
  celular: fila.celular,
})

export const aReserva = (reserva) => {
  const fila = {
    cancha_id: reserva.canchaId,
    fecha: reserva.fecha,
    inicio: reserva.inicio,
    horas: reserva.horas,
    alias: reserva.alias,
    celular: reserva.celular,
  }
  if (reserva.id) fila.id = reserva.id
  return fila
}

export function errorDeSupabase(error) {
  if (error?.code === '23P01') return 'ocupado'
  if (error?.code === '23505' && String(error.message).includes('celular')) return 'celular'
  return 'conexion'
}

function conectado() {
  if (!supabase) throw new Error('supabase-no-configurado')
}

export async function leerReservasRemotas() {
  conectado()
  const { data, error } = await supabase
    .from('reservas')
    .select('id, cancha_id, fecha, inicio, horas, alias, celular')
    .order('fecha')
    .order('inicio')

  if (error) throw error
  return data.map(deReserva)
}

export async function crearReservaRemota(reserva) {
  conectado()
  const { data: pendientes, error: limiteError } = await supabase
    .from('reservas')
    .select('fecha, inicio, horas, cancha_id, alias, celular')
    .eq('celular', reserva.celular)
  if (limiteError) return { error: 'conexion' }
  if (pendientes.map(deReserva).filter((r) => activa(r)).length >= MAX_ACTIVAS) return { error: 'limite' }

  const { data, error } = await supabase
    .from('reservas')
    .insert(aReserva(reserva))
    .select('id, cancha_id, fecha, inicio, horas, alias, celular')
    .single()

  if (error) return { error: errorDeSupabase(error) }
  return { reserva: deReserva(data) }
}

export async function cancelarReservaRemota(id) {
  conectado()
  const { data, error: lecturaError } = await supabase
    .from('reservas')
    .select('id, cancha_id, fecha, inicio, horas, alias, celular')
    .eq('id', id)
    .maybeSingle()

  if (lecturaError) return { error: 'conexion' }
  if (!data) return { error: 'no-existe' }
  if (!sePuedeCancelar(deReserva(data))) return { error: 'tarde' }

  const { error } = await supabase.from('reservas').delete().eq('id', id)
  return error ? { error: errorDeSupabase(error) } : {}
}

export async function buscarClienteRemoto(celular) {
  conectado()
  const { data, error } = await supabase
    .from('clientes')
    .select('alias, celular')
    .eq('celular', celular)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function registrarClienteRemoto(alias, celular) {
  conectado()
  const { data, error } = await supabase
    .from('clientes')
    .insert({ alias: alias.trim(), celular })
    .select('alias, celular')
    .single()

  if (error) return { error: errorDeSupabase(error) }
  return { cliente: data }
}

export async function actualizarClienteRemoto(actualCelular, alias, celular) {
  conectado()
  const nuevoAlias = alias.trim()
  if (nuevoAlias.length < 2) return { error: 'alias-invalido' }
  if (!/^9\d{8}$/.test(celular)) return { error: 'celular-invalido' }

  const { data: otroCelular, error: celularError } = await supabase
    .from('clientes')
    .select('celular')
    .eq('celular', celular)
    .neq('celular', actualCelular)
    .maybeSingle()
  if (celularError) return { error: 'conexion' }
  if (otroCelular) return { error: 'celular' }

  const { data: cliente, error } = await supabase
    .from('clientes')
    .update({ alias: nuevoAlias, celular })
    .eq('celular', actualCelular)
    .select('alias, celular')
    .maybeSingle()
  if (error) return { error: errorDeSupabase(error) }

  if (!cliente) {
    const creado = await registrarClienteRemoto(nuevoAlias, celular)
    if (creado.error) return creado
    return creado
  }

  const { error: reservasError } = await supabase
    .from('reservas')
    .update({ alias: nuevoAlias, celular })
    .eq('celular', actualCelular)
  if (reservasError) return { error: 'conexion' }

  return { cliente }
}

export function suscribirseAReservas(alCambiar) {
  if (!supabase) return () => {}
  const canal = supabase
    .channel('reservas-en-tiempo-real')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, alCambiar)
    .subscribe()

  return () => {
    void canal.unsubscribe()
  }
}
