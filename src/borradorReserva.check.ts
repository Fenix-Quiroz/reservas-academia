import assert from 'node:assert/strict'
import type { Campo } from './types.js'
import {
  borrarBorradorReserva,
  guardarBorradorReserva,
  leerBorradorReserva,
} from './borradorReserva'

class MemoriaStorage implements Storage {
  private valores = new Map<string, string>()

  get length(): number {
    return this.valores.size
  }

  clear(): void {
    this.valores.clear()
  }

  getItem(clave: string): string | null {
    return this.valores.get(clave) ?? null
  }

  key(indice: number): string | null {
    return [...this.valores.keys()][indice] ?? null
  }

  removeItem(clave: string): void {
    this.valores.delete(clave)
  }

  setItem(clave: string, valor: string): void {
    this.valores.set(clave, valor)
  }
}

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: new MemoriaStorage(),
})

const campos: Campo[] = [{
  id: 1,
  nombre: 'Campo 1',
  deporte: 'Fútbol 6',
  jugadores: 6,
  precioHora: 55,
  color: '#a97818',
  imagen: '/campo.webp',
  oferta: '',
}]

const hoy = new Date(2026, 9, 29, 12)

guardarBorradorReserva({
  paso: 2,
  canchaId: 1,
  fecha: '2026-10-30',
  horas: 1,
  inicio: null,
  etapa: 'turno',
  turno: null,
  semana: 0,
})
assert.deepEqual(leerBorradorReserva(campos, hoy), {
  paso: 2,
  canchaId: 1,
  dia: 1,
  fecha: '2026-10-30',
  horas: 1,
  inicio: null,
  etapa: 'turno',
  turno: null,
  semana: 0,
})

guardarBorradorReserva({
  paso: 3,
  canchaId: 1,
  fecha: '2026-10-30',
  horas: 1,
  inicio: 19,
  etapa: 'horario',
  turno: 'tarde',
  semana: 0,
})
assert.equal(leerBorradorReserva(campos, hoy)?.paso, 3)
assert.equal(leerBorradorReserva(campos, hoy)?.inicio, 19)
assert.equal(leerBorradorReserva(campos, hoy)?.etapa, 'horario')
assert.equal(leerBorradorReserva(campos, hoy)?.turno, 'tarde')

sessionStorage.setItem('reserva-borrador', JSON.stringify({
  version: 1,
  paso: 2,
  canchaId: 1,
  fecha: '2026-10-30',
  horas: 1,
  inicio: null,
}))
assert.equal(leerBorradorReserva(campos, hoy)?.paso, 2)
assert.equal(leerBorradorReserva(campos, hoy)?.etapa, 'dia')

sessionStorage.setItem('reserva-borrador', JSON.stringify({
  version: 1,
  paso: 4,
  canchaId: 1,
  fecha: '2026-10-30',
  horas: 1,
  inicio: 19,
}))
assert.equal(leerBorradorReserva(campos, hoy), null)

guardarBorradorReserva({
  paso: 2,
  canchaId: 1,
  fecha: '2026-10-28',
  horas: 1,
  inicio: null,
  etapa: 'dia',
  turno: null,
  semana: 0,
})
assert.equal(leerBorradorReserva(campos, hoy), null)

borrarBorradorReserva()
assert.equal(sessionStorage.getItem('reserva-borrador'), null)

console.log('borradorReserva.check: ok')
