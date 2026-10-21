export default function CabeceraCliente({ verMias, paso, yo, cantidadReservas, onBack, onViewBookings }) {
  return (
    <header className="cabecera">
      <div className="cabecera-interior">
        <div className="cabecera-marca">
          <img className="cabecera-logo" src="/favicon-jaguar.png" alt="" aria-hidden="true" />
          <div className="cabecera-identidad">
            <strong className="cabecera-nombre">Reserva tu campo</strong>
            <span className="cabecera-subtitulo">Polideportivo El Jaguar</span>
          </div>
        </div>
        <div className="cabecera-acciones">
          {verMias ? (
            <button className="cabecera-boton" onClick={onBack}>
              ← Volver
            </button>
          ) : paso > 1 && paso < 4 ? (
            <button className="cabecera-boton cabecera-boton-atras" onClick={onBack}>
              ← Atrás
            </button>
          ) : null}
          {yo && !verMias && (
            <button className="cabecera-boton cabecera-boton-principal" onClick={onViewBookings}>
              <span aria-hidden="true">📋</span> Mis reservas{cantidadReservas > 0 && ` (${cantidadReservas})`}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
