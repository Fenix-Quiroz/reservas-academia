import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { BloqueoEvento, Campo } from '../../types.js'
import {
  validarBloqueoEvento,
  type BloqueoEventoNuevo,
  type ResultadoCancelacionEvento,
  type ResultadoEvento,
} from '../../eventos.js'
import { fechaISO } from '../../reservas.js'
import { horaVisible } from '../../utils/fechasReserva.js'

export interface AdminEventosProps {
  eventos: readonly BloqueoEvento[]
  canchas: readonly Campo[]
  cargando: boolean
  procesando: boolean
  onCrear: (evento: BloqueoEventoNuevo) => Promise<ResultadoEvento>
  onCancelar: (id: string) => Promise<ResultadoCancelacionEvento>
}

function mensajeError(resultado: ResultadoEvento | ResultadoCancelacionEvento): string {
  if (!('error' in resultado)) return ''
  if (resultado.error === 'ocupado') return 'Ese rango ya está ocupado por una reserva u otro evento.'
  if (resultado.error === 'datos-invalidos') return 'Revisa los datos: el evento debe durar al menos 5 horas.'
  if (resultado.error === 'no-existe') return 'Ese evento ya no existe o ya fue cancelado.'
  return 'No pudimos guardar el evento. Revisa la conexión e inténtalo de nuevo.'
}

function fechaVisible(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function opcionesHora(desde: number, hasta: number): number[] {
  return Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, indice) => desde + indice)
}

export default function AdminEventos({
  eventos,
  canchas,
  cargando,
  procesando,
  onCrear,
  onCancelar,
}: AdminEventosProps) {
  const [canchaId, setCanchaId] = useState(canchas[0]?.id ?? 1)
  const [fecha, setFecha] = useState(fechaISO(new Date()))
  const [inicio, setInicio] = useState('7')
  const [fin, setFin] = useState('12')
  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const inicioNumero = Number(inicio)
  const finalesDisponibles = useMemo(
    () => opcionesHora(inicioNumero + 5, 25),
    [inicioNumero],
  )

  function cambiarInicio(valor: string): void {
    const nuevoInicio = Number(valor)
    setInicio(valor)
    if (Number(fin) < nuevoInicio + 5) setFin(String(nuevoInicio + 5))
  }

  async function crear(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setError('')
    setExito('')
    const nuevo: BloqueoEventoNuevo = {
      canchaId,
      fecha,
      inicio: inicioNumero,
      fin: Number(fin),
      nombre: nombre.trim(),
      celular: celular.trim(),
      notas: notas.trim(),
    }
    if (!validarBloqueoEvento(nuevo)) {
      setError(mensajeError({ error: 'datos-invalidos' }))
      return
    }
    const resultado = await onCrear(nuevo)
    if ('error' in resultado) {
      setError(mensajeError(resultado))
      return
    }
    setNombre('')
    setCelular('')
    setNotas('')
    setExito('Evento guardado. Esas horas ya no aparecen disponibles para los clientes.')
  }

  async function cancelar(id: string): Promise<void> {
    setError('')
    setExito('')
    const resultado = await onCancelar(id)
    if ('error' in resultado) {
      setError(mensajeError(resultado))
      return
    }
    setExito('Evento cancelado. El horario puede volver a reservarse.')
  }

  const activos = eventos.filter((evento) => evento.estado === 'activo')

  return (
    <section className="admin-eventos" aria-labelledby="titulo-eventos">
      <div className="admin-eventos-cabecera">
        <div>
          <p className="admin-kicker">Reservas especiales</p>
          <h2 id="titulo-eventos">Bloquear horas para eventos</h2>
          <p className="admin-eventos-ayuda">
            Úsalo para torneos o eventos de 5 horas o más. El cliente verá esas horas como no disponibles.
          </p>
        </div>
      </div>

      {(error || exito) && (
        <p className={error ? 'error' : 'exito'} role={error ? 'alert' : 'status'}>
          {error || exito}
        </p>
      )}

      <form className="admin-eventos-form" onSubmit={(evento) => void crear(evento)}>
        <label>
          <span>Campo</span>
          <select value={canchaId} onChange={(evento) => setCanchaId(Number(evento.target.value))}>
            {canchas.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}
          </select>
        </label>
        <label>
          <span>Fecha</span>
          <input type="date" value={fecha} min={fechaISO(new Date())} required onChange={(evento) => setFecha(evento.target.value)} />
        </label>
        <label>
          <span>Desde</span>
          <select value={inicio} onChange={(evento) => cambiarInicio(evento.target.value)}>
            {opcionesHora(7, 20).map((hora) => <option key={hora} value={hora}>{horaVisible(hora)}</option>)}
          </select>
        </label>
        <label>
          <span>Hasta</span>
          <select value={fin} onChange={(evento) => setFin(evento.target.value)}>
            {finalesDisponibles.map((hora) => <option key={hora} value={hora}>{horaVisible(hora)}</option>)}
          </select>
        </label>
        <label>
          <span>Nombre del evento</span>
          <input value={nombre} required maxLength={80} placeholder="Ej.: torneo escolar" onChange={(evento) => setNombre(evento.target.value)} />
        </label>
        <label>
          <span>Celular (opcional)</span>
          <input type="tel" inputMode="numeric" value={celular} maxLength={9} placeholder="987654321" onChange={(evento) => setCelular(evento.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="admin-eventos-notas">
          <span>Notas (opcional)</span>
          <textarea value={notas} maxLength={240} rows={2} placeholder="Información para el encargado" onChange={(evento) => setNotas(evento.target.value)} />
        </label>
        <button className="admin-boton admin-control-primario admin-eventos-guardar" type="submit" disabled={procesando}>
          {procesando ? 'Guardando…' : 'Reservar evento'}
        </button>
      </form>

      <div className="admin-eventos-lista" aria-live="polite">
        <h3>Eventos activos</h3>
        {cargando ? <p>Cargando eventos…</p> : activos.length === 0 ? <p>No hay eventos especiales activos.</p> : activos.map((evento) => (
          <article className="admin-evento-fila" key={evento.id}>
            <div>
              <strong>{evento.nombre}</strong>
              <span>{canchas.find((cancha) => cancha.id === evento.canchaId)?.nombre ?? `Campo ${evento.canchaId}`} · {fechaVisible(evento.fecha)}</span>
              <span>{horaVisible(evento.inicio)} a {horaVisible(evento.fin)}{evento.celular ? ` · ${evento.celular}` : ''}</span>
              {evento.notas && <span>{evento.notas}</span>}
            </div>
            <button className="admin-boton admin-control-secundario" type="button" disabled={procesando} onClick={() => void cancelar(evento.id)}>
              Cancelar evento
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
