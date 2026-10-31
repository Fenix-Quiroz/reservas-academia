import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Check, Clock, X } from 'lucide-react'
import type { BloqueoEvento, Campo, CambiosReservaAdmin, Reserva, ResultadoEditarReserva } from '../../types.js'
import { chocan } from '../../reservas.js'
import { eventoBloquea } from '../../eventos.js'
import { entrenamientoBloquea } from '../../horariosEntrenamiento.js'
import { fechaVisible } from './AdminReservaCard.js'
import { horaVisible, rangoVisible } from '../../utils/fechasReserva.js'
import AdminSelect from './AdminSelect.js'

export interface AdminModalEditarReservaProps {
  reserva: Reserva
  canchas: readonly Campo[]
  reservas: readonly Reserva[]
  eventos?: readonly BloqueoEvento[]
  procesando: boolean
  onClose: () => void
  onGuardar: (cambios: CambiosReservaAdmin) => Promise<ResultadoEditarReserva>
}

function generarOpcionesInicio(): number[] {
  const lista: number[] = []
  for (let h = 7; h <= 24; h += 0.5) {
    lista.push(h)
  }
  return lista
}

const OPCIONES_INICIO = generarOpcionesInicio()

function generarOpcionesFin(inicioActual: number, finActual?: number): number[] {
  const lista: number[] = []
  // La base de datos (PostgreSQL) permite turnos de hasta 3 horas (0.5, 1, 1.5, 2, 2.5, 3)
  const maxHoras = 3
  const topeCalculado = Math.min(25, inicioActual + maxHoras)
  const tope = finActual && finActual > topeCalculado ? Math.min(25, finActual) : topeCalculado
  for (let h = inicioActual + 0.5; h <= tope; h += 0.5) {
    lista.push(Math.round(h * 10) / 10)
  }
  return lista
}

function etiquetaDuracion(horas: number): string {
  if (horas === 0.5) return '30 min'
  if (horas === 1) return '1 hora'
  if (horas === 1.5) return '1 hora y media'
  if (horas === 2) return '2 horas'
  if (horas === 2.5) return '2 horas y media'
  if (horas === 3) return '3 horas'
  if (Number.isInteger(horas)) return `${horas} horas`
  const entero = Math.floor(horas)
  return `${entero} horas y media`
}

