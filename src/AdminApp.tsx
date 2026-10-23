import { useEffect, useMemo, useState } from 'react'
import canchas from './data/canchas.json'
import type { BloqueoEvento, EstadoReserva, FiltrosAdmin, Reserva } from './types.js'
import type { NumeroBloqueado, NumeroConfiable, ResultadoControlCliente } from './controlClientes.js'
import type { UsuarioAdmin } from './adminAuth.js'
import {
  actualizarEstadoReserva,
  agregarNumeroConfiable,
  bloquearNumero,
  cancelarReservaAdmin,
  cargarReservas,
  cancelarBloqueoEventoLocal,
  crearBloqueoEventoLocal,
  leerBloqueosEventos,
  desbloquearNumero,
  leerNumerosBloqueados,
  leerNumerosConfiables,
  leerReservas,
  limpiarDatosLocales,
  quitarNumeroConfiable,
} from './almacen'
import { supabase, supabaseFaltaEnProduccion, supabaseConfigurado } from './supabase'
import {
  agregarNumeroConfiableRemoto,
  bloquearNumeroRemoto,
  cancelarBloqueoEventoRemoto,
  crearBloqueoEventoRemoto,
  desbloquearNumeroRemoto,
  leerBloqueosEventosRemotos,
  leerNumerosBloqueadosRemotos,
  leerNumerosConfiablesRemotos,
  quitarNumeroConfiableRemoto,
  suscribirseAReservas,
} from './supabaseData'
import { filtrarReservas, resumenAdmin } from './admin'
import { esAdmin } from './adminAuth'
import AdminLogin from './components/admin/AdminLogin'
import AdminNoAutorizado from './components/admin/AdminNoAutorizado'
import AdminCabecera from './components/admin/AdminCabecera'
import AdminMetricas from './components/admin/AdminMetricas'
import AdminFiltros from './components/admin/AdminFiltros'
import AdminListado from './components/admin/AdminListado'
import AdminAlarmaTurno from './components/admin/AdminAlarmaTurno'
import AdminBalanceMensual from './components/admin/AdminBalanceMensual'
import AdminControlClientes from './components/admin/AdminControlClientes'
import AdminEventos from './components/admin/AdminEventos'

type EstadoConexion = 'sincronizando' | 'demo' | 'error' | 'sincronizado'

function usuarioAdminDesdeSesion(usuario: unknown): UsuarioAdmin | null {
  if (!usuario || typeof usuario !== 'object') return null
  const metadata = (usuario as { app_metadata?: { role?: unknown } }).app_metadata
  return {
    app_metadata: {
      role: typeof metadata?.role === 'string' ? metadata.role : undefined,
    },
  }
}

