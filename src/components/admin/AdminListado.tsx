import { sePuedeCancelar } from '../../reservas'
import type { Campo, ComprobanteAdmin, EstadoReserva, Reserva } from '../../types.js'
import AdminReservaCard from './AdminReservaCard'

export interface AdminListadoProps {
  visibles: readonly Reserva[]
  cargandoInicial: boolean
  actualizando: boolean
  canchas: readonly Campo[]
  comprobantes: readonly ComprobanteAdmin[]
  porCancelar: string | null
  cancelando: string | null
  onRequestCancel: (id: string) => void
  onCancel: (id: string) => void | Promise<void>
  onCancelRequest: () => void
  onStatus: (id: string, estado: EstadoReserva) => void | Promise<void>
  actualizandoEstado: string | null
  procesandoComprobante: string | null
  onViewComprobante: (comprobante: ComprobanteAdmin) => void
  onPreloadComprobante?: (comprobante: ComprobanteAdmin) => void
  onDownloadComprobante: (comprobante: ComprobanteAdmin) => void
  onConfirmarComprobante: (pagoId: string) => void
  onEdit?: (reserva: Reserva) => void
}

export function AdminReservaSkeleton() {
  return (
    <article className="admin-reserva admin-skeleton-card" aria-hidden="true">
      <div className="admin-reserva-fecha">
        <div className="admin-skeleton-bloque skeleton-w70" />
        <div className="admin-skeleton-bloque skeleton-w50" />
      </div>
      <div className="admin-reserva-datos">
        <div className="admin-skeleton-bloque skeleton-w40 skeleton-h18" />
        <div className="admin-skeleton-bloque skeleton-w60" />
        <div className="admin-skeleton-bloque skeleton-w50" />
      </div>
      <div className="admin-reserva-estado">
        <div className="admin-reserva-acciones">
          <div className="admin-skeleton-boton" />
          <div className="admin-skeleton-boton" />
        </div>
      </div>
    </article>
  )
}

export default function AdminListado({
  visibles,
  cargandoInicial,
  actualizando,
  canchas,
  comprobantes,
  porCancelar,
  cancelando,
  onRequestCancel,
  onCancel,
  onCancelRequest,
  onStatus,
  actualizandoEstado,
  procesandoComprobante,
  onViewComprobante,
  onPreloadComprobante,
  onDownloadComprobante,
  onConfirmarComprobante,
  onEdit,
}: AdminListadoProps) {
  if (cargandoInicial) {
    return (
      <div className="admin-cargando-wrapper" role="status" aria-busy="true">
        <span className="sr-only">Cargando reservas…</span>
        <div className="admin-reservas">
          <AdminReservaSkeleton />
          <AdminReservaSkeleton />
          <AdminReservaSkeleton />
        </div>
      </div>
    )
  }

  if (visibles.length === 0) {
    return (
      <div className="admin-vacio">
        <strong>No hay reservas con estos filtros.</strong>
        <span>Prueba con “Todas” o cambia la fecha.</span>
      </div>
    )
  }

  return (
    <>
      {actualizando && <p className="admin-listado-actualizando" role="status">Actualizando reservas…</p>}
      <div className="admin-reservas">
        {visibles.map((reserva) => {
          const cancha = canchas.find((c) => c.id === reserva.canchaId)
          return (
            <AdminReservaCard
              key={reserva.id}
              reserva={reserva}
              cancha={cancha}
              comprobante={comprobantes.find((item) => item.reservaId === reserva.id)}
              puedeCancelar={!reserva.id.startsWith('demo-') && sePuedeCancelar(reserva)}
              porCancelar={porCancelar}
              cancelando={cancelando}
              onRequestCancel={() => onRequestCancel(reserva.id)}
              onCancel={onCancel}
              onCancelRequest={onCancelRequest}
              onStatus={onStatus}
              actualizandoEstado={actualizandoEstado}
              procesandoComprobante={procesandoComprobante}
              onViewComprobante={onViewComprobante}
              onPreloadComprobante={onPreloadComprobante}
              onDownloadComprobante={onDownloadComprobante}
              onConfirmarComprobante={onConfirmarComprobante}
              onEdit={onEdit}
            />
          )
        })}
      </div>
    </>
  )
}
