import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, X } from 'lucide-react'
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

export function mantenerDuracionMinima(inicio: number, fin: number, minima = 2): number {
  return Math.max(fin, inicio + minima)
}

export function calcularGridEstiloHorario(total: number): React.CSSProperties {
  const columnasDesktop = Math.min(3, Math.max(1, total))
  const columnasMovil = Math.min(2, Math.max(1, total))
  const filasDesktop = Math.ceil(total / columnasDesktop)
  const filasMovil = Math.ceil(total / columnasMovil)

  return {
    '--admin-selector-columnas': columnasDesktop,
    '--admin-selector-columnas-movil': columnasMovil,
    '--admin-selector-filas': filasDesktop,
    '--admin-selector-filas-movil': filasMovil,
  } as React.CSSProperties
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
  const [paso, setPaso] = useState<1 | 2>(1)
  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const modalRef = useRef<HTMLElement | null>(null)
  const inicioNumero = Number(inicio)
  const finNumero = Number(fin)

  useEffect(() => {
    if (!abierto) return undefined

    const cerrarFuera = (evento: PointerEvent) => {
      const target = evento.target as Node
      if (contenedorRef.current?.contains(target)) return
      if (modalRef.current?.contains(target)) return
      setAbierto(false)
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
    setPaso(1)
    setAbierto(true)
  }

  function cerrar(): void {
    setAbierto(false)
  }

  function seleccionarInicio(valor: string): void {
    onChangeInicio(valor)
    setPaso(2)
  }

  const modalElemento = abierto ? (
    <div className="admin-selector-horario-capa" onClick={cerrar}>
      <section
        ref={modalRef}
        className="admin-selector-horario-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-selector-horario-titulo"
        onClick={(evento) => evento.stopPropagation()}
      >
            <header className="admin-selector-horario-modal-cabecera">
              <div>
                <span className="admin-selector-horario-modal-kicker">
                  Paso {paso} de 2 · Horario del evento
                </span>
                <h3 id="admin-selector-horario-titulo">
                  {paso === 1 ? 'Selecciona el horario de inicio' : 'Selecciona el horario de fin'}
                </h3>
              </div>
              <button className="admin-selector-horario-cerrar" type="button" aria-label="Cerrar" onClick={cerrar}>
                <X size={22} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </header>

            <div className="admin-selector-horario-resumen" role="tablist" aria-label="Pasos de selección de horario">
              <button
                type="button"
                role="tab"
                aria-selected={paso === 1}
                className={`admin-selector-horario-resumen-opcion${paso === 1 ? ' activa' : ''}`}
                onClick={() => setPaso(1)}
              >
                <span className="admin-selector-horario-resumen-tag">Paso 1 · Desde</span>
                <strong>{horaVisible(inicioNumero)}</strong>
              </button>

              <span className="admin-selector-horario-separador" aria-hidden="true">→</span>

              <button
                type="button"
                role="tab"
                aria-selected={paso === 2}
                className={`admin-selector-horario-resumen-opcion${paso === 2 ? ' activa' : ''}`}
                onClick={() => setPaso(2)}
              >
                <span className="admin-selector-horario-resumen-tag">Paso 2 · Hasta</span>
                <strong>{horaVisible(finNumero)}</strong>
              </button>
            </div>

            <p className="admin-selector-horario-ayuda">
              {paso === 1
                ? 'Elige directamente la hora de inicio. Pasará al fin automáticamente.'
                : 'Elige la hora de finalización del evento.'}
            </p>

            <div className="admin-selector-horario-pasos-wrapper">
              {paso === 1 ? (
                <section
                  className="admin-selector-horario-columna admin-selector-horario-columna-desde"
                  aria-label="Horas de inicio"
                >
                  <div className="admin-selector-horario-paso-header">
                    <h4>Hora de inicio</h4>
                  </div>
                  <div className="admin-selector-horario-opciones" style={calcularGridEstiloHorario(opcionesDesde.length)}>
                    {opcionesDesde.map((opcion) => {
                      const activa = opcion.value === inicio
                      return (
                        <button
                          key={opcion.value}
                          className={`admin-selector-horario-opcion${activa ? ' activa' : ''}`}
                          type="button"
                          aria-pressed={activa}
                          onClick={() => seleccionarInicio(opcion.value)}
                        >
                          <span>{opcion.label}</span>
                          {activa && <Check size={17} strokeWidth={3} aria-hidden="true" />}
                        </button>
                      )
                    })}
                  </div>
                </section>
              ) : (
                <section
                  className="admin-selector-horario-columna admin-selector-horario-columna-hasta"
                  aria-label="Horas de fin"
                >
                  <div className="admin-selector-horario-paso-header">
                    <h4>Hora de finalización</h4>
                  </div>
                  <div className="admin-selector-horario-opciones" style={calcularGridEstiloHorario(opcionesHasta.length)}>
                    {opcionesHasta.map((opcion) => {
                      const activa = opcion.value === fin
                      return (
                        <button
                          key={opcion.value}
                          className={`admin-selector-horario-opcion${activa ? ' activa' : ''}`}
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
              )}
            </div>

            <footer className="admin-selector-horario-acciones">
              {paso === 1 ? (
                <>
                  <button className="admin-selector-horario-cancelar" type="button" onClick={cerrar}>
                    Cancelar
                  </button>
                  <button
                    className="admin-selector-horario-aplicar admin-selector-horario-btn-nav"
                    type="button"
                    onClick={() => setPaso(2)}
                  >
                    <span>Elegir hora de fin</span>
                    <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="admin-selector-horario-cancelar admin-selector-horario-btn-nav"
                    type="button"
                    onClick={() => setPaso(1)}
                  >
                    <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" />
                    <span>Cambiar inicio</span>
                  </button>
                  <button className="admin-selector-horario-aplicar" type="button" onClick={cerrar}>
                    Aplicar horario
                  </button>
                </>
              )}
            </footer>
          </section>
        </div>
  ) : null

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

      {modalElemento && (typeof document !== 'undefined' ? createPortal(modalElemento, document.body) : modalElemento)}
    </div>
  )
}
