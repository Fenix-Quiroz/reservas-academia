import entrenamientos from './data/horarios-entrenamientos.json' with { type: 'json' }

export interface HorarioEntrenamiento {
  canchaId: number
  diaSemana: number
  inicioMinuto: number
  finMinuto: number
}

const listaEntrenamientos = entrenamientos as HorarioEntrenamiento[]

export function horarioEntrenamientoQueBloquea(
  canchaId: number,
  diaSemana: number,
  inicio: number,
  horas: number,
): HorarioEntrenamiento | undefined {
  const inicioMinuto = inicio * 60
  const finMinuto = (inicio + horas) * 60
  return listaEntrenamientos.find((entrenamiento) => (
    entrenamiento.canchaId === canchaId
      && entrenamiento.diaSemana === diaSemana
      && inicioMinuto < entrenamiento.finMinuto
      && entrenamiento.inicioMinuto < finMinuto
  ))
}

export function entrenamientoBloquea(
  canchaId: number,
  diaSemana: number,
  inicio: number,
  horas: number,
): boolean {
  return Boolean(horarioEntrenamientoQueBloquea(canchaId, diaSemana, inicio, horas))
}

export function horariosEntrenamiento(): readonly HorarioEntrenamiento[] {
  return listaEntrenamientos
}
