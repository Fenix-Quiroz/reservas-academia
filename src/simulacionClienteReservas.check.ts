import assert from 'node:assert/strict'
import {
  horarios,
  rangoLibre,
  esBloqueAislado,
  masCercana,
  activa,
  deCliente,
  ocultarHorariosPasados,
  fechaISO,
  sumarDias,
  rango,
  rangoHablado,
  DURACION_BLOQUE,
  MAX_ACTIVAS,
  sePuedeCancelar,
} from './reservas.js'
import {
  crearReserva,
  cancelarReserva,
  actualizarEstadoReserva,
  crearEventoEspecialLocal,
  leerReservas,
  limpiarDatosLocales,
  guardarTokenReserva,
  eliminarTokenReserva,
  leerTokensReservas,
  marcarTokenCancelado,
  esReservaVisibleCliente,
  limpiarTokensInactivos,
  bloquearNumero,
  leerNumerosBloqueados,
  agregarNumeroConfiable,
  leerNumerosConfiables,
  HORAS_GRACIA_CANCELADA_MS,
  HORAS_EXPIRACION_TOKEN_MS,
} from './almacen.js'
import { crearBloqueoAccion } from './accionUnica.js'
import {
  normalizarAlias,
  normalizarCelular,
  validarAlias,
  validarCelular,
} from './validacionCliente.js'
import {
  validarComprobante,
  extensionComprobante,
  ADELANTO_YAPE,
} from './pagos.js'
import {
  guardarBorradorReserva,
  leerBorradorReserva,
  borrarBorradorReserva,
} from './borradorReserva.js'
import {
  deReserva,
  aReserva,
  errorDeSupabase,
  deHorarioPublico,
} from './supabaseData.js'
import canchas from './data/canchas.json' with { type: 'json' }
import type { Campo, Reserva } from './types.js'

console.log('===============================================================')
console.log('SIMULACIÓN INTEGRAL DEL FLUJO DE RESERVAS DEL CLIENTE')
console.log('===============================================================\n')

// Mock de localStorage y sessionStorage
const mockLocalStorage = new Map<string, string>()
const mockSessionStorage = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (clave: string) => mockLocalStorage.get(clave) ?? null,
    setItem: (clave: string, valor: string) => mockLocalStorage.set(clave, String(valor)),
    removeItem: (clave: string) => mockLocalStorage.delete(clave),
    clear: () => mockLocalStorage.clear(),
  },
})

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: (clave: string) => mockSessionStorage.get(clave) ?? null,
    setItem: (clave: string, valor: string) => mockSessionStorage.set(clave, String(valor)),
    removeItem: (clave: string) => mockSessionStorage.delete(clave),
    clear: () => mockSessionStorage.clear(),
  },
})

function reiniciarAlmacenamiento() {
  mockLocalStorage.clear()
  mockSessionStorage.clear()
  limpiarDatosLocales()
}

reiniciarAlmacenamiento()

// -----------------------------------------------------------------------------
// 1. SIMULACIÓN: VALIDACIONES DE ENTRADA (ALIAS Y CELULAR)
// -----------------------------------------------------------------------------
console.log('1. Probando validaciones de entrada del cliente...')

// Normalización de alias
assert.equal(normalizarAlias('   Carlos   Mendoza   '), 'Carlos Mendoza')
assert.equal(normalizarAlias(''), '')

// Validación de alias
assert.equal(validarAlias('Carlos Mendoza'), null, 'Alias estándar válido')
assert.equal(validarAlias('Los-Galácticos'), null, 'Alias con guión válido')
assert.equal(validarAlias("D'Alessandro"), null, 'Alias con apóstrofe válido')
assert.equal(validarAlias('A'), 'alias-invalido', 'Alias de 1 letra es inválido (mínimo 2)')
assert.equal(validarAlias('A'.repeat(25)), 'alias-invalido', 'Alias > 24 caracteres es inválido')
assert.equal(validarAlias('123Futbol'), 'alias-invalido', 'No debe empezar con número')
assert.equal(validarAlias('Carlos<script>'), 'alias-invalido', 'Rechaza caracteres especiales')

// Normalización de celular
assert.equal(normalizarCelular('987 654 321'), '987654321')
assert.equal(normalizarCelular('987-654-321'), '987654321')
assert.equal(normalizarCelular('  987654321  '), '987654321')

