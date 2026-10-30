import { useEffect, useRef, useState } from 'react'
import canchas from './data/canchas.json'
import {
  horarios, masCercana, fechaISO, sumarDias, DURACION_BLOQUE,
  deCliente, activa,
} from './reservas'
import type { HorarioDisponible } from './reservas'
import {
  leerReservas, crearReserva, cancelarReserva, registrarCliente, actualizarCliente,
  leerTokensReservas, guardarTokenReserva, eliminarTokenReserva, limpiarTokensInactivos,
  marcarTokenCancelado, esReservaVisibleCliente,
  leerYo, guardarYo, olvidarYo, leerBloqueosEventos, leerNumerosBloqueados, leerNumerosConfiables,
} from './almacen'
import { supabaseFaltaEnProduccion, supabaseConfigurado } from './supabase'
import { leerHorariosRemotos, leerMisReservasRemotas, precalentarRegistrarAdelantoYapeRemoto, registrarAdelantoYapeRemoto, verificarNumeroConfiableRemoto } from './supabaseData'
import type { ErrorReserva, ResultadoCancelacion, ResultadoCliente, ResultadoPago } from './supabaseData'
import { validarComprobante } from './pagos'
import type { BloqueoEvento, Campo, Cliente, Reserva } from './types.js'
import { borrarBorradorReserva, guardarBorradorReserva, leerBorradorReserva } from './borradorReserva'
import type { EtapaHorario, TurnoHorario } from './borradorReserva'
import CabeceraCliente from './components/cliente/CabeceraCliente'
import ProgresoReserva from './components/cliente/ProgresoReserva'
import SelectorCampos from './components/cliente/SelectorCampos'
import SelectorHorario from './components/cliente/SelectorHorario'
import DatosReserva from './components/cliente/DatosReserva'
import ReservaCompletada from './components/cliente/ReservaCompletada'
import MisReservas from './components/cliente/MisReservas'
import PopupPromocion from './components/cliente/PopupPromocion'

const DIAS = 21
const EDAD_MAXIMA_MIS_RESERVAS_MS = 2 * 60_000
const INTERVALO_MIS_RESERVAS_ACTIVAS_MS = 10_000
const NOMBRES_PASOS = ['Campo', 'Día y hora', 'Tus datos'] as const

type ResultadoReservaCliente =
  | { reserva: Reserva; token?: string }
  | { error: ErrorReserva | 'limite-intentos'; alternativa?: HorarioDisponible }

