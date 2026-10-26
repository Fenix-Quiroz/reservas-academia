import type { RefObject } from 'react'
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
  const frase = `Jugarás en el ${cancha.nombre} ${nombreDia(dia, true)} ${rangoHablado(reserva.inicio, reserva.horas)}.`
  const total = cancha.precioHora * reserva.horas
  const saldo = Math.max(total - 10, 0)
  const sinAdelanto = reserva.pagoEstado === 'no_requerido'

  return (
    <section className="listo">
      <div className="check" aria-hidden="true">✓</div>
      <h1 ref={tituloRef} tabIndex={-1}>¡Reserva recibida, {reserva.alias}!</h1>
      <p className="reserva-a-nombre">Reserva a nombre de <strong>{reserva.alias}</strong></p>
      <p className="pago-exito">
        {sinAdelanto ? 'Reserva confirmada. No requiere adelanto.' : 'Reserva asegurada. Tu comprobante está pendiente de revisión.'}
      </p>
      <p className="frase">{frase}</p>
      {sinAdelanto ? (
        <p className="precio grande">Pago pendiente: S/ {total} en el campo</p>
      ) : (
        <p className="precio grande">Adelanto: S/ 10 · Saldo pendiente: S/ {saldo} en el campo</p>
      )}
      <p className="subtitulo">Puedes verla en “Mis reservas”.</p>
      <button className="boton-secundario" onClick={onFinish}>
        Volver al inicio
      </button>
      <button className="enlace" onClick={onViewBookings}>
        Ver mis reservas
      </button>
    </section>
  )
}
