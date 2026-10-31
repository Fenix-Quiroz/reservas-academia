import type { BalanceMensual } from './balanceMensual.js'
import type { Campo } from './types.js'

function periodoVisible(mes: string): string {
  const d = new Date(`${mes}-01T12:00:00`)
  return d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase()
}

function formatearFecha(fecha: string): string {
  const partes = fecha.split('-')
  if (partes.length === 3) {
    const [año, mes, dia] = partes
    return `${dia}/${mes}/${año}`
  }
  return fecha
}

function formatoSoles(monto: number): string {
  return `S/ ${monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function generarTextoBalance(balance: BalanceMensual, canchas: readonly Campo[]): string {
  const lineas: string[] = []

  // Encabezado
  lineas.push('============================================================')
  lineas.push('              POLIDEPORTIVO EL JAGUAR')
  lineas.push('             REPORTE Y BALANCE MENSUAL')
  lineas.push(`             PERIODO: ${periodoVisible(balance.mes)}`)
  lineas.push('============================================================')
  lineas.push('')

  // 1. Resumen Global
  const ingresosEventos = balance.ingresosEventosEspeciales
  const ingresosReservas = Math.round((balance.ingresosTotales - ingresosEventos) * 100) / 100
  const totalGeneral = balance.ingresosTotales

  lineas.push('1. RESUMEN GLOBAL')
  lineas.push('------------------------------------------------------------')
  lineas.push(`• Total de reservas finalizadas:  ${balance.reservasFinalizadas} ${balance.reservasFinalizadas === 1 ? 'turno' : 'turnos'}`)
  lineas.push(`• Total de horas alquiladas:      ${balance.horasAlquiladas.toFixed(1)} horas`)
  lineas.push(`• Ingresos por reservas:          ${formatoSoles(ingresosReservas)}`)
  lineas.push(`• Ingresos eventos especiales:    ${formatoSoles(ingresosEventos)}`)
  lineas.push('------------------------------------------------------------')
  lineas.push(`  TOTAL GENERAL INGRESOS:         ${formatoSoles(totalGeneral)}`)
  lineas.push('')
  lineas.push('')

  // 2. Eventos Especiales / Torneos
  lineas.push('2. EVENTOS ESPECIALES / TORNEOS')
  lineas.push('------------------------------------------------------------')
  if (balance.eventosEspeciales.length === 0) {
    lineas.push('• No hubo eventos especiales registrados en este periodo.')
  } else {
    for (const evento of balance.eventosEspeciales) {
      lineas.push(`• ${formatearFecha(evento.fecha)} | ${evento.evento}`)
      lineas.push(`  - Campos: ${evento.campo}`)
      lineas.push(`  - Horario: ${evento.horario}`)
      lineas.push(`  - Monto cobrado: ${formatoSoles(evento.precio)}`)
      if (evento.celular) {
        lineas.push(`  - Contacto: ${evento.celular}`)
      }
      if (evento.notas) {
        lineas.push(`  - Notas: ${evento.notas}`)
      }
      lineas.push('')
    }
  }
  lineas.push('')

  // 3. Actividad Diaria Individual por Campo
  lineas.push('3. ACTIVIDAD DIARIA INDIVIDUAL POR CAMPO')
  lineas.push('============================================================')
  lineas.push('')

  for (const cancha of canchas) {
    const reservasCancha = balance.detalle.filter((d) => d.campoId === cancha.id)

    // Agrupar por fecha para este campo
    const mapaDias = new Map<string, { fecha: string; reservas: number; horas: number; total: number }>()
    for (const r of reservasCancha) {
      const actual = mapaDias.get(r.fecha)
      if (actual) {
        actual.reservas += 1
        actual.horas += r.horas
        actual.total += r.monto
      } else {
        mapaDias.set(r.fecha, {
          fecha: r.fecha,
          reservas: 1,
          horas: r.horas,
          total: r.monto,
        })
      }
    }

    const diasOrdenados = [...mapaDias.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
    const totalReservasCancha = diasOrdenados.reduce((acc, d) => acc + d.reservas, 0)
    const totalHorasCancha = diasOrdenados.reduce((acc, d) => acc + d.horas, 0)
    const totalMontoCancha = diasOrdenados.reduce((acc, d) => acc + d.total, 0)

    lineas.push(`[ ${cancha.nombre.toUpperCase()} - ${cancha.deporte} ]`)
    lineas.push('FECHA        | RESERVAS   | HORAS    | TOTAL GENERADO')
    lineas.push('------------------------------------------------------------')

    if (diasOrdenados.length === 0) {
      lineas.push('  (Sin reservas registradas en este mes)')
    } else {
      for (const dia of diasOrdenados) {
        const fechaTxt = formatearFecha(dia.fecha).padEnd(12)
        const turnosTxt = `${dia.reservas} ${dia.reservas === 1 ? 'turno' : 'turnos'}`.padEnd(10)
        const horasTxt = `${dia.horas.toFixed(1)} h`.padEnd(8)
        const totalTxt = formatoSoles(dia.total)
        lineas.push(`${fechaTxt} | ${turnosTxt} | ${horasTxt} | ${totalTxt}`)
      }
    }

    lineas.push('------------------------------------------------------------')
    const subtotalTurnosTxt = `${totalReservasCancha} ${totalReservasCancha === 1 ? 'turno' : 'turnos'}`.padEnd(10)
    const subtotalHorasTxt = `${totalHorasCancha.toFixed(1)} h`.padEnd(8)
    const subtotalTotalTxt = formatoSoles(totalMontoCancha)
    lineas.push(`SUBTOTAL     : ${subtotalTurnosTxt} | ${subtotalHorasTxt} | ${subtotalTotalTxt}`)
    lineas.push('')
    lineas.push('------------------------------------------------------------')
  }

  // Pie de página
  const ahora = new Date()
  const fechaGeneracion = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaGeneracion = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
  lineas.push('============================================================')
  lineas.push(`Reporte generado el: ${fechaGeneracion} a las ${horaGeneracion}`)
  lineas.push('============================================================')

  return lineas.join('\r\n')
}

export function descargarBalanceTexto(balance: BalanceMensual, canchas: readonly Campo[]): void {
  const contenido = generarTextoBalance(balance, canchas)
  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `balance-reservas-${balance.mes}.txt`
  enlace.rel = 'noreferrer'
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
