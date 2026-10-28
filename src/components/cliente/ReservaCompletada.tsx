import type { RefObject } from 'react'
import { CalendarDays, Clock3, FileText, MapPin } from 'lucide-react'
import { rangoHablado } from '../../reservas'
import { nombreDia } from '../../utils/fechasReserva'
import type { Campo, Reserva } from '../../types.js'

export interface ReservaCompletadaProps {
  reserva: Reserva
  cancha: Campo
  dia: number
  onFinish: () => void
  onViewBookings: () => void
  tituloRef: RefObject<HTMLHeadingElement | null>
}

export default function ReservaCompletada({
  reserva,
  cancha,
  dia,
  onFinish,
  onViewBookings,
  tituloRef,
}: ReservaCompletadaProps) {
  const total = cancha.precioHora * reserva.horas
  const saldo = Math.max(total - 10, 0)
  const sinAdelanto = reserva.pagoEstado === 'no_requerido'
  const estadoPago = sinAdelanto
    ? 'Reserva confirmada. No requiere adelanto.'
    : 'Reserva asegurada. Tu comprobante está pendiente de revisión.'

  return (
    <section className="listo" aria-labelledby="reserva-completada-titulo">
      <div className="reserva-completada-encabezado">
        <div className="check" aria-hidden="true">✓</div>
        <div>
          <h1 id="reserva-completada-titulo" ref={tituloRef} tabIndex={-1}>Reserva recibida</h1>
          <p className="reserva-a-nombre">Reserva a nombre de <strong>{reserva.alias}</strong></p>
        </div>
      </div>

      <div className="pago-exito" role="status">
        <FileText size={26} strokeWidth={2.4} aria-hidden="true" />
        <span>{estadoPago}</span>
      </div>

      <dl className="reserva-detalles">
        <div className="reserva-detalle">
          <dt><MapPin size={22} strokeWidth={2.4} aria-hidden="true" /> Campo</dt>
          <dd>{cancha.nombre}</dd>
        </div>
        <div className="reserva-detalle">
          <dt><CalendarDays size={22} strokeWidth={2.4} aria-hidden="true" /> Fecha</dt>
          <dd>{nombreDia(dia, true)}</dd>
        </div>
        <div className="reserva-detalle reserva-detalle-horario">
          <dt><Clock3 size={22} strokeWidth={2.4} aria-hidden="true" /> Horario</dt>
          <dd>{rangoHablado(reserva.inicio, reserva.horas)}</dd>
        </div>
      </dl>

      <div className={`reserva-pago-resumen${sinAdelanto ? ' sin-adelanto' : ''}`} aria-label="Resumen del pago">
        {sinAdelanto ? (
          <div className="reserva-pago-item reserva-pago-item-unico">
            <span>Pago total en el campo</span>
            <strong>S/ {total}</strong>
          </div>
        ) : (
          <>
            <div className="reserva-pago-item">
              <span>Adelanto</span>
              <strong>S/ 10</strong>
            </div>
            <div className="reserva-pago-item">
              <span>Saldo pendiente</span>
              <strong>S/ {saldo}</strong>
            </div>
          </>
        )}
      </div>

      <p className="subtitulo">Puedes verla en “Mis reservas”.</p>
      <div className="reserva-completada-acciones">
        <button className="boton-principal" onClick={onFinish}>
          Volver al inicio
        </button>
        <button className="enlace" onClick={onViewBookings}>
          Ver mis reservas
        </button>
      </div>
    </section>
  )
}
