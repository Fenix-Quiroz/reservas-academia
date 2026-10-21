import AdminMarca from './AdminMarca.jsx'

export default function AdminNoAutorizado({ onLogout }) {
  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card">
        <AdminMarca />
        <p className="admin-kicker">Panel privado</p>
        <h1>Acceso no autorizado</h1>
        <p className="subtitulo">No tienes autorización para ver las reservas de la academia.</p>
        <button className="boton-principal" onClick={onLogout}>Cerrar sesión</button>
      </section>
    </main>
  )
}
