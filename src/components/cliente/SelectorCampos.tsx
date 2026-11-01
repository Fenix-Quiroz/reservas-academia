import type { RefObject } from 'react'
import { Phone } from 'lucide-react'
import canchasPorDefecto from '../../data/canchas.json'
import type { Campo } from '../../types.js'
import { tipoCampo } from '../../utils/fechasReserva'
import { NUMERO_CONSULTAS } from './MisReservas'

export interface SelectorCamposProps {
  campos?: readonly Campo[]
  onSelect: (campo: Campo) => void
  tituloRef: RefObject<HTMLHeadingElement | null>
}

export default function SelectorCampos({ campos = canchasPorDefecto, onSelect, tituloRef }: SelectorCamposProps) {
  const numeroContactoVisible = NUMERO_CONSULTAS.match(/.{1,3}/g)?.join(' ') ?? NUMERO_CONSULTAS
  const numeroLimpio = NUMERO_CONSULTAS.replace(/\D/g, '')

  return (
    <section>
      <h1 ref={tituloRef} tabIndex={-1}>¿EN QUÉ CAMPO QUIERES JUGAR?</h1>
      <div className="canchas">
        {campos.map((c) => (
          <article key={c.id} className="tarjeta-cancha">
            <div className="cancha-header">
              <strong className="cancha-nombre">{c.nombre}</strong>
              <span className="cancha-deporte">{tipoCampo(c)}</span>
            </div>

            <div className="cancha-visual">
              <img className="cancha-imagen" src={c.imagen} alt={`Vista del ${c.nombre}, ${tipoCampo(c)}`} />
              <span className="cancha-precio-badge">
                <span className="cancha-precio-punto" aria-hidden="true" />
                <strong className="cancha-precio-monto">S/ {c.precioHora}</strong>
                <span className="cancha-precio-tiempo">LA HORA</span>
              </span>
            </div>

            <div className="cancha-footer">
              <button
                type="button"
                className="seleccionar-cancha"
                onClick={() => onSelect(c)}
              >
                Elegir este campo <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        ))}
      </div>
      <footer className="contacto-soporte" aria-labelledby="contacto-soporte-inicio-titulo">
        <p id="contacto-soporte-inicio-titulo" className="contacto-soporte-titulo">
          Para dudas o consultas llamar a este número:
        </p>
        <div className="contacto-soporte-numero">
          <a
            href={`tel:+51${numeroLimpio}`}
            className="contacto-soporte-telefono"
            aria-label={`Llamar al ${numeroContactoVisible}`}
          >
            <Phone size={18} aria-hidden="true" />
            <strong>{numeroContactoVisible}</strong>
          </a>
        </div>
        <a
          href={`https://wa.me/51${numeroLimpio}`}
          target="_blank"
          rel="noopener noreferrer"
          className="boton-whatsapp"
          aria-label="Contactar por WhatsApp"
        >
          <svg
            className="icono-whatsapp"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.98-.277-.101-.478-.15-.678.15-.2.302-.777.98-.953 1.181-.176.202-.352.227-.652.076-.302-.152-1.272-.469-2.424-1.496-.897-.798-1.502-1.784-1.678-2.086-.176-.302-.019-.465.132-.615.136-.135.302-.352.453-.528.151-.177.201-.302.302-.503.101-.202.05-.378-.026-.528-.075-.152-.677-1.634-.928-2.238-.244-.588-.492-.508-.677-.518-.176-.008-.377-.01-.578-.01-.2 0-.528.075-.804.377-.276.302-1.055 1.03-1.055 2.512 0 1.482 1.08 2.912 1.231 3.113.151.201 2.125 3.245 5.148 4.551.719.311 1.281.497 1.719.636.722.23 1.378.197 1.898.12.579-.087 1.78-.727 2.03-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.202-.578-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.982-1.396A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.564 0-3.023-.42-4.288-1.155l-.307-.181-3.18.891.85-3.097-.199-.319A8.13 8.13 0 013.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
          </svg>
          <span>Escribir por WhatsApp</span>
        </a>
      </footer>
    </section>
  )
}
