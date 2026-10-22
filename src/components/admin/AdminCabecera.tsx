import AdminMarca from './AdminMarca'

export interface AdminCabeceraProps {
  supabaseConfigurado: boolean
  porLimpiar: boolean
  cargando: boolean
  onClearRequest: () => void
  onClearCancel: () => void
  onClearConfirm: () => void
  onRefresh: () => void | Promise<void>
  onLogout: () => void | Promise<void>
}

export default function AdminCabecera({
  supabaseConfigurado,
  porLimpiar,
  cargando,
  onClearRequest,
  onClearCancel,
  onClearConfirm,
  onRefresh,
  onLogout,
}: AdminCabeceraProps) {
  return (
    <header className="admin-cabecera">
      <div>
        <AdminMarca />
        <p className="admin-kicker">Panel privado</p>
        <h1>Reservas del polideportivo</h1>
        <p className="subtitulo">Revisa las reservas hechas desde este navegador.</p>
      </div>
      <div className="admin-acciones">
        {!supabaseConfigurado && (porLimpiar ? (
          <div className="admin-reset-confirmar">
            <span>¿Borrar reservas y clientes?</span>
            <button className="chip peligro" onClick={onClearConfirm}>Sí, borrar</button>
            <button className="chip" onClick={onClearCancel}>No</button>
          </div>
        ) : (
          <button className="boton-secundario admin-boton admin-limpiar" onClick={onClearRequest}>
            <span aria-hidden="true">🧹</span> Empezar de cero
          </button>
        ))}
        <button className="boton-secundario admin-boton" disabled={cargando} onClick={onRefresh}>
          {cargando ? 'Actualizando…' : <><span aria-hidden="true">↻</span> Actualizar</>}
        </button>
        <a className="boton-secundario admin-boton" href="/">Vista del cliente</a>
        {supabaseConfigurado && <button className="boton-secundario admin-boton" onClick={onLogout}>Cerrar sesión</button>}
      </div>
    </header>
  )
}
