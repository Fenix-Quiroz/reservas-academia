import canchasPorDefecto from '../../data/canchas.json'
import { tipoCampo } from '../../utils/fechasReserva.js'

export default function SelectorCampos({ campos = canchasPorDefecto, onSelect, tituloRef }) {
  return (
    <section>
      <h1 ref={tituloRef} tabIndex="-1">¿En qué campo quieres jugar?</h1>
      <div className="canchas">
        {campos.map((c) => (
          <button key={c.id} className="tarjeta-cancha" onClick={() => onSelect(c)}>
            <img className="cancha-imagen" src={c.imagen} alt={`Vista del ${c.nombre}, ${tipoCampo(c)}`} />
            <span className="cancha-info">
              <strong>{c.nombre}</strong>
              <span>
                {tipoCampo(c)} · {c.jugadores} contra {c.jugadores}
              </span>
              <small className="jugadores">Para {c.jugadores * 2} jugadores</small>
              <span className="precio">S/ {c.precioHora} la hora</span>
              <span className="oferta">
                <span className="oferta-titulo">
                  <svg className="oferta-icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m20.59 13.41-8.3 8.3L3 12.41V4h8.41l9.18 9.18a1.75 1.75 0 0 1 0 2.48Z" />
                    <circle cx="7.5" cy="7.5" r="1.1" />
                  </svg>
                  <strong>Oferta</strong>
                </span>
                <span>{c.oferta}</span>
              </span>
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
