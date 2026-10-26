export interface BloqueoAccion {
  adquirir: () => boolean
  liberar: () => void
}

/**
 * Bloquea de forma síncrona una acción asíncrona hasta que termine.
 *
 * Se usa junto con `disabled` para cubrir también dos clics que ocurren
 * antes de que React alcance a renderizar el nuevo estado.
 */
export function crearBloqueoAccion(): BloqueoAccion {
  let ocupada = false

  return {
    adquirir: () => {
      if (ocupada) return false
      ocupada = true
      return true
    },
    liberar: () => {
      ocupada = false
    },
  }
}
