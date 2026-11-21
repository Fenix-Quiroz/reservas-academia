import type { HorarioEntrenamiento } from './horariosEntrenamiento'

export const BLOQUE_MINUTOS = 30

export const RANGO_ENTRENAMIENTOS = Object.freeze({
  inicioMinuto: 7 * 60,
  finMinuto: 22 * 60,
})

/** Orden visual de lunes a domingo; el valor sigue el convenio de Date.getDay(). */
export const DIAS_SEMANA_ADMIN = Object.freeze([1, 2, 3, 4, 5, 6, 0])

export interface CeldaHorarioAdmin {
  canchaId: number
  diaSemana: number
  inicioMinuto: number
  finMinuto: number
  bloqueado: boolean
}

export interface ConfiguracionHorariosAdmin {
  version: 1
  horarios: HorarioEntrenamiento[]
}

function ordenDia(diaSemana: number): number {
  const indice = DIAS_SEMANA_ADMIN.indexOf(diaSemana)
  return indice === -1 ? DIAS_SEMANA_ADMIN.length : indice
}

function estaDentroDelRango(inicioMinuto: number, finMinuto: number): boolean {
  return inicioMinuto >= RANGO_ENTRENAMIENTOS.inicioMinuto
    && finMinuto <= RANGO_ENTRENAMIENTOS.finMinuto
}

function esCeldaValida(celda: CeldaHorarioAdmin): boolean {
  return DIAS_SEMANA_ADMIN.includes(celda.diaSemana)
    && celda.finMinuto - celda.inicioMinuto === BLOQUE_MINUTOS
    && celda.inicioMinuto % BLOQUE_MINUTOS === 0
    && estaDentroDelRango(celda.inicioMinuto, celda.finMinuto)
}

function ordenarHorarios(horarios: readonly HorarioEntrenamiento[]): HorarioEntrenamiento[] {
  return horarios
    .map((horario) => ({ ...horario }))
    .sort((a, b) => (
      a.canchaId - b.canchaId
      || ordenDia(a.diaSemana) - ordenDia(b.diaSemana)
      || a.inicioMinuto - b.inicioMinuto
      || a.finMinuto - b.finMinuto
    ))
}

export function crearConfiguracionHorariosAdmin(
  horarios: readonly HorarioEntrenamiento[],
): ConfiguracionHorariosAdmin {
  return {
    version: 1,
    horarios: ordenarHorarios(horarios),
  }
}

export function convertirHorariosACeldas(
  horarios: readonly HorarioEntrenamiento[],
  canchaId: number,
): CeldaHorarioAdmin[] {
  const celdas: CeldaHorarioAdmin[] = []

  for (const diaSemana of DIAS_SEMANA_ADMIN) {
    for (
      let inicioMinuto = RANGO_ENTRENAMIENTOS.inicioMinuto;
      inicioMinuto < RANGO_ENTRENAMIENTOS.finMinuto;
      inicioMinuto += BLOQUE_MINUTOS
    ) {
      const finMinuto = inicioMinuto + BLOQUE_MINUTOS
      const bloqueado = horarios.some((horario) => (
        horario.canchaId === canchaId
        && horario.diaSemana === diaSemana
        && inicioMinuto < horario.finMinuto
        && horario.inicioMinuto < finMinuto
      ))

      celdas.push({ canchaId, diaSemana, inicioMinuto, finMinuto, bloqueado })
    }
  }

  return celdas
}

export function convertirCeldasARangos(
  celdas: readonly CeldaHorarioAdmin[],
): HorarioEntrenamiento[] {
  const bloqueadas = celdas
    .filter((celda) => celda.bloqueado && esCeldaValida(celda))
    .sort((a, b) => (
      a.canchaId - b.canchaId
      || ordenDia(a.diaSemana) - ordenDia(b.diaSemana)
      || a.inicioMinuto - b.inicioMinuto
    ))

  const rangos: HorarioEntrenamiento[] = []
  for (const celda of bloqueadas) {
    const anterior = rangos[rangos.length - 1]
    if (
      anterior
      && anterior.canchaId === celda.canchaId
      && anterior.diaSemana === celda.diaSemana
      && anterior.finMinuto === celda.inicioMinuto
    ) {
      anterior.finMinuto = celda.finMinuto
      continue
    }

    rangos.push({
      canchaId: celda.canchaId,
      diaSemana: celda.diaSemana,
      inicioMinuto: celda.inicioMinuto,
      finMinuto: celda.finMinuto,
    })
  }

  return rangos
}

export function actualizarCeldaEnConfiguracion(
  configuracion: ConfiguracionHorariosAdmin,
  celda: CeldaHorarioAdmin,
  bloqueado: boolean,
): ConfiguracionHorariosAdmin {
  if (!esCeldaValida(celda)) {
    throw new Error('La celda está fuera del rango editable o no usa bloques de 30 minutos')
  }

  const celdasDelDia = convertirHorariosACeldas(configuracion.horarios, celda.canchaId)
    .filter((item) => item.diaSemana === celda.diaSemana)
    .map((item) => item.inicioMinuto === celda.inicioMinuto
      ? { ...item, bloqueado }
      : item)

  const horariosDeOtrosCamposODias = configuracion.horarios.filter((horario) => (
    horario.canchaId !== celda.canchaId || horario.diaSemana !== celda.diaSemana
  ))

  return {
    version: 1,
    horarios: ordenarHorarios([
      ...horariosDeOtrosCamposODias,
      ...convertirCeldasARangos(celdasDelDia),
    ]),
  }
}

export function copiarDiaEnConfiguracion(
  configuracion: ConfiguracionHorariosAdmin,
  canchaId: number,
  diaOrigen: number,
  diasDestino: readonly number[],
): ConfiguracionHorariosAdmin {
  const celdasOrigen = convertirHorariosACeldas(configuracion.horarios, canchaId)
    .filter((celda) => celda.diaSemana === diaOrigen)
  const diasUnicos = [...new Set(diasDestino)].filter((dia) => dia !== diaOrigen)

  let siguiente = configuracion
  for (const diaDestino of diasUnicos) {
    for (const celdaOrigen of celdasOrigen) {
      siguiente = actualizarCeldaEnConfiguracion(
        siguiente,
        { ...celdaOrigen, diaSemana: diaDestino },
        celdaOrigen.bloqueado,
      )
    }
  }

  return siguiente
}

export function celdasDeConfiguracion(
  configuracion: ConfiguracionHorariosAdmin,
  canchaId: number,
): CeldaHorarioAdmin[] {
  return convertirHorariosACeldas(configuracion.horarios, canchaId)
}
