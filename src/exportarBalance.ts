import type { CellStyle, WorkBook, WorkSheet } from 'xlsx-js-style'
import type { BalanceMensual } from './balanceMensual.js'
import type { Campo } from './types.js'

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

interface InfoSeccionCancha {
  banner: number
  cabecera: number
  inicio: number
  fin: number
  subtotal: number
  vacia: boolean
}

function crearHojaResumen(
  XLSX: ModuloXlsx,
  balance: BalanceMensual,
  canchas: readonly Campo[],
): WorkSheet {
  const filas: Array<Array<string | number | Date>> = []
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = []
  const filasFecha: number[] = []
  const filasMoneda: Array<{ col: string; fila: number }> = []

  // Encabezado principal (3 filas)
  filas.push(['POLIDEPORTIVO EL JAGUAR', '', '', '', '', '', '', '', ''])
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } })

  filas.push(['REPORTE Y BALANCE MENSUAL', '', '', '', '', '', '', '', ''])
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } })

  filas.push([`PERIODO: ${periodoVisible(balance.mes).toUpperCase()}`, '', '', '', '', '', '', '', ''])
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 8 } })

  // Separador
  filas.push([])

  // 1. RESUMEN GLOBAL
  const filaTituloResumen = filas.length + 1
  filas.push(['1. RESUMEN GLOBAL', '', '', '', '', '', '', '', ''])
  merges.push({ s: { r: filaTituloResumen - 1, c: 0 }, e: { r: filaTituloResumen - 1, c: 8 } })

  const filaCabeceraResumen = filas.length + 1
  filas.push(['Indicador', '', 'Valor'])
  merges.push({ s: { r: filaCabeceraResumen - 1, c: 0 }, e: { r: filaCabeceraResumen - 1, c: 1 } })

  const ingresosEventos = balance.ingresosEventosEspeciales
  const ingresosReservas = Math.round((balance.ingresosTotales - ingresosEventos) * 100) / 100

  const filaRes1 = filas.length + 1
  filas.push(['Total de reservas finalizadas', '', `${balance.reservasFinalizadas} ${balance.reservasFinalizadas === 1 ? 'turno' : 'turnos'}`])
  merges.push({ s: { r: filaRes1 - 1, c: 0 }, e: { r: filaRes1 - 1, c: 1 } })

  const filaRes2 = filas.length + 1
  filas.push(['Total de horas alquiladas', '', `${balance.horasAlquiladas.toFixed(1)} horas`])
  merges.push({ s: { r: filaRes2 - 1, c: 0 }, e: { r: filaRes2 - 1, c: 1 } })

  const filaRes3 = filas.length + 1
  filas.push(['Ingresos por reservas (S/)', '', ingresosReservas])
  merges.push({ s: { r: filaRes3 - 1, c: 0 }, e: { r: filaRes3 - 1, c: 1 } })
  filasMoneda.push({ col: 'C', fila: filaRes3 })

  const filaRes4 = filas.length + 1
  filas.push(['Ingresos eventos especiales (S/)', '', ingresosEventos])
  merges.push({ s: { r: filaRes4 - 1, c: 0 }, e: { r: filaRes4 - 1, c: 1 } })
  filasMoneda.push({ col: 'C', fila: filaRes4 })

  const filaResTotal = filas.length + 1
  filas.push(['TOTAL GENERAL INGRESOS (S/)', '', balance.ingresosTotales])
  merges.push({ s: { r: filaResTotal - 1, c: 0 }, e: { r: filaResTotal - 1, c: 1 } })
  filasMoneda.push({ col: 'C', fila: filaResTotal })

  // Separador
  filas.push([])

  // 2. EVENTOS ESPECIALES / TORNEOS
  const filaTituloEventos = filas.length + 1
  filas.push(['2. EVENTOS ESPECIALES / TORNEOS', '', '', '', '', '', '', '', ''])
  merges.push({ s: { r: filaTituloEventos - 1, c: 0 }, e: { r: filaTituloEventos - 1, c: 8 } })

  let filaCabeceraEventos = 0
  let filaInicioEventos = 0
  let filaFinEventos = 0
  let filaTotalEventos = 0
  const hayEventos = balance.eventosEspeciales.length > 0

  if (!hayEventos) {
    const filaVacia = filas.length + 1
    filas.push(['• No hubo eventos especiales registrados en este periodo.', '', '', '', '', '', '', '', ''])
    merges.push({ s: { r: filaVacia - 1, c: 0 }, e: { r: filaVacia - 1, c: 8 } })
    filaInicioEventos = filaVacia
    filaFinEventos = filaVacia
  } else {
    filaCabeceraEventos = filas.length + 1
    filas.push(['Fecha', 'Día', 'Evento / Torneo', 'Campos bloqueados', 'Horario', 'Horas', 'Contacto', 'Notas', 'Monto cobrado (S/)'])
    filaInicioEventos = filas.length + 1
    for (const evento of balance.eventosEspeciales) {
      const filaIdx = filas.length + 1
      filas.push([
        new Date(`${evento.fecha}T12:00:00`),
        evento.dia,
        evento.evento,
        evento.campo,
        evento.horario,
        evento.horas,
        evento.celular || '—',
        evento.notas || '—',
        evento.precio,
      ])
      filasFecha.push(filaIdx)
      filasMoneda.push({ col: 'I', fila: filaIdx })
    }
    filaFinEventos = filas.length
    filaTotalEventos = filas.length + 1
    filas.push(['TOTAL EVENTOS ESPECIALES (S/)', '', '', '', '', '', '', '', balance.ingresosEventosEspeciales])
    merges.push({ s: { r: filaTotalEventos - 1, c: 0 }, e: { r: filaTotalEventos - 1, c: 7 } })
    filasMoneda.push({ col: 'I', fila: filaTotalEventos })
  }

  // Separador
  filas.push([])

  // 3. ACTIVIDAD DIARIA INDIVIDUAL POR CAMPO
  const filaTituloActividad = filas.length + 1
  filas.push(['3. ACTIVIDAD DIARIA INDIVIDUAL POR CAMPO', '', '', '', '', '', '', '', ''])
  merges.push({ s: { r: filaTituloActividad - 1, c: 0 }, e: { r: filaTituloActividad - 1, c: 8 } })

  const seccionesCancha: InfoSeccionCancha[] = []

  for (const cancha of canchas) {
    filas.push([]) // Separador antes de la cancha
    const bannerFila = filas.length + 1
    filas.push([`[ ${cancha.nombre.toUpperCase()} - ${cancha.deporte} ]`, '', '', '', ''])
    merges.push({ s: { r: bannerFila - 1, c: 0 }, e: { r: bannerFila - 1, c: 4 } })

    const cabeceraFila = filas.length + 1
    filas.push(['Fecha', 'Día', 'Reservas finalizadas', 'Horas alquiladas', 'Total generado (S/)'])

    const reservasCancha = balance.detalle.filter((d) => d.campoId === cancha.id)
    const mapaDias = new Map<string, { fecha: string; dia: string; reservas: number; horas: number; total: number }>()
    for (const r of reservasCancha) {
      const actual = mapaDias.get(r.fecha)
      if (actual) {
        actual.reservas += 1
        actual.horas = Math.round((actual.horas + r.horas) * 10) / 10
        actual.total = Math.round((actual.total + r.monto) * 100) / 100
      } else {
        mapaDias.set(r.fecha, {
          fecha: r.fecha,
          dia: r.dia,
          reservas: 1,
          horas: r.horas,
          total: r.monto,
        })
      }
    }
    const diasOrdenados = [...mapaDias.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
    const totalReservasCancha = diasOrdenados.reduce((acc, d) => acc + d.reservas, 0)
    const totalHorasCancha = Math.round(diasOrdenados.reduce((acc, d) => acc + d.horas, 0) * 10) / 10
    const totalMontoCancha = Math.round(diasOrdenados.reduce((acc, d) => acc + d.total, 0) * 100) / 100

    if (diasOrdenados.length === 0) {
      const filaVaciaCancha = filas.length + 1
      filas.push(['(Sin reservas registradas en este mes)', '', '', '', ''])
      merges.push({ s: { r: filaVaciaCancha - 1, c: 0 }, e: { r: filaVaciaCancha - 1, c: 4 } })

      const subtotalFila = filas.length + 1
      filas.push(['SUBTOTAL', '', '0 turnos', '0.0 h', 0])
      merges.push({ s: { r: subtotalFila - 1, c: 0 }, e: { r: subtotalFila - 1, c: 1 } })
      filasMoneda.push({ col: 'E', fila: subtotalFila })

      seccionesCancha.push({
        banner: bannerFila,
        cabecera: cabeceraFila,
        inicio: filaVaciaCancha,
        fin: filaVaciaCancha,
        subtotal: subtotalFila,
        vacia: true,
      })
    } else {
      const inicioFila = filas.length + 1
      for (const dia of diasOrdenados) {
        const filaIdx = filas.length + 1
        filas.push([
          new Date(`${dia.fecha}T12:00:00`),
          dia.dia,
          `${dia.reservas} ${dia.reservas === 1 ? 'turno' : 'turnos'}`,
          `${dia.horas.toFixed(1)} h`,
          dia.total,
        ])
        filasFecha.push(filaIdx)
        filasMoneda.push({ col: 'E', fila: filaIdx })
      }
      const finFila = filas.length
      const subtotalFila = filas.length + 1
      filas.push([
        'SUBTOTAL',
        '',
        `${totalReservasCancha} ${totalReservasCancha === 1 ? 'turno' : 'turnos'}`,
        `${totalHorasCancha.toFixed(1)} h`,
        totalMontoCancha,
      ])
      merges.push({ s: { r: subtotalFila - 1, c: 0 }, e: { r: subtotalFila - 1, c: 1 } })
      filasMoneda.push({ col: 'E', fila: subtotalFila })

      seccionesCancha.push({
        banner: bannerFila,
        cabecera: cabeceraFila,
        inicio: inicioFila,
        fin: finFila,
        subtotal: subtotalFila,
        vacia: false,
      })
    }
  }

  // Separador y pie de página
  filas.push([])
  const ahora = new Date()
  const fechaGeneracion = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaGeneracion = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
  const filaPie = filas.length + 1
  filas.push([`Reporte generado el: ${fechaGeneracion} a las ${horaGeneracion}`, '', '', '', '', '', '', '', ''])
  merges.push({ s: { r: filaPie - 1, c: 0 }, e: { r: filaPie - 1, c: 8 } })

  const hoja = XLSX.utils.aoa_to_sheet(filas)
  ajustarColumnas(hoja, [14, 14, 24, 26, 22, 10, 16, 30, 20])
  hoja['!merges'] = merges

  aplicarFormato(hoja, filasFecha.map((fila) => `A${fila}`), 'dd/mm/yyyy')
  aplicarFormato(hoja, filasMoneda.map(({ col, fila }) => `${col}${fila}`), '0.00')

  // 1. Estilo general base para todo el rango activo
  aplicarEstiloRango(XLSX, hoja, `A1:I${filas.length}`, {
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
  })

  // 2. Encabezado principal
  aplicarEstiloRango(XLSX, hoja, 'A1:I1', {
    fill: { patternType: 'solid', fgColor: rgb(colores.negro) },
    font: { name: 'Arial', sz: 16, bold: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'center', vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A2:I2', {
    fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
    font: { name: 'Arial', sz: 12, bold: true, color: rgb(colores.negro) },
    alignment: { horizontal: 'center', vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A3:I3', {
    fill: { patternType: 'solid', fgColor: rgb(colores.crema) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
  })

  // 3. Sección 1: Resumen Global
  aplicarEstiloRango(XLSX, hoja, `A${filaTituloResumen}:I${filaTituloResumen}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
    alignment: { horizontal: 'left', vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, `A${filaCabeceraResumen}:C${filaCabeceraResumen}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
    font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'center', vertical: 'center' },
  })
  for (let f = filaRes1; f <= filaRes4; f += 1) {
    const bg = f % 2 === 1 ? 'FFFFFF' : colores.filaAlterna
    aplicarEstiloRango(XLSX, hoja, `A${f}:B${f}`, {
      fill: { patternType: 'solid', fgColor: rgb(bg) },
      font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
    })
    aplicarEstiloRango(XLSX, hoja, `C${f}:C${f}`, {
      fill: { patternType: 'solid', fgColor: rgb(bg) },
      font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
    })
  }
  aplicarEstiloRango(XLSX, hoja, `A${filaResTotal}:B${filaResTotal}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.doradoClaro) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: rgb(colores.dorado) },
      bottom: { style: 'medium', color: rgb(colores.dorado) },
    },
  })
  aplicarEstiloRango(XLSX, hoja, `C${filaResTotal}:C${filaResTotal}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.doradoClaro) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb('5A4300') },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: rgb(colores.dorado) },
      bottom: { style: 'medium', color: rgb(colores.dorado) },
    },
  })

  // 4. Sección 2: Eventos Especiales / Torneos
  aplicarEstiloRango(XLSX, hoja, `A${filaTituloEventos}:I${filaTituloEventos}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
    alignment: { horizontal: 'left', vertical: 'center' },
  })
  if (!hayEventos) {
    aplicarEstiloRango(XLSX, hoja, `A${filaInicioEventos}:I${filaInicioEventos}`, {
      fill: { patternType: 'solid', fgColor: rgb('FFFFFF') },
      font: { name: 'Arial', sz: 10, italic: true, color: rgb(colores.gris) },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
    })
  } else {
    aplicarEstiloRango(XLSX, hoja, `A${filaCabeceraEventos}:I${filaCabeceraEventos}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.crema) },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    })
    for (let f = filaInicioEventos; f <= filaFinEventos; f += 1) {
      const bg = f % 2 === 1 ? 'FFFFFF' : colores.filaAlterna
      aplicarEstiloRango(XLSX, hoja, `A${f}:I${f}`, {
        fill: { patternType: 'solid', fgColor: rgb(bg) },
        font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
        border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
      })
      aplicarEstiloRango(XLSX, hoja, `A${f}:B${f}`, { alignment: { horizontal: 'center', vertical: 'center' } })
      aplicarEstiloRango(XLSX, hoja, `C${f}:E${f}`, { alignment: { horizontal: 'left', vertical: 'center' } })
      aplicarEstiloRango(XLSX, hoja, `F${f}:G${f}`, { alignment: { horizontal: 'center', vertical: 'center' } })
      aplicarEstiloRango(XLSX, hoja, `H${f}:H${f}`, { alignment: { horizontal: 'left', vertical: 'center', wrapText: true } })
      aplicarEstiloRango(XLSX, hoja, `I${f}:I${f}`, {
        font: { name: 'Arial', sz: 10, bold: true, color: rgb('5A4300') },
        alignment: { horizontal: 'right', vertical: 'center' },
      })
    }
    aplicarEstiloRango(XLSX, hoja, `A${filaTotalEventos}:H${filaTotalEventos}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.doradoClaro) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.negro) },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin', color: rgb(colores.dorado) },
        bottom: { style: 'medium', color: rgb(colores.dorado) },
      },
    })
    aplicarEstiloRango(XLSX, hoja, `I${filaTotalEventos}:I${filaTotalEventos}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.doradoClaro) },
      font: { name: 'Arial', sz: 11, bold: true, color: rgb('5A4300') },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin', color: rgb(colores.dorado) },
        bottom: { style: 'medium', color: rgb(colores.dorado) },
      },
    })
  }

  // 5. Sección 3: Actividad Diaria Individual por Campo
  aplicarEstiloRango(XLSX, hoja, `A${filaTituloActividad}:I${filaTituloActividad}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
    font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
    alignment: { horizontal: 'left', vertical: 'center' },
  })

  for (const seccion of seccionesCancha) {
    aplicarEstiloRango(XLSX, hoja, `A${seccion.banner}:E${seccion.banner}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.crema) },
      alignment: { horizontal: 'left', vertical: 'center' },
    })
    aplicarEstiloRango(XLSX, hoja, `A${seccion.cabecera}:E${seccion.cabecera}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.doradoClaro) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.negro) },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { bottom: { style: 'medium', color: rgb(colores.negroSuave) } },
    })

    if (seccion.vacia) {
      aplicarEstiloRango(XLSX, hoja, `A${seccion.inicio}:E${seccion.inicio}`, {
        fill: { patternType: 'solid', fgColor: rgb('FFFFFF') },
        font: { name: 'Arial', sz: 10, italic: true, color: rgb(colores.gris) },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
      })
    } else {
      for (let f = seccion.inicio; f <= seccion.fin; f += 1) {
        const bg = f % 2 === 1 ? 'FFFFFF' : colores.filaAlterna
        aplicarEstiloRango(XLSX, hoja, `A${f}:E${f}`, {
          fill: { patternType: 'solid', fgColor: rgb(bg) },
          font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
          border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
        })
        aplicarEstiloRango(XLSX, hoja, `A${f}:B${f}`, { alignment: { horizontal: 'center', vertical: 'center' } })
        aplicarEstiloRango(XLSX, hoja, `C${f}:D${f}`, { alignment: { horizontal: 'center', vertical: 'center' } })
        aplicarEstiloRango(XLSX, hoja, `E${f}:E${f}`, { alignment: { horizontal: 'right', vertical: 'center' } })
      }
    }

    aplicarEstiloRango(XLSX, hoja, `A${seccion.subtotal}:B${seccion.subtotal}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.crema) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.negro) },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: rgb(colores.grisClaro) },
        bottom: { style: 'medium', color: rgb(colores.negroSuave) },
      },
    })
    aplicarEstiloRango(XLSX, hoja, `C${seccion.subtotal}:D${seccion.subtotal}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.crema) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.negro) },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: rgb(colores.grisClaro) },
        bottom: { style: 'medium', color: rgb(colores.negroSuave) },
      },
    })
    aplicarEstiloRango(XLSX, hoja, `E${seccion.subtotal}:E${seccion.subtotal}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.crema) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb('5A4300') },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin', color: rgb(colores.grisClaro) },
        bottom: { style: 'medium', color: rgb(colores.negroSuave) },
      },
    })
  }

  // 6. Pie de página
  aplicarEstiloRango(XLSX, hoja, `A${filaPie}:I${filaPie}`, {
    fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
    font: { name: 'Arial', sz: 9, italic: true, color: rgb(colores.crema) },
    alignment: { horizontal: 'center', vertical: 'center' },
  })

  return hoja
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
  aplicarEstiloRango(XLSX, hoja, `A1:I${Math.max(1, ultimaFila)}`, {
    font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
    alignment: { vertical: 'center' },
  })
  aplicarEstiloRango(XLSX, hoja, 'A1:I1', {
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
    aplicarEstiloRango(XLSX, hoja, `A${seccion.titulo}:I${seccion.titulo}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.dorado) },
      font: { name: 'Arial', sz: 11, bold: true, color: rgb(colores.negro) },
    })
    aplicarEstiloRango(XLSX, hoja, `A${seccion.cabecera}:I${seccion.cabecera}`, {
      fill: { patternType: 'solid', fgColor: rgb(colores.negroSuave) },
      font: { name: 'Arial', sz: 10, bold: true, color: rgb(colores.crema) },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    })
    const ultimaFilaSeccion = seccion.inicio + Math.max(1, seccion.filas) - 1
    aplicarEstiloRango(XLSX, hoja, `A${seccion.inicio}:I${ultimaFilaSeccion}`, {
      fill: { patternType: 'solid', fgColor: rgb('FFFFFF') },
      font: { name: 'Arial', sz: 10, color: rgb(colores.negro) },
      border: { bottom: { style: 'thin', color: rgb(colores.grisClaro) } },
    })
    for (let fila = seccion.inicio; fila <= ultimaFilaSeccion; fila += 1) {
      if (fila % 2 === 1) aplicarEstiloFilaAlterna(XLSX, hoja, fila, 'I')
    }
    aplicarEstiloRango(XLSX, hoja, `E${seccion.inicio}:E${ultimaFilaSeccion}`, {
      alignment: { horizontal: 'center', vertical: 'center' },
    })
    aplicarEstiloRango(XLSX, hoja, `I${seccion.inicio}:I${ultimaFilaSeccion}`, {
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
      filas.push(['Sin eventos especiales registrados'])
    }
    secciones.push({ titulo: tituloFila, cabecera: cabeceraFila, inicio: inicioFila, filas: Math.max(1, eventos.length) })
    filas.push([])
  }

  const cabecerasDetalle = ['Fecha', 'Día', 'Campos bloqueados', 'Horario', 'Horas', 'Evento', 'Celular', 'Notas', 'Precio cobrado (S/)']

  const todosLosCampos = balance.eventosEspeciales.filter((evento) => evento.tipo === 'todos_los_campos')
  agregarSeccion(
    'TODOS LOS CAMPOS DE FÚTBOL (CAMPOS 1, 2 Y 3)',
    cabecerasDetalle,
    todosLosCampos,
    (evento) => [
      new Date(`${evento.fecha}T12:00:00`),
      evento.dia,
      evento.campo,
      evento.horario,
      evento.horas,
      evento.evento,
      evento.celular,
      evento.notas,
      evento.precio,
    ],
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
      ['Fecha', 'Día', 'Campo', 'Horario', 'Horas', 'Evento', 'Celular', 'Notas', 'Precio cobrado (S/)'],
      eventos,
      (evento) => [
        new Date(`${evento.fecha}T12:00:00`),
        evento.dia,
        evento.campo,
        evento.horario,
        evento.horas,
        evento.evento,
        evento.celular,
        evento.notas,
        evento.precio,
      ],
    )
  }

  const hoja = XLSX.utils.aoa_to_sheet(filas)
  ajustarColumnas(hoja, [14, 14, 34, 22, 10, 30, 16, 28, 20])
  hoja['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    ...secciones.map((seccion) => ({ s: { r: seccion.titulo - 1, c: 0 }, e: { r: seccion.titulo - 1, c: 8 } })),
  ]
  hoja['!freeze'] = { xSplit: 0, ySplit: 4 }
  aplicarFormato(hoja, filasFecha.map((fila) => `A${fila}`), 'dd/mm/yyyy')
  aplicarFormato(hoja, filasPrecio.map((fila) => `I${fila}`), '0.00')
  aplicarFormato(hoja, ['B3'], '0.00')
  aplicarEstilosEventosEspeciales(XLSX, hoja, secciones, filas.length)
  return hoja
}

export function obtenerCanchas(balance: BalanceMensual, canchas?: readonly Campo[]): readonly Campo[] {
  if (canchas && canchas.length > 0) return canchas

  const mapa = new Map<number, Campo>()
  for (const pc of balance.porCampo) {
    mapa.set(pc.campoId, {
      id: pc.campoId,
      nombre: pc.campo,
      deporte: pc.deporte,
      jugadores: 0,
      precioHora: 0,
      color: '',
      imagen: '',
      oferta: '',
    })
  }
  for (const d of balance.detalle) {
    if (!mapa.has(d.campoId)) {
      mapa.set(d.campoId, {
        id: d.campoId,
        nombre: d.campo,
        deporte: d.deporte,
        jugadores: 0,
        precioHora: 0,
        color: '',
        imagen: '',
        oferta: '',
      })
    }
  }
  return [...mapa.values()].sort((a, b) => a.id - b.id)
}

export function crearLibroConModulo(
  XLSX: ModuloXlsx,
  balance: BalanceMensual,
  canchas?: readonly Campo[],
): WorkBook {
  const canchasCompletas = obtenerCanchas(balance, canchas)
  const resumen = crearHojaResumen(XLSX, balance, canchasCompletas)

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

export async function crearLibroBalance(
  balance: BalanceMensual,
  canchas?: readonly Campo[],
): Promise<WorkBook> {
  const XLSX = await cargarModuloXlsx()
  return crearLibroConModulo(XLSX, balance, canchas)
}

export async function descargarBalanceMensual(
  balance: BalanceMensual,
  canchas?: readonly Campo[],
): Promise<void> {
  const XLSX = await cargarModuloXlsx()
  XLSX.writeFile(crearLibroConModulo(XLSX, balance, canchas), `balance-reservas-${balance.mes}.xlsx`, {
    cellDates: true,
    cellStyles: true,
    compression: true,
  })
}
