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

interface SeccionBalanceDia {
  titulo: number
  cabecera: number
  inicio: number
  filas: number
}

function aplicarEstilosResumen(
  XLSX: ModuloXlsx,
  hoja: WorkSheet,
  filasPorCampo: number,
  seccionesDia: readonly SeccionBalanceDia[],
): void {
  const ultimaFila = Math.max(
    14,
    ...seccionesDia.map((seccion) => Math.max(seccion.cabecera, seccion.inicio + seccion.filas - 1)),
  )

  aplicarEstiloRango(XLSX, hoja, `A1:E${ultimaFila}`, {
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A1:E1', {
    fill: { patternType: 'solid', fgColor: rgb(colores.negro) },
    font: { name: 'Arial', sz: 16, bold: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'left', vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A2:B3', {
    fill: { patternType: 'solid', fgColor: rgb(colores.crema) },
    font: { name: 'Arial', sz: 12, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
    border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
  })
  aplicarEstiloRango(XLSX, hoja, 'A2:A3', {
    font: { name: 'Arial', sz: 12, bold: true, color: rgb(colores.gris) },
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

  for (const seccion of seccionesDia) {
    aplicarEstiloRango(XLSX, hoja, `A${seccion.titulo}:E${seccion.titulo}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
      font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
    })
    aplicarEstiloRango(XLSX, hoja, `A${seccion.cabecera}:E${seccion.cabecera}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.crema) },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    })
    if (seccion.filas === 0) continue
    const ultimaFilaDia = seccion.inicio + seccion.filas - 1
    aplicarEstiloRango(XLSX, hoja, `A${seccion.inicio}:E${ultimaFilaDia}`, {
      fill: { patternType: 'solid', fgColor: rgb('FFFFFF') },
      font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
      alignment: { vertical: 'center' },
      border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
    })
    for (let fila = seccion.inicio; fila <= ultimaFilaDia; fila += 1) {
      if (fila % 2 === 1) aplicarEstiloFilaAlterna(XLSX, hoja, fila, 'E')
    }
    aplicarEstiloRango(XLSX, hoja, `C${seccion.inicio}:E${ultimaFilaDia}`, {
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

interface SeccionEventosEspeciales {
  titulo: number
  cabecera: number
  inicio: number
  filas: number
}

function aplicarEstilosEventosEspeciales(
  XLSX: ModuloXlsx,
  hoja: WorkSheet,
  secciones: readonly SeccionEventosEspeciales[],
  ultimaFila: number,
): void {
  aplicarEstiloRango(XLSX, hoja, `A1:G${Math.max(1, ultimaFila)}`, {
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A1:G1', {
    fill: { patternType: 'solid', fgColor: rgb(colores.negro) },
    font: { name: 'Arial', sz: 16, bold: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'left', vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A2:B4', {
    fill: { patternType: 'solid', fgColor: rgb(colores.crema) },
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
  })
  aplicarEstiloRango(XLSX, hoja, 'A2:A4', {
    font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.gris) },
  })
  for (const seccion of secciones) {
    aplicarEstiloRango(XLSX, hoja, `A${seccion.titulo}:G${seccion.titulo}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
      font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
    })
    aplicarEstiloRango(XLSX, hoja, `A${seccion.cabecera}:G${seccion.cabecera}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.crema) },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    })
    const ultimaFilaSeccion = seccion.inicio + Math.max(1, seccion.filas) - 1
    aplicarEstiloRango(XLSX, hoja, `A${seccion.inicio}:G${ultimaFilaSeccion}`, {
      fill: { patternType: 'solid', fgColor: rgb('FFFFFF') },
      font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
      border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
    })
    for (let fila = seccion.inicio; fila <= ultimaFilaSeccion; fila += 1) {
      if (fila % 2 === 1) aplicarEstiloFilaAlterna(XLSX, hoja, fila, 'G')
    }
    aplicarEstiloRango(XLSX, hoja, `G${seccion.inicio}:G${ultimaFilaSeccion}`, {
      alignment: { horizontal: 'right', vertical: 'center' },
    })
  }
}

function crearHojaEventosEspeciales(XLSX: ModuloXlsx, balance: BalanceMensual): WorkSheet {
  const filas: Array<Array<string | number | Date>> = [
    ['EVENTOS ESPECIALES'],
    ['Periodo', periodoVisible(balance.mes)],
    ['Total cobrado en eventos especiales (S/)', balance.ingresosEventosEspeciales],
    [],
  ]
  const secciones: SeccionEventosEspeciales[] = []
  const filasFecha: number[] = []
  const filasPrecio: number[] = []

  const agregarSeccion = (
    titulo: string,
    cabeceras: string[],
    eventos: typeof balance.eventosEspeciales,
    filaEvento: (evento: typeof balance.eventosEspeciales[number]) => Array<string | number | Date>,
  ): void => {
    const tituloFila = filas.length + 1
    filas.push([titulo])
    const cabeceraFila = filas.length + 1
    filas.push(cabeceras)
    const inicioFila = filas.length + 1
    for (const evento of eventos) {
      const filaExcel = filas.length + 1
      filas.push(filaEvento(evento))
      filasFecha.push(filaExcel)
      filasPrecio.push(filaExcel)
    }
    if (eventos.length === 0) {
      filas.push(['Sin eventos especiales'])
    }
    secciones.push({ titulo: tituloFila, cabecera: cabeceraFila, inicio: inicioFila, filas: Math.max(1, eventos.length) })
    filas.push([])
  }

  const todosLosCampos = balance.eventosEspeciales.filter((evento) => evento.tipo === 'todos_los_campos')
  agregarSeccion(
    'TODOS LOS CAMPOS DE FÚTBOL',
    ['Fecha', 'Día', 'Campos bloqueados', 'Horario', 'Evento', 'Celular', 'Precio cobrado (S/)'],
    todosLosCampos,
    (evento) => [new Date(`${evento.fecha}T12:00:00`), evento.dia, evento.campo, evento.horario, evento.evento, evento.celular, evento.precio],
  )

  const camposIndividuales = new Map<number, typeof balance.eventosEspeciales>()
  for (const evento of balance.eventosEspeciales.filter((item) => item.tipo === 'individual')) {
    const canchaId = evento.canchaIds[0]
    if (canchaId === undefined) continue
    const grupo = camposIndividuales.get(canchaId) ?? []
    grupo.push(evento)
    camposIndividuales.set(canchaId, grupo)
  }
  for (const [canchaId, eventos] of camposIndividuales) {
    const nombreCampo = eventos[0]?.campo ?? `Campo ${canchaId}`
    agregarSeccion(
      `${nombreCampo.toUpperCase()} — EVENTOS INDIVIDUALES`,
      ['Fecha', 'Día', 'Horario', 'Evento', 'Celular', 'Notas', 'Precio cobrado (S/)'],
      eventos,
      (evento) => [new Date(`${evento.fecha}T12:00:00`), evento.dia, evento.horario, evento.evento, evento.celular, evento.notas, evento.precio],
    )
  }

  const hoja = XLSX.utils.aoa_to_sheet(filas)
  ajustarColumnas(hoja, [14, 14, 28, 22, 28, 16, 20])
  hoja['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, ...secciones.map((seccion) => ({ s: { r: seccion.titulo - 1, c: 0 }, e: { r: seccion.titulo - 1, c: 6 } }))]
  hoja['!freeze'] = { xSplit: 0, ySplit: 4 }
  aplicarFormato(hoja, filasFecha.map((fila) => `A${fila}`), 'dd/mm/yyyy')
  aplicarFormato(hoja, filasPrecio.map((fila) => `G${fila}`), '0.00')
  aplicarFormato(hoja, ['B3'], '0.00')
  aplicarEstilosEventosEspeciales(XLSX, hoja, secciones, filas.length)
  return hoja
}

function crearLibroConModulo(XLSX: ModuloXlsx, balance: BalanceMensual): WorkBook {
  const filaSeccionDia = 14 + balance.porCampo.length
  const seccionesDia: SeccionBalanceDia[] = []
  const filasResultadoDia: Array<Array<string | number | Date>> = [['RESULTADOS POR DÍA']]
  const filasFechaDia: number[] = []
  const filasIngresoDia: number[] = []
  let siguienteFilaDia = filaSeccionDia + 1

  for (const campo of balance.porCampo) {
    const filas = balance.porDia.filter((fila) => fila.campoId === campo.campoId)
    const titulo = siguienteFilaDia
    const cabecera = titulo + 1
    const inicio = cabecera + 1
    seccionesDia.push({ titulo, cabecera, inicio, filas: filas.length })
    filasResultadoDia.push(
      [campo.campo],
      ['Fecha', 'Día', 'Reservas finalizadas', 'Horas alquiladas', 'Ingresos generados (S/)'],
      ...filas.map((fila, indice) => {
        const filaExcel = inicio + indice
        filasFechaDia.push(filaExcel)
        filasIngresoDia.push(filaExcel)
        return [
          new Date(`${fila.fecha}T12:00:00`),
          fila.dia,
          fila.reservas,
          fila.horas,
          fila.ingresos,
        ]
      }),
      [],
      [],
    )
    siguienteFilaDia = inicio + filas.length + 2
  }

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
    ...filasResultadoDia,
  ])
  ajustarColumnas(resumen, [16, 16, 22, 18, 24])
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }]
  seccionesDia.forEach((seccion) => {
    merges.push({ s: { r: seccion.titulo - 1, c: 0 }, e: { r: seccion.titulo - 1, c: 4 } })
  })
  resumen['!merges'] = merges
  resumen['!autofilter'] = { ref: `A12:E${Math.max(12, balance.porCampo.length + 12)}` }
  resumen['!freeze'] = { xSplit: 0, ySplit: 12 }
  aplicarFormato(resumen, ['B9', ...balance.porCampo.map((_fila, indice) => `E${indice + 13}`)], '0.00')
  aplicarFormato(resumen, filasFechaDia.map((fila) => `A${fila}`), 'dd/mm/yyyy')
  aplicarFormato(resumen, filasIngresoDia.map((fila) => `E${fila}`), '0.00')
  aplicarEstilosResumen(XLSX, resumen, balance.porCampo.length, seccionesDia)

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
  XLSX.utils.book_append_sheet(libro, crearHojaEventosEspeciales(XLSX, balance), 'Eventos especiales')
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
