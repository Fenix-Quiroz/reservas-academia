export const ADELANTO_YAPE = 15
export const NUMERO_YAPE = '995933438'
export const TITULAR_YAPE = 'Jesús Leg*'
export const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024

export const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp'] as const
export type TipoComprobante = typeof TIPOS_COMPROBANTE[number]
export type ExtensionComprobante = 'jpg' | 'png' | 'webp'
export type ErrorComprobante = 'archivo-requerido' | 'archivo-vacio' | 'tipo-no-admitido' | 'tamano-excedido'

type ArchivoComprobante = Pick<File, 'type' | 'size'>

export function validarComprobante(archivo: ArchivoComprobante | null | undefined): ErrorComprobante | null {
  if (!archivo) return 'archivo-requerido'
  if (archivo.size <= 0) return 'archivo-vacio'
  if (!TIPOS_COMPROBANTE.includes(archivo.type as TipoComprobante)) return 'tipo-no-admitido'
  if (archivo.size > MAX_COMPROBANTE_BYTES) return 'tamano-excedido'
  return null
}

export function extensionComprobante(archivo: Pick<File, 'type'>): ExtensionComprobante {
  if (archivo.type === 'image/jpeg') return 'jpg'
  if (archivo.type === 'image/png') return 'png'
  if (archivo.type === 'image/webp') return 'webp'
  throw new Error('tipo-comprobante-no-admitido')
}
