import type { Cliente } from '../../types.js'

export interface CabeceraClienteProps {
  verMias: boolean
  paso: number
  yo: Cliente | null
  cantidadReservas: number
  onBack: () => void
  onViewBookings: () => void
}

export default function CabeceraCliente({
  verMias,
  paso,
  yo,
  cantidadReservas,
  onBack,
  onViewBookings,
}: CabeceraClienteProps) {
  return (
    <header className="cabecera">
      <div className="cabecera-interior">
        <div className="cabecera-marca">
          <img className="cabecera-logo" src="/logo-polideportivo-el-jaguar.png" alt="" aria-hidden="true" />
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
            <button className="cabecera-boton cabecera-boton-principal cabecera-boton-reservas" onClick={onViewBookings}>
              <span aria-hidden="true">📋</span>
              <span className="cabecera-reservas-texto">
                <span>Mis</span>
                <span>reservas{cantidadReservas > 0 && ` (${cantidadReservas})`}</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
