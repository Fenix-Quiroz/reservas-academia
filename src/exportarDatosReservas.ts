import { rangoHablado } from './reservas.js'
import type { Campo, ComprobanteAdmin, Reserva } from './types.js'
import { normalizarCelular } from './validacionCliente.js'
import type ExcelJS from 'exceljs'

type ModuloExcelJS = typeof import('exceljs')

async function cargarModuloExcelJS(): Promise<ModuloExcelJS> {
  const modulo = await import('exceljs') as unknown as ModuloExcelJS & { default?: ModuloExcelJS }
  return modulo.default ?? modulo
}

export interface FilaDatosReserva {
  reservaId: string
  campoId: number
  campo: Campo
  nombre: string
  celular: string
  fecha: string
  inicio: number
  horario: string
  horas: number
  comprobante?: ComprobanteAdmin
}

export type ResolverComprobante = (storagePath: string) => Promise<Blob>
export type ResolverUrlComprobante = (storagePath: string) => Promise<string>
export type ProgresoExportacionReservas = (completados: number, total: number) => void

const COLORES = {
  negro: '0B0B0A',
  negroSuave: '1E1D1A',
  dorado: 'D99A0B',
  crema: 'FFF8E7',
  grisClaro: 'D9D4C8',
  blanco: 'FFFFFF',
}

function claveClienteDatos(celular: string, nombre: string): string {
  const numero = normalizarCelular(celular)
  return numero || `sin-celular:${nombre.trim().toLocaleLowerCase()}`
}

function claveCliente(reserva: Reserva): string {
  return claveClienteDatos(reserva.celular, reserva.alias)
}

function compararFechas(a: FilaDatosReserva, b: FilaDatosReserva): number {
  return a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio || a.reservaId.localeCompare(b.reservaId)
}

export function prepararFilasDatosReservas(
  reservas: readonly Reserva[],
  canchas: readonly Campo[],
  comprobantes: readonly ComprobanteAdmin[] = [],
): FilaDatosReserva[] {
  const canchaPorId = new Map(canchas.map((cancha) => [cancha.id, cancha]))
  const comprobantePorReserva = new Map<string, ComprobanteAdmin>()
  for (const comprobante of comprobantes) {
    if (!comprobantePorReserva.has(comprobante.reservaId)) {
      comprobantePorReserva.set(comprobante.reservaId, comprobante)
    }
  }
  const cantidadPorCampoYCliente = new Map<number, Map<string, number>>()
  const clientePorReserva = new Map<string, string>()

  for (const reserva of reservas) {
    const porCliente = cantidadPorCampoYCliente.get(reserva.canchaId) ?? new Map<string, number>()
    const cliente = claveCliente(reserva)
    clientePorReserva.set(reserva.id, cliente)
    porCliente.set(cliente, (porCliente.get(cliente) ?? 0) + 1)
    cantidadPorCampoYCliente.set(reserva.canchaId, porCliente)
  }

  const filas = reservas.map((reserva): FilaDatosReserva => {
    const campo = canchaPorId.get(reserva.canchaId) ?? {
      id: reserva.canchaId,
      nombre: `Campo ${reserva.canchaId}`,
      deporte: 'Sin deporte',
      jugadores: 0,
      precioHora: 0,
      color: '',
      imagen: '',
      oferta: '',
    }
    return {
      reservaId: reserva.id,
      campoId: reserva.canchaId,
      campo,
      nombre: reserva.nombre?.trim() || reserva.alias,
      celular: normalizarCelular(reserva.celular),
      fecha: reserva.fecha,
      inicio: reserva.inicio,
      horario: rangoHablado(reserva.inicio, reserva.horas),
      horas: reserva.horas,
      comprobante: comprobantePorReserva.get(reserva.id),
    }
  })

  const ordenCampo = new Map(canchas.map((cancha, indice) => [cancha.id, indice]))
  return filas.sort((a, b) => {
    const campoA = ordenCampo.get(a.campoId) ?? Number.MAX_SAFE_INTEGER
    const campoB = ordenCampo.get(b.campoId) ?? Number.MAX_SAFE_INTEGER
    if (campoA !== campoB) return campoA - campoB
    if (a.campoId !== b.campoId) return a.campoId - b.campoId

    const clienteA = clientePorReserva.get(a.reservaId) ?? claveClienteDatos(a.celular, a.nombre)
    const clienteB = clientePorReserva.get(b.reservaId) ?? claveClienteDatos(b.celular, b.nombre)
    const cantidadA = cantidadPorCampoYCliente.get(a.campoId)?.get(clienteA) ?? 0
    const cantidadB = cantidadPorCampoYCliente.get(b.campoId)?.get(clienteB) ?? 0
    if (cantidadA !== cantidadB) return cantidadB - cantidadA
    const ordenCliente = clienteA.localeCompare(clienteB)
    if (ordenCliente !== 0) return ordenCliente
    return compararFechas(a, b)
  })
}

