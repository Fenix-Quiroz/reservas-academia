import type { RefObject } from 'react'
import { horarios } from '../../reservas'
import type { Campo, Reserva } from '../../types.js'
import { horaVisible, nombreDia, nombreDiaCorto } from '../../utils/fechasReserva'

const DIAS = 7
const GRUPOS = [
  // "En la mañana" y no "Mañana", para no confundir con el día de mañana
  { nombre: 'En la mañana', icono: '🌅', desde: 0, hasta: 12 },
  { nombre: 'En la tarde', icono: '☀️', desde: 12, hasta: 18 },
  { nombre: 'En la noche', icono: '🌙', desde: 18, hasta: 24 },
] as const

export interface SelectorHorarioProps {
  cancha: Campo
  reservas: Reserva[]
  dia: number
  onDiaChange: (dia: number) => void
  horas: number
  onHorasChange: (horas: number) => void
  fecha: string
  inicio: number | null
  onSelectHour: (inicio: number) => void
  onConfirmHour: () => void
  tituloRef: RefObject<HTMLHeadingElement | null>
}

export default function SelectorHorario({
  cancha,
  reservas,
  dia,
  onDiaChange,
  horas,
  onHorasChange,
  fecha,
  inicio,
  onSelectHour,
  onConfirmHour,
  tituloRef,
}: SelectorHorarioProps) {
  const lista = horarios(reservas, cancha.id, fecha, horas)
  const hayLibres = lista.some((h) => h.libre)

  return (
    <section>
      <h1 ref={tituloRef} tabIndex={-1}>¿Qué día y a qué hora?</h1>
      <p className="subtitulo">
        {cancha.nombre} · {cancha.deporte ?? `Fútbol ${cancha.jugadores}`} · para {cancha.jugadores * 2} jugadores
      </p>

      <fieldset className="selector-grupo">
        <legend>1. Elige el día</legend>
        <div className="dias">
          {Array.from({ length: DIAS }, (_, d) => (
            <button key={d} className="chip dia" aria-label={nombreDia(d, true)} aria-pressed={d === dia} onClick={() => onDiaChange(d)}>
              <span>{nombreDiaCorto(d).titulo}</span>
              <small>{nombreDiaCorto(d).detalle}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="selector-grupo">
        <legend>2. ¿Cuánto tiempo quieres jugar?</legend>
        <div className="duraciones">
          {[1, 2].map((duracion) => (
            <button key={duracion} className="chip grande" aria-pressed={duracion === horas} onClick={() => onHorasChange(duracion)}>
              {duracion === 1 ? '1 hora' : '2 horas'}
              <small>S/ {cancha.precioHora * duracion}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="selector-grupo">
        <legend>3. Elige una hora</legend>
        {!hayLibres && (
          <div className="aviso" role="status">Ya no quedan horas libres {nombreDia(dia, true)}.
            {dia < DIAS - 1 && (
              <button className="enlace" onClick={() => onDiaChange(dia + 1)}>
                Ver {nombreDia(dia + 1, true)} →
              </button>
            )}
          </div>
        )}
        {GRUPOS.map((grupo) => {
          const delGrupo = lista.filter((h) => h.inicio >= grupo.desde && h.inicio < grupo.hasta)
          if (!delGrupo.length) return null
          return (
            <div key={grupo.nombre} className="grupo">
              <h3>
                <span aria-hidden="true">{grupo.icono}</span> {grupo.nombre}
              </h3>
              <div className="horas">
                {delGrupo.map((h) => (
                  <button key={h.inicio} className="hora" aria-pressed={h.inicio === inicio} disabled={!h.libre} onClick={() => onSelectHour(h.inicio)}>
                    <span className="hora-rango">
                      <span>{horaVisible(h.inicio)}</span>
                      <span className="hora-conector">a</span>
                      <span>{horaVisible(h.inicio + horas)}</span>
                    </span>
                    <small>{h.libre ? 'Libre' : 'Ocupado'}</small>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {inicio !== null && (
          <div className="hora-confirmacion" aria-live="polite">
            <p>Hora elegida: <strong>{horaVisible(inicio)} a {horaVisible(inicio + horas)}</strong></p>
            <button className="boton-principal" type="button" onClick={onConfirmHour}>
              Continuar con mis datos <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </fieldset>
    </section>
  )
}
