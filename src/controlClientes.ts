export interface NumeroBloqueado {
  celular: string
  motivo: string
  inasistencias: number
  activo: boolean
  createdAt?: string
}

export interface NumeroConfiable {
  celular: string
  alias: string
  activo: boolean
  createdAt?: string
}

export type ErrorControlCliente = 'celular-invalido' | 'alias-invalido' | 'no-existe' | 'conexion'
export type ResultadoControlCliente = Record<string, never> | { error: ErrorControlCliente }

export const INASISTENCIAS_PARA_BLOQUEAR = 2