function extensionImagen(mimeType: ComprobanteAdmin['mimeType']): 'jpeg' | 'png' | 'gif' {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'png'
  return 'jpeg'
}

function base64DesdeBytes(bytes: Uint8Array): string {
  let resultado = ''
  const tamanoBloque = 0x8000
  for (let inicio = 0; inicio < bytes.length; inicio += tamanoBloque) {
    resultado += String.fromCharCode(...bytes.subarray(inicio, inicio + tamanoBloque))
  }
  return btoa(resultado)
}

interface ImagenParaExcel {
  dataUrl: string
  extension: 'jpeg' | 'png' | 'gif'
  dimensiones: DimensionesImagen
}

interface ResultadoComprobanteExcel {
  imagen?: ImagenParaExcel
  url?: string
}

export interface DimensionesImagen {
  ancho: number
  alto: number
}

export interface TamanoImagenExcel {
  width: number
  height: number
}

const MAX_ANCHO_IMAGEN_EXCEL = 360
const MAX_ALTO_IMAGEN_EXCEL = 520

export function calcularTamanoImagenExcel(dimensiones: DimensionesImagen): TamanoImagenExcel {
  const ancho = Number.isFinite(dimensiones.ancho) && dimensiones.ancho > 0 ? dimensiones.ancho : 1
  const alto = Number.isFinite(dimensiones.alto) && dimensiones.alto > 0 ? dimensiones.alto : 1
  const escala = Math.min(1, MAX_ANCHO_IMAGEN_EXCEL / ancho, MAX_ALTO_IMAGEN_EXCEL / alto)
  return {
    width: Math.max(1, Math.round(ancho * escala)),
    height: Math.max(1, Math.round(alto * escala)),
  }
}

function leerUint32Grande(bytes: Uint8Array, inicio: number): number {
  return bytes[inicio] * 0x1000000 + bytes[inicio + 1] * 0x10000 + bytes[inicio + 2] * 0x100 + bytes[inicio + 3]
}

function leerDimensionesPng(bytes: Uint8Array): DimensionesImagen | null {
  const firmaPng = [137, 80, 78, 71, 13, 10, 26, 10]
  if (!firmaPng.every((valor, indice) => bytes[indice] === valor) || bytes.length < 24) return null
  return { ancho: leerUint32Grande(bytes, 16), alto: leerUint32Grande(bytes, 20) }
}

function leerDimensionesJpeg(bytes: Uint8Array): DimensionesImagen | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let indice = 2
  while (indice + 9 < bytes.length) {
    if (bytes[indice] !== 0xff) {
      indice += 1
      continue
    }
    const marcador = bytes[indice + 1]
    indice += 2
    if (marcador === 0xd8 || marcador === 0xd9) continue
    if (indice + 2 > bytes.length) return null
    const longitud = bytes[indice] * 0x100 + bytes[indice + 1]
    const esMarco = (marcador >= 0xc0 && marcador <= 0xc3)
      || (marcador >= 0xc5 && marcador <= 0xc7)
      || (marcador >= 0xc9 && marcador <= 0xcb)
      || (marcador >= 0xcd && marcador <= 0xcf)
    if (esMarco && indice + 7 < bytes.length) {
      return {
        alto: bytes[indice + 3] * 0x100 + bytes[indice + 4],
        ancho: bytes[indice + 5] * 0x100 + bytes[indice + 6],
      }
    }
    if (longitud < 2) return null
    indice += longitud
  }
  return null
}

