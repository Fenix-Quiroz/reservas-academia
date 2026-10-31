import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './design-tokens.css'
import './index.css'
import App from './App'
import AdminLoadingSplash from './components/admin/AdminLoadingSplash'

const AdminApp = lazy(() => import('./AdminApp'))

export const ruta = window.location.pathname.replace(/\/+$/, '') || '/'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No se encontró el elemento raíz de la aplicación.')

createRoot(rootElement).render(
  <StrictMode>
    <Suspense fallback={
      ruta === '/admin' ? (
        <AdminLoadingSplash mensaje="Cargando panel de administración…" />
      ) : (
        <div className="app" aria-busy="true">
          <p className="aviso" role="status">Cargando…</p>
        </div>
      )
    }>
      {ruta === '/admin' ? <AdminApp /> : <App />}
    </Suspense>
  </StrictMode>,
)
