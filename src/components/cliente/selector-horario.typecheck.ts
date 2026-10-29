import type { Campo } from '../../types.js'
import SelectorHorario from './SelectorHorario.js'

const cancha: Campo = {
  id: 1,
  nombre: 'Campo 1',
  deporte: 'Fútbol 5',
  jugadores: 5,
  precioHora: 60,
  color: '#a97818',
  imagen: '/campos/campo-1-futbol-5.webp',
  oferta: 'Alquila este campo y recibe 1 agua de 625 ml',
}
const vista = SelectorHorario({
  cancha,
  horariosDisponibles: [],
  cargando: false,
  dia: 0,
  onDiaChange: (dia) => dia,
  etapa: 'dia',
  onEtapaChange: (etapa) => etapa,
  turno: null,
  onTurnoChange: (turno) => turno,
  semana: 0,
  onSemanaChange: (semana) => semana,
  horas: 1,
  onHorasChange: (horas) => horas,
  fecha: '2026-10-21',
  inicio: null,
  onSelectHour: (inicio) => inicio,
  onClearHour: () => undefined,
  onConfirmHour: () => undefined,
  tituloRef: { current: null },
})

void vista