async function leerDimensionesImagen(blob: Blob): Promise<DimensionesImagen> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const dimensionesDelEncabezado = leerDimensionesPng(bytes) ?? leerDimensionesJpeg(bytes)
  if (dimensionesDelEncabezado) return dimensionesDelEncabezado

  if (typeof createImageBitmap === 'function') {
    try {
      const imagen = await createImageBitmap(blob)
      const dimensiones = { ancho: imagen.width, alto: imagen.height }
      imagen.close()
      return dimensiones
    } catch {
      // El comprobante queda como no cargable si el navegador no puede decodificarlo.
    }
  }

  throw new Error('dimensiones-imagen-no-disponibles')
}

async function convertirBlobAImagenExcel(blob: Blob, mimeType: ComprobanteAdmin['mimeType']): Promise<ImagenParaExcel> {
  if (mimeType === 'image/webp') {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
      throw new Error('webp-no-compatible')
    }
    const imagen = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = imagen.width
    canvas.height = imagen.height
    const contexto = canvas.getContext('2d')
    if (!contexto) {
      imagen.close()
      throw new Error('canvas-no-disponible')
    }
    contexto.drawImage(imagen, 0, 0)
    imagen.close()
    return {
      dataUrl: canvas.toDataURL('image/png'),
      extension: 'png',
      dimensiones: { ancho: canvas.width, alto: canvas.height },
    }
  }

  const dimensiones = await leerDimensionesImagen(blob)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return {
    dataUrl: `data:${mimeType};base64,${base64DesdeBytes(bytes)}`,
    extension: extensionImagen(mimeType),
    dimensiones,
  }
}

const MAX_COMPROBANTES_EN_PARALELO = 5
const ALTURA_MINIMA_FILA_EXCEL = 30

async function cargarImagenesComprobantes(
  filas: readonly FilaDatosReserva[],
  resolverComprobante: ResolverComprobante,
  alProgresar?: ProgresoExportacionReservas,
  resolverUrlComprobante?: ResolverUrlComprobante,
): Promise<Map<string, ResultadoComprobanteExcel>> {
  const filasConComprobante = filas.filter((fila) => fila.comprobante)
  const resultadosPorReserva = new Map<string, ResultadoComprobanteExcel>()
  if (!filasConComprobante.length) {
    alProgresar?.(0, 0)
    return resultadosPorReserva
  }

  let siguiente = 0
  let completados = 0
  const trabajador = async (): Promise<void> => {
    while (true) {
      const indice = siguiente
      siguiente += 1
      const fila = filasConComprobante[indice]
      if (!fila?.comprobante) return

      const promesaUrl = resolverUrlComprobante
        ? resolverUrlComprobante(fila.comprobante.storagePath).catch(() => undefined)
        : Promise.resolve(undefined)
      try {
        const [blob, url] = await Promise.all([
          resolverComprobante(fila.comprobante.storagePath),
          promesaUrl,
        ])
        const imagen = await convertirBlobAImagenExcel(blob, fila.comprobante.mimeType)
        resultadosPorReserva.set(fila.reservaId, { imagen, ...(url ? { url } : {}) })
      } catch {
        const url = await promesaUrl
        if (url) resultadosPorReserva.set(fila.reservaId, { url })
        // La fila se conserva y el usuario verá "No se pudo cargar" en Excel.
      } finally {
        completados += 1
        alProgresar?.(completados, filasConComprobante.length)
      }
    }
  }

  const cantidadTrabajadores = Math.min(MAX_COMPROBANTES_EN_PARALELO, filasConComprobante.length)
  await Promise.all(Array.from({ length: cantidadTrabajadores }, () => trabajador()))
  return resultadosPorReserva
}

function aplicarEstiloTitulo(celda: ExcelJS.Cell): void {
  celda.font = { name: 'Arial', size: 16, bold: true, color: { argb: COLORES.crema } }
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.negro } }
  celda.alignment = { horizontal: 'center', vertical: 'middle' }
}

