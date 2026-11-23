import assert from 'node:assert/strict'

import {
  BLOQUE_MINUTOS,
  RANGO_ENTRENAMIENTOS,
  actualizarCeldaEnConfiguracion,
  copiarDiaEnConfiguracion,
  convertirCeldasARangos,
  convertirHorariosACeldas,
  crearConfiguracionHorariosAdmin,
} from './horariosAdmin'
import {
  CLAVES_HORARIOS_DEMO,
  borrarBorradorHorariosDemo,
  guardarBorradorHorariosDemo,
  guardarHorariosDemo,
  leerBorradorHorariosDemo,
  leerConfiguracionHorariosDemo,
  type AlmacenamientoHorariosDemo,
} from './horariosAdminDemo'
import type { HorarioEntrenamiento } from './horariosEntrenamiento'

class MemoriaStorage implements AlmacenamientoHorariosDemo {
  private readonly valores = new Map<string, string>()

  getItem(clave: string): string | null {
    return this.valores.get(clave) ?? null
  }

  setItem(clave: string, valor: string): void {
    this.valores.set(clave, valor)
  }

  removeItem(clave: string): void {
    this.valores.delete(clave)
  }
}

function celda(
  canchaId: number,
  diaSemana: number,
  inicioMinuto: number,
  bloqueado: boolean,
) {
  return {
    canchaId,
    diaSemana,
    inicioMinuto,
    finMinuto: inicioMinuto + BLOQUE_MINUTOS,
    bloqueado,
  }
}

const rangoDe80Minutos: HorarioEntrenamiento = {
  canchaId: 2,
  diaSemana: 2,
  inicioMinuto: 1020,
  finMinuto: 1100,
}
const rangoDe85Minutos: HorarioEntrenamiento = {
  canchaId: 1,
  diaSemana: 1,
  inicioMinuto: 1050,
  finMinuto: 1135,
}

const celdasCampo2 = convertirHorariosACeldas([rangoDe80Minutos], 2)
assert.equal(celdasCampo2.length, 210, 'un campo debe mostrar 7 días de bloques de media hora')
assert.equal(
  celdasCampo2.find((item) => item.diaSemana === 2 && item.inicioMinuto === 1020)?.bloqueado,
  true,
  'el inicio del rango de 80 minutos debe quedar bloqueado',
)
assert.equal(
  celdasCampo2.find((item) => item.diaSemana === 2 && item.inicioMinuto === 1050)?.bloqueado,
  true,
  'el segundo bloque cruzado debe quedar bloqueado',
)
assert.equal(
  celdasCampo2.find((item) => item.diaSemana === 2 && item.inicioMinuto === 1080)?.bloqueado,
  true,
  'el tercer bloque cruzado debe quedar bloqueado aunque el rango termine a los 80 minutos',
)
assert.equal(
  celdasCampo2.find((item) => item.diaSemana === 2 && item.inicioMinuto === 1110)?.bloqueado,
  false,
  'un bloque posterior al rango debe seguir libre',
)
const celdasCampo1 = convertirHorariosACeldas([rangoDe85Minutos], 1)
assert.deepEqual(
  celdasCampo1
    .filter((item) => item.diaSemana === 1 && item.bloqueado)
    .map((item) => item.inicioMinuto),
  [1050, 1080, 1110],
  'un rango de 85 minutos debe ocupar todas las celdas que cruza',
)
assert.equal(
  celdasCampo2.find((item) => item.diaSemana === 2 && item.inicioMinuto === RANGO_ENTRENAMIENTOS.inicioMinuto)?.bloqueado,
  false,
  'el inicio del rango editable debe poder mostrarse como libre',
)
assert.equal(
  celdasCampo2.some((item) => item.inicioMinuto + BLOQUE_MINUTOS > RANGO_ENTRENAMIENTOS.finMinuto),
  false,
  'no deben aparecer bloques posteriores a las 10 p. m.',
)

