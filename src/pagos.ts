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

export async function optimizarComprobante(archivo: File): Promise<File> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return archivo
  if (!archivo.type.startsWith('image/')) return archivo
  if (archivo.type === 'image/jpeg' && archivo.size <= 80 * 1024) return archivo

  try {
    let fuente: CanvasImageSource | null = null
    let width = 0
    let height = 0

    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(archivo)
        fuente = bitmap
        width = bitmap.width
        height = bitmap.height
      } catch {
        fuente = null
      }
    }

    if (!fuente) {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const elementoImg = new Image()
        const objUrl = URL.createObjectURL(archivo)
        elementoImg.onload = () => {
          URL.revokeObjectURL(objUrl)
          resolve(elementoImg)
        }
        elementoImg.onerror = (e) => {
          URL.revokeObjectURL(objUrl)
          reject(e)
        }
        elementoImg.src = objUrl
      })
      fuente = img
      width = img.naturalWidth || img.width
      height = img.naturalHeight || img.height
    }

    if (!width || !height) return archivo

    const MAX_ANCHO = 1200
    const MAX_ALTO = 1600
    if (width > MAX_ANCHO || height > MAX_ALTO) {
      const escala = Math.min(MAX_ANCHO / width, MAX_ALTO / height)
      width = Math.round(width * escala)
      height = Math.round(height * escala)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return archivo

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(fuente, 0, 0, width, height)

    if ('close' in fuente && typeof (fuente as ImageBitmap).close === 'function') {
      (fuente as ImageBitmap).close()
    }

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    })

    if (!blob || blob.size === 0) {
      return archivo
    }

    if (blob.size >= archivo.size && archivo.type !== 'image/webp') {
      return archivo
    }

    const tipo = blob.type || 'image/jpeg'
    const extension = tipo === 'image/png' ? 'png' : 'jpg'
    const nombreBase = archivo.name.replace(/\.[^.]+$/, '')
    return new File([blob], `${nombreBase}.${extension}`, { type: tipo })
  } catch {
    return archivo
  }
}