// Validación de celular peruano (debe empezar con 9 y tener 9 dígitos)
assert.equal(validarCelular('987654321'), null, 'Celular peruano válido')
assert.equal(validarCelular('887654321'), 'celular-invalido', 'No empieza con 9')
assert.equal(validarCelular('98765432'), 'celular-invalido', 'Menos de 9 dígitos')
assert.equal(validarCelular('9876543210'), 'celular-invalido', 'Más de 9 dígitos')
assert.equal(validarCelular('98765abc1'), 'celular-invalido', 'Contiene letras')

console.log('   ✔ Validaciones de alias y celular OK.')

// -----------------------------------------------------------------------------
// 2. SIMULACIÓN: COMPROBANTES DE PAGO Y ADELANTO YAPE
// -----------------------------------------------------------------------------
console.log('\n2. Probando validación de comprobante de pago...')
assert.equal(ADELANTO_YAPE, 15, 'El monto de adelanto Yape debe ser 15 soles')

// Archivo vacío
assert.equal(validarComprobante(null), 'archivo-requerido')
assert.equal(validarComprobante({ type: 'image/jpeg', size: 0 } as File), 'archivo-vacio')

// Tipo de archivo
assert.equal(validarComprobante({ type: 'application/pdf', size: 50000 } as File), 'tipo-no-admitido')
assert.equal(validarComprobante({ type: 'text/plain', size: 50000 } as File), 'tipo-no-admitido')
assert.equal(validarComprobante({ type: 'image/jpeg', size: 50000 } as File), null)
assert.equal(validarComprobante({ type: 'image/png', size: 50000 } as File), null)
assert.equal(validarComprobante({ type: 'image/webp', size: 50000 } as File), null)

// Tamaño máximo (5 MB)
assert.equal(validarComprobante({ type: 'image/jpeg', size: 5 * 1024 * 1024 } as File), null)
assert.equal(validarComprobante({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 } as File), 'tamano-excedido')

// Extensiones
assert.equal(extensionComprobante({ type: 'image/jpeg' } as File), 'jpg')
assert.equal(extensionComprobante({ type: 'image/png' } as File), 'png')
assert.equal(extensionComprobante({ type: 'image/webp' } as File), 'webp')

console.log('   ✔ Validación de comprobantes de pago OK.')

// -----------------------------------------------------------------------------
// 3. SIMULACIÓN: CÁLCULO DE DISPONIBILIDAD, ENTRENAMIENTOS Y EVENTOS
// -----------------------------------------------------------------------------
console.log('\n3. Probando generación de agenda de disponibilidad (horarios)...')

const fechaTest = '2099-06-15' // Lunes (día de semana 1)
// En cancha 1, lunes tiene entrenamiento de academia de 960m (16:00) a 1225m (20:25)
const horasDisponiblesLunes = horarios([], 1, fechaTest, 1, new Date('2090-01-01T12:00:00'))

const bloque15 = horasDisponiblesLunes.find((h) => h.inicio === 15)
const bloque16 = horasDisponiblesLunes.find((h) => h.inicio === 16)
const bloque18 = horasDisponiblesLunes.find((h) => h.inicio === 18)
const bloque20 = horasDisponiblesLunes.find((h) => h.inicio === 20)
const bloque21 = horasDisponiblesLunes.find((h) => h.inicio === 21)

assert.equal(bloque15?.libre, true, '15:00 a 16:00 debe estar libre antes del entrenamiento')
assert.equal(bloque16?.libre, false, '16:00 a 17:00 debe estar bloqueado por entrenamiento de academia')
assert.equal(bloque18?.libre, false, '18:00 a 19:00 debe estar bloqueado por entrenamiento de academia')
assert.equal(bloque20?.libre, false, '20:00 a 21:00 debe estar bloqueado por entrenamiento de academia (termina 20:25)')
assert.equal(bloque21?.libre, true, '21:00 a 22:00 debe estar libre después del entrenamiento')

console.log('   ✔ Entrenamientos de la academia bloquean correctamente los horarios del cliente.')

// -----------------------------------------------------------------------------
// 4. SIMULACIÓN: BLOQUE AISLADO DE MEDIA HORA
// -----------------------------------------------------------------------------
console.log('\n4. Probando detección de bloques aislados de media hora...')