function aplicarEstiloCampo(celda: ExcelJS.Cell): void {
  celda.font = { name: 'Arial', size: 16, bold: true, color: { argb: COLORES.negro } }
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.dorado } }
  celda.alignment = { horizontal: 'left', vertical: 'middle' }
}

function aplicarEstiloCabecera(celda: ExcelJS.Cell): void {
  celda.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORES.crema } }
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.negroSuave } }
  celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  celda.border = { bottom: { style: 'thin', color: { argb: COLORES.dorado } } }
}

function aplicarEstiloFila(celda: ExcelJS.Cell, alterna: boolean): void {
  celda.font = { name: 'Arial', size: 10, color: { argb: COLORES.negro } }
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: alterna ? 'F8F4EA' : COLORES.blanco } }
  celda.alignment = { vertical: 'middle', wrapText: true }
  celda.border = { bottom: { style: 'hair', color: { argb: COLORES.grisClaro } } }
}

function filasPorCampo(filas: readonly FilaDatosReserva[], canchas: readonly Campo[]): Array<{ campo: Campo; filas: FilaDatosReserva[] }> {
  const porCampo = new Map<number, FilaDatosReserva[]>()
  for (const fila of filas) {
    const grupo = porCampo.get(fila.campoId) ?? []
    grupo.push(fila)
    porCampo.set(fila.campoId, grupo)
  }

  const resultado = canchas.map((campo) => ({ campo, filas: porCampo.get(campo.id) ?? [] }))
  const idsConfigurados = new Set(canchas.map((campo) => campo.id))
  for (const [campoId, filasDelCampo] of porCampo) {
    if (idsConfigurados.has(campoId)) continue
    const campo = filasDelCampo[0]?.campo
    if (campo) resultado.push({ campo, filas: filasDelCampo })
  }
  return resultado
}