export default function AdminApp() {
  const [usuario, setUsuario] = useState<UsuarioAdmin | null>(null)
  const [cargandoAuth, setCargandoAuth] = useState(supabaseConfigurado)
  const [authError, setAuthError] = useState('')
  const [reservas, setReservas] = useState<Reserva[]>(leerReservas)
  const [filtros, setFiltros] = useState<FiltrosAdmin>({ vista: 'proximas', fecha: 'todas', canchaId: 'todas', buscar: '' })
  const [porCancelar, setPorCancelar] = useState<string | null>(null)
  const [porLimpiar, setPorLimpiar] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>(supabaseConfigurado ? 'sincronizando' : 'demo')
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [actualizandoEstado, setActualizandoEstado] = useState<string | null>(null)
  const [numerosBloqueados, setNumerosBloqueados] = useState<NumeroBloqueado[]>([])
  const [numerosConfiables, setNumerosConfiables] = useState<NumeroConfiable[]>([])
  const [cargandoControl, setCargandoControl] = useState(false)
  const [procesandoControl, setProcesandoControl] = useState(false)
  const [eventos, setEventos] = useState<BloqueoEvento[]>(leerBloqueosEventos)
  const [cargandoEventos, setCargandoEventos] = useState(false)
  const [procesandoEvento, setProcesandoEvento] = useState(false)

  useEffect(() => {
    if (!mensaje) return undefined
    const temporizador = window.setTimeout(() => setMensaje(''), 4000)
    return () => window.clearTimeout(temporizador)
  }, [mensaje])

  useEffect(() => {
    const clienteSupabase = supabase
    if (!supabaseConfigurado || !clienteSupabase) {
      setCargandoAuth(false)
      return undefined
    }

    let montado = true
    const comprobarSesion = async () => {
      const { data, error: errorSesion } = await clienteSupabase.auth.getSession()
      if (!montado) return
      if (errorSesion) setAuthError('No pudimos comprobar la sesión. Inténtalo de nuevo.')
      setUsuario(usuarioAdminDesdeSesion(data.session?.user))
      setCargandoAuth(false)
    }

    void comprobarSesion()
    const { data: escucha } = clienteSupabase.auth.onAuthStateChange((_evento, sesion) => {
      if (!montado) return
      setUsuario(usuarioAdminDesdeSesion(sesion?.user))
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
        const [actuales, eventosActuales] = await Promise.all([
          cargarReservas(),
          supabaseConfigurado ? leerBloqueosEventosRemotos() : Promise.resolve(leerBloqueosEventos()),
        ])
        if (montado) {
          setReservas(actuales)
          setEventos(eventosActuales)
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

  async function cargarControlClientes(): Promise<boolean> {
    setCargandoControl(true)
    try {
      const [bloqueados, confiables] = supabaseConfigurado
        ? await Promise.all([leerNumerosBloqueadosRemotos(), leerNumerosConfiablesRemotos()])
        : [leerNumerosBloqueados(), leerNumerosConfiables()]
      setNumerosBloqueados(bloqueados)
      setNumerosConfiables(confiables)
      return true
    } catch {
      setError('No pudimos cargar el control de clientes. Revisa la conexión con Supabase.')
      return false
    } finally {
      setCargandoControl(false)
    }
  }

  async function cargarEventos(): Promise<BloqueoEvento[]> {
    setCargandoEventos(true)
    try {
      const actuales = supabaseConfigurado ? await leerBloqueosEventosRemotos() : leerBloqueosEventos()
      setEventos(actuales)
      return actuales
    } finally {
      setCargandoEventos(false)
    }
  }

  useEffect(() => {
    if (supabaseConfigurado && !esAdmin(usuario)) return undefined
    void cargarControlClientes()
    return undefined
  }, [usuario])

  const resumen = useMemo(() => resumenAdmin(reservas), [reservas])
  const visibles = useMemo(() => filtrarReservas(reservas, filtros, canchas), [reservas, filtros])

  async function ingresar(email: string, password: string) {
    if (!supabase) return { error: { message: 'Supabase no configurado' } }
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function actualizar(): Promise<void> {
    if (cargando) return
    setCargando(true)
    if (supabaseConfigurado) setEstadoConexion('sincronizando')
    try {
      setReservas(await cargarReservas())
      await cargarEventos()
      await cargarControlClientes()
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

  async function cancelar(id: string): Promise<void> {
    if (cancelando) return
    setCancelando(id)
    try {
      const resultado = await cancelarReservaAdmin(id)
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

  async function cambiarEstado(id: string, estado: EstadoReserva): Promise<void> {
    if (actualizandoEstado) return
    setActualizandoEstado(id)
    setPorCancelar(null)
    try {
      const resultado = await actualizarEstadoReserva(id, estado)
      if ('error' in resultado) {
        setError(resultado.error === 'estado-invalido'
          ? 'Ese cambio de estado no está permitido.'
          : resultado.error === 'conexion'
            ? 'No pudimos actualizar el estado. Revisa la conexión.'
            : 'La reserva ya no existe.')
        setMensaje('')
        return
      }
      setReservas(await cargarReservas())
      if (estado === 'no_asistio') await cargarControlClientes()
      setMensaje(estado === 'iniciado'
        ? 'Turno iniciado.'
        : estado === 'no_asistio'
          ? 'Reserva marcada como inasistencia.'
          : 'Reserva finalizada y pago confirmado.')
      setError('')
    } catch {
      setError('No pudimos actualizar el estado. Revisa tu conexión e inténtalo de nuevo.')
      setMensaje('')
    } finally {
      setActualizandoEstado(null)
    }
  }

  function limpiar(): void {
    limpiarDatosLocales()
    setReservas(leerReservas())
    setEventos(leerBloqueosEventos())
    setPorLimpiar(false)
    setMensaje('Datos locales eliminados. La demo está lista para empezar de cero.')
    setError('')
  }

  async function cerrarSesion(): Promise<void> {
    if (supabase) await supabase.auth.signOut()
  }

  async function ejecutarControl(
    accion: () => Promise<ResultadoControlCliente> | ResultadoControlCliente,
  ): Promise<ResultadoControlCliente> {
    if (procesandoControl) return { error: 'conexion' }
    setProcesandoControl(true)
    try {
      const resultado = await accion()
      if (!('error' in resultado)) await cargarControlClientes()
      return resultado
    } catch {
      return { error: 'conexion' }
    } finally {
      setProcesandoControl(false)
    }
  }

  async function ejecutarEvento<T>(
    accion: () => Promise<T> | T,
  ): Promise<T> {
    if (procesandoEvento) return { error: 'conexion' } as T
    setProcesandoEvento(true)
    try {
      const resultado = await accion()
      if (!(typeof resultado === 'object' && resultado !== null && 'error' in resultado)) await cargarEventos()
      return resultado
    } catch {
      return { error: 'conexion' } as T
    } finally {
      setProcesandoEvento(false)
    }
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

  if (supabaseFaltaEnProduccion) {
    return (
      <main className="admin-auth-state" role="alert">
        El panel no está configurado para producción. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en Vercel.
      </main>
    )
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

      <AdminAlarmaTurno reservas={reservas} canchas={canchas} />

      <AdminEventos
        eventos={eventos}
        canchas={canchas}
        cargando={cargandoEventos}
        procesando={procesandoEvento}
        onCrear={(nuevo) => ejecutarEvento(() => supabaseConfigurado
          ? crearBloqueoEventoRemoto(nuevo)
          : crearBloqueoEventoLocal(nuevo, reservas))}
        onCancelar={(id) => ejecutarEvento(() => supabaseConfigurado
          ? cancelarBloqueoEventoRemoto(id)
          : cancelarBloqueoEventoLocal(id))}
      />

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
          onRequestCancel={(id) => setPorCancelar(id)}
          onCancel={cancelar}
          onCancelRequest={() => setPorCancelar(null)}
          onStatus={cambiarEstado}
          actualizandoEstado={actualizandoEstado}
        />
      </section>

      <AdminBalanceMensual reservas={reservas} canchas={canchas} />

      <AdminControlClientes
        bloqueados={numerosBloqueados}
        confiables={numerosConfiables}
        cargando={cargandoControl}
        procesando={procesandoControl}
        onBloquear={(celular, motivo) => ejecutarControl(() => supabaseConfigurado
          ? bloquearNumeroRemoto(celular, motivo)
          : bloquearNumero(celular, motivo))}
        onDesbloquear={(celular) => ejecutarControl(() => supabaseConfigurado
          ? desbloquearNumeroRemoto(celular)
          : desbloquearNumero(celular))}
        onAgregarConfiable={(celular, alias) => ejecutarControl(() => supabaseConfigurado
          ? agregarNumeroConfiableRemoto(celular, alias)
          : agregarNumeroConfiable(celular, alias))}
        onQuitarConfiable={(celular) => ejecutarControl(() => supabaseConfigurado
          ? quitarNumeroConfiableRemoto(celular)
          : quitarNumeroConfiable(celular))}
      />
    </main>
  )
}
