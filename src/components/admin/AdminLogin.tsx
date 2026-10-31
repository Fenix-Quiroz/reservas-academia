import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import AdminMarca from './AdminMarca'
import { crearBloqueoAccion } from '../../accionUnica'

interface ResultadoLogin {
  error?: {
    message?: string
  } | null
}

export interface AdminLoginProps {
  errorInicial?: string
  onLogin: (email: string, password: string) => Promise<ResultadoLogin>
}

export default function AdminLogin({ errorInicial, onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(errorInicial ?? '')
  const [procesando, setProcesando] = useState(false)
  const bloqueoIngreso = useRef(crearBloqueoAccion())

  useEffect(() => {
    if (!error) return undefined
    const temporizador = window.setTimeout(() => setError(''), 5000)
    return () => window.clearTimeout(temporizador)
  }, [error])

  async function ingresar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!bloqueoIngreso.current.adquirir()) return
    setError('')
    setProcesando(true)
    try {
      const resultado = await onLogin(email.trim(), password)
      if (resultado?.error) {
        setError(resultado.error.message?.toLowerCase().includes('invalid login credentials')
          ? 'El correo o la contraseña no son correctos.'
          : 'No pudimos iniciar sesión. Revisa tu conexión e inténtalo de nuevo.')
      }
    } catch {
      setError('No pudimos iniciar sesión. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setProcesando(false)
      bloqueoIngreso.current.liberar()
    }
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card">
        <AdminMarca />
        <p className="admin-kicker">Panel privado</p>
        <h1>Ingresar al panel</h1>
        <p className="subtitulo">Solo el dueño o encargado puede ver las reservas.</p>
        <form className="admin-auth-form" onSubmit={ingresar}>
          <label>
            <span>Correo</span>
            <input
              id="admin-email"
              type="email"
              value={email}
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'admin-login-error' : undefined}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            <span>Contraseña</span>
            <input
              id="admin-password"
              type="password"
              value={password}
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'admin-login-error' : undefined}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p id="admin-login-error" className="error" role="alert">{error}</p>}
          <button className="boton-principal" type="submit" disabled={procesando}>
            {procesando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
          <a className="boton-secundario admin-boton" href="/">Volver a reservar</a>
        </form>
      </section>
    </main>
  )
}
