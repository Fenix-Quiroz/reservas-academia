import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './design-tokens.css'
import './index.css'

const App = lazy(() => import('./App'))
const AdminApp = lazy(() => import('./AdminApp'))

export const ruta = window.location.pathname.replace(/\/+$/, '') || '/'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No se encontró el elemento raíz de la aplicación.')

createRoot(rootElement).render(
  <StrictMode>
    <Suspense fallback={
      <div className="app" aria-busy="true">
        <p className="aviso" role="status">Cargando…</p>
      </div>
    }>
      {ruta === '/admin' ? <AdminApp /> : <App />}
    </Suspense>
  </StrictMode>,
)
