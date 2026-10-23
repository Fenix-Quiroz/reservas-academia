import { useEffect, useRef, useState } from 'react'
import canchas from './data/canchas.json'
import {
  horarios, masCercana, fechaISO, sumarDias,
  deCliente, activa,
} from './reservas'
import type { HorarioDisponible } from './reservas'
import {
  leerReservas, crearReserva, cancelarReserva, registrarCliente, actualizarCliente, buscarPorCelular,
  leerTokensReservas, guardarTokenReserva,
  leerYo, guardarYo, olvidarYo,
} from './almacen'
import { supabaseFaltaEnProduccion, supabaseConfigurado } from './supabase'
import { leerHorariosRemotos, leerMisReservasRemotas } from './supabaseData'
import type { ErrorReserva, ResultadoCancelacion, ResultadoCliente } from './supabaseData'
import type { Campo, Cliente, Reserva } from './types.js'
import CabeceraCliente from './components/cliente/CabeceraCliente'
import ProgresoReserva from './components/cliente/ProgresoReserva'
import SelectorCampos from './components/cliente/SelectorCampos'
import SelectorHorario from './components/cliente/SelectorHorario'
import DatosReserva from './components/cliente/DatosReserva'
import ReservaCompletada from './components/cliente/ReservaCompletada'
import MisReservas from './components/cliente/MisReservas'

const DIAS = 7
const NOMBRES_PASOS = ['Campo', 'Día y hora', 'Tus datos'] as const

type ResultadoReservaCliente =
  | { reserva: Reserva }
  | { error: ErrorReserva | 'limite-intentos'; alternativa?: HorarioDisponible }

export default function App() {
  const [paso, setPaso] = useState(1)
  const [cancha, setCancha] = useState<Campo | null>(null)
  const [dia, setDia] = useState(0)
  const [horas, setHoras] = useState(1)
  const [inicio, setInicio] = useState<number | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>(leerReservas)
  const [yo, setYo] = useState<Cliente | null>(leerYo)
  const [hecha, setHecha] = useState<Reserva | null>(null)
  const [errorConexion, setErrorConexion] = useState('')
  const [horariosDisponibles, setHorariosDisponibles] = useState<HorarioDisponible[]>([])
  const [cargandoHorarios, setCargandoHorarios] = useState(false)
  const [tokens, setTokens] = useState<string[]>(leerTokensReservas)
  const [cargandoMias, setCargandoMias] = useState(false)
  const [intentoCarga, setIntentoCarga] = useState(0)
  // "Mis reservas" se abre encima del paso actual, así al volver no se pierde lo elegido
  const [verMias, setVerMias] = useState(false)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const mias = supabaseConfigurado
    ? reservas.filter((r) => activa(r))
    : yo ? deCliente(reservas, yo.celular) : []
  const clienteMias = yo ?? (mias[0] ? { alias: mias[0].alias, celular: mias[0].celular } : null)
  const fecha = fechaISO(sumarDias(dia))

  // En el cliente público solo se conserva la demo local. Supabase se consulta
  // mediante RPC cuando el usuario elige un día y una duración.
  useEffect(() => {
    const alCambiar = () => {
      if (!supabaseConfigurado) setReservas(leerReservas())
      setYo(leerYo())
    }
    if (!supabaseConfigurado) setReservas(leerReservas())
    window.addEventListener('storage', alCambiar)
    return () => {
      window.removeEventListener('storage', alCambiar)
    }
  }, [])

  useEffect(() => {
    if (!supabaseConfigurado || !verMias) return
    let montado = true
    setCargandoMias(true)
    const cargarMias = async () => {
      try {
        const actuales = await leerMisReservasRemotas(tokens)
        if (!montado) return
        setReservas(actuales)
        setErrorConexion('')
      } catch {
        if (montado) setErrorConexion('No pudimos cargar tus reservas. Revisa tu conexión e inténtalo de nuevo.')
      } finally {
        if (montado) setCargandoMias(false)
      }
    }
    void cargarMias()
    return () => {
      montado = false
    }
  }, [verMias, tokens, intentoCarga])

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
          ? await leerHorariosRemotos(cancha.id, fecha, horas)
          : horarios(reservas, cancha.id, fecha, horas)
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
  }, [paso, cancha, fecha, horas, reservas, intentoCarga])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => tituloRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [paso, verMias, hecha])

  function reiniciar(): void {
    setPaso(1)
    setCancha(null)
    setDia(0)
    setHoras(1)
    setInicio(null)
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

  async function buscarCliente(celular: string): Promise<Cliente | null | undefined> {
    if (supabaseConfigurado) return null
    return Promise.resolve(buscarPorCelular(celular))
  }

  async function reservarCliente(cliente: Cliente, hora: number): Promise<ResultadoReservaCliente> {
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
      }))
      if ('token' in r && r.token) {
        guardarTokenReserva(r.reserva.id, r.token)
        setTokens(leerTokensReservas())
      }
      if (!supabaseConfigurado) setReservas(leerReservas())
      if ('error' in r && r.error === 'ocupado') {
        let actuales = horariosDisponibles
        if (supabaseConfigurado) {
          try {
            actuales = await leerHorariosRemotos(canchaActual.id, fecha, horas)
            setHorariosDisponibles(actuales)
          } catch {
            // Conserva la disponibilidad que ya se mostró para ofrecer una alternativa.
          }
        }
        return {
          ...r,
          alternativa: masCercana(actuales, hora),
        }
      }
      return r
    } catch {
      return { error: 'conexion' }
    }
  }

  async function cancelarCliente(id: string): Promise<ResultadoCancelacion> {
    return Promise.resolve(cancelarReserva(id)).then(async (r) => {
      if (!r.error) {
        if (!supabaseConfigurado) setReservas(leerReservas())
        else {
          try {
            setReservas(await leerMisReservasRemotas(leerTokensReservas()))
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
        cantidadReservas={mias.length}
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
            permitirEdicion={!supabaseConfigurado}
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
              onSelect={(c) => {
                // Arranca en el primer día que tenga horas libres (de noche, "Hoy" ya no tiene)
                const primerLibre = supabaseConfigurado
                  ? 0
                  : Array.from({ length: DIAS }, (_, d) => d).find((d) =>
                    horarios(reservas, c.id, fechaISO(sumarDias(d)), horas).some((h) => h.libre),
                  )
                setDia(primerLibre ?? 0)
                setCancha(c)
                setInicio(null)
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
              onDiaChange={(nuevoDia) => {
                setInicio(null)
                setDia(nuevoDia)
              }}
              horas={horas}
              onHorasChange={(nuevasHoras) => {
                setInicio(null)
                setHoras(nuevasHoras)
              }}
              fecha={fecha}
              inicio={inicio}
              onSelectHour={(h) => {
                setInicio(h)
              }}
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
                setHecha(r)
                setPaso(4)
              }}
              actions={{
                createClient: crearCliente,
                findClient: buscarCliente,
                reserve: reservarCliente,
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
    </div>
  )
}
