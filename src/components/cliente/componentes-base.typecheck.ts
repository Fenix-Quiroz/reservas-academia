import type { Cliente } from '../../types.js'
import CabeceraCliente from './CabeceraCliente.js'
import ProgresoReserva from './ProgresoReserva.js'

const yo: Cliente = { alias: 'Equipo Jaguar', celular: '987654321' }

const cabecera = CabeceraCliente({
  verMias: false,
  paso: 1,
  yo,
  cantidadReservas: 0,
  onBack: () => undefined,
  onViewBookings: () => undefined,
})
const progreso = ProgresoReserva({
  paso: 2,
  nombresPasos: ['Campo', 'Día y hora', 'Tus datos'],
})

void [cabecera, progreso]
