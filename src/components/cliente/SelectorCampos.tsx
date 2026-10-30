import type { RefObject } from 'react'
import canchasPorDefecto from '../../data/canchas.json'
import type { Campo } from '../../types.js'
import { tipoCampo } from '../../utils/fechasReserva'

export interface SelectorCamposProps {
  campos?: readonly Campo[]
  onSelect: (campo: Campo) => void
  tituloRef: RefObject<HTMLHeadingElement | null>
}

export default function SelectorCampos({ campos = canchasPorDefecto, onSelect, tituloRef }: SelectorCamposProps) {
  return (
    <section>
      <h1 ref={tituloRef} tabIndex={-1}>¿EN QUÉ CAMPO QUIERES JUGAR?</h1>
      <div className="canchas">
        {campos.map((c) => (
          <button key={c.id} className="tarjeta-cancha" onClick={() => onSelect(c)}>
            <span className="cancha-header">
              <strong className="cancha-nombre">{c.nombre}</strong>
              <span className="cancha-deporte">{tipoCampo(c)}</span>
            </span>

            <span className="cancha-visual">
              <img className="cancha-imagen" src={c.imagen} alt={`Vista del ${c.nombre}, ${tipoCampo(c)}`} />
              <span className="cancha-precio-badge">
                <span className="cancha-precio-punto" aria-hidden="true" />
                <strong className="cancha-precio-monto">S/ {c.precioHora}</strong>
                <span className="cancha-precio-tiempo">LA HORA</span>
              </span>
            </span>

            <span className="cancha-footer">
              <span className="seleccionar-cancha">
                Elegir este campo <span aria-hidden="true">→</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
