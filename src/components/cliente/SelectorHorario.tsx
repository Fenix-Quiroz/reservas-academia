import { type RefObject } from 'react'
import { DURACION_BLOQUE, esBloqueAislado, rangoLibre, type HorarioDisponible } from '../../reservas'
import type { Campo } from '../../types.js'
import type { EtapaHorario, TurnoHorario } from '../../borradorReserva'

type Etapa = 'dia' | 'turno' | 'horario'
import { horaVisible, nombreDia, nombreDiaCorto } from '../../utils/fechasReserva'

const DIAS_POR_SEMANA = 7
const TOTAL_SEMANAS = 3
const TOTAL_DIAS = DIAS_POR_SEMANA * TOTAL_SEMANAS
const MIN_HORAS_SECUENCIA = 1
const MAX_HORAS = 3

const etiquetaSemana = (indice: number): string =>
  indice === 0 ? 'Esta semana' : indice === 1 ? 'Próxima semana' : `En ${indice} semanas`

const rangoSemana = (indice: number): string => {
  const inicio = indice * DIAS_POR_SEMANA
  return `${nombreDiaCorto(inicio).detalle}–${nombreDiaCorto(inicio + DIAS_POR_SEMANA - 1).detalle}`
}

const GRUPOS = [
  // `hasta` es exclusivo: 13 representa la 1:00 p. m., 19 las 7:00 p. m.
  { clave: 'manana', nombre: 'Mañana', icono: '🌅', desde: 7, hasta: 13 },
  { clave: 'tarde', nombre: 'Tarde', icono: '☀️', desde: 13, hasta: 19 },
  { clave: 'noche', nombre: 'Noche', icono: '🌙', desde: 19, hasta: 25 },
] as const

export interface SelectorHorarioProps {
  cancha: Campo
  horariosDisponibles: HorarioDisponible[]
  cargando: boolean
  dia: number
  onDiaChange: (dia: number) => void
  etapa: EtapaHorario
  onEtapaChange: (etapa: EtapaHorario) => void
  turno: TurnoHorario | null
  onTurnoChange: (turno: TurnoHorario | null) => void
  semana: number
  onSemanaChange: (semana: number) => void
  horas: number
  onHorasChange: (horas: number) => void
  fecha: string
  inicio: number | null
  onSelectHour: (inicio: number) => void
  onClearHour: () => void
  onConfirmHour: () => void
  tituloRef: RefObject<HTMLHeadingElement | null>
}

