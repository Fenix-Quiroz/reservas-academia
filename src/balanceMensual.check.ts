import assert from 'node:assert/strict'
import type { BloqueoEvento, Campo, Reserva } from './types.js'
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
    id: 'finalizada-2b',
    canchaId: 2,
    fecha: '2026-10-05',
    inicio: 20,
    horas: 1,
    alias: 'Equipo Sol',
    celular: '988888889',
    estado: 'finalizado',
    montoTotal: 60,
  },
  {
    id: 'finalizada-3',
    canchaId: 2,
    fecha: '2026-10-07',
    inicio: 10,
    horas: 1.5,
    alias: 'Equipo Media Hora',
    celular: '988888887',
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
assert.equal(balance.reservasFinalizadas, 4)
assert.equal(balance.horasAlquiladas, 5.5)
assert.equal(balance.ingresosTotales, 330)
assert.deepEqual(balance.porCampo, [
  { campoId: 1, campo: 'Campo 1', deporte: 'Fútbol 5', reservas: 1, horas: 2, ingresos: 120 },
  { campoId: 2, campo: 'Campo 2', deporte: 'Fútbol 5', reservas: 3, horas: 3.5, ingresos: 210 },
])
assert.deepEqual(balance.porDia, [
  { fecha: '2026-10-05', dia: 'lunes', campoId: 1, campo: 'Campo 1', reservas: 1, horas: 2, ingresos: 120 },
  { fecha: '2026-10-05', dia: 'lunes', campoId: 2, campo: 'Campo 2', reservas: 1, horas: 1, ingresos: 60 },
  { fecha: '2026-10-06', dia: 'martes', campoId: 2, campo: 'Campo 2', reservas: 1, horas: 1, ingresos: 60 },
  { fecha: '2026-10-07', dia: 'miércoles', campoId: 2, campo: 'Campo 2', reservas: 1, horas: 1.5, ingresos: 90 },
])
assert.deepEqual(balance.detalle.map(({ id, campo, horas, monto }) => ({ id, campo, horas, monto })), [
  { id: 'finalizada-1', campo: 'Campo 1', horas: 2, monto: 120 },
  { id: 'finalizada-2b', campo: 'Campo 2', horas: 1, monto: 60 },
  { id: 'finalizada-2', campo: 'Campo 2', horas: 1, monto: 60 },
  { id: 'finalizada-3', campo: 'Campo 2', horas: 1.5, monto: 90 },
])

const libro = await crearLibroBalance(balance)
assert.deepEqual(libro.SheetNames, ['Resumen mensual', 'Detalle diario', 'Eventos especiales'])
assert.equal(libro.Sheets['Resumen mensual']['A1'].v, 'BALANCE MENSUAL DE RESERVAS')
assert.equal(libro.Sheets['Resumen mensual']['A7'].v, 'Reservas finalizadas')
assert.equal(libro.Sheets['Resumen mensual']['B7'].v, 4)
assert.equal(libro.Sheets['Resumen mensual']['C12'].v, 'Reservas realizadas')
assert.equal(libro.Sheets['Resumen mensual']['C13'].v, 1)
assert.equal(libro.Sheets['Resumen mensual']['A16'].v, 'RESULTADOS POR DÍA')
assert.equal(libro.Sheets['Resumen mensual']['A17'].v, 'Campo 1')
assert.equal(libro.Sheets['Resumen mensual']['A18'].v, 'Fecha')
assert.equal(libro.Sheets['Resumen mensual']['B18'].v, 'Día')
assert.equal(libro.Sheets['Resumen mensual']['C18'].v, 'Reservas finalizadas')
assert.equal(libro.Sheets['Resumen mensual']['D18'].v, 'Horas alquiladas')
assert.equal(libro.Sheets['Resumen mensual']['E18'].v, 'Ingresos generados (S/)')
assert.equal(libro.Sheets['Resumen mensual']['A19'].t, 'n')
assert.equal(libro.Sheets['Resumen mensual']['A19'].z, 'dd/mm/yyyy')
assert.equal(libro.Sheets['Resumen mensual']['B19'].v, 'lunes')
assert.equal(libro.Sheets['Resumen mensual']['C19'].v, 1)
assert.equal(libro.Sheets['Resumen mensual']['D19'].v, 2)
assert.equal(libro.Sheets['Resumen mensual']['E19'].v, 120)
assert.equal(libro.Sheets['Resumen mensual']['A22'].v, 'Campo 2')
assert.equal(libro.Sheets['Resumen mensual']['A23'].v, 'Fecha')
assert.equal(libro.Sheets['Resumen mensual']['A24'].t, 'n')
assert.equal(libro.Sheets['Resumen mensual']['C24'].v, 1)
assert.equal(libro.Sheets['Resumen mensual']['D24'].v, 1)
assert.equal(libro.Sheets['Resumen mensual']['E24'].v, 60)
assert.equal(libro.Sheets['Resumen mensual']['A25'].t, 'n')
assert.equal(libro.Sheets['Resumen mensual']['D25'].v, 1)
assert.equal(libro.Sheets['Resumen mensual']['E25'].v, 60)
assert.equal(libro.Sheets['Detalle diario']['A4'].v, 'Fecha')
assert.equal(libro.Sheets['Detalle diario']['J8'].v, 90)
assert.equal(libro.Sheets['Detalle diario']['!autofilter']?.ref, 'A4:J8')
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
assert.equal(libro.Sheets['Eventos especiales']['A1'].v, 'EVENTOS ESPECIALES')
assert.equal(libro.Sheets['Eventos especiales']['A5'].v, 'TODOS LOS CAMPOS DE FÚTBOL (CAMPOS 1, 2 Y 3)')
assert.equal(libro.Sheets['Eventos especiales']['A6'].v, 'Fecha')
assert.equal(libro.Sheets['Eventos especiales']['A7'].v, 'Sin eventos especiales registrados')

const eventos: BloqueoEvento[] = [
  {
    id: 'evento-campo-1',
    canchaId: 1,
    fecha: '2026-10-12',
    inicio: 7,
    fin: 22,
    nombre: 'Torneo fútbol',
    celular: '987654321',
    notas: 'Final',
    estado: 'activo',
    grupoId: 'grupo-todos',
    tipo: 'todos_los_campos',
    precioCobrado: 450,
  },
  {
    id: 'evento-campo-2',
    canchaId: 2,
    fecha: '2026-10-12',
    inicio: 7,
    fin: 22,
    nombre: 'Torneo fútbol',
    celular: '987654321',
    notas: 'Final',
    estado: 'activo',
    grupoId: 'grupo-todos',
    tipo: 'todos_los_campos',
    precioCobrado: 450,
  },
  {
    id: 'evento-individual-2',
    canchaId: 2,
    fecha: '2026-10-15',
    inicio: 8,
    fin: 13,
    nombre: 'Evento Campo 2',
    celular: '',
    notas: '',
    estado: 'activo',
    grupoId: 'grupo-individual',
    tipo: 'individual',
    precioCobrado: 120,
  },
]
const balanceEventos = construirBalanceMensual('2026-10', reservas, canchas, eventos, new Date('2026-10-20T23:00:00-05:00'))
assert.equal(balanceEventos.eventosEspeciales.length, 2)
assert.equal(balanceEventos.ingresosEventosEspeciales, 570)
assert.equal(balanceEventos.ingresosTotales, 900)
assert.deepEqual(balanceEventos.porCampo, [
  { campoId: 1, campo: 'Campo 1', deporte: 'Fútbol 5', reservas: 2, horas: 17, ingresos: 345 },
  { campoId: 2, campo: 'Campo 2', deporte: 'Fútbol 5', reservas: 5, horas: 23.5, ingresos: 555 },
])
assert.deepEqual(balanceEventos.eventosEspeciales.map(({ id, tipo, campo, precio }) => ({ id, tipo, campo, precio })), [
  { id: 'grupo-todos', tipo: 'todos_los_campos', campo: 'Todos los campos de fútbol', precio: 450 },
  { id: 'grupo-individual', tipo: 'individual', campo: 'Campo 2', precio: 120 },
])
const libroEventos = await crearLibroBalance(balanceEventos)
assert.equal(libroEventos.Sheets['Eventos especiales']['C7'].v, 'Todos los campos de fútbol')
assert.equal(libroEventos.Sheets['Eventos especiales']['I7'].v, 450)
assert.equal(libroEventos.Sheets['Eventos especiales']['A9'].v, 'CAMPO 2 — EVENTOS INDIVIDUALES')
assert.equal(libroEventos.Sheets['Eventos especiales']['C11'].v, 'Campo 2')
assert.equal(libroEventos.Sheets['Eventos especiales']['D11'].v, 'de 8 a 1 de la tarde')
assert.equal(libroEventos.Sheets['Eventos especiales']['I11'].v, 120)
assert.equal(libroEventos.Sheets['Eventos especiales']['A12'].v, '')
const XLSX = (await import('xlsx-js-style') as unknown as { default: typeof import('xlsx-js-style') }).default
const archivoEnMemoria = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
const libroReabierto = XLSX.read(archivoEnMemoria, { type: 'buffer', cellStyles: true })
assert.ok(archivoEnMemoria.length > 1000)
assert.deepEqual(libroReabierto.SheetNames, ['Resumen mensual', 'Detalle diario', 'Eventos especiales'])
assert.equal(libroReabierto.Sheets['Resumen mensual']['A17'].v, 'Campo 1')
assert.equal(libroReabierto.Sheets['Resumen mensual']['A19'].t, 'n')
assert.equal(libroReabierto.Sheets['Resumen mensual']['C19'].v, 1)
assert.equal(libroReabierto.Sheets['Resumen mensual']['D19'].v, 2)
assert.equal(libroReabierto.Sheets['Resumen mensual']['E19'].v, 120)

const moduloXlsx = { utils: {} } as unknown as typeof import('xlsx-js-style')
assert.equal(normalizarModuloXlsx(moduloXlsx), moduloXlsx)
assert.equal(normalizarModuloXlsx({ default: moduloXlsx }), moduloXlsx)

console.log('✔ balanceMensual.check.ts OK')
