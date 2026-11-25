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

export type ResolverUrlComprobante = (storagePath: string) => Promise<string>

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
}

async function convertirUrlAImagenExcel(url: string, mimeType: ComprobanteAdmin['mimeType']): Promise<ImagenParaExcel> {
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`comprobante-http-${respuesta.status}`)
  const blob = await respuesta.blob()

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
    return { dataUrl: canvas.toDataURL('image/png'), extension: 'png' }
  }

  const bytes = new Uint8Array(await blob.arrayBuffer())
  return {
    dataUrl: `data:${mimeType};base64,${base64DesdeBytes(bytes)}`,
    extension: extensionImagen(mimeType),
  }
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
  resolverUrlComprobante?: ResolverUrlComprobante,
): Promise<ExcelJS.Workbook> {
  const moduloExcelJS = await cargarModuloExcelJS()
  const filas = prepararFilasDatosReservas(reservas, canchas, comprobantes)
  const libro = new moduloExcelJS.Workbook()
  libro.creator = 'Polideportivo El Jaguar'
  libro.created = new Date()
  const hoja = libro.addWorksheet('Datos de reservas')
  hoja.columns = [
    { header: 'Nombre', key: 'nombre', width: 26 },
    { header: 'Número', key: 'celular', width: 16 },
    { header: 'Comprobante', key: 'comprobante', width: 28 },
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Horario', key: 'horario', width: 24 },
    { header: 'Horas', key: 'horas', width: 10 },
  ]

  let filaActual = 1
  hoja.mergeCells(filaActual, 1, filaActual, 6)
  hoja.getCell(filaActual, 1).value = 'DATOS DE RESERVAS'
  hoja.getRow(filaActual).height = 30
  aplicarEstiloTitulo(hoja.getCell(filaActual, 1))
  filaActual += 1

  hoja.mergeCells(filaActual, 1, filaActual, 6)
  hoja.getCell(filaActual, 1).value = 'Histórico de reservas — una fila por cada reserva'
  hoja.getCell(filaActual, 1).font = { name: 'Arial', size: 10, italic: true, color: { argb: COLORES.negro } }
  hoja.getCell(filaActual, 1).alignment = { horizontal: 'center' }
  filaActual += 2

  for (const grupo of filasPorCampo(filas, canchas)) {
    hoja.mergeCells(filaActual, 1, filaActual, 6)
    hoja.getCell(filaActual, 1).value = grupo.campo.nombre.toUpperCase()
    hoja.getRow(filaActual).height = 25
    aplicarEstiloCampo(hoja.getCell(filaActual, 1))
    filaActual += 1

    const filaCabecera = hoja.getRow(filaActual)
    filaCabecera.values = ['Nombre', 'Número', 'Comprobante', 'Fecha', 'Horario', 'Horas']
    filaCabecera.height = 24
    for (let columna = 1; columna <= 6; columna += 1) aplicarEstiloCabecera(filaCabecera.getCell(columna))
    filaActual += 1

    if (!grupo.filas.length) {
      hoja.mergeCells(filaActual, 1, filaActual, 6)
      hoja.getCell(filaActual, 1).value = 'Sin reservas registradas'
      hoja.getCell(filaActual, 1).font = { name: 'Arial', size: 10, italic: true, color: { argb: '66635C' } }
      hoja.getCell(filaActual, 1).alignment = { horizontal: 'center' }
      filaActual += 2
      continue
    }

    for (const [indice, fila] of grupo.filas.entries()) {
      const filaExcel = hoja.getRow(filaActual)
      filaExcel.values = [fila.nombre, fila.celular, '', new Date(`${fila.fecha}T12:00:00`), fila.horario, fila.horas]
      filaExcel.height = 82
      for (let columna = 1; columna <= 6; columna += 1) aplicarEstiloFila(filaExcel.getCell(columna), indice % 2 === 1)
      filaExcel.getCell(4).numFmt = 'dd/mm/yyyy'
      filaExcel.getCell(6).numFmt = '0.0'

      if (!fila.comprobante) {
        filaExcel.getCell(3).value = 'Sin comprobante'
      } else if (!resolverUrlComprobante) {
        filaExcel.getCell(3).value = 'Imagen no disponible'
      } else {
        try {
          const url = await resolverUrlComprobante(fila.comprobante.storagePath)
          const imagen = await convertirUrlAImagenExcel(url, fila.comprobante.mimeType)
          const imagenId = libro.addImage({ base64: imagen.dataUrl, extension: imagen.extension })
          hoja.addImage(imagenId, {
            tl: { col: 2.1, row: filaActual - 1 + 0.08 },
            ext: { width: 170, height: 92 },
          })
        } catch {
          filaExcel.getCell(3).value = 'No se pudo cargar'
        }
      }
      filaActual += 1
    }
    filaActual += 1
  }

  hoja.views = [{ state: 'frozen', ySplit: 4 }]
  return libro
}

export async function descargarDatosReservas(
  reservas: readonly Reserva[],
  canchas: readonly Campo[],
  comprobantes: readonly ComprobanteAdmin[] = [],
  resolverUrlComprobante?: ResolverUrlComprobante,
): Promise<void> {
  const libro = await crearLibroDatosReservas(reservas, canchas, comprobantes, resolverUrlComprobante)
  const contenido = await libro.xlsx.writeBuffer()
  const blob = new Blob([contenido], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'datos-reservas.xlsx'
  enlace.click()
  URL.revokeObjectURL(url)
}
