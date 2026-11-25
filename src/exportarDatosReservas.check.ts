import assert from 'node:assert/strict'
import { crearLibroDatosReservas, prepararFilasDatosReservas } from './exportarDatosReservas.js'
import type { Campo, ComprobanteAdmin, Reserva } from './types.js'

const canchas: Campo[] = [
  { id: 1, nombre: 'Campo 1', deporte: 'Fútbol 6', jugadores: 6, precioHora: 55, color: '', imagen: '', oferta: '' },
  { id: 2, nombre: 'Campo 2', deporte: 'Fútbol 7', jugadores: 7, precioHora: 70, color: '', imagen: '', oferta: '' },
]

const reserva = (datos: Partial<Reserva> & Pick<Reserva, 'id' | 'fecha' | 'inicio' | 'alias' | 'celular'>): Reserva => ({
  canchaId: 1,
  horas: 1,
  estado: 'finalizado',
  ...datos,
})

const reservas: Reserva[] = [
  reserva({ id: 'r1', fecha: '2026-11-05', inicio: 20, horas: 1.5, alias: 'Cliente Tres A', celular: '912345678' }),
  reserva({ id: 'r2', fecha: '2026-11-01', inicio: 18, horas: 2, alias: 'Cliente Tres', celular: '912345678' }),
  reserva({ id: 'r3', fecha: '2026-11-03', inicio: 19, alias: 'Cliente Tres B', celular: '912 345-678' }),
  reserva({ id: 'r4', fecha: '2026-11-02', inicio: 21, alias: 'Cliente Uno', celular: '923456789' }),
  reserva({ id: 'r6', fecha: '2026-11-04', inicio: 21, alias: 'Cliente Uno', celular: '923456789' }),
  reserva({ id: 'r5', canchaId: 2, fecha: '2026-11-02', inicio: 17, alias: 'Cliente Campo Dos', celular: '934567890' }),
]

const comprobante = (reservaId: string, numero: number): ComprobanteAdmin => ({
  pagoId: `pago-${numero}`,
  reservaId,
  estado: 'confirmado',
  storagePath: `comprobantes/${reservaId}-${numero}.png`,
  mimeType: 'image/png',
  sizeBytes: 100 + numero,
})

const comprobantes = [
  comprobante('r1', 99),
  comprobante('r1', 1),
  comprobante('r2', 2),
  comprobante('r3', 3),
  comprobante('r4', 4),
]
const filas = prepararFilasDatosReservas(reservas, canchas, comprobantes)

assert.equal(filas.length, reservas.length, 'cada reserva debe conservar su propia fila')
assert.deepEqual(
  filas.map((fila) => fila.reservaId),
  ['r2', 'r3', 'r1', 'r4', 'r6', 'r5'],
  'el cliente con tres reservas debe aparecer primero y cada grupo debe mantenerse unido',
)
assert.deepEqual(
  filas.slice(0, 3).map((fila) => fila.comprobante?.storagePath),
  ['comprobantes/r2-2.png', 'comprobantes/r3-3.png', 'comprobantes/r1-99.png'],
  'cada fila debe conservar el comprobante de su reserva',
)
assert.deepEqual(filas.slice(0, 3).map((fila) => fila.celular), ['912345678', '912345678', '912345678'])
assert.deepEqual(filas.slice(0, 3).map((fila) => fila.campoId), [1, 1, 1])
assert.equal(filas[3]?.campoId, 1)
assert.equal(filas[5]?.campoId, 2)

const imagenPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
const imagenBlob = await (await fetch(imagenPng)).blob()
let llamadasActivas = 0
let maxLlamadasActivas = 0
const libro = await crearLibroDatosReservas(
  reservas,
  canchas,
  comprobantes,
  async () => {
    llamadasActivas += 1
    maxLlamadasActivas = Math.max(maxLlamadasActivas, llamadasActivas)
    await new Promise((resolve) => setTimeout(resolve, 2))
    llamadasActivas -= 1
    return imagenBlob
  },
)
const hoja = libro.getWorksheet('Datos de reservas')
assert.ok(hoja, 'el libro debe tener una hoja de datos de reservas')

const filaConTexto = (texto: string): number => {
  let encontrada = 0
  hoja.eachRow((fila, numero) => {
    if (fila.getCell(1).value === texto) encontrada = numero
  })
  return encontrada
}

const filaCampo1 = filaConTexto('CAMPO 1')
const filaCampo2 = filaConTexto('CAMPO 2')
assert.ok(filaCampo1 > 0 && filaCampo2 > filaCampo1, 'los bloques deben aparecer en el orden de los campos')
assert.ok((hoja.getCell(filaCampo1, 1).font?.size ?? 0) >= 16, 'el título del campo debe verse grande')
assert.ok((hoja.getRow(filaCampo1 + 2).height ?? 0) >= 170, 'la fila debe ser suficientemente alta para leer el comprobante')
assert.equal(hoja.views?.some((vista) => vista.state === 'frozen'), false, 'el reporte no debe congelar el título del primer campo')
assert.equal(hoja.getCell(filaCampo1 + 1, 1).value, 'Nombre')
assert.equal(hoja.getCell(filaCampo1 + 1, 2).value, 'Número')
assert.equal(hoja.getCell(filaCampo1 + 1, 3).value, 'Comprobante')
assert.equal(hoja.getCell(filaCampo1 + 1, 4).value, 'Fecha')
assert.equal(hoja.getCell(filaCampo1 + 1, 5).value, 'Horario')
assert.equal(hoja.getCell(filaCampo1 + 1, 6).value, 'Horas')

const nombresCampo1: string[] = []
for (let numero = filaCampo1 + 2; numero < filaCampo2; numero += 1) {
  const nombre = hoja.getCell(numero, 1).value
  if (typeof nombre === 'string' && nombre !== 'Sin reservas registradas') nombresCampo1.push(nombre)
}
assert.deepEqual(nombresCampo1, ['Cliente Tres', 'Cliente Tres B', 'Cliente Tres A', 'Cliente Uno', 'Cliente Uno'])
assert.equal(hoja.getCell(filaCampo1 + 2, 2).value, '912345678')
assert.equal(hoja.getCell(filaCampo1 + 4, 2).value, '912345678')
assert.equal(hoja.getCell(filaCampo1 + 5, 1).value, 'Cliente Uno')
assert.equal(hoja.getCell(filaCampo1 + 6, 3).value, 'Cliente confiable — no tiene comprobante')
assert.equal(hoja.getCell(filaCampo2 + 1, 1).value, 'Nombre')

const media = (libro as unknown as { model?: { media?: unknown[] } }).model?.media ?? []
assert.equal(media.length, 4, 'cada comprobante resoluble debe incrustarse como imagen')
assert.ok(maxLlamadasActivas > 1, 'los comprobantes deben descargarse en paralelo')

const libroConFallo = await crearLibroDatosReservas(
  reservas.slice(0, 1),
  canchas,
  [comprobante('r1', 1)],
  async () => { throw new Error('comprobante inaccesible') },
)
const hojaConFallo = libroConFallo.getWorksheet('Datos de reservas')
assert.ok(hojaConFallo)
assert.ok(
  Array.from({ length: hojaConFallo.rowCount }, (_valor, indice) => hojaConFallo.getCell(indice + 1, 3).value)
    .includes('No se pudo cargar'),
  'un comprobante que falla no debe impedir el archivo',
)

console.log('✔ exportarDatosReservas.check.ts: prepara una fila por reserva y ordena por frecuencia')
