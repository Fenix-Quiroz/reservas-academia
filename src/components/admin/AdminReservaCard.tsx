import { activa, fechaISO, rangoHablado } from '../../reservas'
import type { Campo, ComprobanteAdmin, EstadoReserva, Reserva } from '../../types.js'
import { finDeReserva } from '../../utils/alarmaTurno.js'
import { Ban, Check, Download, Eye, X } from 'lucide-react'

type EtiquetaEstado = 'Finalizada' | 'Demo' | 'Activa' | 'En curso' | 'Iniciada' | 'Cancelada' | 'No asistió' | 'Por revisar'

export interface AdminReservaCardProps {
  reserva: Reserva
  ahora?: Date
  cancha?: Campo
  comprobante?: ComprobanteAdmin
  puedeCancelar: boolean
  porCancelar: string | null
  cancelando: string | null
  onRequestCancel: () => void
  onCancel: (id: string) => void | Promise<void>
  onCancelRequest: () => void
  onStatus: (id: string, estado: EstadoReserva) => void | Promise<void>
  actualizandoEstado: string | null
  procesandoComprobante: string | null
  onViewComprobante: (comprobante: ComprobanteAdmin) => void
  onDownloadComprobante: (comprobante: ComprobanteAdmin) => void
  onConfirmarComprobante: (pagoId: string) => void
}

