import { sePuedeCancelar } from '../../reservas'
import type { Campo, Reserva } from '../../types.js'
import AdminReservaCard from './AdminReservaCard'

export interface AdminListadoProps {
  visibles: readonly Reserva[]
  cargando: boolean
  canchas: readonly Campo[]
  porCancelar: string | null
  cancelando: string | null
  onRequestCancel: (id: string) => void
  onCancel: (id: string) => void | Promise<void>
  onCancelRequest: () => void
}

export default function AdminListado({
  visibles,
  cargando,
  canchas,
  porCancelar,
  cancelando,
  onRequestCancel,
  onCancel,
  onCancelRequest,
}: AdminListadoProps) {
  if (cargando) return <div className="admin-cargando" role="status">Cargando reservas…</div>

  if (visibles.length === 0) {
    return (
      <div className="admin-vacio">
        <strong>No hay reservas con estos filtros.</strong>
        <span>Prueba con “Todas” o cambia la fecha.</span>
      </div>
    )
  }

  return (
    <div className="admin-reservas">
      {visibles.map((reserva) => {
        const cancha = canchas.find((c) => c.id === reserva.canchaId)
        return (
          <AdminReservaCard
            key={reserva.id}
            reserva={reserva}
            cancha={cancha}
            puedeCancelar={!reserva.id.startsWith('demo-') && sePuedeCancelar(reserva)}
            porCancelar={porCancelar}
            cancelando={cancelando}
            onRequestCancel={() => onRequestCancel(reserva.id)}
            onCancel={onCancel}
            onCancelRequest={onCancelRequest}
          />
        )
      })}
    </div>
  )
}
