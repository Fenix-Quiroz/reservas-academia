export const ALIAS_MINIMO = 2
export const ALIAS_MAXIMO = 24

export type ErrorValidacionCliente = 'alias-invalido' | 'celular-invalido'

/** Conserva nombres legibles y evita espacios repetidos al guardar. */
export function normalizarAlias(alias: unknown): string {
  if (typeof alias !== 'string') return ''
  return alias.normalize('NFC').trim().replace(/\s+/gu, ' ')
}

/** Acepta separadores habituales al pegar un celular, pero guarda solo sus 9 dígitos. */
export function normalizarCelular(celular: unknown): string {
  if (typeof celular !== 'string') return ''
  return celular.trim().replace(/[\s-]+/gu, '')
}

export function validarAlias(alias: unknown): ErrorValidacionCliente | null {
  const valor = normalizarAlias(alias)
  const longitud = Array.from(valor).length

  if (longitud < ALIAS_MINIMO || longitud > ALIAS_MAXIMO) return 'alias-invalido'
  if (!/^\p{L}[\p{L}\p{N} '-]*$/u.test(valor)) return 'alias-invalido'
  return null
}

export function validarCelular(celular: unknown): ErrorValidacionCliente | null {
  return /^9\d{8}$/.test(normalizarCelular(celular)) ? null : 'celular-invalido'
}
