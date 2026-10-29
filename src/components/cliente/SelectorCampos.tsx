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
            <span className="cancha-visual">
              <img className="cancha-imagen" src={c.imagen} alt={`Vista del ${c.nombre}, ${tipoCampo(c)}`} />
              <span className="oferta-sticker" role="img" aria-label={c.oferta}>
                <img className="oferta-sticker-imagen" src="/ofertas/sticker-agua-gratis.png" alt="" aria-hidden="true" />
              </span>
            </span>
            <span className="cancha-info">
              <strong>{c.nombre}</strong>
              <span>
                {tipoCampo(c)} · {c.jugadores} contra {c.jugadores}
              </span>
              <small className="jugadores">Para {c.jugadores * 2} jugadores</small>
              <span className="precio">S/ {c.precioHora} la hora</span>
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
