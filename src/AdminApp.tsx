import { useEffect, useMemo, useRef, useState } from 'react'
import canchas from './data/canchas.json'
import type { BloqueoEvento, CambiosReservaAdmin, ComprobanteAdmin, EstadoReserva, FiltrosAdmin, Reserva, ResultadoEditarReserva } from './types.js'
import type { NumeroBloqueado, NumeroConfiable, ResultadoControlCliente } from './controlClientes.js'
import type { UsuarioAdmin } from './adminAuth.js'
import {
  actualizarEstadoReserva,
  agregarNumeroConfiable,
  bloquearNumero,
  cancelarReservaAdmin,
  cargarReservas,
  cancelarEventoEspecialLocal,
  actualizarEventoEspecialLocal,
  crearEventoEspecialLocal,
  leerBloqueosEventos,
  desbloquearNumero,
  editarReservaAdmin,
  leerNumerosBloqueados,
  leerNumerosConfiables,
  leerReservas,
  limpiarDatosLocales,
  quitarNumeroConfiable,
  confirmarPagoAdminLocal,
} from './almacen'
import { supabase, supabaseFaltaEnProduccion, supabaseConfigurado } from './supabase'
import {
  agregarNumeroConfiableRemoto,
  bloquearNumeroRemoto,
  cancelarEventoEspecialRemoto,
  confirmarPagoAdminRemoto,
  crearUrlComprobanteAdminRemota,
  nombreDescargaComprobante,
  obtenerUrlComprobanteCacheada,
  precalentarComprobanteAdminRemoto,
  actualizarEventoEspecialRemoto,
  crearEventoEspecialRemoto,
  desbloquearNumeroRemoto,
  leerComprobantesAdminRemotos,
  leerBloqueosEventosRemotos,
  limpiarDatosPruebaRemoto,
  leerNumerosBloqueadosRemotos,
  leerNumerosConfiablesRemotos,
  quitarNumeroConfiableRemoto,
  suscribirseAReservas,
} from './supabaseData'
import { filtrarReservas } from './admin'
import { esAdmin } from './adminAuth'
import AdminLogin from './components/admin/AdminLogin'
import AdminNoAutorizado from './components/admin/AdminNoAutorizado'
import AdminCabecera from './components/admin/AdminCabecera'
import AdminFiltros, { AdminFiltrosCampos } from './components/admin/AdminFiltros'
import AdminListado from './components/admin/AdminListado'
import AdminAlarmaTurno from './components/admin/AdminAlarmaTurno'
import AdminBalanceMensual from './components/admin/AdminBalanceMensual'
import AdminControlClientes from './components/admin/AdminControlClientes'
import AdminEventos from './components/admin/AdminEventos'
import AdminSimuladorReservas from './components/admin/AdminSimuladorReservas'
import AdminNavegacion from './components/admin/AdminNavegacion'
import AdminModalComprobante from './components/admin/AdminModalComprobante'
import AdminModalEditarReserva from './components/admin/AdminModalEditarReserva'
import { crearBloqueoAccion } from './accionUnica'

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
  const [comprobantesAdmin, setComprobantesAdmin] = useState<ComprobanteAdmin[]>([])
  const [filtros, setFiltros] = useState<FiltrosAdmin>({ vista: 'todas', fecha: 'todas', canchaId: 'todas', buscar: '' })
  const [porCancelar, setPorCancelar] = useState<string | null>(null)
  const [porLimpiar, setPorLimpiar] = useState(false)
  const [limpiandoDatosPrueba, setLimpiandoDatosPrueba] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [listaCargada, setListaCargada] = useState(!supabaseConfigurado)
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>(supabaseConfigurado ? 'sincronizando' : 'demo')
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [actualizandoEstado, setActualizandoEstado] = useState<string | null>(null)
  const [procesandoComprobante, setProcesandoComprobante] = useState<string | null>(null)
  const [modalComprobante, setModalComprobante] = useState<{
    comprobante: ComprobanteAdmin
    url: string | null
    cargando: boolean
    error: string | null
  } | null>(null)
  const [numerosBloqueados, setNumerosBloqueados] = useState<NumeroBloqueado[]>([])
  const [numerosConfiables, setNumerosConfiables] = useState<NumeroConfiable[]>([])
  const [cargandoControl, setCargandoControl] = useState(false)
  const [procesandoControl, setProcesandoControl] = useState(false)
  const [eventos, setEventos] = useState<BloqueoEvento[]>(leerBloqueosEventos)
  const [cargandoEventos, setCargandoEventos] = useState(false)
  const [procesandoEvento, setProcesandoEvento] = useState(false)
  const [reservaAEditar, setReservaAEditar] = useState<Reserva | null>(null)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const bloqueoEditar = useRef(crearBloqueoAccion())
  const bloqueoActualizar = useRef(crearBloqueoAccion())
  const bloqueoCancelar = useRef(crearBloqueoAccion())
  const bloqueoEstado = useRef(crearBloqueoAccion())
  const bloqueoComprobante = useRef(crearBloqueoAccion())
  const bloqueoControl = useRef(crearBloqueoAccion())
  const bloqueoEvento = useRef(crearBloqueoAccion())

  useEffect(() => {
    if (!mensaje) return undefined
    const temporizador = window.setTimeout(() => setMensaje(''), 4000)
    return () => window.clearTimeout(temporizador)
  }, [mensaje])

  useEffect(() => {
    if (!supabaseConfigurado || !comprobantesAdmin.length) return
    const paraPrecalentar = comprobantesAdmin.slice(0, 10)
    for (const item of paraPrecalentar) {
      void precalentarComprobanteAdminRemoto(item.storagePath)
    }
  }, [comprobantesAdmin])

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
        const comprobantesActuales = supabaseConfigurado ? await leerComprobantesAdminRemotos() : []
        if (montado) {
          setReservas(actuales)
          setComprobantesAdmin(comprobantesActuales)
      setModalComprobante((actual) => {
        if (!actual) return null
        const pagoId = actual.comprobante.pagoId
        const actualizado = comprobantesActuales.find((c) => c.pagoId === pagoId)
        return actualizado
          ? { ...actual, comprobante: actualizado }
          : { ...actual, comprobante: { ...actual.comprobante, estado: 'confirmado' } }
      })
          setEventos(eventosActuales)
          setEstadoConexion(supabaseConfigurado ? 'sincronizado' : 'demo')
        }
      } catch {
        if (montado) {
          setEstadoConexion(supabaseConfigurado ? 'error' : 'demo')
          setError('No pudimos cargar las reservas. Ejecuta primero el esquema de Supabase.')
        }
      } finally {
        if (montado) {
          setListaCargada(true)
          setCargando(false)
        }
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

  const visibles = useMemo(() => filtrarReservas(reservas, filtros, canchas), [reservas, filtros])
  const porRevisar = useMemo(() => filtrarReservas(reservas, { vista: 'por-revisar' }, canchas).length, [reservas])

  async function ingresar(email: string, password: string) {
    if (!supabase) return { error: { message: 'Supabase no configurado' } }
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function actualizar(): Promise<void> {
    if (!bloqueoActualizar.current.adquirir()) return
    if (cargando) {
      bloqueoActualizar.current.liberar()
      return
    }
    setCargando(true)
    if (supabaseConfigurado) setEstadoConexion('sincronizando')
    try {
      const [actuales, comprobantesActuales] = await Promise.all([
        cargarReservas(),
        supabaseConfigurado ? leerComprobantesAdminRemotos() : Promise.resolve([]),
      ])
      setReservas(actuales)
      setComprobantesAdmin(comprobantesActuales)
      setModalComprobante((actual) => {
        if (!actual) return null
        const pagoId = actual.comprobante.pagoId
        const actualizado = comprobantesActuales.find((c) => c.pagoId === pagoId)
        return actualizado
          ? { ...actual, comprobante: actualizado }
          : { ...actual, comprobante: { ...actual.comprobante, estado: 'confirmado' } }
      })
      await cargarEventos()
      await cargarControlClientes()
    } catch {
      setEstadoConexion(supabaseConfigurado ? 'error' : 'demo')
      setError('No pudimos actualizar la lista. Revisa la conexión con Supabase.')
      setCargando(false)
      return
    } finally {
      bloqueoActualizar.current.liberar()
    }
    setEstadoConexion(supabaseConfigurado ? 'sincronizado' : 'demo')
    setCargando(false)
    setMensaje('Lista actualizada.')
    setError('')
  }

  async function cancelar(id: string): Promise<void> {
    if (!bloqueoCancelar.current.adquirir()) return
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
      bloqueoCancelar.current.liberar()
    }
  }

  async function guardarEdicion(cambios: CambiosReservaAdmin): Promise<ResultadoEditarReserva> {
    if (!reservaAEditar) return { error: 'no-existe' }
    if (!bloqueoEditar.current.adquirir()) return { error: 'conexion' }
    setGuardandoEdicion(true)
    try {
      const resultado = await editarReservaAdmin(reservaAEditar.id, cambios)
      if ('error' in resultado) {
        return resultado
      }
      try {
        const actuales = await cargarReservas()
        setReservas(actuales)
      } catch {
        // En caso de fallo transitorio en recarga, realtime sincronizará
      }
      setReservaAEditar(null)
      setMensaje('Reserva reprogramada correctamente.')
      setError('')
      return resultado
    } catch {
      return { error: 'conexion' }
    } finally {
      setGuardandoEdicion(false)
      bloqueoEditar.current.liberar()
    }
  }

  async function cambiarEstado(id: string, estado: EstadoReserva): Promise<void> {
    if (!bloqueoEstado.current.adquirir()) return
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
          : 'Reserva finalizada y pago total confirmado.')
      setError('')
    } catch {
      setError('No pudimos actualizar el estado. Revisa tu conexión e inténtalo de nuevo.')
      setMensaje('')
    } finally {
      setActualizandoEstado(null)
      bloqueoEstado.current.liberar()
    }
  }

  function mensajeErrorComprobanteAdmin(error: string): string {
    if (error === 'no-existe') return 'El comprobante ya no existe.'
    if (error === 'no-confirmable') return 'Este comprobante ya no puede confirmarse.'
    if (error === 'sin-comprobante') return 'No encontramos la imagen del comprobante.'
    if (error === 'confirmacion-fuera-de-plazo') return 'El plazo para confirmar este comprobante venció (2 horas después de terminar el turno).'
    if (error === 'reserva-no-activa') return 'La reserva ya no está activa.'
    return 'No pudimos procesar el comprobante. Revisa la conexión.'
  }

  async function verComprobante(comprobante: ComprobanteAdmin): Promise<void> {
    const accion = `ver:${comprobante.pagoId}`
    if (!bloqueoComprobante.current.adquirir()) return
    setProcesandoComprobante(accion)
    setModalComprobante({
      comprobante,
      url: null,
      cargando: true,
      error: null,
    })
    try {
      const url = await crearUrlComprobanteAdminRemota(comprobante.storagePath, false)
      setModalComprobante((actual) => {
        if (!actual || actual.comprobante.pagoId !== comprobante.pagoId) return actual
        return { ...actual, url, cargando: false }
      })
    } catch {
      setModalComprobante((actual) => {
        if (!actual || actual.comprobante.pagoId !== comprobante.pagoId) return actual
        return { ...actual, cargando: false, error: 'No pudimos cargar la imagen del comprobante. Revisa la conexión.' }
      })
    } finally {
      setProcesandoComprobante(null)
      bloqueoComprobante.current.liberar()
    }
  }

  async function descargarComprobante(comprobante: ComprobanteAdmin): Promise<void> {
    const accion = `descargar:${comprobante.pagoId}`
    if (!bloqueoComprobante.current.adquirir()) return
    setProcesandoComprobante(accion)
    try {
      const url = await crearUrlComprobanteAdminRemota(comprobante.storagePath, true)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombreDescargaComprobante(comprobante.storagePath)
      enlace.rel = 'noreferrer'
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
    } catch {
      setError('No pudimos descargar el comprobante. Revisa la conexión.')
      setMensaje('')
    } finally {
      setProcesandoComprobante(null)
      bloqueoComprobante.current.liberar()
    }
  }

  async function confirmarComprobante(pagoId: string): Promise<void> {
    if (!bloqueoComprobante.current.adquirir()) return
    setProcesandoComprobante(`confirmar:${pagoId}`)
    try {
      const resultado = supabaseConfigurado
        ? await confirmarPagoAdminRemoto(pagoId)
        : confirmarPagoAdminLocal(pagoId)
      if ('error' in resultado) {
        setError(mensajeErrorComprobanteAdmin(resultado.error))
        setMensaje('')
        return
      }
      const [actuales, comprobantesActuales] = await Promise.all([
        cargarReservas(),
        supabaseConfigurado ? leerComprobantesAdminRemotos() : Promise.resolve([]),
      ])
      setReservas(actuales)
      setComprobantesAdmin((prev) =>
        supabaseConfigurado
          ? comprobantesActuales
          : prev.map((c) => (c.pagoId === pagoId ? { ...c, estado: 'confirmado' } : c)),
      )
      setModalComprobante((actual) => {
        if (!actual) return null
        const idActual = actual.comprobante.pagoId
        const actualizado = comprobantesActuales.find((c) => c.pagoId === idActual)
        return actualizado
          ? { ...actual, comprobante: actualizado }
          : { ...actual, comprobante: { ...actual.comprobante, estado: 'confirmado' } }
      })
      setMensaje('Comprobante confirmado. La reserva sigue activa.')
      setError('')
    } catch {
      setError('No pudimos confirmar el comprobante. Revisa la conexión.')
      setMensaje('')
    } finally {
      setProcesandoComprobante(null)
      bloqueoComprobante.current.liberar()
    }
  }

  async function limpiar(): Promise<void> {
    if (supabaseConfigurado) {
      setLimpiandoDatosPrueba(true)
      try {
        const resultado = await limpiarDatosPruebaRemoto()
        if ('error' in resultado) {
          setError(resultado.error === 'no-autorizado'
            ? 'No tienes autorización para limpiar los datos de prueba.'
            : 'No pudimos limpiar los datos de prueba. Revisa la función de Supabase.')
          setMensaje('')
          return
        }
        await actualizar()
        setMensaje('Datos de prueba eliminados. La aplicación está lista para probar de nuevo.')
        setError('')
      } finally {
        setLimpiandoDatosPrueba(false)
        setPorLimpiar(false)
      }
      return
    }

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
    if (!bloqueoControl.current.adquirir()) return { error: 'conexion' }
    setProcesandoControl(true)
    try {
      const resultado = await accion()
      if (!('error' in resultado)) await cargarControlClientes()
      return resultado
    } catch {
      return { error: 'conexion' }
    } finally {
      setProcesandoControl(false)
      bloqueoControl.current.liberar()
    }
  }

  async function ejecutarEvento<T>(
    accion: () => Promise<T> | T,
  ): Promise<T> {
    if (!bloqueoEvento.current.adquirir()) return { error: 'conexion' } as T
    setProcesandoEvento(true)
    try {
      const resultado = await accion()
      if (!(typeof resultado === 'object' && resultado !== null && 'error' in resultado)) await cargarEventos()
      return resultado
    } catch {
      return { error: 'conexion' } as T
    } finally {
      setProcesandoEvento(false)
      bloqueoEvento.current.liberar()
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
    <main id="admin-inicio" className="admin-app" aria-busy={cargando}>
      <aside className="admin-sidebar">
        <AdminNavegacion />
      </aside>

      <div className="admin-cuerpo">
        <AdminCabecera
        supabaseConfigurado={supabaseConfigurado}
        porLimpiar={porLimpiar}
        limpiandoDatosPrueba={limpiandoDatosPrueba}
        cargando={cargando}
        onClearRequest={() => setPorLimpiar(true)}
        onClearCancel={() => setPorLimpiar(false)}
        onClearConfirm={() => void limpiar()}
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
              : ''}</span>
      </div>

      {mensaje && <p className="exito" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <AdminAlarmaTurno reservas={reservas} canchas={canchas} eventos={eventos} />

      <section id="admin-agenda" className="admin-listado">
        <div className="admin-listado-cabecera">
          <div>
            <h2>Agenda</h2>
            <p className="subtitulo">{visibles.length} reserva{visibles.length === 1 ? '' : 's'} mostrada{visibles.length === 1 ? '' : 's'}</p>
          </div>
          <AdminFiltros
            filtros={filtros}
            canchas={canchas}
            porRevisar={porRevisar}
            onChange={(siguiente) => setFiltros((actual) => ({ ...actual, ...siguiente }))}
          />
        </div>

        <AdminFiltrosCampos
          filtros={filtros}
          canchas={canchas}
          onChange={(siguiente) => setFiltros((actual) => ({ ...actual, ...siguiente }))}
        />

        <AdminListado
          visibles={visibles}
          cargandoInicial={cargando && !listaCargada}
          actualizando={cargando}
          canchas={canchas}
          comprobantes={comprobantesAdmin}
          porCancelar={porCancelar}
          cancelando={cancelando}
          onRequestCancel={(id) => setPorCancelar(id)}
          onCancel={cancelar}
          onCancelRequest={() => setPorCancelar(null)}
          onStatus={cambiarEstado}
          actualizandoEstado={actualizandoEstado}
          procesandoComprobante={procesandoComprobante}
          onViewComprobante={(comprobante) => void verComprobante(comprobante)}
          onPreloadComprobante={(comprobante) => void precalentarComprobanteAdminRemoto(comprobante.storagePath)}
          onDownloadComprobante={(comprobante) => void descargarComprobante(comprobante)}
          onConfirmarComprobante={(pagoId) => void confirmarComprobante(pagoId)}
          onEdit={(r) => setReservaAEditar(r)}
        />
      </section>

      <div id="admin-reservas-especiales" className="admin-seccion-destino">
        <AdminEventos
          eventos={eventos}
          canchas={canchas}
          reservas={reservas}
          cargando={cargandoEventos}
          procesando={procesandoEvento}
          onCrear={(nuevo) => ejecutarEvento(() => supabaseConfigurado
            ? crearEventoEspecialRemoto(nuevo)
            : crearEventoEspecialLocal(nuevo, reservas))}
          onCancelar={(grupoId) => ejecutarEvento(() => supabaseConfigurado
            ? cancelarEventoEspecialRemoto(grupoId)
            : cancelarEventoEspecialLocal(grupoId))}
          onEditar={(actualizado) => ejecutarEvento(async () => {
            const res = await (supabaseConfigurado
              ? actualizarEventoEspecialRemoto(actualizado)
              : Promise.resolve(actualizarEventoEspecialLocal(actualizado, reservas)))
            if (!('error' in res)) {
              await cargarEventos()
            }
            return res
          })}
        />
      </div>

      <AdminSimuladorReservas cancha={canchas[0]} />

      <div id="admin-balance" className="admin-seccion-destino">
        <AdminBalanceMensual reservas={reservas} canchas={canchas} eventos={eventos} />
      </div>

      <div id="admin-clientes" className="admin-seccion-destino">
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
      </div>
      </div>
      {reservaAEditar && (
        <AdminModalEditarReserva
          reserva={reservaAEditar}
          canchas={canchas}
          reservas={reservas}
          eventos={eventos}
          procesando={guardandoEdicion}
          onClose={() => setReservaAEditar(null)}
          onGuardar={guardarEdicion}
        />
      )}
      {modalComprobante && (
        <AdminModalComprobante
          comprobante={modalComprobante.comprobante}
          reserva={reservas.find((r) => r.id === modalComprobante.comprobante.reservaId)}
          cancha={canchas.find((c) => c.id === reservas.find((r) => r.id === modalComprobante.comprobante.reservaId)?.canchaId)}
          url={modalComprobante.url}
          cargando={modalComprobante.cargando}
          error={modalComprobante.error}
          onClose={() => setModalComprobante(null)}
          onDownload={(comprobante) => void descargarComprobante(comprobante)}
          onReintentar={() => void verComprobante(modalComprobante.comprobante)}
        />
      )}
    </main>
  )
}
