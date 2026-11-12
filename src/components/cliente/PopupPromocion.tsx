import { useEffect, useRef } from 'react'

export interface PopupPromocionProps {
  abierto: boolean
  onCerrar: () => void
}

export default function PopupPromocion({ abierto, onCerrar }: PopupPromocionProps) {
  const botonAccionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierto) return

    // Enfocar el botón de acción al abrir
    const frame = window.requestAnimationFrame(() => {
      botonAccionRef.current?.focus()
    })

    // Cerrar con Escape
    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar()
      }
    }

    // Bloquear scroll de fondo
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.addEventListener('keydown', manejarTecla)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = overflowAnterior
      window.removeEventListener('keydown', manejarTecla)
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="promo-popup-backdrop"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-popup-titulo"
    >
      <div
        className="promo-popup-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="promo-popup-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar promoción"
        >
          ✕
        </button>

        <div className="promo-popup-badge">
          <span aria-hidden="true">🦃</span> GRAN SORTEO NAVIDEÑO
        </div>

        <h2 id="promo-popup-titulo" className="promo-popup-titulo">
          ¡5 PAVOS DE 8 KG!
        </h2>

        <p className="promo-popup-subtitulo">
          Por reservar desde nuestra web
        </p>

        <div className="promo-popup-imagen-box promo-popup-sorteo-box">
          <img
            src="/ofertas/sorteo-pavos-promo.jpg"
            alt="Gran Sorteo de 5 Pavos de 8 Kg - Polideportivo El Jaguar"
            className="promo-popup-imagen promo-popup-sorteo-img"
          />
        </div>

        <div className="promo-popup-condicion">
          <span className="promo-popup-condicion-icono" aria-hidden="true">📅</span>
          <p className="promo-popup-condicion-texto">
            Sorteo: <strong>22 de Diciembre a las 9:00 PM</strong>. ¡Válido para todas las reservas en nuestra web!
          </p>
        </div>

        <div className="promo-popup-acciones">
          <button
            ref={botonAccionRef}
            type="button"
            className="promo-popup-btn-principal"
            onClick={onCerrar}
          >
            <span>¡RESERVAR AHORA Y PARTICIPAR!</span>
            <span aria-hidden="true">⚽</span>
          </button>
        </div>
      </div>
    </div>
  )
}