export default function AdminModalEditarReserva({
  reserva,
  canchas,
  reservas,
  eventos = [],
  procesando,
  onClose,
  onGuardar,
}: AdminModalEditarReservaProps) {
  const [canchaId, setCanchaId] = useState<number>(reserva.canchaId)
  const [fecha, setFecha] = useState<string>(reserva.fecha)
  const [inicio, setInicio] = useState<number>(reserva.inicio)
  const [fin, setFin] = useState<number>(() => Math.round((reserva.inicio + reserva.horas) * 10) / 10)
  const [alias, setAlias] = useState<string>(reserva.alias)
  const [celular, setCelular] = useState<string>(reserva.celular)
  const [montoTotal, setMontoTotal] = useState<string>(
    String(reserva.montoTotal ?? ((canchas.find((c) => c.id === reserva.canchaId)?.precioHora ?? 0) * reserva.horas)),
  )
  const [montoModificadoManualmente, setMontoModificadoManualmente] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string>('')
  const [guardando, setGuardando] = useState(false)
  const botonCerrarRef = useRef<HTMLButtonElement | null>(null)

  const canchaActual = useMemo(() => canchas.find((c) => c.id === canchaId), [canchas, canchaId])
  const horas = useMemo(() => Math.max(0.5, Math.round((fin - inicio) * 10) / 10), [fin, inicio])
  const opcionesFin = useMemo(() => generarOpcionesFin(inicio, fin), [inicio, fin])

  function manejarCambioInicio(nuevoInicio: number) {
    const duracionActual = fin > inicio ? Math.round((fin - inicio) * 10) / 10 : 1
    setInicio(nuevoInicio)
    const nuevoFin = Math.min(25, Math.max(nuevoInicio + 0.5, Math.round((nuevoInicio + duracionActual) * 10) / 10))
    setFin(nuevoFin)
  }

  function manejarCambioFin(nuevoFin: number) {
    setFin(nuevoFin)
  }

  // Recalcular monto total automáticamente si cambia cancha o duración y el usuario no lo sobreescribió a mano
  useEffect(() => {
    if (!montoModificadoManualmente && canchaActual) {
      setMontoTotal(String(canchaActual.precioHora * horas))
    }
  }, [canchaId, horas, canchaActual, montoModificadoManualmente])

  // Accesibilidad: escape y bloqueo de scroll
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      botonCerrarRef.current?.focus()
    })

    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const manejarTecla = (eventoTeclado: KeyboardEvent) => {
      if (eventoTeclado.key === 'Escape' && !guardando && !procesando) {
        onClose()
      }
    }

    window.addEventListener('keydown', manejarTecla)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = overflowPrevio
      window.removeEventListener('keydown', manejarTecla)
    }
  }, [onClose, guardando, procesando])

  // Detección de conflictos en tiempo real
  const conflicto = useMemo(() => {
    if (inicio + horas > 25) {
      return 'El horario elegido excede la hora de cierre del polideportivo (1:00 am).'
    }

    const diaSemana = new Date(`${fecha}T12:00:00`).getDay()
    if (entrenamientoBloquea(canchaId, diaSemana, inicio, horas)) {
      return 'Este horario coincide con los entrenamientos programados de la academia en esta cancha.'
    }

    for (const ev of eventos) {
      if (ev.estado !== 'cancelado' && eventoBloquea(ev, canchaId, fecha, inicio, horas)) {
        return `Coincide con el evento especial "${ev.nombre}" programado en este campo.`
      }
    }

    for (const r of reservas) {
      if (r.id !== reserva.id && r.estado !== 'cancelado') {
        if (chocan(r, { canchaId, fecha, inicio, horas })) {
          const c = canchas.find((item) => item.id === r.canchaId)
          return `Coincide con la reserva activa de ${r.alias} (${rangoVisible(r.inicio, r.horas)}) en ${c?.nombre ?? 'esta cancha'}.`
        }
      }
    }

    return null
  }, [canchaId, fecha, inicio, horas, eventos, reservas, reserva.id, canchas])

  const hayCambios =
    canchaId !== reserva.canchaId ||
    fecha !== reserva.fecha ||
    inicio !== reserva.inicio ||
    horas !== reserva.horas ||
    alias.trim() !== reserva.alias.trim() ||
    celular.trim() !== reserva.celular.trim() ||
    Number(montoTotal) !== (reserva.montoTotal ?? ((canchas.find((c) => c.id === reserva.canchaId)?.precioHora ?? 0) * reserva.horas))

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (conflicto || guardando || procesando) return

    setErrorEnvio('')
    setGuardando(true)

    try {
      const resultado = await onGuardar({
        canchaId,
        fecha,
        inicio,
        horas,
        montoTotal: Number(montoTotal) || undefined,
        alias: alias.trim() || undefined,
        celular: celular.trim() || undefined,
      })

      if ('error' in resultado) {
        if (resultado.error === 'ocupado') {
          setErrorEnvio('Ese horario ya no está disponible. Alguien más reservó o hay un evento en esa hora.')
        } else if (resultado.error === 'no-existe') {
          setErrorEnvio('La reserva ya no existe.')
        } else {
          setErrorEnvio('No pudimos guardar los cambios. Revisa tu conexión a internet.')
        }
        setGuardando(false)
        return
      }

      onClose()
    } catch {
      setErrorEnvio('Ocurrió un error inesperado al actualizar la reserva.')
      setGuardando(false)
    }
  }

  return (
    <div
      className="admin-modal-comprobante-capa"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-editar-reserva-titulo"
    >
      <article
        className="admin-modal-comprobante admin-modal-editar-reserva"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="admin-modal-comprobante-cabecera">
          <div className="admin-modal-comprobante-info">
            <div className="admin-modal-comprobante-kicker">
              <span>Reprogramar reserva</span>
            </div>
            <h3 id="modal-editar-reserva-titulo" className="admin-modal-comprobante-titulo">
              Editar reserva de {reserva.alias}
            </h3>
            <span className="admin-modal-comprobante-subtitulo">
              Horario actual: {fechaVisible(reserva.fecha)} · {rangoVisible(reserva.inicio, reserva.horas)}
            </span>
          </div>
          <button
            ref={botonCerrarRef}
            type="button"
            className="admin-modal-comprobante-cerrar"
            aria-label="Cerrar modal de edición"
            disabled={guardando || procesando}
            onClick={onClose}
          >
            <X size={20} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} className="admin-modal-editar-reserva-form">
          <div className="admin-modal-editar-reserva-cuerpo">
            {errorEnvio && (
              <p className="error" role="alert">
                {errorEnvio}
              </p>
            )}

            <div className="admin-modal-campos-grid">
              <div className="admin-modal-campo">
                <span>Cancha / Campo</span>
                <AdminSelect
                  value={canchaId}
                  disabled={guardando || procesando}
                  onChange={(val) => setCanchaId(Number(val))}
                  opciones={canchas.map((c) => ({
                    value: c.id,
                    label: `${c.nombre} (${c.jugadores} vs ${c.jugadores})`,
                    detalle: `S/ ${c.precioHora}/h`,
                  }))}
                />
              </div>

              <label className="admin-modal-campo">
                <span>Fecha del turno</span>
                <input
                  type="date"
                  value={fecha}
                  disabled={guardando || procesando}
                  required
                  onChange={(e) => setFecha(e.target.value)}
                />
              </label>

              <div className="admin-modal-campo">
                <span>Hora de inicio</span>
                <AdminSelect
                  value={inicio}
                  disabled={guardando || procesando}
                  onChange={(val) => manejarCambioInicio(Number(val))}
                  opciones={OPCIONES_INICIO.map((hora) => ({
                    value: hora,
                    label: horaVisible(hora),
                  }))}
                />
              </div>

              <div className="admin-modal-campo">
                <span>Hora de fin</span>
                <AdminSelect
                  value={fin}
                  disabled={guardando || procesando}
                  onChange={(val) => manejarCambioFin(Number(val))}
                  opciones={opcionesFin.map((hora) => {
                    const d = Math.round((hora - inicio) * 10) / 10
                    return {
                      value: hora,
                      label: horaVisible(hora),
                      detalle: `(${etiquetaDuracion(d)})`,
                    }
                  })}
                />
              </div>

              <label className="admin-modal-campo">
                <span>Nombre del cliente</span>
                <input
                  type="text"
                  value={alias}
                  disabled={guardando || procesando}
                  required
                  maxLength={24}
                  onChange={(e) => setAlias(e.target.value)}
                />
              </label>

              <label className="admin-modal-campo">
                <span>Celular</span>
                <input
                  type="tel"
                  value={celular}
                  disabled={guardando || procesando}
                  required
                  pattern="9[0-9]{8}"
                  maxLength={9}
                  placeholder="987654321"
                  onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
                />
              </label>

              <label className="admin-modal-campo">
                <span>Total a cobrar (S/)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={montoTotal}
                  disabled={guardando || procesando}
                  required
                  onChange={(e) => {
                    setMontoModificadoManualmente(true)
                    setMontoTotal(e.target.value)
                  }}
                />
              </label>
            </div>

            <div className="admin-modal-resumen-turno">
              <Clock size={16} aria-hidden="true" />
              <span>
                Nuevo turno: <strong>{fechaVisible(fecha)}</strong> de <strong>{rangoVisible(inicio, horas)}</strong> ({etiquetaDuracion(horas)})
              </span>
            </div>

            {conflicto && (
              <div className="admin-eventos-conflicto" role="alert">
                <div className="admin-eventos-conflicto-titulo">
                  <AlertTriangle size={18} strokeWidth={2.5} aria-hidden="true" />
                  <h4>Horario no disponible</h4>
                </div>
                <p className="admin-eventos-conflicto-aviso">{conflicto}</p>
              </div>
            )}
          </div>

          <footer className="admin-modal-comprobante-pie">
            <button
              type="button"
              className="admin-modal-btn admin-modal-btn-secundario"
              onClick={onClose}
              disabled={guardando || procesando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-modal-btn admin-modal-btn-confirmar"
              disabled={guardando || procesando || Boolean(conflicto) || !hayCambios}
            >
              <Check size={16} aria-hidden="true" />
              <span>{guardando || procesando ? 'Guardando cambios…' : 'Guardar cambios'}</span>
            </button>
          </footer>
        </form>
      </article>
    </div>
  )
}