export default function App() {
  const estadoInicialReserva = leerBorradorReserva(canchas)
  const [paso, setPaso] = useState(() => estadoInicialReserva?.paso ?? 1)
  const [cancha, setCancha] = useState<Campo | null>(() => estadoInicialReserva ? canchas.find((c) => c.id === estadoInicialReserva.canchaId) ?? null : null)
  const [dia, setDia] = useState(() => estadoInicialReserva?.dia ?? 0)
  const [horas, setHoras] = useState(() => estadoInicialReserva?.horas ?? 1)
  const [inicio, setInicio] = useState<number | null>(() => estadoInicialReserva?.inicio ?? null)
  const [etapaHorario, setEtapaHorario] = useState<EtapaHorario>(() => estadoInicialReserva?.etapa ?? 'dia')
  const [turnoHorario, setTurnoHorario] = useState<TurnoHorario | null>(() => estadoInicialReserva?.turno ?? null)
  const [semanaHorario, setSemanaHorario] = useState(() => estadoInicialReserva?.semana ?? 0)
  const [reservas, setReservas] = useState<Reserva[]>(leerReservas)
  const [bloqueosEventos, setBloqueosEventos] = useState<BloqueoEvento[]>(leerBloqueosEventos)
  const [yo, setYo] = useState<Cliente | null>(leerYo)
  const [hecha, setHecha] = useState<Reserva | null>(null)
  const [errorConexion, setErrorConexion] = useState('')
  const [errorMias, setErrorMias] = useState('')
  const [horariosDisponibles, setHorariosDisponibles] = useState<HorarioDisponible[]>([])
  const [cargandoHorarios, setCargandoHorarios] = useState(false)
  const [cargandoMias, setCargandoMias] = useState(false)
  const [intentoCarga, setIntentoCarga] = useState(0)
  const [mostrarPromo, setMostrarPromo] = useState(true)
  // "Mis reservas" se abre encima del paso actual, así al volver no se pierde lo elegido
  const [verMias, setVerMias] = useState(false)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const ultimaCargaMias = useRef('')
  const ultimaSincronizacionMias = useRef(0)
  const sincronizarMiasRef = useRef<(() => void) | null>(null)
  const tokens = leerTokensReservas(yo?.celular)
  const claveTokens = tokens.join('|')
  const mias = supabaseConfigurado
    ? yo ? reservas.filter((r) => r.celular === yo.celular && (activa(r) || esReservaVisibleCliente(r))) : []
    : yo ? deCliente(reservas, yo.celular) : []
  const clienteMias = yo ?? (mias[0] ? { alias: mias[0].alias, celular: mias[0].celular } : null)
  const fecha = fechaISO(sumarDias(dia))

  useEffect(() => {
    if (paso === 1 || paso === 4) {
      borrarBorradorReserva()
      return
    }
    if ((paso !== 2 && paso !== 3) || !cancha) return
    guardarBorradorReserva({
      paso,
      canchaId: cancha.id,
      fecha,
      horas,
      inicio,
      etapa: etapaHorario,
      turno: turnoHorario,
      semana: semanaHorario,
    })
  }, [paso, cancha, fecha, horas, inicio, etapaHorario, turnoHorario, semanaHorario])

  // En el cliente público solo se conserva la demo local. Supabase se consulta
  // mediante RPC en segundo plano para reservas y disponibilidad.
  useEffect(() => {
    const alCambiar = () => {
      if (!supabaseConfigurado) setReservas(leerReservas())
      if (!supabaseConfigurado) setBloqueosEventos(leerBloqueosEventos())
      setYo(leerYo())
    }
    if (!supabaseConfigurado) setReservas(leerReservas())
    window.addEventListener('storage', alCambiar)
    return () => {
      window.removeEventListener('storage', alCambiar)
    }
  }, [])

  useEffect(() => {
    if (!supabaseConfigurado) return
    if (!tokens.length) {
      sincronizarMiasRef.current = null
      setReservas([])
      setCargandoMias(false)
      setErrorMias('')
      ultimaCargaMias.current = claveTokens
      ultimaSincronizacionMias.current = Date.now()
      return
    }

    let montado = true
    let cargaMiasEnCurso = false
    const mostrarCargaInicial = ultimaCargaMias.current !== claveTokens
    if (mostrarCargaInicial) {
      setCargandoMias(true)
      setErrorMias('')
    }
    const cargarMias = async (mostrarCarga: boolean) => {
      if (!montado || cargaMiasEnCurso) return
      cargaMiasEnCurso = true
      if (mostrarCarga) setCargandoMias(true)
      try {
        const actuales = await leerMisReservasRemotas(tokens)
        if (!montado) return
        setReservas(actuales)
        limpiarTokensInactivos(actuales)
        ultimaCargaMias.current = claveTokens
        ultimaSincronizacionMias.current = Date.now()
        setErrorMias('')
        setErrorConexion('')
      } catch {
        if (montado) setErrorMias('No pudimos cargar tus reservas. Revisa tu conexión e inténtalo de nuevo.')
      } finally {
        cargaMiasEnCurso = false
        if (montado && mostrarCarga) setCargandoMias(false)
      }
    }
    sincronizarMiasRef.current = () => void cargarMias(false)
    const sincronizarSiEstaDesactualizada = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - ultimaSincronizacionMias.current < EDAD_MAXIMA_MIS_RESERVAS_MS) return
      void cargarMias(false)
    }
    void cargarMias(mostrarCargaInicial)
    document.addEventListener('visibilitychange', sincronizarSiEstaDesactualizada)
    window.addEventListener('focus', sincronizarSiEstaDesactualizada)
    return () => {
      montado = false
      sincronizarMiasRef.current = null
      document.removeEventListener('visibilitychange', sincronizarSiEstaDesactualizada)
      window.removeEventListener('focus', sincronizarSiEstaDesactualizada)
    }
  }, [claveTokens, intentoCarga])

  useEffect(() => {
    if (!supabaseConfigurado || !verMias || !tokens.length) return
    const sincronizarMientrasSeVe = () => {
      if (document.visibilityState !== 'visible') return
      sincronizarMiasRef.current?.()
    }
    const temporizador = window.setInterval(sincronizarMientrasSeVe, INTERVALO_MIS_RESERVAS_ACTIVAS_MS)
    return () => window.clearInterval(temporizador)
  }, [verMias, claveTokens])

  useEffect(() => {
    if (paso !== 2 || !cancha) {
      setHorariosDisponibles([])
      setCargandoHorarios(false)
      return
    }

    let montado = true
    setCargandoHorarios(true)
    const cargarHorarios = async () => {
      try {
        const actuales = supabaseConfigurado
          ? await leerHorariosRemotos(cancha.id, fecha)
          : horarios(reservas, cancha.id, fecha, DURACION_BLOQUE, new Date(), bloqueosEventos)
        if (!montado) return
        setHorariosDisponibles(actuales)
        setErrorConexion('')
      } catch {
        if (montado) setErrorConexion('No pudimos cargar las horas disponibles. Revisa tu conexión e inténtalo de nuevo.')
      } finally {
        if (montado) setCargandoHorarios(false)
      }
    }
    void cargarHorarios()
    return () => {
      montado = false
    }
  }, [paso, cancha, fecha, reservas, bloqueosEventos, intentoCarga])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => tituloRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [paso, verMias, hecha])

  function reiniciar(): void {
    borrarBorradorReserva()
    setPaso(1)
    setCancha(null)
    setDia(0)
    setHoras(1)
    setInicio(null)
    setEtapaHorario('dia')
    setTurnoHorario(null)
    setSemanaHorario(0)
    setHecha(null)
  }

  function recordarCliente(cliente: Cliente): void {
    guardarYo(cliente)
    setYo(cliente)
  }

  function olvidarCliente(): void {
    olvidarYo()
    setYo(null)
  }

  async function crearCliente(alias: string, celular: string): Promise<ResultadoCliente> {
    if (supabaseConfigurado) return { cliente: { alias, celular } }
    return Promise.resolve(registrarCliente(alias, celular))
  }

  async function reservarCliente(cliente: Cliente, hora: number, sinAdelanto = false): Promise<ResultadoReservaCliente> {
    const canchaActual = cancha
    if (!canchaActual) return { error: 'conexion' }

    try {
      const r = await Promise.resolve(crearReserva({
        canchaId: canchaActual.id,
        fecha,
        inicio: hora,
        horas,
        montoTotal: canchaActual.precioHora * horas,
        ...cliente,
      }, sinAdelanto))
      if ('token' in r && r.token) {
        guardarTokenReserva(r.reserva.id, r.token, cliente.celular)
      }
      if (!supabaseConfigurado) setReservas(leerReservas())
      if ('error' in r && r.error === 'ocupado') {
        let actuales = horariosDisponibles
        if (supabaseConfigurado) {
          try {
            actuales = await leerHorariosRemotos(canchaActual.id, fecha)
            setHorariosDisponibles(actuales)
          } catch {
            // Conserva la disponibilidad que ya se mostró para ofrecer una alternativa.
          }
        }
        return {
          ...r,
          alternativa: masCercana(actuales, hora, horas),
        }
      }
      return r
    } catch {
      return { error: 'conexion' }
    }
  }

  async function verificarNumeroConfiable(celular: string): Promise<boolean> {
    if (supabaseConfigurado) return verificarNumeroConfiableRemoto(celular)
    const normalizado = celular.trim()
    const confiable = leerNumerosConfiables().some((numero) => numero.celular === normalizado && numero.activo)
    const bloqueado = leerNumerosBloqueados().some((numero) => numero.celular === normalizado && numero.activo)
    return confiable && !bloqueado
  }

  async function enviarComprobante(
    reserva: Reserva,
    token: string | undefined,
    comprobante: File,
    idempotencia: string,
  ): Promise<ResultadoPago> {
    const errorArchivo = validarComprobante(comprobante)
    if (errorArchivo) return { error: 'archivo-invalido' }
    if (supabaseConfigurado) {
      if (!token) return { error: 'reserva-no-autorizada' }
      return registrarAdelantoYapeRemoto(reserva.id, token, comprobante, idempotencia)
    }
    return {}
  }

  async function cancelarCliente(id: string): Promise<ResultadoCancelacion> {
    return Promise.resolve(cancelarReserva(id, yo?.celular)).then(async (r) => {
      if (!r.error) {
        marcarTokenCancelado(id)
        if (!supabaseConfigurado) setReservas(leerReservas())
        else {
          try {
            const actuales = await leerMisReservasRemotas(leerTokensReservas(yo?.celular))
            setReservas(actuales)
            limpiarTokensInactivos(actuales)
          } catch {
            return { error: 'conexion' as const }
          }
        }
      }
      return r
    })
  }

  async function actualizarMisDatos(datos: { alias: string; celular: string }): Promise<ResultadoCliente> {
    const celularActual = yo?.celular
    if (!celularActual) return { error: 'conexion' }
    if (supabaseConfigurado) return { error: 'conexion' }

    return Promise.resolve(actualizarCliente(celularActual, datos.alias, datos.celular)).then(async (r) => {
      if (!('error' in r)) {
        setYo(r.cliente)
        if (!supabaseConfigurado) setReservas(leerReservas())
      }
      return r
    })
  }

  if (supabaseFaltaEnProduccion) {
    return (
      <div className="app">
        <main className="error error-conexion" role="alert">
          <h1>Servicio no configurado</h1>
          <p>La aplicación necesita conectarse a Supabase antes de aceptar reservas.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <CabeceraCliente
        verMias={verMias}
        paso={paso}
        yo={yo}
        cantidadReservas={mias.filter((r) => activa(r)).length}
        onBack={() => (verMias ? setVerMias(false) : setPaso(paso - 1))}
        onViewBookings={() => setVerMias(true)}
      />

      {(cargandoHorarios || cargandoMias) && <p className="sr-only" role="status">Cargando reservas…</p>}
      {errorConexion && (
        <div className="error error-conexion" role="alert">
          <span>{errorConexion}</span>
          <button className="chip" onClick={() => setIntentoCarga((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {verMias ? (
        <main aria-busy={cargandoHorarios || cargandoMias}>
          <MisReservas
            tituloRef={tituloRef}
            reservas={mias}
            yo={clienteMias}
            canchas={canchas}
            cargando={cargandoMias}
            errorCarga={errorMias}
            onRetry={() => {
              ultimaCargaMias.current = ''
              ultimaSincronizacionMias.current = 0
              setIntentoCarga((n) => n + 1)
            }}
            permitirEdicion={!supabaseConfigurado}
            esReservaVisible={esReservaVisibleCliente}
            onCancel={cancelarCliente}
            onUpdateData={actualizarMisDatos}
            onReserve={() => {
              setVerMias(false)
              reiniciar()
            }}
          />
        </main>
      ) : (
        <main className={paso === 1 ? 'main-campos' : paso === 2 ? (inicio === null ? 'main-horario' : 'main-horario tiene-hora-seleccionada') : paso === 3 ? 'main-datos' : paso === 4 ? 'main-completada' : undefined} aria-busy={cargandoHorarios || cargandoMias}>
          {paso > 1 && paso < 4 && (
            <button className="navegacion-paso solo-movil" onClick={() => setPaso(paso - 1)}>
              ← Atrás
            </button>
          )}
          {paso < 4 && <ProgresoReserva paso={paso} nombresPasos={NOMBRES_PASOS} />}
          {paso === 1 && (
            <SelectorCampos
              campos={canchas}
              tituloRef={tituloRef}
              onOpenPromo={() => setMostrarPromo(true)}
              onSelect={(c) => {
                // Arranca en el primer día que tenga horas libres (de noche, "Hoy" ya no tiene)
                const primerLibre = supabaseConfigurado
                  ? 0
                  : Array.from({ length: DIAS }, (_, d) => d).find((d) =>
                    horarios(reservas, c.id, fechaISO(sumarDias(d)), horas, new Date(), bloqueosEventos).some((h) => h.libre),
                  )
                setDia(primerLibre ?? 0)
                setCancha(c)
                setInicio(null)
                setEtapaHorario('dia')
                setTurnoHorario(null)
                setSemanaHorario(0)
                setHorariosDisponibles([])
                setErrorConexion('')
                setPaso(2)
              }}
            />
          )}
          {paso === 2 && cancha && (
            <SelectorHorario
              tituloRef={tituloRef}
              cancha={cancha}
              horariosDisponibles={horariosDisponibles}
              cargando={cargandoHorarios}
              dia={dia}
              etapa={etapaHorario}
              onEtapaChange={setEtapaHorario}
              turno={turnoHorario}
              onTurnoChange={setTurnoHorario}
              semana={semanaHorario}
              onSemanaChange={setSemanaHorario}
              onDiaChange={(nuevoDia) => {
                setInicio(null)
                setDia(nuevoDia)
              }}
              horas={horas}
              onHorasChange={(nuevasHoras) => {
                setHoras(nuevasHoras)
              }}
              fecha={fecha}
              inicio={inicio}
              onSelectHour={(h) => {
                setInicio(h)
              }}
              onClearHour={() => setInicio(null)}
              onConfirmHour={() => setPaso(3)}
            />
          )}
          {paso === 3 && cancha && inicio !== null && (
            <DatosReserva
              tituloRef={tituloRef}
              cancha={cancha}
              dia={dia}
              fecha={fecha}
              horas={horas}
              inicio={inicio}
              onInicioChange={setInicio}
              yo={yo}
              onRememberClient={recordarCliente}
              onForgetClient={olvidarCliente}
              onBack={() => setPaso(2)}
              onViewBookings={() => setVerMias(true)}
              onReserved={(r) => {
                borrarBorradorReserva()
                setHecha(r)
                setPaso(4)
              }}
              actions={{
                createClient: crearCliente,
                reserve: reservarCliente,
                checkTrustedNumber: verificarNumeroConfiable,
                prewarmPayment: precalentarRegistrarAdelantoYapeRemoto,
                submitPayment: enviarComprobante,
              }}
            />
          )}
          {paso === 4 && cancha && hecha && (
            <ReservaCompletada
              tituloRef={tituloRef}
              reserva={hecha}
              cancha={cancha}
              dia={dia}
              onFinish={reiniciar}
              onViewBookings={() => setVerMias(true)}
            />
          )}
        </main>
      )}
      <PopupPromocion abierto={mostrarPromo} onCerrar={() => setMostrarPromo(false)} />
    </div>
  )
}