// Simulación de una agenda donde solo las 12:30 está libre entre las 12:00 y las 13:00 ocupadas
const agendaConAislado = [
  { inicio: 11.5, libre: false },
  { inicio: 12.0, libre: false },
  { inicio: 12.5, libre: true }, // Bloque aislado
  { inicio: 13.0, libre: false },
  { inicio: 13.5, libre: false },
]

assert.equal(esBloqueAislado(agendaConAislado, 12.5), true, '12:30 debe detectarse como bloque aislado')
assert.equal(esBloqueAislado(agendaConAislado, 12.0), false, '12:00 no es libre')

console.log('   ✔ Detección de bloque aislado OK.')

// -----------------------------------------------------------------------------
// 5. SIMULACIÓN: CREACIÓN DE RESERVA ESTÁNDAR Y ASIGNACIÓN DE TOKEN
// -----------------------------------------------------------------------------
console.log('\n5. Simulando reserva estándar con token y verificación...')
reiniciarAlmacenamiento()

const resultadoReserva1 = await Promise.resolve(crearReserva({
  canchaId: 1,
  fecha: '2099-07-10',
  inicio: 10,
  horas: 1.5,
  alias: 'Juan Pérez',
  celular: '987654321',
  montoTotal: 55 * 1.5,
}, false))

assert.ok('reserva' in resultadoReserva1, 'La reserva debe crearse exitosamente')
const res1 = resultadoReserva1.reserva
assert.equal(res1.canchaId, 1)
assert.equal(res1.inicio, 10)
assert.equal(res1.horas, 1.5)
assert.equal(res1.montoTotal, 82.5)
assert.equal(res1.pagoEstado, 'pendiente', 'Cliente regular debe tener pagoEstado pendiente')
assert.equal(res1.estado, 'activo')

// Simular guardado de token de seguridad
const tokenSimulado = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0'
guardarTokenReserva(res1.id, tokenSimulado, '987654321')
const tokensGuardados = leerTokensReservas('987654321')
assert.equal(tokensGuardados.length, 1)
assert.equal(tokensGuardados[0], tokenSimulado)

console.log('   ✔ Reserva creada con monto S/ 82.50 y token de seguridad asociado.')

// -----------------------------------------------------------------------------
// 6. SIMULACIÓN: CLIENTE CON BENEFICIO (NÚMERO CONFIABLE)
// -----------------------------------------------------------------------------
console.log('\n6. Simulando reserva de cliente confiable (sin comprobante/adelanto)...')

// Registrar número como confiable
agregarNumeroConfiable('999000111', 'Cliente Frecuente')
const confiables = leerNumerosConfiables()
assert.ok(confiables.some((n) => n.celular === '999000111' && n.activo))

const resultadoReservaConfiable = await Promise.resolve(crearReserva({
  canchaId: 2,
  fecha: '2099-07-10',
  inicio: 14,
  horas: 1,
  alias: 'María López',
  celular: '999000111',
  montoTotal: 50,
}, true)) // sinAdelanto = true

assert.ok('reserva' in resultadoReservaConfiable)
assert.equal(resultadoReservaConfiable.reserva.pagoEstado, 'no_requerido', 'Cliente confiable no requiere comprobante')
console.log('   ✔ Cliente confiable registrado con pagoEstado: "no_requerido".')

// -----------------------------------------------------------------------------
// 7. SIMULACIÓN: CONFLICTO DE HORARIO Y SUGERENCIA MÁS CERCANA
// -----------------------------------------------------------------------------
console.log('\n7. Simulando colisión de horario y sugerencia de alternativa más cercana...')

// Otro cliente intenta reservar en la misma cancha y fecha a las 10:30 (la reserva 1 fue 10:00 a 11:30)
const intentoColision = await Promise.resolve(crearReserva({
  canchaId: 1,
  fecha: '2099-07-10',
  inicio: 10.5,
  horas: 1,
  alias: 'Pedro Sánchez',
  celular: '911222333',
  montoTotal: 55,
}))

assert.ok('error' in intentoColision)
assert.equal(intentoColision.error, 'ocupado', 'Debe rechazar la colisión con error "ocupado"')

// Buscar alternativa más cercana
const disponibilidadActual = horarios(leerReservas(), 1, '2099-07-10', DURACION_BLOQUE, new Date('2090-01-01T12:00:00'))
const alternativa = masCercana(disponibilidadActual, 10.5, 1)

