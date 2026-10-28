import { CalendarDays, Clock3, FileText, LockKeyhole, MapPin, Phone } from 'lucide-react'
import type { BloqueoEvento, Campo } from '../../types.js'
import { horaVisible } from '../../utils/fechasReserva.js'

export interface AdminEventoCardProps {
  evento: BloqueoEvento
  cancha?: Campo
  procesando: boolean
  onCancel: (id: string) => void | Promise<unknown>
}

function fechaVisible(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AdminEventoCard({ evento, cancha, procesando, onCancel }: AdminEventoCardProps) {
  const tituloId = `evento-agenda-${evento.id}`

  return (
    <article className="admin-evento-agenda" aria-labelledby={tituloId}>
      <div className="admin-evento-agenda-principal">
        <div className="admin-evento-agenda-cabecera">
          <div className="admin-evento-agenda-icono" aria-hidden="true">
            <CalendarDays size={22} strokeWidth={2.4} />
          </div>
          <div>
            <span className="admin-evento-agenda-etiqueta">Evento especial</span>
            <h3 id={tituloId}>{evento.nombre}</h3>
          </div>
        </div>

        <div className="admin-evento-agenda-metadata">
          <div className="admin-evento-agenda-dato">
            <MapPin size={16} aria-hidden="true" />
            <span>Campo</span>
            <strong>{cancha?.nombre ?? `Campo ${evento.canchaId}`}</strong>
          </div>
          <div className="admin-evento-agenda-dato">
            <CalendarDays size={16} aria-hidden="true" />
            <span>Fecha</span>
            <strong>{fechaVisible(evento.fecha)}</strong>
          </div>
          <div className="admin-evento-agenda-dato">
            <Clock3 size={16} aria-hidden="true" />
            <span>Horario</span>
            <strong>{horaVisible(evento.inicio)} a {horaVisible(evento.fin)}</strong>
          </div>
          {evento.celular && (
            <div className="admin-evento-agenda-dato">
              <Phone size={16} aria-hidden="true" />
              <span>Celular</span>
              <strong>{evento.celular}</strong>
            </div>
          )}
        </div>

        {evento.notas && (
          <div className="admin-evento-agenda-nota">
            <FileText size={17} aria-hidden="true" />
            <div>
              <span>Nota del evento</span>
              <strong>{evento.notas}</strong>
            </div>
          </div>
        )}
      </div>

      <aside className="admin-evento-agenda-aside">
        <span className="admin-evento-agenda-bloqueo">
          <LockKeyhole size={16} aria-hidden="true" />
          Bloqueo activo
        </span>
        <p className="admin-evento-agenda-ayuda">Este horario está bloqueado para reservas públicas.</p>
        <button
          className="admin-evento-agenda-cancelar"
          type="button"
          disabled={procesando}
          onClick={() => void onCancel(evento.id)}
        >
          {procesando ? 'Cancelando…' : 'Cancelar evento'}
        </button>
      </aside>
    </article>
  )
}
