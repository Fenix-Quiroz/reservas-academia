import { useRef, useState } from 'react'
import AdminMarca from './AdminMarca'
import { crearBloqueoAccion } from '../../accionUnica'

export interface AdminNoAutorizadoProps {
  onLogout: () => void | Promise<void>
}

export default function AdminNoAutorizado({ onLogout }: AdminNoAutorizadoProps) {
  const [procesando, setProcesando] = useState(false)
  const bloqueoLogout = useRef(crearBloqueoAccion())

  async function cerrarSesion(): Promise<void> {
    if (!bloqueoLogout.current.adquirir()) return
    setProcesando(true)
    try {
      await onLogout()
    } finally {
      setProcesando(false)
      bloqueoLogout.current.liberar()
    }
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card">
        <AdminMarca />
        <p className="admin-kicker">Panel privado</p>
        <h1>Acceso no autorizado</h1>
        <p className="subtitulo">No tienes autorización para ver las reservas de la academia.</p>
        <button className="boton-principal" disabled={procesando} onClick={() => void cerrarSesion()}>
          {procesando ? 'Cerrando…' : 'Cerrar sesión'}
        </button>
      </section>
    </main>
  )
}
