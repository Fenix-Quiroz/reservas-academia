import type { CellStyle, WorkBook, WorkSheet } from 'xlsx-js-style'
import type { BalanceMensual } from './balanceMensual.js'

type ModuloXlsx = typeof import('xlsx-js-style')
type ModuloXlsxRuntime = { default: ModuloXlsx }
type ModuloXlsxImportado = ModuloXlsx | ModuloXlsxRuntime

const colores = {
  negro: '0B0B0A',
  negroSuave: '1E1D1A',
  dorado: 'D99A0B',
  doradoClaro: 'FFF1C7',
  crema: 'FFF8E7',
  gris: '66635C',
  grisClaro: 'D9D4C8',
  filaAlterna: 'F8F4EA',
}

export function normalizarModuloXlsx(modulo: ModuloXlsxImportado): ModuloXlsx {
  return 'utils' in modulo ? modulo : modulo.default
}

async function cargarModuloXlsx(): Promise<ModuloXlsx> {
  const modulo = await import('xlsx-js-style') as unknown as ModuloXlsxImportado
  return normalizarModuloXlsx(modulo)
}

function periodoVisible(mes: string): string {
  return new Date(`${mes}-01T12:00:00`).toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  })
}

function ajustarColumnas(hoja: WorkSheet, anchos: number[]): void {
  hoja['!cols'] = anchos.map((wch) => ({ wch }))
}

function aplicarFormato(hoja: WorkSheet, celdas: string[], formato: string): void {
  for (const referencia of celdas) {
    const celda = hoja[referencia]
    if (celda) celda.z = formato
  }
}

function rgb(valor: string): { rgb: string } {
  return { rgb: valor }
}

function aplicarEstiloRango(XLSX: ModuloXlsx, hoja: WorkSheet, referencia: string, estilo: CellStyle): void {
  const rango = XLSX.utils.decode_range(referencia)
  for (let fila = rango.s.r; fila <= rango.e.r; fila += 1) {
    for (let columna = rango.s.c; columna <= rango.e.c; columna += 1) {
      const direccion = XLSX.utils.encode_cell({ r: fila, c: columna })
      const celda = hoja[direccion] ?? { t: 'z', v: '' }
      celda.s = {
        ...celda.s,
        ...estilo,
        font: { ...celda.s?.font, ...estilo.font },
        alignment: { ...celda.s?.alignment, ...estilo.alignment },
        border: { ...celda.s?.border, ...estilo.border },
        fill: { ...celda.s?.fill, ...estilo.fill },
      }
      hoja[direccion] = celda
    }
  }
}

