import { Ban, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, FileText, LockKeyhole, MapPin, Pencil, Phone } from 'lucide-react'
import type { BloqueoEvento, Campo } from '../../types.js'
import { horaVisible } from '../../utils/fechasReserva.js'
import { eventoYaTermino } from '../../eventos.js'

export interface AdminEventoCardProps {
  eventos: readonly BloqueoEvento[]
  canchas: readonly Campo[]
  procesando: boolean
  onCancel: (grupoId: string) => void | Promise<unknown>
  onEditar?: (grupo: readonly BloqueoEvento[]) => void
  ahora?: Date
}

function fechaVisible(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AdminEventoCard({ eventos, canchas, procesando, onCancel, onEditar, ahora = new Date() }: AdminEventoCardProps) {
  const evento = eventos[0]
  if (!evento) return null

  const esCancelado = evento.estado === 'cancelado'
  const concluido = !esCancelado && eventoYaTermino(evento, ahora)
  const tituloId = `evento-agenda-${evento.id}`
  const nombresCampos = eventos.map((eventoCampo) => (
    canchas.find((cancha) => cancha.id === eventoCampo.canchaId)?.nombre ?? `Campo ${eventoCampo.canchaId}`
  ))
  const textoCampos = nombresCampos.length === 1
    ? nombresCampos[0]
    : `${nombresCampos.slice(0, -1).join(', ')} y ${nombresCampos[nombresCampos.length - 1]}`

  return (
    <article
      className={`admin-evento-agenda${esCancelado ? ' admin-evento-cancelado' : concluido ? ' admin-evento-concluido' : ''}`}
      aria-labelledby={tituloId}
    >
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
            <strong>{textoCampos}</strong>
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
          <div className="admin-evento-agenda-dato">
            <CircleDollarSign size={16} aria-hidden="true" />
            <span>Precio cobrado</span>
            <strong>S/ {(evento.precioCobrado ?? 0).toFixed(2)}</strong>
          </div>
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
        {esCancelado ? (
          <>
            <span className="admin-evento-agenda-cancelado-badge">
              <Ban size={16} aria-hidden="true" />
              Evento cancelado
            </span>
            <p className="admin-evento-agenda-ayuda">Este evento fue cancelado. El horario está libre para reservas públicas.</p>
          </>
        ) : concluido ? (
          <>
            <span className="admin-evento-agenda-concluido-badge">
              <CheckCircle2 size={16} aria-hidden="true" />
              Evento concluido
            </span>
            <p className="admin-evento-agenda-ayuda">Este evento ya finalizó y está registrado en el balance mensual.</p>
          </>
        ) : (
          <>
            <span className="admin-evento-agenda-bloqueo">
              <LockKeyhole size={16} aria-hidden="true" />
              Bloqueo activo
            </span>
            <p className="admin-evento-agenda-ayuda">Este horario está bloqueado para reservas públicas.</p>
          </>
        )}
        {!esCancelado && (
          <div className="admin-evento-agenda-botones">
            {onEditar && (
              <button
                className="admin-evento-agenda-editar"
                type="button"
                disabled={procesando}
                onClick={() => onEditar(eventos)}
              >
                <Pencil size={15} aria-hidden="true" />
                <span>Editar evento</span>
              </button>
            )}
            {!concluido && (
              <button
                className="admin-evento-agenda-cancelar"
                type="button"
                disabled={procesando}
                onClick={() => void onCancel(evento.grupoId ?? evento.id)}
              >
                {procesando ? 'Cancelando…' : 'Cancelar evento'}
              </button>
            )}
          </div>
        )}
      </aside>
    </article>
  )
}
