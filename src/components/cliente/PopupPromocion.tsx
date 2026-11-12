import { useEffect, useRef, useState } from 'react'

export interface PopupPromocionProps {
  abierto: boolean
  onCerrar: () => void
}

export default function PopupPromocion({ abierto, onCerrar }: PopupPromocionProps) {
  const botonAccionRef = useRef<HTMLButtonElement>(null)
  const [imagenCargada, setImagenCargada] = useState(false)

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

        <h2 id="promo-popup-titulo" className="sr-only">
          Gran Sorteo de 5 Pavos de 8 KG - Polideportivo El Jaguar
        </h2>

        <div className="promo-popup-badge">
          <span aria-hidden="true">🦃</span> GRAN SORTEO NAVIDEÑO
        </div>

        <div className="promo-popup-sorteo-box">
          {!imagenCargada && (
            <div className="promo-popup-skeleton" aria-hidden="true">
              <div className="promo-popup-skeleton-shimmer" />
              <div className="promo-popup-skeleton-contenido">
                <span className="promo-popup-skeleton-icono">⚽</span>
                <span className="promo-popup-skeleton-texto">Cargando sorteo...</span>
              </div>
            </div>
          )}
          <img
            src="/ofertas/sorteo-pavos-promo.jpg"
            alt="Gran Sorteo de 5 Pavos de 8 Kg - Válido para reservas en nuestra web - Polideportivo El Jaguar"
            width={848}
            height={1264}
            loading="eager"
            decoding="async"
            onLoad={() => setImagenCargada(true)}
            className={`promo-popup-sorteo-img ${
              imagenCargada ? 'promo-popup-img-cargada' : 'promo-popup-img-cargando'
            }`}
          />
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