function aplicarEstiloFilaAlterna(XLSX: ModuloXlsx, hoja: WorkSheet, fila: number, ultimaColumna: string): void {
  aplicarEstiloRango(XLSX, hoja, `A${fila}:${ultimaColumna}${fila}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.filaAlterna) },
  })
}

function aplicarEstilosResumen(
  XLSX: ModuloXlsx,
  hoja: WorkSheet,
  filasPorCampo: number,
  filasPorDia: number,
): void {
  const filaSeccionDia = 14 + filasPorCampo
  const filaCabeceraDia = filaSeccionDia + 1
  const filaDatosDia = filaCabeceraDia + 1
  const ultimaFila = Math.max(14, filaCabeceraDia, filaDatosDia + filasPorDia - 1)

  aplicarEstiloRango(XLSX, hoja, `A1:F${ultimaFila}`, {
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A1:F1', {
    fill: { patternType: 'solid', fgColor: rgb(colores.negro) },
    font: { name: 'Arial', sz: 16, bold: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'left', vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A2:B3', {
    fill: { patternType: 'solid', fgColor: rgb(colores.crema) },
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
    border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
  })
  aplicarEstiloRango(XLSX, hoja, 'A2:A3', {
    font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.gris) },
  })
  aplicarEstiloRango(XLSX, hoja, 'A5:B5', {
    fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
  })
  aplicarEstiloRango(XLSX, hoja, 'A6:B6', {
    fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
    font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'center', vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'B7:B9', {
    fill: { patternType: 'solid', fgColor: rgb(colores.doradoClaro) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
    alignment: { horizontal: 'right', vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A7:A9', {
    fill: { patternType: 'solid', fgColor: rgb('FFFFFF') },
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A11:E11', {
    fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
  })
  aplicarEstiloRango(XLSX, hoja, 'A12:E12', {
    fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
    font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  })
  if (filasPorCampo > 0) {
    aplicarEstiloRango(XLSX, hoja, `A13:E${filasPorCampo + 12}`, {
      fill: { patternType: 'solid', fgColor: rgb('FFFFFF') },
      font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
      border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
    })
    aplicarEstiloRango(XLSX, hoja, `C13:E${filasPorCampo + 12}`, {
      alignment: { horizontal: 'right', vertical: 'center' },
    })
  }

  aplicarEstiloRango(XLSX, hoja, `A${filaSeccionDia}:F${filaSeccionDia}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
  })
  aplicarEstiloRango(XLSX, hoja, `A${filaCabeceraDia}:F${filaCabeceraDia}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
    font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  })
  if (filasPorDia > 0) {
    const ultimaFilaDia = filaDatosDia + filasPorDia - 1
    aplicarEstiloRango(XLSX, hoja, `A${filaDatosDia}:F${ultimaFilaDia}`, {
      fill: { patternType: 'solid', fgColor: rgb('FFFFFF') },
      font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
      alignment: { vertical: 'center' },
      border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
    })
    for (let fila = filaDatosDia; fila <= ultimaFilaDia; fila += 1) {
      if (fila % 2 === 1) aplicarEstiloFilaAlterna(XLSX, hoja, fila, 'F')
    }
    aplicarEstiloRango(XLSX, hoja, `D${filaDatosDia}:F${ultimaFilaDia}`, {
      alignment: { horizontal: 'right', vertical: 'center' },
    })
  }
}

function aplicarEstilosDetalle(XLSX: ModuloXlsx, hoja: WorkSheet, filas: number): void {
  aplicarEstiloRango(XLSX, hoja, 'A1:J4', {
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A1:J1', {
    fill: { patternType: 'solid', fgColor: rgb(colores.negro) },
    font: { name: 'Arial', sz: 16, bold: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'left', vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A2:B3', {
    fill: { patternType: 'solid', fgColor: rgb(colores.crema) },
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
    border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
  })
  aplicarEstiloRango(XLSX, hoja, 'A2:A3', {
    font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.gris) },
  })
  aplicarEstiloRango(XLSX, hoja, 'A4:J4', {
    fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
    font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.negro) },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { bottom: { style: 'medium', color: rgb(colores.negro) } },
  })
  if (filas === 0) return
  const ultimaFila = filas + 4
  aplicarEstiloRango(XLSX, hoja, `A5:J${ultimaFila}`, {
    fill: { patternType: 'solid', fgColor: rgb('FFFFFF') },
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
    border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
  })
  for (let fila = 5; fila <= ultimaFila; fila += 1) {
    if (fila % 2 === 1) aplicarEstiloFilaAlterna(XLSX, hoja, fila, 'J')
  }
  aplicarEstiloRango(XLSX, hoja, `I5:J${ultimaFila}`, {
    font: { name: 'Arial', sz: 10, bold: true, color: rgb('5A4300') },
  })
}

function crearLibroConModulo(XLSX: ModuloXlsx, balance: BalanceMensual): WorkBook {
  const filaSeccionDia = 14 + balance.porCampo.length
  const filaCabeceraDia = filaSeccionDia + 1
  const filaDatosDia = filaCabeceraDia + 1
  const resumen = XLSX.utils.aoa_to_sheet([
    ['BALANCE MENSUAL DE RESERVAS'],
    ['Periodo', periodoVisible(balance.mes)],
    ['Criterio', 'Solo reservas finalizadas'],
    [],
    ['RESUMEN GENERAL'],
    ['Indicador', 'Valor'],
    ['Reservas finalizadas', balance.reservasFinalizadas],
    ['Horas alquiladas', balance.horasAlquiladas],
    ['Ingresos totales (S/)', balance.ingresosTotales],
    [],
    ['RESULTADOS POR CAMPO'],
    ['Campo', 'Deporte', 'Reservas realizadas', 'Horas alquiladas', 'Ingresos generados (S/)'],
    ...balance.porCampo.map((fila) => [fila.campo, fila.deporte, fila.reservas, fila.horas, fila.ingresos]),
    [],
    ['RESULTADOS POR DÍA'],
    ['Fecha', 'Día', 'Campo', 'Reservas finalizadas', 'Horas alquiladas', 'Ingresos generados (S/)'],
    ...balance.porDia.map((fila) => [
      new Date(`${fila.fecha}T12:00:00`),
      fila.dia,
      fila.campo,
      fila.reservas,
      fila.horas,
      fila.ingresos,
    ]),
  ])
  ajustarColumnas(resumen, [28, 24, 22, 18, 18, 24])
  resumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }]
  resumen['!autofilter'] = { ref: `A12:E${Math.max(12, balance.porCampo.length + 12)}` }
  resumen['!freeze'] = { xSplit: 0, ySplit: 12 }
  aplicarFormato(resumen, ['B9', ...balance.porCampo.map((_fila, indice) => `E${indice + 13}`)], '0.00')
  aplicarFormato(resumen, balance.porDia.map((_fila, indice) => `A${indice + filaDatosDia}`), 'dd/mm/yyyy')
  aplicarFormato(resumen, balance.porDia.map((_fila, indice) => `F${indice + filaDatosDia}`), '0.00')
  aplicarEstilosResumen(XLSX, resumen, balance.porCampo.length, balance.porDia.length)

  const detalle = XLSX.utils.aoa_to_sheet([
    ['DETALLE DIARIO DE RESERVAS'],
    ['Periodo', periodoVisible(balance.mes)],
    [],
    ['Fecha', 'Día', 'Campo', 'Deporte', 'Horario', 'Horas', 'Cliente', 'Celular', 'Estado', 'Monto (S/)'],
    ...balance.detalle.map((fila) => [
      new Date(`${fila.fecha}T12:00:00`),
      fila.dia,
      fila.campo,
      fila.deporte,
      fila.horario,
      fila.horas,
      fila.cliente,
      fila.celular,
      fila.estado,
      fila.monto,
    ]),
  ])
  ajustarColumnas(detalle, [14, 14, 18, 18, 20, 10, 24, 14, 16, 16])
  detalle['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }]
  detalle['!autofilter'] = { ref: `A4:J${Math.max(4, balance.detalle.length + 4)}` }
  detalle['!freeze'] = { xSplit: 0, ySplit: 4 }
  aplicarFormato(detalle, balance.detalle.map((_fila, indice) => `A${indice + 5}`), 'dd/mm/yyyy')
  aplicarFormato(detalle, balance.detalle.map((_fila, indice) => `J${indice + 5}`), '0.00')
  aplicarEstilosDetalle(XLSX, detalle, balance.detalle.length)

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, resumen, 'Resumen mensual')
  XLSX.utils.book_append_sheet(libro, detalle, 'Detalle diario')
  return libro
}

export async function crearLibroBalance(balance: BalanceMensual): Promise<WorkBook> {
  const XLSX = await cargarModuloXlsx()
  return crearLibroConModulo(XLSX, balance)
}

export async function descargarBalanceMensual(balance: BalanceMensual): Promise<void> {
  const XLSX = await cargarModuloXlsx()
  XLSX.writeFile(crearLibroConModulo(XLSX, balance), `balance-reservas-${balance.mes}.xlsx`, {
    cellDates: true,
    cellStyles: true,
    compression: true,
  })
}
