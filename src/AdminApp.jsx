import { useEffect, useMemo, useState } from 'react'
import canchas from './data/canchas.json'
import { cancelarReserva, cargarReservas, leerReservas, limpiarDatosLocales } from './almacen.js'
import { supabase, supabaseConfigurado } from './supabase.js'
import { suscribirseAReservas } from './supabaseData.js'
import { filtrarReservas, resumenAdmin } from './admin.js'
import { esAdmin } from './adminAuth.js'
import AdminLogin from './components/admin/AdminLogin.jsx'
import AdminNoAutorizado from './components/admin/AdminNoAutorizado.jsx'
import AdminCabecera from './components/admin/AdminCabecera.jsx'
import AdminMetricas from './components/admin/AdminMetricas.jsx'
import AdminFiltros from './components/admin/AdminFiltros.jsx'
import AdminListado from './components/admin/AdminListado.jsx'

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

  async function ingresar(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

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
    return <AdminLogin errorInicial={authError} onLogin={ingresar} />
  }

  if (supabaseConfigurado && !esAdmin(usuario)) {
    return <AdminNoAutorizado onLogout={cerrarSesion} />
  }

  return (
    <main className="admin-app" aria-busy={cargando}>
      <AdminCabecera
        supabaseConfigurado={supabaseConfigurado}
        porLimpiar={porLimpiar}
        cargando={cargando}
        onClearRequest={() => setPorLimpiar(true)}
        onClearCancel={() => setPorLimpiar(false)}
        onClearConfirm={limpiar}
        onRefresh={actualizar}
        onLogout={cerrarSesion}
      />

      <div className={`demo-aviso${estadoConexion === 'error' ? ' sin-conexion' : ''}`} role={estadoConexion === 'error' ? 'alert' : 'status'}>
        <strong>{!supabaseConfigurado
          ? 'Demo'
          : estadoConexion === 'error'
            ? 'Sin conexión'
            : estadoConexion === 'sincronizando'
              ? 'Sincronizando…'
              : 'Datos sincronizados'}</strong> <span>{!supabaseConfigurado
          ? 'El panel y las reservas comparten el almacenamiento de este navegador.'
          : estadoConexion === 'error'
            ? 'No pudimos sincronizar las reservas. Pulsa “Actualizar” para reintentar.'
            : estadoConexion === 'sincronizando'
              ? 'Estamos actualizando las reservas compartidas.'
              : 'El panel y los clientes comparten las reservas de Supabase.'}</span>
      </div>

      {mensaje && <p className="exito" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <AdminMetricas resumen={resumen} />

      <section className="admin-listado">
        <div className="admin-listado-cabecera">
          <div>
            <h2>Agenda</h2>
            <p className="subtitulo">{visibles.length} reserva{visibles.length === 1 ? '' : 's'} mostrada{visibles.length === 1 ? '' : 's'}</p>
          </div>
          <AdminFiltros
            filtros={filtros}
            canchas={canchas}
            onChange={(siguiente) => setFiltros((actual) => ({ ...actual, ...siguiente }))}
          />
        </div>

        <AdminListado
          visibles={visibles}
          cargando={cargando}
          canchas={canchas}
          porCancelar={porCancelar}
          cancelando={cancelando}
          onRequestCancel={setPorCancelar}
          onCancel={cancelar}
          onCancelRequest={() => setPorCancelar(null)}
        />
      </section>
    </main>
  )
}
