import assert from 'node:assert/strict'
import { chocan } from './reservas.js'
import type { BloqueoEvento, Campo, Reserva } from './types.js'
import { eventoBloquea } from './eventos.js'
import { entrenamientoBloquea } from './horariosEntrenamiento.js'

const canchas: Campo[] = [
  { id: 1, nombre: 'Campo 1 (Fútbol 6)', deporte: 'Fútbol 6', jugadores: 6, precioHora: 55, color: '', imagen: '', oferta: '' },
  { id: 2, nombre: 'Campo 2 (Fútbol 7)', deporte: 'Fútbol 7', jugadores: 7, precioHora: 70, color: '', imagen: '', oferta: '' },
]

// 2026-11-08 es Domingo (diaSemana 0, sin entrenamientos en cancha 1)
const fechaPrueba = '2026-11-08'

const reservaExistente1: Reserva = {
  id: 'reserva-1',
  canchaId: 1,
  fecha: fechaPrueba,
  inicio: 18,
  horas: 1.5,
  alias: 'Carlos',
  celular: '912345678',
  estado: 'activo',
  montoTotal: 82.5,
}

const reservaExistente2: Reserva = {
  id: 'reserva-2',
  canchaId: 1,
  fecha: fechaPrueba,
  inicio: 20,
  horas: 1,
  alias: 'Pedro',
  celular: '987654321',
  estado: 'activo',
  montoTotal: 55,
}

const reservas = [reservaExistente1, reservaExistente2]

// Función de validación de conflicto idéntica a AdminModalEditarReserva
function verificarConflicto(
  reservaId: string,
  canchaId: number,
  fecha: string,
  inicio: number,
  horas: number,
  listaReservas: readonly Reserva[],
  listaEventos: readonly BloqueoEvento[] = [],
): string | null {
  if (inicio + horas > 25) {
    return 'excede_cierre'
  }

  const diaSemana = new Date(`${fecha}T12:00:00`).getDay()
  if (entrenamientoBloquea(canchaId, diaSemana, inicio, horas)) {
    return 'entrenamiento'
  }

  for (const ev of listaEventos) {
    if (ev.estado !== 'cancelado' && eventoBloquea(ev, canchaId, fecha, inicio, horas)) {
      return 'evento'
    }
  }

  for (const r of listaReservas) {
    if (r.id !== reservaId && r.estado !== 'cancelado') {
      if (chocan(r, { canchaId, fecha, inicio, horas })) {
        return 'reserva'
      }
    }
  }

  return null
}

// 1. Reprogramar reserva-1 en su mismo horario no debe chocar consigo misma
assert.equal(
  verificarConflicto(reservaExistente1.id, 1, fechaPrueba, 18, 1.5, reservas),
  null,
  'No debe chocar consigo misma',
)

// 2. Mover reserva-1 a las 19:30 debe chocar con reserva-2 (que está de 20:00 a 21:00)
assert.equal(
  verificarConflicto(reservaExistente1.id, 1, fechaPrueba, 19.5, 1, reservas),
  'reserva',
  '19:30 a 20:30 debe chocar con 20:00 a 21:00',
)

// 3. Mover reserva-1 de 20:00 a 21:00 debe chocar directamente con reserva-2
assert.equal(
  verificarConflicto(reservaExistente1.id, 1, fechaPrueba, 20, 1, reservas),
  'reserva',
  '20:00 a 21:00 choca con reserva 2',
)

// 4. Mover reserva-1 a las 21:00 (justo después de reserva 2) NO debe chocar
assert.equal(
  verificarConflicto(reservaExistente1.id, 1, fechaPrueba, 21, 1, reservas),
  null,
  '21:00 a 22:00 no debe chocar con 20:00 a 21:00',
)

// 5. Mover reserva-1 a otra cancha (Cancha 2) en el mismo horario NO debe chocar
assert.equal(
  verificarConflicto(reservaExistente1.id, 2, fechaPrueba, 20, 1, reservas),
  null,
  'En Cancha 2 a las 20:00 no debe chocar',
)

// 6. Horario que excede la 1:00 am (hora 25)
assert.equal(
  verificarConflicto(reservaExistente1.id, 1, fechaPrueba, 24, 1.5, reservas),
  'excede_cierre',
  '24:00 + 1.5 = 25.5 excede cierre',
)

// 7. Horario que choca con entrenamiento (jueves 2026-11-05 a las 18:00 en Cancha 1)
assert.equal(
  verificarConflicto(reservaExistente1.id, 1, '2026-11-05', 18, 1, reservas),
  'entrenamiento',
  'Jueves a las 18:00 debe detectar entrenamiento',
)

console.log('✔ editarReservaAdmin.check.ts OK')
