import assert from 'node:assert/strict'
import type { Campo, Reserva } from './types.js'
import { construirBalanceMensual } from './balanceMensual.js'
import { crearLibroBalance, normalizarModuloXlsx } from './exportarBalance.js'

const canchas: Campo[] = [
  {
    id: 1,
    nombre: 'Campo 1',
    deporte: 'Fútbol 5',
    jugadores: 5,
    precioHora: 60,
    color: '#a97818',
    imagen: '/campos/campo-1-futbol-5.webp',
    oferta: 'Agua incluida',
  },
  {
    id: 2,
    nombre: 'Campo 2',
    deporte: 'Fútbol 5',
    jugadores: 5,
    precioHora: 60,
    color: '#c58b1d',
    imagen: '/campos/campo-2-futbol-5.webp',
    oferta: 'Agua incluida',
  },
]

const reservas: Reserva[] = [
  {
    id: 'finalizada-1',
    canchaId: 1,
    fecha: '2026-10-05',
    inicio: 18,
    horas: 2,
    alias: 'Los Jaguares',
    celular: '987654321',
    estado: 'finalizado',
    montoTotal: 120,
  },
  {
    id: 'finalizada-2',
    canchaId: 2,
    fecha: '2026-10-06',
    inicio: 19,
    horas: 1,
    alias: 'Equipo Luna',
    celular: '988888888',
    estado: 'finalizado',
  },
  {
    id: 'iniciada',
    canchaId: 1,
    fecha: '2026-10-07',
    inicio: 20,
    horas: 1,
    alias: 'Pendientes',
    celular: '999999999',
    estado: 'iniciado',
    montoTotal: 60,
  },
  {
    id: 'otro-mes',
    canchaId: 1,
    fecha: '2026-09-30',
    inicio: 20,
    horas: 1,
    alias: 'Septiembre',
    celular: '966666666',
    estado: 'finalizado',
    montoTotal: 60,
  },
]

const balance = construirBalanceMensual('2026-10', reservas, canchas)

assert.equal(balance.mes, '2026-10')
assert.equal(balance.reservasFinalizadas, 2)
assert.equal(balance.horasAlquiladas, 3)
assert.equal(balance.ingresosTotales, 180)
assert.deepEqual(balance.porCampo, [
  { campoId: 1, campo: 'Campo 1', deporte: 'Fútbol 5', reservas: 1, horas: 2, ingresos: 120 },
  { campoId: 2, campo: 'Campo 2', deporte: 'Fútbol 5', reservas: 1, horas: 1, ingresos: 60 },
])
assert.deepEqual(balance.detalle.map(({ id, campo, horas, monto }) => ({ id, campo, horas, monto })), [
  { id: 'finalizada-1', campo: 'Campo 1', horas: 2, monto: 120 },
  { id: 'finalizada-2', campo: 'Campo 2', horas: 1, monto: 60 },
])

const libro = await crearLibroBalance(balance)
assert.deepEqual(libro.SheetNames, ['Resumen mensual', 'Detalle diario'])
assert.equal(libro.Sheets['Resumen mensual']['A1'].v, 'BALANCE MENSUAL DE RESERVAS')
assert.equal(libro.Sheets['Resumen mensual']['A7'].v, 'Reservas finalizadas')
assert.equal(libro.Sheets['Resumen mensual']['B7'].v, 2)
assert.equal(libro.Sheets['Resumen mensual']['C12'].v, 'Reservas realizadas')
assert.equal(libro.Sheets['Resumen mensual']['C13'].v, 1)
assert.equal(libro.Sheets['Detalle diario']['A4'].v, 'Fecha')
assert.equal(libro.Sheets['Detalle diario']['J6'].v, 60)
assert.equal(libro.Sheets['Detalle diario']['!autofilter']?.ref, 'A4:J6')
assert.equal(libro.Sheets['Resumen mensual']['A1'].s?.fill?.fgColor?.rgb, '0B0B0A')
assert.equal(libro.Sheets['Resumen mensual']['A11'].s?.fill?.fgColor?.rgb, 'D99A0B')
assert.equal(libro.Sheets['Detalle diario']['A4'].s?.fill?.fgColor?.rgb, 'D99A0B')
assert.equal(libro.Sheets['Resumen mensual']['A2'].s?.fill?.fgColor?.rgb, 'FFF8E7')
assert.equal(libro.Sheets['Resumen mensual']['B2'].s?.font?.color?.rgb, '0B0B0A')
assert.equal(libro.Sheets['Resumen mensual']['A7'].s?.fill?.fgColor?.rgb, 'FFFFFF')
assert.equal(libro.Sheets['Resumen mensual']['A7'].s?.font?.color?.rgb, '0B0B0A')
assert.equal(libro.Sheets['Resumen mensual']['A13'].s?.fill?.fgColor?.rgb, 'FFFFFF')
assert.equal(libro.Sheets['Resumen mensual']['A13'].s?.font?.color?.rgb, '0B0B0A')
assert.equal(libro.Sheets['Detalle diario']['A2'].s?.fill?.fgColor?.rgb, 'FFF8E7')
assert.equal(libro.Sheets['Detalle diario']['B2'].s?.font?.color?.rgb, '0B0B0A')
assert.notEqual(libro.Sheets['Detalle diario']['A5'].s?.fill?.fgColor?.rgb, '0B0B0A')
assert.equal(libro.Sheets['Detalle diario']['A5'].s?.font?.color?.rgb, '0B0B0A')
const XLSX = (await import('xlsx-js-style') as unknown as { default: typeof import('xlsx-js-style') }).default
const archivoEnMemoria = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
const libroReabierto = XLSX.read(archivoEnMemoria, { type: 'buffer', cellStyles: true })
assert.ok(archivoEnMemoria.length > 1000)
assert.deepEqual(libroReabierto.SheetNames, ['Resumen mensual', 'Detalle diario'])

const moduloXlsx = { utils: {} } as unknown as typeof import('xlsx-js-style')
assert.equal(normalizarModuloXlsx(moduloXlsx), moduloXlsx)
assert.equal(normalizarModuloXlsx({ default: moduloXlsx }), moduloXlsx)

console.log('✔ balanceMensual.check.ts OK')
