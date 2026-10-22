import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design-tokens.css'
import './index.css'
import App from './App'
import AdminApp from './AdminApp'

export const ruta = window.location.pathname.replace(/\/+$/, '') || '/'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No se encontró el elemento raíz de la aplicación.')

createRoot(rootElement).render(
  <StrictMode>
    {ruta === '/admin' ? <AdminApp /> : <App />}
  </StrictMode>,
)