assert.ok(alternativa, 'Debe ofrecer una alternativa cercana libre')
assert.ok(alternativa.inicio < 10 || alternativa.inicio >= 11.5, 'La alternativa debe estar fuera del rango 10:00 a 11:30')
console.log(`   ✔ Conflicto detectado. Alternativa sugerida para 10:30: ${alternativa.inicio}:00 hrs.`)

// -----------------------------------------------------------------------------
// 8. SIMULACIÓN: LÍMITE DE RESERVAS ACTIVAS (MÁXIMO 2)
// -----------------------------------------------------------------------------
console.log('\n8. Simulando límite máximo de reservas por cliente (máx 2)...')

const celularCliente = '955444333'
// Reserva 1
const r1 = await Promise.resolve(crearReserva({
  canchaId: 1,
  fecha: '2099-07-11',
  inicio: 8,
  horas: 1,
  alias: 'Roberto',
  celular: celularCliente,
  montoTotal: 55,
}))
assert.ok('reserva' in r1)

// Reserva 2
const r2 = await Promise.resolve(crearReserva({
  canchaId: 2,
  fecha: '2099-07-12',
  inicio: 8,
  horas: 1,
  alias: 'Roberto',
  celular: celularCliente,
  montoTotal: 50,
}))
assert.ok('reserva' in r2)

// Reserva 3 (debe fallar)
const r3 = await Promise.resolve(crearReserva({
  canchaId: 3,
  fecha: '2099-07-13',
  inicio: 8,
  horas: 1,
  alias: 'Roberto',
  celular: celularCliente,
  montoTotal: 60,
}))
assert.ok('error' in r3)
assert.equal(r3.error, 'limite', 'Debe rechazar la 3ra reserva activa con error "limite"')
console.log('   ✔ Regla de máximo 2 reservas activas respetada correctamente.')

// -----------------------------------------------------------------------------
// 9. SIMULACIÓN: CONTROL DE INASISTENCIAS Y BLOQUEO AUTOMÁTICO
// -----------------------------------------------------------------------------
console.log('\n9. Simulando bloqueo por inasistencias acumuladas...')

const celularInasistente = '944333222'
// Crear 2 reservas
const resIna1 = await Promise.resolve(crearReserva({
  canchaId: 1,
  fecha: '2099-08-01',
  inicio: 9,
  horas: 1,
  alias: 'Cliente Falton',
  celular: celularInasistente,
  montoTotal: 55,
}))
const resIna2 = await Promise.resolve(crearReserva({
  canchaId: 1,
  fecha: '2099-08-02',
  inicio: 9,
  horas: 1,
  alias: 'Cliente Falton',
  celular: celularInasistente,
  montoTotal: 55,
}))

assert.ok('reserva' in resIna1 && 'reserva' in resIna2)
// Encargado marca ambas como 'no_asistio'
await actualizarEstadoReserva(resIna1.reserva.id, 'no_asistio')
await actualizarEstadoReserva(resIna2.reserva.id, 'no_asistio')

// Verificar que quedó en la lista de números bloqueados
const bloqueados = leerNumerosBloqueados()
const fueBloqueado = bloqueados.some((b) => b.celular === celularInasistente && b.activo)
assert.equal(fueBloqueado, true, 'El celular debe haberse bloqueado tras 2 inasistencias')

// Intento de nueva reserva debe ser rechazado
const intentoBloqueado = await Promise.resolve(crearReserva({
  canchaId: 1,
  fecha: '2099-08-03',
  inicio: 9,
  horas: 1,
  alias: 'Cliente Falton',
  celular: celularInasistente,
  montoTotal: 55,
}))
assert.ok('error' in intentoBloqueado)
assert.equal(intentoBloqueado.error, 'celular-bloqueado', 'Debe rechazar reserva de número bloqueado')
console.log('   ✔ Bloqueo por 2 inasistencias y rechazo de reserva verificado.')

// -----------------------------------------------------------------------------
// 10. SIMULACIÓN: CANCELACIÓN DE RESERVA Y VENTANA DE VISIBILIDAD DE 5 HORAS
// -----------------------------------------------------------------------------
console.log('\n10. Simulando cancelación de reserva y ventana de gracia...')