const rangosUnidos = convertirCeldasARangos([
  celda(1, 1, 420, true),
  celda(1, 1, 450, true),
  celda(1, 1, 480, false),
  celda(1, 1, 510, true),
  celda(4, 6, 540, true),
])
assert.deepEqual(rangosUnidos, [
  { canchaId: 1, diaSemana: 1, inicioMinuto: 420, finMinuto: 480 },
  { canchaId: 1, diaSemana: 1, inicioMinuto: 510, finMinuto: 540 },
  { canchaId: 4, diaSemana: 6, inicioMinuto: 540, finMinuto: 570 },
], 'las celdas contiguas deben unirse y las liberadas deben separar rangos')

const configuracionInicial = crearConfiguracionHorariosAdmin([
  { canchaId: 1, diaSemana: 1, inicioMinuto: 420, finMinuto: 480 },
  { canchaId: 2, diaSemana: 1, inicioMinuto: 600, finMinuto: 660 },
])
const configuracionActualizada = actualizarCeldaEnConfiguracion(
  configuracionInicial,
  celda(1, 1, 450, false),
  false,
)
assert.deepEqual(
  configuracionActualizada.horarios.filter((item) => item.canchaId === 1 && item.diaSemana === 1),
  [{ canchaId: 1, diaSemana: 1, inicioMinuto: 420, finMinuto: 450 }],
  'liberar un switch debe separar el rango editado',
)
assert.deepEqual(
  configuracionActualizada.horarios.filter((item) => item.canchaId === 2),
  [{ canchaId: 2, diaSemana: 1, inicioMinuto: 600, finMinuto: 660 }],
  'editar un campo no debe modificar otros campos',
)
const configuracionCopiada = copiarDiaEnConfiguracion(
  configuracionInicial,
  1,
  1,
  [2, 3],
)
assert.deepEqual(
  configuracionCopiada.horarios.filter((item) => item.canchaId === 1),
  [
    { canchaId: 1, diaSemana: 1, inicioMinuto: 420, finMinuto: 480 },
    { canchaId: 1, diaSemana: 2, inicioMinuto: 420, finMinuto: 480 },
    { canchaId: 1, diaSemana: 3, inicioMinuto: 420, finMinuto: 480 },
  ],
  'copiar un día debe reproducirlo solo en los días seleccionados',
)

const almacenamiento = new MemoriaStorage()
const demoInicial = leerConfiguracionHorariosDemo(almacenamiento)
assert.ok(demoInicial.horarios.length > 0, 'la demo debe cargar la semilla JSON')
const borrador = crearConfiguracionHorariosAdmin([
  { canchaId: 1, diaSemana: 1, inicioMinuto: 420, finMinuto: 450 },
])
guardarBorradorHorariosDemo(borrador, almacenamiento)
assert.deepEqual(leerBorradorHorariosDemo(almacenamiento), borrador, 'el borrador completo debe persistir en storage')

const resultadoError = await guardarHorariosDemo(borrador, {
  storage: almacenamiento,
  delayMs: 0,
  forzarError: true,
})
assert.deepEqual(resultadoError, { ok: false, error: 'simulado' }, 'la demo debe permitir probar un error de guardado')
assert.deepEqual(leerBorradorHorariosDemo(almacenamiento), borrador, 'un error no debe borrar el borrador')

const resultadoExitoso = await guardarHorariosDemo(borrador, { storage: almacenamiento, delayMs: 0 })
assert.equal(resultadoExitoso.ok, true, 'la demo debe confirmar un guardado exitoso')
assert.deepEqual(leerConfiguracionHorariosDemo(almacenamiento), borrador, 'el servidor demo debe conservar la configuración guardada')
assert.deepEqual(leerBorradorHorariosDemo(almacenamiento), borrador, 'el repositorio no debe borrar el borrador antes de que la UI confirme')

borrarBorradorHorariosDemo(almacenamiento)
assert.equal(leerBorradorHorariosDemo(almacenamiento), null, 'la UI podrá limpiar el borrador después de confirmar')
assert.ok(CLAVES_HORARIOS_DEMO.borrador.length > 0, 'las claves demo deben estar versionadas')

console.log('✔ horariosAdmin.check.ts OK')
