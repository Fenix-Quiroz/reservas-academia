export interface AdminLoadingSplashProps {
  mensaje?: string
}

export default function AdminLoadingSplash({
  mensaje = 'Iniciando panel de administración…',
}: AdminLoadingSplashProps) {
  return (
    <div className="admin-splash-pantalla" role="status" aria-live="polite">
      <div className="admin-splash-caja">
        <div className="admin-splash-emblema">
          <div className="admin-splash-halo" aria-hidden="true" />
          <img
            src="/logo-admin-polideportivo-el-jaguar.jpg"
            alt="Polideportivo El Jaguar Administrador"
            className="admin-splash-logo"
          />
          <div className="admin-splash-spinner" aria-hidden="true" />
        </div>
        <div className="admin-splash-texto">
          <strong>Polideportivo El Jaguar</strong>
          <span>{mensaje}</span>
        </div>
      </div>
    </div>
  )
}
