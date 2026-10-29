import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Clock3, X } from 'lucide-react'
import { horaVisible } from '../../utils/fechasReserva.js'

export interface AdminSelectorHorarioOpcion {
  value: string
  label: string
}

export interface AdminSelectorHorarioProps {
  inicio: string
  fin: string
  opcionesDesde: readonly AdminSelectorHorarioOpcion[]
  opcionesHasta: readonly AdminSelectorHorarioOpcion[]
  onChangeInicio: (value: string) => void
  onChangeFin: (value: string) => void
}

export function mantenerDuracionMinima(inicio: number, fin: number, minima = 5): number {
  return Math.max(fin, inicio + minima)
}

export default function AdminSelectorHorario({
  inicio,
  fin,
  opcionesDesde,
  opcionesHasta,
  onChangeInicio,
  onChangeFin,
}: AdminSelectorHorarioProps) {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const inicioNumero = Number(inicio)
  const finNumero = Number(fin)

  useEffect(() => {
    if (!abierto) return undefined

    const cerrarFuera = (evento: PointerEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) setAbierto(false)
    }
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('pointerdown', cerrarFuera)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [abierto])

  function abrir(): void {
    setAbierto(true)
  }

  function cerrar(): void {
    setAbierto(false)
  }

  return (
    <div className="admin-selector-horario" ref={contenedorRef}>
      <span className="admin-selector-horario-label">Horario</span>
      <button
        className={`admin-selector-horario-trigger${abierto ? ' abierto' : ''}`}
        type="button"
        aria-label="Horario"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={() => (abierto ? cerrar() : abrir())}
      >
        <span className="admin-selector-horario-trigger-contenido">
          <Clock3 size={18} strokeWidth={2.5} aria-hidden="true" />
          <strong>{horaVisible(inicioNumero)} – {horaVisible(finNumero)}</strong>
        </span>
        <ChevronDown size={18} strokeWidth={2.5} aria-hidden="true" />
      </button>

      {abierto && (
        <div className="admin-selector-horario-capa" onClick={cerrar}>
          <section
            className="admin-selector-horario-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-selector-horario-titulo"
            onClick={(evento) => evento.stopPropagation()}
          >
            <header className="admin-selector-horario-modal-cabecera">
              <div>
                <span className="admin-selector-horario-modal-kicker">Horario del evento</span>
                <h3 id="admin-selector-horario-titulo">Selecciona el horario</h3>
              </div>
              <button className="admin-selector-horario-cerrar" type="button" aria-label="Cerrar" onClick={cerrar}>
                <X size={22} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </header>

            <div className="admin-selector-horario-resumen" role="group" aria-label="Rango seleccionado">
              <div
                className="admin-selector-horario-resumen-opcion activa"
                aria-label={`Hora de inicio: ${horaVisible(inicioNumero)}`}
              >
                <span>Desde</span>
                <strong>{horaVisible(inicioNumero)}</strong>
              </div>
              <span className="admin-selector-horario-separador" aria-hidden="true">→</span>
              <div
                className="admin-selector-horario-resumen-opcion activa"
                aria-label={`Hora de fin: ${horaVisible(finNumero)}`}
              >
                <span>Hasta</span>
                <strong>{horaVisible(finNumero)}</strong>
              </div>
            </div>

            <p className="admin-selector-horario-ayuda">Elige directamente el inicio y el fin del horario.</p>

            <div className="admin-selector-horario-columnas">
              <section className="admin-selector-horario-columna admin-selector-horario-columna-desde" aria-label="Horas de inicio">
                <h4>Desde</h4>
                <div className="admin-selector-horario-opciones">
                  {opcionesDesde.map((opcion) => {
                    const valor = Number(opcion.value)
                    const activa = opcion.value === inicio
                    const enRango = valor > inicioNumero && valor <= finNumero
                    return (
                      <button
                        key={opcion.value}
                        className={`admin-selector-horario-opcion${activa ? ' activa' : ''}${enRango ? ' en-rango' : ''}`}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => onChangeInicio(opcion.value)}
                      >
                        <span>{opcion.label}</span>
                        {activa && <Check size={17} strokeWidth={3} aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="admin-selector-horario-columna admin-selector-horario-columna-hasta" aria-label="Horas de fin">
                <h4>Hasta</h4>
                <div className="admin-selector-horario-opciones">
                  {opcionesHasta.map((opcion) => {
                    const valor = Number(opcion.value)
                    const activa = opcion.value === fin
                    const enRango = valor > inicioNumero && valor < finNumero
                    return (
                      <button
                        key={opcion.value}
                        className={`admin-selector-horario-opcion${activa ? ' activa' : ''}${enRango ? ' en-rango' : ''}`}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => onChangeFin(opcion.value)}
                      >
                        <span>{opcion.label}</span>
                        {activa && <Check size={17} strokeWidth={3} aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>

            <footer className="admin-selector-horario-acciones">
              <button className="admin-selector-horario-cancelar" type="button" onClick={cerrar}>Cancelar</button>
              <button className="admin-selector-horario-aplicar" type="button" onClick={cerrar}>Aplicar horario</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
