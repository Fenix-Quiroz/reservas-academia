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
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`⚽ Reservé campo: ${frase} Pago S/ ${total} en el campo.`)}`

  return (
    <section className="listo">
      <div className="check" aria-hidden="true">✓</div>
      <h1 ref={tituloRef} tabIndex={-1}>¡Listo, {reserva.alias}!</h1>
      <p className="reserva-a-nombre">Reserva a nombre de <strong>{reserva.alias}</strong></p>
      <p className="frase">{frase}</p>
      <p className="precio grande">Pagas S/ {total} en el campo</p>
      <p className="subtitulo">Puedes verla en “Mis reservas” o avisar a tu equipo.</p>
      <a className="boton-principal whatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Avisar a mis amigos por WhatsApp (se abre en una nueva pestaña)">
        Avisar a mis amigos por WhatsApp
      </a>
      <button className="boton-secundario" onClick={onFinish}>
        Volver al inicio
      </button>
      <button className="enlace" onClick={onViewBookings}>
        Ver mis reservas
      </button>
    </section>
  )
}
