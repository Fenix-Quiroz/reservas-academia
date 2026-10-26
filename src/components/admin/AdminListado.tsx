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
  onDownloadComprobante: (comprobante: ComprobanteAdmin) => void
  onConfirmarComprobante: (pagoId: string) => void
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
  onDownloadComprobante,
  onConfirmarComprobante,
}: AdminListadoProps) {
  if (cargandoInicial) return <div className="admin-cargando" role="status">Cargando reservas…</div>

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
              onDownloadComprobante={onDownloadComprobante}
              onConfirmarComprobante={onConfirmarComprobante}
            />
          )
        })}
      </div>
    </>
  )
}