export default function SelectorHorario({
  cancha,
  horariosDisponibles,
  cargando,
  dia,
  onDiaChange,
  etapa,
  onEtapaChange,
  turno,
  onTurnoChange,
  semana,
  onSemanaChange,
  horas,
  onHorasChange,
  fecha,
  inicio,
  onSelectHour,
  onClearHour,
  onConfirmHour,
  tituloRef,
}: SelectorHorarioProps) {
  const setEtapa = onEtapaChange
  const grupoSeleccionado = GRUPOS.find((grupo) => grupo.clave === turno)
  const listaTurno = grupoSeleccionado
    ? horariosDisponibles.filter((h) => h.inicio >= grupoSeleccionado.desde && h.inicio < grupoSeleccionado.hasta)
    : []
  const duracionMinima = (nuevoInicio: number): number =>
    esBloqueAislado(horariosDisponibles, nuevoInicio) ? DURACION_BLOQUE : MIN_HORAS_SECUENCIA
  const hayInicioValido = listaTurno.some((h) => h.libre && rangoLibre(horariosDisponibles, h.inicio, duracionMinima(h.inicio)))
  const resumenDia = nombreDiaCorto(dia)

  const elegirDia = (nuevoDia: number) => {
    onDiaChange(nuevoDia)
    onHorasChange(MIN_HORAS_SECUENCIA)
    onClearHour()
    onTurnoChange(null)
    setEtapa('turno')
  }

  const cambiarSemana = (nuevaSemana: number) => {
    onHorasChange(MIN_HORAS_SECUENCIA)
    onClearHour()
    onTurnoChange(null)
    setEtapa('dia')
    onSemanaChange(nuevaSemana)
  }

  const elegirTurno = (nuevoTurno: TurnoHorario) => {
    onHorasChange(MIN_HORAS_SECUENCIA)
    onClearHour()
    onTurnoChange(nuevoTurno)
    setEtapa('horario')
  }

  const elegirBloque = (nuevoInicio: number) => {
    if (inicio === null) {
      const minimo = duracionMinima(nuevoInicio)
      if (rangoLibre(horariosDisponibles, nuevoInicio, minimo)) {
        onSelectHour(nuevoInicio)
        onHorasChange(minimo)
      }
      return
    }

    const minimoSeleccion = duracionMinima(inicio)

    if (nuevoInicio === inicio + horas && horas < MAX_HORAS && rangoLibre(horariosDisponibles, inicio, horas + DURACION_BLOQUE)) {
      onHorasChange(horas + DURACION_BLOQUE)
      return
    }

    if (nuevoInicio === inicio + horas - DURACION_BLOQUE && horas > minimoSeleccion) {
      onHorasChange(horas - DURACION_BLOQUE)
      return
    }

    if (nuevoInicio >= inicio && nuevoInicio < inicio + horas) return

    const minimo = duracionMinima(nuevoInicio)
    if (rangoLibre(horariosDisponibles, nuevoInicio, minimo)) {
      onSelectHour(nuevoInicio)
      onHorasChange(minimo)
    }
  }

  const volver = () => {
    onClearHour()
    if (etapa === 'turno') {
      onTurnoChange(null)
      setEtapa('dia')
    } else if (etapa === 'horario') {
      onHorasChange(MIN_HORAS_SECUENCIA)
      setEtapa('turno')
    }
  }

  const limpiarSeleccion = () => {
    onClearHour()
    onHorasChange(MIN_HORAS_SECUENCIA)
  }

  return (
    <section>
      <h1 ref={tituloRef} tabIndex={-1}>
        {cancha.nombre} · {cancha.deporte ?? `Fútbol ${cancha.jugadores}`} · para {cancha.jugadores * 2} jugadores
      </h1>

      {etapa !== 'dia' && (
        <button className="enlace selector-volver" type="button" onClick={volver}>
          ← {etapa === 'turno' ? 'Cambiar día' : 'Cambiar turno'}
        </button>
      )}

      {etapa !== 'dia' && (
        <div className="selector-resumen" aria-label="Resumen de tu reserva">
          <span className="selector-resumen-titulo">Resumen</span>
          <div className="selector-resumen-chips" role="list">
            <span className="selector-resumen-chip" role="listitem">
              <span className="selector-resumen-chip-icon" aria-hidden="true">▣</span>
              <span>{resumenDia.titulo} {resumenDia.detalle}</span>
            </span>
            {grupoSeleccionado && (
              <span className="selector-resumen-chip" role="listitem">
                <span className="selector-resumen-chip-icon" aria-hidden="true">☀</span>
                <span>{grupoSeleccionado.nombre}</span>
              </span>
            )}
            {inicio !== null && (
              <span className="selector-resumen-chip" role="listitem">
                <span className="selector-resumen-chip-icon" aria-hidden="true">◷</span>
                <span>{horaVisible(inicio)}–{horaVisible(inicio + horas)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {etapa === 'dia' && (
        <fieldset className="selector-grupo">
          <legend>1. Elige el día</legend>
          <div className="selector-semanas" role="group" aria-label="Selecciona la semana">
            {Array.from({ length: TOTAL_SEMANAS }, (_, indice) => (
              <button
                key={indice}
                className="selector-semana"
                type="button"
                aria-pressed={indice === semana}
                onClick={() => cambiarSemana(indice)}
              >
                <span>{etiquetaSemana(indice)}</span>
                {indice === 2 && <small className="selector-semana-rango">{rangoSemana(indice)}</small>}
              </button>
            ))}
          </div>
          <div className="dias">
            {Array.from({ length: DIAS_POR_SEMANA }, (_, indice) => {
              const d = semana * DIAS_POR_SEMANA + indice
              return (
                <button key={d} className="chip dia" type="button" aria-label={nombreDia(d, true)} aria-pressed={d === dia} onClick={() => elegirDia(d)}>
                  <span>{nombreDiaCorto(d).titulo}</span>
                  <small>{nombreDiaCorto(d).detalle}</small>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {etapa === 'turno' && (
        <fieldset className="selector-grupo">
          <legend>2. Elige el turno</legend>
          <div className="turnos">
            {GRUPOS.map((grupo) => (
              <button key={grupo.clave} className="chip grande turno" type="button" aria-pressed={grupo.clave === turno} onClick={() => elegirTurno(grupo.clave)}>
                <span aria-hidden="true">{grupo.icono}</span> {grupo.nombre}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {etapa === 'horario' && grupoSeleccionado && (
        <fieldset className="selector-grupo">
          <legend>3. Elige el horario</legend>
          <p className="ayuda-horario">Elige cuánto tiempo quieres reservar: desde 1 hora hasta un máximo de 3 horas.</p>
          {cargando && <p className="aviso" role="status">Buscando horas disponibles…</p>}
          {!cargando && !hayInicioValido && (
            <div className="aviso" role="status">Ya no quedan horas libres {nombreDia(dia, true)}.
              {dia < TOTAL_DIAS - 1 && (
                <button className="enlace" type="button" onClick={() => { onDiaChange(dia + 1); onHorasChange(MIN_HORAS_SECUENCIA); onClearHour() }}>
                  Ver {nombreDia(dia + 1, true)} →
                </button>
              )}
            </div>
          )}
          <div className="horarios-agenda">
            {listaTurno.map((h) => {
              const seleccionado = inicio !== null && h.inicio >= inicio && h.inicio < inicio + horas
              const puedeSeleccionarse = inicio === null
                ? rangoLibre(horariosDisponibles, h.inicio, duracionMinima(h.inicio))
                : h.inicio === inicio + horas
                  ? horas < MAX_HORAS && rangoLibre(horariosDisponibles, inicio, horas + DURACION_BLOQUE)
                  : h.inicio === inicio + horas - DURACION_BLOQUE
                    ? horas > duracionMinima(inicio)
                    : !seleccionado && rangoLibre(horariosDisponibles, h.inicio, duracionMinima(h.inicio))
              const esInicioSeleccionado = seleccionado && h.inicio === inicio
              const esFinSeleccionado = seleccionado && h.inicio + DURACION_BLOQUE === inicio + horas
              const claseFila = [
                'horario-fila',
                seleccionado ? 'seleccionado' : '',
                esInicioSeleccionado ? 'seleccionado-inicio' : '',
                esFinSeleccionado ? 'seleccionado-fin' : '',
                !h.libre ? 'ocupado' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={h.inicio}
                  className={claseFila}
                  type="button"
                  aria-label={`${horaVisible(h.inicio)} a ${horaVisible(h.inicio + DURACION_BLOQUE)}`}
                  aria-pressed={seleccionado}
                  disabled={!h.libre || !puedeSeleccionarse}
                  onClick={() => elegirBloque(h.inicio)}
                >
                  <span className="horario-rango">
                    <span>{horaVisible(h.inicio)}</span>
                    <span className="hora-conector">a</span>
                    <span>{horaVisible(h.inicio + DURACION_BLOQUE)}</span>
                  </span>
                  <span className="horario-precio">S/ {(cancha.precioHora / 2).toFixed(2)}</span>
                  <span className="horario-estado">{h.libre ? (seleccionado ? 'Seleccionado' : 'Libre') : 'Ocupado'}</span>
                </button>
              )
            })}
          </div>
          {inicio !== null && (
            <div className="hora-confirmacion" aria-live="polite">
              <p>Hora elegida: <strong>{horaVisible(inicio)} a {horaVisible(inicio + horas)}</strong></p>
              <button
                className="boton-secundario eliminar-seleccion"
                type="button"
                aria-label="Eliminar selección de horario"
                onClick={limpiarSeleccion}
              >
                ✕ Eliminar selección
              </button>
              <button className="boton-principal" type="button" onClick={onConfirmHour}>
                Continuar con mis datos <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </fieldset>
      )}
    </section>
  )
}