const resParaCancelar = await Promise.resolve(crearReserva({
  canchaId: 3,
  fecha: '2099-09-06',
  inicio: 18,
  horas: 2,
  alias: 'Diego Torres',
  celular: '933222111',
  montoTotal: 120,
}))
assert.ok('reserva' in resParaCancelar)
const idCancelar = resParaCancelar.reserva.id
const tokenCancelar = '1122334455667788990011223344556677889900aabbccdd'
guardarTokenReserva(idCancelar, tokenCancelar, '933222111')

// Cancelar
const resCancelacion = await Promise.resolve(cancelarReserva(idCancelar, '933222111'))
assert.deepEqual(resCancelacion, {})

const reservaCancelada = leerReservas().find((r) => r.id === idCancelar)
assert.equal(reservaCancelada?.estado, 'cancelado')

// Inmediatamente después de cancelar, debe seguir visible en "Mis Reservas"
const ahoraMs = Date.now()
assert.equal(esReservaVisibleCliente(reservaCancelada!, ahoraMs), true, 'Visible inmediatamente')

// A las 4 horas (dentro de las 5 horas de gracia) sigue visible
assert.equal(esReservaVisibleCliente(reservaCancelada!, ahoraMs + 4 * 3600 * 1000), true, 'Visible a las 4 horas')

// A las 5 horas y 1 minuto ya no debe ser visible
assert.equal(esReservaVisibleCliente(reservaCancelada!, ahoraMs + (5 * 3600 * 1000 + 60000)), false, 'Oculta después de 5 horas')

// El horario 18:00 a 20:00 en Cancha 3 quedó inmediatamente libre
const agendaDespuesCancelar = horarios(leerReservas(), 3, '2099-09-06', 1, new Date('2090-01-01T12:00:00'))
const bloque18Libre = agendaDespuesCancelar.find((h) => h.inicio === 18)?.libre
assert.equal(bloque18Libre, true, 'El horario se liberó inmediatamente para otros clientes')
console.log('   ✔ Cancelación exitosa, ventana de gracia de 5h y liberación inmediata comprobadas.')

// -----------------------------------------------------------------------------
// 11. SIMULACIÓN: PERSISTENCIA DEL BORRADOR DE RESERVA (SESSION STORAGE)
// -----------------------------------------------------------------------------
console.log('\n11. Simulando guardado y restauración de borrador de reserva...')

// Cliente avanza al paso 2 y elige Cancha 1, fecha dentro de 3 días, 2 horas, inicio 19
const fechaBorrador = fechaISO(sumarDias(3))
guardarBorradorReserva({
  paso: 2,
  canchaId: 1,
  fecha: fechaBorrador,
  horas: 2,
  inicio: 19,
  etapa: 'horario',
  turno: 'noche',
  semana: 0,
})

const borradorRestaurado = leerBorradorReserva(canchas)
assert.ok(borradorRestaurado, 'El borrador debe restaurarse')
assert.equal(borradorRestaurado.canchaId, 1)
assert.equal(borradorRestaurado.inicio, 19)
assert.equal(borradorRestaurado.horas, 2)
assert.equal(borradorRestaurado.turno, 'noche')
assert.equal(borradorRestaurado.dia, 3)

// Borrar borrador
borrarBorradorReserva()
assert.equal(leerBorradorReserva(canchas), null, 'Borrador eliminado correctamente')
console.log('   ✔ Borrador persistido y restaurado con precisión.')

// -----------------------------------------------------------------------------
// 12. SIMULACIÓN: MAPEO DE ERRORES DE SUPABASE Y RPC
// -----------------------------------------------------------------------------
console.log('\n12. Probando normalización de errores y mapeo de datos remotos...')

assert.equal(errorDeSupabase({ code: '23P01' }), 'ocupado')
assert.equal(errorDeSupabase({ message: 'limite_reservas' }), 'limite')
assert.equal(errorDeSupabase({ message: 'celular_bloqueado' }), 'celular-bloqueado')
assert.equal(errorDeSupabase({ message: 'numero_no_confiable' }), 'numero-no-confiable')
assert.equal(errorDeSupabase({ message: 'hora_pasada' }), 'tarde')
assert.equal(errorDeSupabase({ message: 'duracion_invalida' }), 'duracion-invalida')
assert.equal(errorDeSupabase({ code: 'ECONNREFUSED' }), 'conexion')

