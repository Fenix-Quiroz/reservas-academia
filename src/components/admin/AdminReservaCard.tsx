import { activa, rangoHablado } from '../../reservas'
import type { Campo, Reserva } from '../../types.js'

type EstadoReserva = 'Finalizada' | 'Demo' | 'Activa'

export interface AdminReservaCardProps {
  reserva: Reserva
  cancha?: Campo
  puedeCancelar: boolean
  porCancelar: string | null
  cancelando: string | null
  onRequestCancel: () => void
  onCancel: (id: string) => void | Promise<void>
  onCancelRequest: () => void
}

function fechaVisible(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function estadoReserva(reserva: Reserva): EstadoReserva {
  if (!activa(reserva)) return 'Finalizada'
  if (reserva.id.startsWith('demo-')) return 'Demo'
  return 'Activa'
}

export default function AdminReservaCard({
  reserva,
  cancha,
  puedeCancelar,
  porCancelar,
  cancelando,
  onRequestCancel,
  onCancel,
  onCancelRequest,
}: AdminReservaCardProps) {
  const estado = estadoReserva(reserva)

  return (
    <article className="admin-reserva" aria-labelledby={`reserva-${reserva.id}`}>
      <div className="admin-reserva-fecha">
        <strong>{fechaVisible(reserva.fecha)}</strong>
        <span>{rangoHablado(reserva.inicio, reserva.horas)}</span>
      </div>
      <div className="admin-reserva-datos">
        <h3 id={`reserva-${reserva.id}`}>{cancha?.nombre ?? 'Campo desconocido'}</h3>
        <span>{reserva.alias} · {reserva.celular}</span>
        <span className="precio">S/ {(cancha?.precioHora ?? 0) * reserva.horas} · {cancha?.jugadores} contra {cancha?.jugadores}</span>
      </div>
      <div className="admin-reserva-estado">
        <span className={`estado estado-${estado === 'Activa' ? 'activa' : 'suave'}`}>
          {estado}
        </span>
        {porCancelar === reserva.id ? (
          <div className="admin-confirmar" role="group" aria-labelledby={`confirmar-admin-${reserva.id}`}>
            <span id={`confirmar-admin-${reserva.id}`}>¿Cancelar esta reserva?</span>
            <div>
              <button className="chip peligro" disabled={cancelando === reserva.id} onClick={() => onCancel(reserva.id)}>
                {cancelando === reserva.id ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
              <button className="chip" disabled={Boolean(cancelando)} onClick={onCancelRequest}>No</button>
            </div>
          </div>
        ) : puedeCancelar ? (
          <button className="admin-cancelar" disabled={Boolean(cancelando)} onClick={onRequestCancel}>Cancelar</button>
        ) : reserva.id.startsWith('demo-') ? (
          <small>Solo ejemplo</small>
        ) : null}
      </div>
    </article>
  )
}
