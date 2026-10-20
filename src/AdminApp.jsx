import { useEffect, useMemo, useState } from 'react'
import canchas from './data/canchas.json'
import { cancelarReserva, cargarReservas, leerReservas, limpiarDatosLocales } from './almacen.js'
import { supabase, supabaseConfigurado } from './supabase.js'
import { suscribirseAReservas } from './supabaseData.js'
import { activa, fechaISO, rangoHablado, sePuedeCancelar, sumarDias } from './reservas.js'
import { filtrarReservas, precioDeReserva, resumenAdmin } from './admin.js'
import { esAdmin } from './adminAuth.js'

const hoy = () => fechaISO(new Date())

function fechaVisible(fecha) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function nombreCancha(id) {
  return canchas.find((c) => c.id === id)?.nombre ?? 'Cancha desconocida'
}

function estadoReserva(reserva, ahora) {
  if (!activa(reserva, ahora)) return 'Finalizada'
  if (reserva.id.startsWith('demo-')) return 'Demo'
  return 'Activa'
}

export default function AdminApp() {
  const [usuario, setUsuario] = useState(null)
  const [cargandoAuth, setCargandoAuth] = useState(supabaseConfigurado)
  const [authError, setAuthError] = useState('')
  const [reservas, setReservas] = useState(leerReservas)
  const [filtros, setFiltros] = useState({ vista: 'proximas', fecha: 'todas', canchaId: 'todas', buscar: '' })
  const [porCancelar, setPorCancelar] = useState(null)
  const [porLimpiar, setPorLimpiar] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [estadoConexion, setEstadoConexion] = useState(supabaseConfigurado ? 'sincronizando' : 'demo')
  const [cancelando, setCancelando] = useState(null)

  useEffect(() => {
    if (!mensaje) return undefined
    const temporizador = window.setTimeout(() => setMensaje(''), 4000)
    return () => window.clearTimeout(temporizador)
  }, [mensaje])

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCargandoAuth(false)
      return undefined
    }

    let montado = true
    const comprobarSesion = async () => {
      const { data, error: errorSesion } = await supabase.auth.getSession()
      if (!montado) return
      if (errorSesion) setAuthError('No pudimos comprobar la sesión. Inténtalo de nuevo.')
      setUsuario(data.session?.user ?? null)
      setCargandoAuth(false)
    }

    void comprobarSesion()
    const { data: escucha } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      if (!montado) return
      setUsuario(sesion?.user ?? null)
      setCargandoAuth(false)
      if (sesion) setAuthError('')
    })

    return () => {
      montado = false
      escucha.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (supabaseConfigurado && !esAdmin(usuario)) {
      setCargando(false)
      return undefined
    }

    let montado = true
    setCargando(true)
    if (supabaseConfigurado) setEstadoConexion('sincronizando')
    const refrescar = async () => {
      try {
        const actuales = await cargarReservas()
        if (montado) {
          setReservas(actuales)
          setEstadoConexion(supabaseConfigurado ? 'sincronizado' : 'demo')
        }
      } catch {
        if (montado) {
          setEstadoConexion(supabaseConfigurado ? 'error' : 'demo')
          setError('No pudimos cargar las reservas. Ejecuta primero el esquema de Supabase.')
        }
      } finally {
        if (montado) setCargando(false)
      }
    }
    void refrescar()
    const actualizar = () => void refrescar()
    window.addEventListener('storage', actualizar)
    const dejarDeEscuchar = suscribirseAReservas(() => void refrescar())
    return () => {
      montado = false
      window.removeEventListener('storage', actualizar)
      dejarDeEscuchar()
    }
  }, [usuario])

  const resumen = useMemo(() => resumenAdmin(reservas), [reservas])
  const visibles = useMemo(() => filtrarReservas(reservas, filtros, canchas), [reservas, filtros])

  async function actualizar() {
    if (cargando) return
    setCargando(true)
    if (supabaseConfigurado) setEstadoConexion('sincronizando')
    try {
      setReservas(await cargarReservas())
    } catch {
      setEstadoConexion(supabaseConfigurado ? 'error' : 'demo')
      setError('No pudimos actualizar la lista. Revisa la conexión con Supabase.')
      setCargando(false)
      return
    }
    setEstadoConexion(supabaseConfigurado ? 'sincronizado' : 'demo')
    setCargando(false)
    setMensaje('Lista actualizada.')
    setError('')
  }

  async function cancelar(id) {
    if (cancelando) return
    setCancelando(id)
    try {
      const resultado = await cancelarReserva(id)
      setPorCancelar(null)
      if (resultado.error) {
        setError(resultado.error === 'tarde'
          ? 'No pudimos cancelar la reserva. Inténtalo de nuevo.'
          : resultado.error === 'conexion'
            ? 'No pudimos cancelar la reserva. Revisa la conexión.'
            : 'Esta reserva pertenece a la demo o ya no existe.')
        setMensaje('')
        return
      }
      try {
        setReservas(await cargarReservas())
      } catch {
        setError('La reserva se canceló, pero no pudimos actualizar la lista.')
        setMensaje('')
        return
      }
      setMensaje('Reserva cancelada. El horario volvió a quedar libre.')
      setError('')
    } catch {
      setError('No pudimos cancelar la reserva. Revisa tu conexión e inténtalo de nuevo.')
      setMensaje('')
    } finally {
      setCancelando(null)
    }
  }

  function limpiar() {
    limpiarDatosLocales()
    setReservas(leerReservas())
    setPorLimpiar(false)
    setMensaje('Datos locales eliminados. La demo está lista para empezar de cero.')
    setError('')
  }

  async function cerrarSesion() {
    if (supabase) await supabase.auth.signOut()
  }

  if (supabaseConfigurado && cargandoAuth) {
    return <div className="admin-auth-state" role="status">Comprobando acceso…</div>
  }

  if (supabaseConfigurado && !usuario) {
    return <AdminLogin errorInicial={authError} />
  }

  if (supabaseConfigurado && !esAdmin(usuario)) {
    return <AdminNoAutorizado alCerrar={cerrarSesion} />
  }

  return (
    <main className="admin-app" aria-busy={cargando}>
      <header className="admin-cabecera">
        <div>
          <p className="admin-kicker">Panel privado</p>
          <h1>Reservas de la academia</h1>
          <p className="subtitulo">Revisa las reservas hechas desde este navegador.</p>
        </div>
        <div className="admin-acciones">
          {!supabaseConfigurado && (porLimpiar ? (
            <div className="admin-reset-confirmar">
              <span>¿Borrar reservas y clientes?</span>
              <button className="chip peligro" onClick={limpiar}>Sí, borrar</button>
              <button className="chip" onClick={() => setPorLimpiar(false)}>No</button>
            </div>
          ) : (
            <button className="boton-secundario admin-boton admin-limpiar" onClick={() => setPorLimpiar(true)}>
              <span aria-hidden="true">🧹</span> Empezar de cero
            </button>
          ))}
          <button className="boton-secundario admin-boton" disabled={cargando} onClick={actualizar}>
            {cargando ? 'Actualizando…' : <><span aria-hidden="true">↻</span> Actualizar</>}
          </button>
          <a className="boton-secundario admin-boton" href="/">Vista del cliente</a>
          {supabaseConfigurado && <button className="boton-secundario admin-boton" onClick={cerrarSesion}>Cerrar sesión</button>}
        </div>
      </header>

      <div className={`demo-aviso${estadoConexion === 'error' ? ' sin-conexion' : ''}`} role={estadoConexion === 'error' ? 'alert' : 'status'}>
        <strong>{!supabaseConfigurado
          ? 'Demo'
          : estadoConexion === 'error'
            ? 'Sin conexión'
            : estadoConexion === 'sincronizando'
              ? 'Sincronizando…'
              : 'Datos sincronizados'}</strong>
        <span>{!supabaseConfigurado
          ? 'El panel y las reservas comparten el almacenamiento de este navegador.'
          : estadoConexion === 'error'
            ? 'No pudimos sincronizar las reservas. Pulsa “Actualizar” para reintentar.'
            : estadoConexion === 'sincronizando'
              ? 'Estamos actualizando las reservas compartidas.'
              : 'El panel y los clientes comparten las reservas de Supabase.'}</span>
      </div>

      {mensaje && <p className="exito" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <section className="admin-metricas" aria-label="Resumen de reservas">
        <article className="admin-metrica">
          <span>Próximas reservas</span>
          <strong>{resumen.proximas}</strong>
        </article>
        <article className="admin-metrica">
          <span>Reservas de hoy</span>
          <strong>{resumen.hoy}</strong>
        </article>
      </section>

      <section className="admin-listado">
        <div className="admin-listado-cabecera">
          <div>
            <h2>Agenda</h2>
            <p className="subtitulo">{visibles.length} reserva{visibles.length === 1 ? '' : 's'} mostrada{visibles.length === 1 ? '' : 's'}</p>
          </div>
          <div className="admin-filtros">
            <label>
              <span>Ver</span>
              <select value={filtros.vista} onChange={(e) => setFiltros({ ...filtros, vista: e.target.value })}>
                <option value="proximas">Próximas</option>
                <option value="todas">Todas</option>
              </select>
            </label>
            <label>
              <span>Fecha</span>
              <select value={filtros.fecha} onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}>
                <option value="todas">Todas las fechas</option>
                <option value={hoy()}>Hoy</option>
                <option value={fechaISO(sumarDias(1))}>Mañana</option>
              </select>
            </label>
            <label>
              <span>Cancha</span>
              <select value={filtros.canchaId} onChange={(e) => setFiltros({ ...filtros, canchaId: e.target.value })}>
                <option value="todas">Todas las canchas</option>
                {canchas.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}
              </select>
            </label>
            <label className="admin-buscar">
              <span>Alias o nombre</span>
              <input
                type="search"
                value={filtros.buscar}
                onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })}
                placeholder="Ej: David o 931..."
              />
            </label>
          </div>
        </div>

        {cargando ? (
          <div className="admin-cargando" role="status">Cargando reservas…</div>
        ) : visibles.length === 0 ? (
          <div className="admin-vacio">
            <strong>No hay reservas con estos filtros.</strong>
            <span>Prueba con “Todas” o cambia la fecha.</span>
          </div>
        ) : (
          <div className="admin-reservas">
            {visibles.map((reserva) => {
              const puedeCancelar = !reserva.id.startsWith('demo-') && sePuedeCancelar(reserva)
              const cancha = canchas.find((c) => c.id === reserva.canchaId)
              return (
                <article className="admin-reserva" key={reserva.id} aria-labelledby={`reserva-${reserva.id}`}>
                  <div className="admin-reserva-fecha">
                    <strong>{fechaVisible(reserva.fecha)}</strong>
                    <span>{rangoHablado(reserva.inicio, reserva.horas)}</span>
                  </div>
                  <div className="admin-reserva-datos">
                    <h3 id={`reserva-${reserva.id}`}>{nombreCancha(reserva.canchaId)}</h3>
                    <span>{reserva.alias} · {reserva.celular}</span>
                    <span className="precio">S/ {precioDeReserva(reserva, canchas)} · {cancha?.jugadores} contra {cancha?.jugadores}</span>
                  </div>
                  <div className="admin-reserva-estado">
                    <span className={`estado estado-${estadoReserva(reserva) === 'Activa' ? 'activa' : 'suave'}`}>
                      {estadoReserva(reserva)}
                    </span>
                    {porCancelar === reserva.id ? (
                      <div className="admin-confirmar" role="group" aria-labelledby={`confirmar-admin-${reserva.id}`}>
                        <span id={`confirmar-admin-${reserva.id}`}>¿Cancelar esta reserva?</span>
                        <div>
                          <button className="chip peligro" disabled={cancelando === reserva.id} onClick={() => cancelar(reserva.id)}>
                            {cancelando === reserva.id ? 'Cancelando…' : 'Sí, cancelar'}
                          </button>
                          <button className="chip" disabled={Boolean(cancelando)} onClick={() => setPorCancelar(null)}>No</button>
                        </div>
                      </div>
                    ) : puedeCancelar ? (
                      <button className="admin-cancelar" disabled={Boolean(cancelando)} onClick={() => setPorCancelar(reserva.id)}>Cancelar</button>
                    ) : reserva.id.startsWith('demo-') ? (
                      <small>Solo ejemplo</small>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function AdminLogin({ errorInicial }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(errorInicial ?? '')
  const [procesando, setProcesando] = useState(false)

  async function ingresar(e) {
    e.preventDefault()
    if (procesando) return
    setError('')
    setProcesando(true)
    const { error: errorInicio } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (errorInicio) {
      setError(errorInicio.message.toLowerCase().includes('invalid login credentials')
        ? 'El correo o la contraseña no son correctos.'
        : 'No pudimos iniciar sesión. Revisa tu conexión e inténtalo de nuevo.')
    }
    setProcesando(false)
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card">
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

function AdminNoAutorizado({ alCerrar }) {
  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card">
        <p className="admin-kicker">Panel privado</p>
        <h1>Acceso no autorizado</h1>
        <p className="subtitulo">No tienes autorización para ver las reservas de la academia.</p>
        <button className="boton-principal" onClick={alCerrar}>Cerrar sesión</button>
      </section>
    </main>
  )
}