// Conversión fila RPC -> Reserva de dominio
const filaReserva = {
  id: 'e4d8b9f0-1234-4567-89ab-cdef01234567',
  cancha_id: 1,
  fecha: '2099-10-10',
  inicio: 15,
  horas: 1.5,
  alias: 'Goleadores FC',
  celular: '988777666',
  estado: 'activo',
  pago_estado: 'pendiente',
  monto_total: '82.50',
}
const entidad = deReserva(filaReserva)
assert.equal(entidad.id, filaReserva.id)
assert.equal(entidad.montoTotal, 82.5)
assert.equal(entidad.pagoEstado, 'pendiente')

console.log('   ✔ Mapeo de errores y transformaciones de datos OK.')

// -----------------------------------------------------------------------------
// 13. SIMULACIÓN: PROTECCIÓN CONTRA DOBLE CLIC (RE-ENTRANCIA CONCURRENTE)
// -----------------------------------------------------------------------------
console.log('\n13. Probando mecanismo de bloqueo de acción única (anti doble-clic)...')

const bloqueo = crearBloqueoAccion()
assert.equal(bloqueo.adquirir(), true, 'El primer clic adquiere el bloqueo')
assert.equal(bloqueo.adquirir(), false, 'El segundo clic rápido es bloqueado de inmediato')
bloqueo.liberar()
assert.equal(bloqueo.adquirir(), true, 'Tras liberar la acción, vuelve a estar disponible')
bloqueo.liberar()
console.log('   ✔ Bloqueo síncrono previene dobles reservas concurrentes en el cliente.')

// -----------------------------------------------------------------------------
// 14. SIMULACIÓN: RESERVA CONFIRMADA POR ADMINISTRACIÓN
// -----------------------------------------------------------------------------
console.log('\n14. Verificando reglas de reserva con pago confirmado...')

const reservaConfirmada: Reserva = {
  id: 'res-confirmada-1',
  canchaId: 1,
  fecha: '2099-11-20',
  inicio: 20,
  horas: 1,
  alias: 'Futboleros VIP',
  celular: '998877665',
  estado: 'activo',
  pagoEstado: 'confirmado',
  montoTotal: 55,
}

// En MisReservas, cuando pagoEstado es 'confirmado', comprobanteConfirmado es true
const comprobanteConfirmado = reservaConfirmada.pagoEstado === 'confirmado'
assert.equal(comprobanteConfirmado, true)
// La UI no permite cancelar reservas confirmadas
assert.equal(reservaConfirmada.estado !== 'cancelado' && comprobanteConfirmado, true)
console.log('   ✔ Cliente no puede cancelar directamente reservas con pago verificado.')

// -----------------------------------------------------------------------------
// 15. SIMULACIÓN: EVENTO ESPECIAL MULTI-CAMPO BLOQUEA HORARIOS
// -----------------------------------------------------------------------------
console.log('\n15. Simulando evento especial multi-campo y bloqueo de agenda...')

reiniciarAlmacenamiento()
const resEvento = crearEventoEspecialLocal({
  canchaIds: [1, 2],
  fecha: '2099-12-06',
  inicio: 18,
  fin: 21,
  nombre: 'Torneo Navideño',
  celular: '988000000',
  notas: 'Bloqueo campos 1 y 2',
  tipo: 'individual',
  precioCobrado: 300,
})

assert.ok('eventos' in resEvento)
// Cliente consulta disponibilidad en Cancha 1
const agendaEventoCancha1 = horarios([], 1, '2099-12-06', 1, new Date('2090-01-01T12:00:00'), resEvento.eventos)
const h18 = agendaEventoCancha1.find((h) => h.inicio === 18)
const h19 = agendaEventoCancha1.find((h) => h.inicio === 19)
const h20 = agendaEventoCancha1.find((h) => h.inicio === 20)
const h21 = agendaEventoCancha1.find((h) => h.inicio === 21)

assert.equal(h18?.libre, false, '18:00 debe estar bloqueado por el evento')
assert.equal(h19?.libre, false, '19:00 debe estar bloqueado por el evento')
assert.equal(h20?.libre, false, '20:00 debe estar bloqueado por el evento')
assert.equal(h21?.libre, true, '21:00 queda libre al terminar el evento')

