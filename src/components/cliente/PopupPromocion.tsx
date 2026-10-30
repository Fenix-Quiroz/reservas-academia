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
          <span aria-hidden="true">🎁</span> PROMOCIÓN EXCLUSIVA
        </div>

        <h2 id="promo-popup-titulo" className="promo-popup-titulo">
          POR RESERVAR AQUÍ
        </h2>

        <p className="promo-popup-subtitulo">
          obtendrás
        </p>

        <div className="promo-popup-imagen-box">
          <img
            src="/ofertas/agua-promo.png"
            alt="Agua Cielo 2.5 L sin gas gratis con tu reserva"
            className="promo-popup-imagen"
          />
          <span className="promo-popup-badge-gratis">
            ¡TOTALMENTE GRATIS!
          </span>
        </div>

        <div className="promo-popup-condicion">
          <span className="promo-popup-condicion-icono" aria-hidden="true">💧</span>
          <p className="promo-popup-condicion-texto">
            Al cancelar la totalidad de tu reserva.
          </p>
        </div>

        <div className="promo-popup-acciones">
          <button
            ref={botonAccionRef}
            type="button"
            className="promo-popup-btn-principal"
            onClick={onCerrar}
          >
            <span>¡RESERVAR AHORA!</span>
            <span aria-hidden="true">⚽</span>
          </button>
        </div>
      </div>
    </div>
  )
}
