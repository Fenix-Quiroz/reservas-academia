import {
  normalizarConfiguracionHorariosAdmin,
  type ConfiguracionHorariosAdmin,
} from './horariosAdmin'
import {
  convertirFilasHorariosAdmin,
  type FilaHorarioEntrenamientoAdmin,
} from './horariosAdminSupabase'
import { supabase } from './supabase'

export interface PayloadHorariosEntrenamientoAdmin {
  version: 1
  horarios: Array<{
    cancha_id: number
    dia_semana: number
    inicio_minuto: number
    fin_minuto: number
  }>
}

export function crearPayloadHorariosAdmin(
  configuracion: ConfiguracionHorariosAdmin,
): PayloadHorariosEntrenamientoAdmin {
  const configuracionNormalizada = normalizarConfiguracionHorariosAdmin(configuracion)

  return {
    version: 1,
    horarios: configuracionNormalizada.horarios.map((horario) => ({
      cancha_id: horario.canchaId,
      dia_semana: horario.diaSemana,
      inicio_minuto: horario.inicioMinuto,
      fin_minuto: horario.finMinuto,
    })),
  }
}

export async function guardarHorariosEntrenamientoAdminRemoto(
  configuracion: ConfiguracionHorariosAdmin,
): Promise<ConfiguracionHorariosAdmin> {
  if (!supabase) throw new Error('supabase-no-configurado')

  const { data, error } = await supabase.rpc('guardar_horarios_entrenamiento_admin', {
    p_configuracion: crearPayloadHorariosAdmin(configuracion),
  })

  if (error) throw error

  return convertirFilasHorariosAdmin((data ?? []) as FilaHorarioEntrenamientoAdmin[])
}