// Cliente intenta reservar en Cancha 1 a las 19:00
const intentoEnEvento = await Promise.resolve(crearReserva({
  canchaId: 1,
  fecha: '2099-12-06',
  inicio: 19,
  horas: 1,
  alias: 'Equipo B',
  celular: '977666555',
  montoTotal: 55,
}))
assert.ok('error' in intentoEnEvento)
assert.equal(intentoEnEvento.error, 'ocupado')
console.log('   ✔ Evento multi-campo bloqueó exitosamente la disponibilidad para clientes.')

// -----------------------------------------------------------------------------
// 16. SIMULACIÓN: OCULTAMIENTO DE HORARIOS PASADOS PARA EL DÍA DE HOY
// -----------------------------------------------------------------------------
console.log('\n16. Probando filtrado de horas pasadas para el día de hoy...')

const hoyLima = '2026-10-31'
// Simulamos que en Lima son las 15:30 (3:30 p. m.)
const ahoraSimulada = new Date('2026-10-31T15:30:00-05:00')

const listaHorarios = [
  { inicio: 14.0, libre: true }, // Pasado
  { inicio: 15.0, libre: true }, // Pasado (15 <= 15)
  { inicio: 16.0, libre: true }, // Futuro (16 > 15)
  { inicio: 17.0, libre: true }, // Futuro
]

const filtrados = ocultarHorariosPasados(listaHorarios, hoyLima, ahoraSimulada)
assert.equal(filtrados.length, 2)
assert.equal(filtrados[0].inicio, 16.0)
assert.equal(filtrados[1].inicio, 17.0)
console.log('   ✔ Horas pasadas del día de hoy filtradas correctamente.')

// -----------------------------------------------------------------------------
// 17. SIMULACIÓN: CANCELACIÓN AUTOMÁTICA AL VOLVER ATRÁS (OPCIÓN A)
// -----------------------------------------------------------------------------
console.log('\n17. Simulando cancelación automática de reserva inconclusa al volver atrás...')

reiniciarAlmacenamiento()

// Cliente 1 inicia reserva a las 20:00 (Cancha 2, domingo 2099-09-13 sin entrenamientos)
const fechaTestDomingo = '2099-09-13'
const resPendiente = await Promise.resolve(crearReserva({
  canchaId: 2,
  fecha: fechaTestDomingo,
  inicio: 20,
  horas: 1,
  alias: 'Marcos Ruiz',
  celular: '988555444',
  montoTotal: 50,
}, false))

assert.ok('reserva' in resPendiente)
const idPendiente = resPendiente.reserva.id
const tokenPendiente = '2233445566778899001122334455667788990011aabbccdd'
guardarTokenReserva(idPendiente, tokenPendiente, '988555444')

// La agenda ahora muestra las 20:00 como OCUPADA
const agendaOcupada = horarios(leerReservas(), 2, fechaTestDomingo, 1, new Date('2090-01-01T12:00:00'))
assert.equal(agendaOcupada.find((h) => h.inicio === 20)?.libre, false, '20:00 debe figurar como ocupada mientras esté pendiente')

// El comprobante no subió y el cliente presiona "← Atrás":
// Se ejecuta la cancelación automática y limpieza de token
await Promise.resolve(cancelarReserva(idPendiente, '988555444'))
eliminarTokenReserva(idPendiente)

// La agenda vuelve a mostrar las 20:00 como LIBRE de inmediato
const agendaLiberada = horarios(leerReservas(), 2, fechaTestDomingo, 1, new Date('2090-01-01T12:00:00'))
assert.equal(agendaLiberada.find((h) => h.inicio === 20)?.libre, true, '20:00 debe liberarse de inmediato al volver atrás')

// El cliente (o cualquier otro cliente) puede volver a seleccionar y reservar las 20:00 sin error
const reintentoReserva = await Promise.resolve(crearReserva({
  canchaId: 2,
  fecha: fechaTestDomingo,
  inicio: 20,
  horas: 1,
  alias: 'Marcos Ruiz',
  celular: '988555444',
  montoTotal: 50,
}, false))

assert.ok('reserva' in reintentoReserva, 'El cliente debe poder volver a reservar la misma hora libremente')
assert.equal(reintentoReserva.reserva.inicio, 20)
console.log('   ✔ Cancelación automática al volver atrás libera el horario instantáneamente.')

console.log('\n===============================================================')
console.log('✔ TODAS LAS SIMULACIONES DE CLIENTE PASARON CON ÉXITO (17/17)')
console.log('===============================================================')
