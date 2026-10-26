import { useRef, useState } from 'react'
import AdminMarca from './AdminMarca'
import { crearBloqueoAccion } from '../../accionUnica'

export interface AdminCabeceraProps {
  supabaseConfigurado: boolean
  porLimpiar: boolean
  limpiandoDatosPrueba: boolean
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
  limpiandoDatosPrueba,
  cargando,
  onClearRequest,
  onClearCancel,
  onClearConfirm,
  onRefresh,
  onLogout,
}: AdminCabeceraProps) {
  const [cerrandoSesion, setCerrandoSesion] = useState(false)
  const bloqueoLogout = useRef(crearBloqueoAccion())

  async function cerrarSesion(): Promise<void> {
    if (!bloqueoLogout.current.adquirir()) return
    setCerrandoSesion(true)
    try {
      await onLogout()
    } finally {
      setCerrandoSesion(false)
      bloqueoLogout.current.liberar()
    }
  }

  return (
    <header className="admin-cabecera">
      <div>
        <AdminMarca />
        <p className="admin-kicker">Panel privado</p>
        <h1>Reservas del polideportivo</h1>
        <p className="subtitulo">Gestiona las reservas del polideportivo.</p>
      </div>
      <div className="admin-acciones">
        {(!supabaseConfigurado || import.meta.env.DEV) && (porLimpiar ? (
          <div className="admin-reset-confirmar">
            <span>{supabaseConfigurado ? '¿Borrar todos los datos de prueba?' : '¿Borrar reservas y clientes?'}</span>
            <button className="chip peligro" disabled={limpiandoDatosPrueba} onClick={onClearConfirm}>
              {limpiandoDatosPrueba ? 'Limpiando…' : 'Sí, borrar'}
            </button>
            <button className="chip" disabled={limpiandoDatosPrueba} onClick={onClearCancel}>No</button>
          </div>
        ) : (
          <button className="boton-secundario admin-boton admin-limpiar" disabled={limpiandoDatosPrueba} onClick={onClearRequest}>
            <span aria-hidden="true">🧹</span> {supabaseConfigurado ? 'Limpiar datos de prueba' : 'Empezar de cero'}
          </button>
        ))}
        <button className="boton-secundario admin-boton" disabled={cargando} onClick={onRefresh}>
          {cargando ? 'Actualizando…' : <><span aria-hidden="true">↻</span> Actualizar</>}
        </button>
        <a className="boton-secundario admin-boton" href="/">Vista del cliente</a>
        {supabaseConfigurado && (
          <button className="boton-secundario admin-boton" disabled={cerrandoSesion} onClick={() => void cerrarSesion()}>
            {cerrandoSesion ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        )}
      </div>
    </header>
  )
}
