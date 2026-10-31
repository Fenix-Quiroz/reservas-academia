import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import type { BloqueoEvento, Campo, Reserva } from '../../types.js'
import {
  buscarConflictosEvento,
  horarioEntrenamientoQueBloqueaEvento,
  validarEventoEspecial,
  type DetalleEntrenamiento,
  type EventoEspecialActualizado,
  type ResultadoEventoEspecial,
} from '../../eventos.js'
import { fechaISO } from '../../reservas.js'
import { horaVisible } from '../../utils/fechasReserva.js'
import AdminSelectorHorario from './AdminSelectorHorario'
import { validarCelular } from '../../validacionCliente.js'

export interface AdminModalEditarEventoProps {
  eventos: readonly BloqueoEvento[]
  canchas: readonly Campo[]
  reservas: readonly Reserva[]
  todosLosEventos: readonly BloqueoEvento[]
  procesando: boolean
  onClose: () => void
  onGuardar: (actualizado: EventoEspecialActualizado) => Promise<ResultadoEventoEspecial>
}

function horaEntrenamientoVisible(minuto: number): string {
  return horaVisible(minuto / 60)
}

function opcionesHora(desde: number, hasta: number, paso = 0.5): number[] {
  return Array.from(
    { length: Math.max(0, Math.round((hasta - desde) / paso) + 1) },
    (_, indice) => Math.round((desde + indice * paso) * 10) / 10,
  )
}