export async function crearLibroDatosReservas(
  reservas: readonly Reserva[],
  canchas: readonly Campo[],
  comprobantes: readonly ComprobanteAdmin[] = [],
  resolverComprobante?: ResolverComprobante,
  alProgresar?: ProgresoExportacionReservas,
  resolverUrlComprobante?: ResolverUrlComprobante,
): Promise<ExcelJS.Workbook> {
  const moduloExcelJS = await cargarModuloExcelJS()
  const filas = prepararFilasDatosReservas(reservas, canchas, comprobantes)
  const imagenesPorReserva = resolverComprobante
    ? await cargarImagenesComprobantes(filas, resolverComprobante, alProgresar, resolverUrlComprobante)
    : new Map<string, ResultadoComprobanteExcel>()
  const libro = new moduloExcelJS.Workbook()
  libro.creator = 'Polideportivo El Jaguar'
  libro.created = new Date()
  const hoja = libro.addWorksheet('Datos de reservas')
  hoja.columns = [
    { header: 'Nombre', key: 'nombre', width: 26 },
    { header: 'Número', key: 'celular', width: 16 },
    { header: 'Comprobante', key: 'comprobante', width: 52 },
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Horario', key: 'horario', width: 24 },
    { header: 'Horas', key: 'horas', width: 10 },
    { header: 'Abrir comprobante', key: 'enlace', width: 22 },
  ]

  let filaActual = 1
  hoja.mergeCells(filaActual, 1, filaActual, 7)
  hoja.getCell(filaActual, 1).value = 'DATOS DE RESERVAS'
  hoja.getRow(filaActual).height = 30
  aplicarEstiloTitulo(hoja.getCell(filaActual, 1))
  filaActual += 1

  hoja.mergeCells(filaActual, 1, filaActual, 7)
  hoja.getCell(filaActual, 1).value = 'Histórico de reservas — una fila por cada reserva'
  hoja.getCell(filaActual, 1).font = { name: 'Arial', size: 10, italic: true, color: { argb: COLORES.negro } }
  hoja.getCell(filaActual, 1).alignment = { horizontal: 'center' }
  filaActual += 2

  for (const grupo of filasPorCampo(filas, canchas)) {
    hoja.mergeCells(filaActual, 1, filaActual, 7)
    hoja.getCell(filaActual, 1).value = grupo.campo.nombre.toUpperCase()
    hoja.getRow(filaActual).height = 25
    aplicarEstiloCampo(hoja.getCell(filaActual, 1))
    filaActual += 1

    const filaCabecera = hoja.getRow(filaActual)
    filaCabecera.values = ['Nombre', 'Número', 'Comprobante', 'Fecha', 'Horario', 'Horas', 'Abrir comprobante']
    filaCabecera.height = 24
    for (let columna = 1; columna <= 7; columna += 1) aplicarEstiloCabecera(filaCabecera.getCell(columna))
    filaActual += 1

    if (!grupo.filas.length) {
      hoja.mergeCells(filaActual, 1, filaActual, 7)
      hoja.getCell(filaActual, 1).value = 'Sin reservas registradas'
      hoja.getCell(filaActual, 1).font = { name: 'Arial', size: 10, italic: true, color: { argb: '66635C' } }
      hoja.getCell(filaActual, 1).alignment = { horizontal: 'center' }
      filaActual += 2
      continue
    }

    for (const [indice, fila] of grupo.filas.entries()) {
      const filaExcel = hoja.getRow(filaActual)
      filaExcel.values = [fila.nombre, fila.celular, '', new Date(`${fila.fecha}T12:00:00`), fila.horario, fila.horas, '']
      filaExcel.height = ALTURA_MINIMA_FILA_EXCEL
      for (let columna = 1; columna <= 7; columna += 1) aplicarEstiloFila(filaExcel.getCell(columna), indice % 2 === 1)
      filaExcel.getCell(4).numFmt = 'dd/mm/yyyy'
      filaExcel.getCell(6).numFmt = '0.0'

      if (!fila.comprobante) {
        filaExcel.getCell(3).value = 'Cliente confiable — no tiene comprobante'
      } else if (!resolverComprobante) {
        filaExcel.getCell(3).value = 'Imagen no disponible'
      } else {
        const resultado = imagenesPorReserva.get(fila.reservaId)
        if (!resultado?.imagen) {
          filaExcel.getCell(3).value = 'No se pudo cargar'
        } else {
          const tamano = calcularTamanoImagenExcel(resultado.imagen.dimensiones)
          filaExcel.height = Math.max(ALTURA_MINIMA_FILA_EXCEL, Math.ceil(tamano.height * 0.75))
          const imagenId = libro.addImage({ base64: resultado.imagen.dataUrl, extension: resultado.imagen.extension })
          hoja.addImage(imagenId, {
            tl: { col: 2.1, row: filaActual - 1 + 0.08 },
            ext: tamano,
          })
        }

        if (resultado?.url) {
          filaExcel.getCell(7).value = {
            text: 'Abrir comprobante',
            hyperlink: resultado.url,
            tooltip: 'Abrir comprobante original',
          }
          filaExcel.getCell(7).font = { name: 'Arial', size: 10, color: { argb: '0563C1' }, underline: true }
        } else if (resolverUrlComprobante) {
          filaExcel.getCell(7).value = 'Enlace no disponible'
        }
      }
      filaActual += 1
    }
    filaActual += 1
  }

  return libro
}

export async function descargarDatosReservas(
  reservas: readonly Reserva[],
  canchas: readonly Campo[],
  comprobantes: readonly ComprobanteAdmin[] = [],
  resolverComprobante?: ResolverComprobante,
  alProgresar?: ProgresoExportacionReservas,
  resolverUrlComprobante?: ResolverUrlComprobante,
): Promise<void> {
  const libro = await crearLibroDatosReservas(
    reservas,
    canchas,
    comprobantes,
    resolverComprobante,
    alProgresar,
    resolverUrlComprobante,
  )
  const contenido = await libro.xlsx.writeBuffer()
  const blob = new Blob([contenido], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'datos-reservas.xlsx'
  enlace.click()
  URL.revokeObjectURL(url)
}