function fechaVisible(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function estadoReserva(reserva: Reserva, ahora: Date): { etiqueta: EtiquetaEstado; clase: string } {
  if (reserva.id.startsWith('demo-')) return { etiqueta: 'Demo', clase: 'suave' }
  if (reserva.estado === 'iniciado') return { etiqueta: 'Iniciada', clase: 'iniciado' }
  if (reserva.estado === 'finalizado') {
    return { etiqueta: 'Finalizada', clase: 'finalizado' }
  }
  if (reserva.estado === 'cancelado') return { etiqueta: 'Cancelada', clase: 'cancelada' }
  if (reserva.estado === 'no_asistio') return { etiqueta: 'No asistió', clase: 'no-asistio' }
  if (reservaEnCurso(reserva, ahora)) return { etiqueta: 'En curso', clase: 'en-curso' }
  if (!activa(reserva, ahora)) return { etiqueta: 'Por revisar', clase: 'pendiente' }
  return { etiqueta: 'Activa', clase: 'activa' }
}

function reservaYaComenzo(reserva: Reserva, ahora: Date): boolean {
  const hoy = fechaISO(ahora)
  const horaActual = ahora.getHours() + ahora.getMinutes() / 60
  return reserva.fecha < hoy || (reserva.fecha === hoy && reserva.inicio <= horaActual)
}

function reservaEnCurso(reserva: Reserva, ahora: Date): boolean {
  return reserva.estado === 'activo' && reservaYaComenzo(reserva, ahora) && activa(reserva, ahora)
}

function puedeConfirmarComprobante(reserva: Reserva, ahora: Date): boolean {
  if (!['activo', 'iniciado', 'finalizado'].includes(reserva.estado)) return false
  const limiteConfirmacion = finDeReserva(reserva)
  limiteConfirmacion.setHours(limiteConfirmacion.getHours() + 2)
  return ahora <= limiteConfirmacion
}

export default function AdminReservaCard({
  reserva,
  ahora = new Date(),
  cancha,
  comprobante,
  puedeCancelar,
  porCancelar,
  cancelando,
  onRequestCancel,
  onCancel,
  onCancelRequest,
  onStatus,
  actualizandoEstado,
  procesandoComprobante,
  onViewComprobante,
  onDownloadComprobante,
  onConfirmarComprobante,
}: AdminReservaCardProps) {
  const esDemo = reserva.id.startsWith('demo-')
  const sinAdelanto = !esDemo && reserva.pagoEstado === 'no_requerido'
  const pagoConfirmado = !sinAdelanto && (reserva.pagoEstado === 'confirmado' || comprobante?.estado === 'confirmado')
  const estado = estadoReserva(reserva, ahora)
  const mostrarPagoConfirmado = reserva.estado === 'finalizado' && pagoConfirmado
  const mostrarEstados = sinAdelanto || estado.etiqueta !== 'Activa' || mostrarPagoConfirmado
  const reservaActiva = activa(reserva, ahora)
  const reservaYaIniciada = reservaYaComenzo(reserva, ahora)
  const comprobanteProcesando = Boolean(comprobante && procesandoComprobante?.endsWith(`:${comprobante.pagoId}`))
  const procesando = cancelando === reserva.id || actualizandoEstado === reserva.id
  const textoFinalizacion = sinAdelanto ? 'Finalizar reserva' : 'Finalizar y confirmar pago'

  return (
    <article className="admin-reserva" aria-labelledby={`reserva-${reserva.id}`}>
      <div className="admin-reserva-fecha">
        <strong>{fechaVisible(reserva.fecha)}</strong>
        <span>{rangoHablado(reserva.inicio, reserva.horas)}</span>
      </div>
      <div className="admin-reserva-datos">
        <h3 id={`reserva-${reserva.id}`}>{cancha?.nombre ?? 'Campo desconocido'}</h3>
        <span>{reserva.alias} · {reserva.celular}</span>
        <span className="precio">S/ {reserva.montoTotal ?? (cancha?.precioHora ?? 0) * reserva.horas} · {cancha?.jugadores} contra {cancha?.jugadores}</span>
      </div>
      {comprobante && !sinAdelanto && (
        <div className="admin-reserva-comprobante" aria-label="Comprobante de pago">
          <div className="admin-comprobante-encabezado">
            <strong>Comprobante de pago</strong>
            <span className={`estado estado-${comprobante.estado}`}>
              {comprobante.estado === 'confirmado' ? 'Comprobante confirmado' : comprobante.estado === 'pendiente' ? 'Pendiente' : comprobante.estado}
            </span>
          </div>
          <div className="admin-comprobante-rail">
            <div className="admin-comprobante-enlaces">
              <button
                className="admin-comprobante-accion"
                disabled={comprobanteProcesando}
                onClick={() => onViewComprobante(comprobante)}
              >
                <Eye size={15} strokeWidth={2.2} aria-hidden="true" />
                <span>{procesandoComprobante === `ver:${comprobante.pagoId}` ? 'Abriendo…' : 'Ver'}</span>
              </button>
              <button
                className="admin-comprobante-accion"
                disabled={comprobanteProcesando}
                onClick={() => onDownloadComprobante(comprobante)}
              >
                <Download size={15} strokeWidth={2.2} aria-hidden="true" />
                <span>{procesandoComprobante === `descargar:${comprobante.pagoId}` ? 'Descargando…' : 'Descargar'}</span>
              </button>
            </div>
            {comprobante.estado === 'pendiente' && puedeConfirmarComprobante(reserva, ahora) && (
              <button
                className="admin-confirmar-comprobante"
                disabled={comprobanteProcesando}
                onClick={() => onConfirmarComprobante(comprobante.pagoId)}
              >
                <Check size={15} strokeWidth={2.3} aria-hidden="true" />
                <span>{procesandoComprobante === `confirmar:${comprobante.pagoId}` ? 'Confirmando…' : 'Confirmar comprobante'}</span>
              </button>
            )}
          </div>
        </div>
      )}
      <div className="admin-reserva-estado">
        {mostrarEstados && (
          <div className="admin-reserva-estados">
            {sinAdelanto && <span className="estado estado-sin-adelanto">Sin adelanto</span>}
            {estado.etiqueta !== 'Activa' && (
              <span className={`estado estado-${estado.clase}`}>
                {estado.etiqueta}
              </span>
            )}
            {mostrarPagoConfirmado && <span className="estado estado-pago-confirmado">Pago total confirmado</span>}
          </div>
        )}
        {porCancelar === reserva.id ? (
          <div className="admin-confirmar" role="group" aria-labelledby={`confirmar-admin-${reserva.id}`}>
            <span id={`confirmar-admin-${reserva.id}`}>¿Cancelar esta reserva?</span>
            <div>
              <button className="chip peligro" disabled={procesando} onClick={() => onCancel(reserva.id)}>
                <X size={15} strokeWidth={2.3} aria-hidden="true" />
                <span>{cancelando === reserva.id ? 'Cancelando…' : 'Sí, cancelar'}</span>
              </button>
              <button className="chip" disabled={Boolean(cancelando || actualizandoEstado)} onClick={onCancelRequest}>No</button>
            </div>
          </div>
        ) : !esDemo && reserva.estado === 'activo' && !reservaActiva ? (
          <div className="admin-reserva-acciones">
            <button className="admin-estado-accion" disabled={procesando} onClick={() => onStatus(reserva.id, 'finalizado')}>
              <Check size={15} strokeWidth={2.3} aria-hidden="true" />
              <span>{actualizandoEstado === reserva.id ? 'Guardando…' : textoFinalizacion}</span>
            </button>
            <button className="admin-no-asistio" disabled={procesando} onClick={() => onStatus(reserva.id, 'no_asistio')}>
              <Ban size={15} strokeWidth={2.3} aria-hidden="true" />
              <span>{actualizandoEstado === reserva.id ? 'Guardando…' : 'Marcar no asistió'}</span>
            </button>
          </div>
        ) : !esDemo && reserva.estado === 'activo' ? (
          puedeCancelar && !reservaYaIniciada ? (
            <button className="admin-cancelar" disabled={procesando} onClick={onRequestCancel}>
              <X size={15} strokeWidth={2.3} aria-hidden="true" />
              <span>Cancelar</span>
            </button>
          ) : null
        ) : !esDemo && reserva.estado === 'iniciado' ? (
          <div className="admin-reserva-acciones">
            <button className="admin-estado-accion" disabled={procesando} onClick={() => onStatus(reserva.id, 'finalizado')}>
              <Check size={15} strokeWidth={2.3} aria-hidden="true" />
              <span>{actualizandoEstado === reserva.id ? 'Finalizando…' : 'Finalizar reserva'}</span>
            </button>
          </div>
        ) : esDemo ? (
          <small>Solo ejemplo</small>
        ) : null}
      </div>
    </article>
  )
}