export default function AdminModalEditarEvento({
  eventos,
  canchas,
  reservas,
  todosLosEventos,
  procesando,
  onClose,
  onGuardar,
}: AdminModalEditarEventoProps) {
  const principal = eventos[0]
  const grupoId = principal?.grupoId?.trim() || principal?.id || ''

  const [fecha, setFecha] = useState(principal?.fecha ?? fechaISO(new Date()))
  const [inicio, setInicio] = useState(String(principal?.inicio ?? 7))
  const [fin, setFin] = useState(String(principal?.fin ?? 9))
  const [nombre, setNombre] = useState(principal?.nombre ?? '')
  const [celular, setCelular] = useState(principal?.celular ?? '')
  const [notas, setNotas] = useState(principal?.notas ?? '')
  const [precioCobrado, setPrecioCobrado] = useState(String(principal?.precioCobrado ?? 0))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)

  const canchaIds = useMemo(() => [...new Set(eventos.map((e) => e.canchaId))], [eventos])

  const nombresCampos = useMemo(() => (
    canchaIds.map((id) => canchas.find((c) => c.id === id)?.nombre ?? `Campo ${id}`)
  ), [canchaIds, canchas])

  const textoCampos = nombresCampos.length === 1
    ? nombresCampos[0]
    : `${nombresCampos.slice(0, -1).join(', ')} y ${nombresCampos[nombresCampos.length - 1]}`

  const inicioNumero = Number(inicio)
  const finalesDisponibles = useMemo(
    () => opcionesHora(inicioNumero + 2, 25, 0.5),
    [inicioNumero],
  )
  const opcionesDesde = opcionesHora(7, 23, 0.5).map((hora) => ({ value: String(hora), label: horaVisible(hora) }))
  const opcionesHasta = finalesDisponibles.map((hora) => ({ value: String(hora), label: horaVisible(hora) }))

  function cambiarInicio(valor: string): void {
    const nuevoInicio = Number(valor)
    setInicio(valor)
    if (Number(fin) < nuevoInicio + 2) setFin(String(nuevoInicio + 2))
  }

  const finNumero = Number(fin)

  const conflictos = useMemo(() => {
    return buscarConflictosEvento(
      canchaIds,
      fecha,
      inicioNumero,
      finNumero,
      reservas,
      todosLosEventos,
      canchas,
      grupoId,
    )
  }, [canchaIds, fecha, inicioNumero, finNumero, reservas, todosLosEventos, canchas, grupoId])

  useEffect(() => {
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const manejarTecla = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !guardando && !procesando) {
        onClose()
      }
    }
    window.addEventListener('keydown', manejarTecla)
    return () => {
      document.body.style.overflow = overflowPrevio
      window.removeEventListener('keydown', manejarTecla)
    }
  }, [guardando, procesando, onClose])

  async function guardar(ev: FormEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault()
    if (guardandoRef.current || procesando) return
    guardandoRef.current = true
    setGuardando(true)
    setError('')

    try {
      if (conflictos.reservas.length > 0) {
        const primera = conflictos.reservas[0]
        setError(
          `No se puede guardar: ese horario choca con la reserva de ${primera?.cliente} en ${primera?.canchaNombre} (${primera?.horarioTexto}).`,
        )
        return
      }
      if (conflictos.eventos.length > 0) {
        const primero = conflictos.eventos[0]
        setError(
          `No se puede guardar: coincide con el evento "${primero?.nombre}" en ${primero?.canchaNombre} (${primero?.horarioTexto}).`,
        )
        return
      }

      const simulado = {
        canchaIds,
        fecha,
        inicio: inicioNumero,
        fin: finNumero,
        nombre: nombre.trim(),
        celular: celular.trim(),
        notas: notas.trim(),
        tipo: principal?.tipo ?? 'individual',
        precioCobrado: Number(precioCobrado),
      }

      if (nombre.trim().length < 2) {
        setError('El nombre del evento debe tener al menos 2 caracteres.')
        return
      }
      if (celular.trim() && validarCelular(celular.trim()) !== null) {
        setError('El celular debe tener 9 dígitos y empezar con 9.')
        return
      }
      if (Number(precioCobrado) < 0 || Number.isNaN(Number(precioCobrado))) {
        setError('El precio cobrado debe ser un número mayor o igual a 0.')
        return
      }
      if (finNumero - inicioNumero < 1) {
        setError('La duración mínima de un evento es de 1 hora.')
        return
      }
      if (!validarEventoEspecial(simulado)) {
        setError('Revisa los datos del evento.')
        return
      }

      for (const id of canchaIds) {
        const entrenamiento = horarioEntrenamientoQueBloqueaEvento({
          canchaId: id,
          fecha,
          inicio: inicioNumero,
          fin: finNumero,
        })
        if (entrenamiento) {
          setError(
            `No es posible reservar estas horas porque hay entrenamiento de ${horaEntrenamientoVisible(entrenamiento.inicioMinuto)} a ${horaEntrenamientoVisible(entrenamiento.finMinuto)}.`,
          )
          return
        }
      }

      const actualizado: EventoEspecialActualizado = {
        grupoId,
        fecha,
        inicio: inicioNumero,
        fin: finNumero,
        nombre: nombre.trim(),
        celular: celular.trim(),
        notas: notas.trim(),
        precioCobrado: Number(precioCobrado),
      }

      const res = await onGuardar(actualizado)
      if ('error' in res) {
        if (res.error === 'entrenamiento-ocupado') {
          const h = 'entrenamiento' in res ? (res as { entrenamiento?: DetalleEntrenamiento }).entrenamiento : undefined
          setError(
            h
              ? `Hay entrenamiento de ${horaEntrenamientoVisible(h.inicioMinuto)} a ${horaEntrenamientoVisible(h.finMinuto)}.`
              : 'Hay entrenamiento programado en ese horario.',
          )
          return
        }
        if (res.error === 'datos-invalidos') {
          setError('Revisa los datos del evento. Si ingresaste un celular, debe tener 9 dígitos y empezar con 9.')
          return
        }
        if (res.error === 'ocupado') {
          setError('Ese horario ya está ocupado por otra reserva o evento.')
          return
        }
        setError('No pudimos guardar los cambios. Revisa tu conexión.')
        return
      }

      onClose()
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  return (
    <div
      className="admin-modal-comprobante-capa"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-editar"
      onClick={() => {
        if (!guardando && !procesando) onClose()
      }}
    >
      <article
        className="admin-modal-comprobante admin-modal-editar-contenido"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-comprobante-cabecera">
          <div className="admin-modal-comprobante-info">
            <span className="admin-modal-comprobante-kicker">
              <Pencil size={14} aria-hidden="true" />
              Editar reserva especial
            </span>
            <h3 id="titulo-modal-editar" className="admin-modal-comprobante-titulo">
              {principal?.nombre || 'Evento especial'}
            </h3>
            <span className="admin-modal-comprobante-subtitulo">
              {textoCampos}
            </span>
          </div>
          <button
            type="button"
            className="admin-modal-comprobante-cerrar"
            onClick={onClose}
            disabled={guardando || procesando}
            aria-label="Cerrar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={(e) => void guardar(e)} className="admin-modal-editar-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="admin-modal-editar-grid">
            <label>
              <span>Fecha</span>
              <input
                type="date"
                value={fecha}
                min={fechaISO(new Date())}
                required
                onChange={(e) => setFecha(e.target.value)}
              />
            </label>

            <div className="admin-modal-editar-horario">
              <AdminSelectorHorario
                inicio={inicio}
                fin={fin}
                opcionesDesde={opcionesDesde}
                opcionesHasta={opcionesHasta}
                onChangeInicio={cambiarInicio}
                onChangeFin={setFin}
              />
            </div>

            <label>
              <span>Nombre del evento</span>
              <input
                value={nombre}
                required
                maxLength={80}
                placeholder="Ej.: torneo escolar"
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>

            <label>
              <span>Precio cobrado (S/)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={precioCobrado}
                required
                onChange={(e) => setPrecioCobrado(e.target.value)}
              />
            </label>

            <label>
              <span>Celular (opcional)</span>
              <input
                type="tel"
                inputMode="numeric"
                value={celular}
                maxLength={9}
                placeholder="987654321"
                onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
              />
            </label>

            <label className="admin-modal-editar-notas">
              <span>Notas (opcional)</span>
              <textarea
                value={notas}
                maxLength={240}
                rows={2}
                placeholder="Información para el encargado"
                onChange={(e) => setNotas(e.target.value)}
              />
            </label>
          </div>

          <div className="admin-modal-editar-acciones">
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
              disabled={guardando || procesando}
            >
              <Check size={16} aria-hidden="true" />
              <span>{guardando || procesando ? 'Guardando…' : 'Guardar cambios'}</span>
            </button>
          </div>
        </form>
      </article>
    </div>
  )
}
