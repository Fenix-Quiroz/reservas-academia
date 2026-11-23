import {
  crearConfiguracionHorariosAdmin,
  type ConfiguracionHorariosAdmin,
} from './horariosAdmin'
import { supabase } from './supabase'

const MOTIVO_ENTRENAMIENTO = 'Entrenamiento de academia'

export interface FilaHorarioEntrenamientoAdmin {
  cancha_id: number
  dia_semana: number
  inicio_minuto: number
  fin_minuto: number
  motivo: string
  activo: boolean
}

export function convertirFilasHorariosAdmin(
  filas: readonly FilaHorarioEntrenamientoAdmin[],
): ConfiguracionHorariosAdmin {
  return crearConfiguracionHorariosAdmin(
    filas
      .filter((fila) => fila.activo && fila.motivo === MOTIVO_ENTRENAMIENTO)
      .map((fila) => ({
        canchaId: fila.cancha_id,
        diaSemana: fila.dia_semana,
        inicioMinuto: fila.inicio_minuto,
        finMinuto: fila.fin_minuto,
      })),
  )
}

export async function leerHorariosEntrenamientoAdminRemotos(): Promise<ConfiguracionHorariosAdmin> {
  if (!supabase) throw new Error('supabase-no-configurado')

  const { data, error } = await supabase
    .from('horarios_bloqueados')
    .select('cancha_id,dia_semana,inicio_minuto,fin_minuto,motivo,activo')
    .eq('activo', true)
    .eq('motivo', MOTIVO_ENTRENAMIENTO)
    .order('cancha_id')
    .order('dia_semana')
    .order('inicio_minuto')

  if (error) throw error

  return convertirFilasHorariosAdmin((data ?? []) as FilaHorarioEntrenamientoAdmin[])
}
