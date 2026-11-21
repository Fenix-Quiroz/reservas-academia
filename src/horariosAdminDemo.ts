import horariosIniciales from './data/horarios-entrenamientos.json' with { type: 'json' }

import {
  crearConfiguracionHorariosAdmin,
  type ConfiguracionHorariosAdmin,
} from './horariosAdmin'
import type { HorarioEntrenamiento } from './horariosEntrenamiento'

export interface AlmacenamientoHorariosDemo {
  getItem(clave: string): string | null
  setItem(clave: string, valor: string): void
  removeItem(clave: string): void
}

export const CLAVES_HORARIOS_DEMO = Object.freeze({
  servidor: 'horarios-academia-demo:v1:servidor',
  borrador: 'horarios-academia-demo:v1:borrador',
})

export interface OpcionesGuardarHorariosDemo {
  storage?: AlmacenamientoHorariosDemo
  delayMs?: number
  forzarError?: boolean
}

export type ResultadoGuardarHorariosDemo =
  | { ok: true; configuracion: ConfiguracionHorariosAdmin }
  | { ok: false; error: 'simulado' }

const semilla = horariosIniciales as HorarioEntrenamiento[]

function almacenamientoPredeterminado(): AlmacenamientoHorariosDemo | null {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
}

function clonarConfiguracion(configuracion: ConfiguracionHorariosAdmin): ConfiguracionHorariosAdmin {
  return crearConfiguracionHorariosAdmin(configuracion.horarios)
}

function leerConfiguracionGuardada(
  almacenamiento: AlmacenamientoHorariosDemo | null,
  clave: string,
): ConfiguracionHorariosAdmin | null {
  if (!almacenamiento) return null

  try {
    const contenido = almacenamiento.getItem(clave)
    if (!contenido) return null
    const valor = JSON.parse(contenido) as Partial<ConfiguracionHorariosAdmin>
    if (valor.version !== 1 || !Array.isArray(valor.horarios)) return null
    return crearConfiguracionHorariosAdmin(valor.horarios as HorarioEntrenamiento[])
  } catch {
    return null
  }
}

export function leerConfiguracionHorariosDemo(
  almacenamiento: AlmacenamientoHorariosDemo | null = almacenamientoPredeterminado(),
): ConfiguracionHorariosAdmin {
  return leerConfiguracionGuardada(almacenamiento, CLAVES_HORARIOS_DEMO.servidor)
    ?? crearConfiguracionHorariosAdmin(semilla)
}

export function leerBorradorHorariosDemo(
  almacenamiento: AlmacenamientoHorariosDemo | null = almacenamientoPredeterminado(),
): ConfiguracionHorariosAdmin | null {
  return leerConfiguracionGuardada(almacenamiento, CLAVES_HORARIOS_DEMO.borrador)
}

export function guardarBorradorHorariosDemo(
  configuracion: ConfiguracionHorariosAdmin,
  almacenamiento: AlmacenamientoHorariosDemo | null = almacenamientoPredeterminado(),
): void {
  almacenamiento?.setItem(
    CLAVES_HORARIOS_DEMO.borrador,
    JSON.stringify(clonarConfiguracion(configuracion)),
  )
}

export function borrarBorradorHorariosDemo(
  almacenamiento: AlmacenamientoHorariosDemo | null = almacenamientoPredeterminado(),
): void {
  almacenamiento?.removeItem(CLAVES_HORARIOS_DEMO.borrador)
}

export async function guardarHorariosDemo(
  configuracion: ConfiguracionHorariosAdmin,
  opciones: OpcionesGuardarHorariosDemo = {},
): Promise<ResultadoGuardarHorariosDemo> {
  const delayMs = Math.max(0, opciones.delayMs ?? 350)
  if (delayMs > 0) {
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, delayMs))
  }

  if (opciones.forzarError) {
    return { ok: false, error: 'simulado' }
  }

  const configuracionNormalizada = clonarConfiguracion(configuracion)
  const almacenamiento = opciones.storage ?? almacenamientoPredeterminado()
  almacenamiento?.setItem(
    CLAVES_HORARIOS_DEMO.servidor,
    JSON.stringify(configuracionNormalizada),
  )

  return { ok: true, configuracion: configuracionNormalizada }
}
