import { useEffect, useRef, useState } from 'react'
import canchas from './data/canchas.json'
import {
  horarios, masCercana, fechaISO, sumarDias,
  deCliente,
} from './reservas'
import type { HorarioDisponible } from './reservas'
import {
  leerReservas, cargarReservas, crearReserva, cancelarReserva, registrarCliente, actualizarCliente, buscarPorCelular,
  leerYo, guardarYo, olvidarYo,
} from './almacen'
import { supabaseConfigurado } from './supabase'
import { suscribirseAReservas } from './supabaseData'
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
  | { error: ErrorReserva; alternativa?: HorarioDisponible }

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
  const [cargandoReservas, setCargandoReservas] = useState(supabaseConfigurado)
  const [intentoCarga, setIntentoCarga] = useState(0)
  // "Mis reservas" se abre encima del paso actual, así al volver no se pierde lo elegido
  const [verMias, setVerMias] = useState(false)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const mias = yo ? deCliente(reservas, yo.celular) : []

  // Refresca la agenda local, remota y los cambios en tiempo real de Supabase.
  useEffect(() => {
    let montado = true
    setCargandoReservas(true)
    const refrescar = async () => {
      try {
        const actuales = await cargarReservas()
        if (!montado) return
        setReservas(actuales)
        setErrorConexion('')
      } catch {
        if (montado) setErrorConexion('No pudimos cargar las reservas. Revisa que hayas ejecutado el esquema de Supabase.')
      } finally {
        if (montado) setCargandoReservas(false)
      }
    }
    const alCambiar = () => {
      void refrescar()
      setYo(leerYo())
    }
    void refrescar()
    window.addEventListener('storage', alCambiar)
    const dejarDeEscuchar = suscribirseAReservas(() => void refrescar())
    return () => {
      montado = false
      window.removeEventListener('storage', alCambiar)
      dejarDeEscuchar()
    }
  }, [intentoCarga])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => tituloRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [paso, verMias, hecha])

  const fecha = fechaISO(sumarDias(dia))

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
    return Promise.resolve(registrarCliente(alias, celular))
  }

  async function buscarCliente(celular: string): Promise<Cliente | null | undefined> {
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
      let actuales: Reserva[]
      try {
        actuales = await cargarReservas()
      } catch {
        actuales = leerReservas()
      }
      setReservas(actuales)
      if ('error' in r && r.error === 'ocupado') {
        return {
          ...r,
          alternativa: masCercana(horarios(actuales, canchaActual.id, fecha, horas), hora),
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
        try {
          setReservas(await cargarReservas())
        } catch {
          return { error: 'conexion' as const }
        }
      }
      return r
    })
  }

  async function actualizarMisDatos(datos: { alias: string; celular: string }): Promise<ResultadoCliente> {
    const celularActual = yo?.celular
    if (!celularActual) return { error: 'conexion' }

    return Promise.resolve(actualizarCliente(celularActual, datos.alias, datos.celular)).then(async (r) => {
      if (!('error' in r)) {
        try {
          setYo(r.cliente)
          setReservas(await cargarReservas())
        } catch {
          return { error: 'conexion' as const }
        }
      }
      return r
    })
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

      {cargandoReservas && <p className="sr-only" role="status">Cargando reservas…</p>}
      {errorConexion && (
        <div className="error error-conexion" role="alert">
          <span>{errorConexion}</span>
          <button className="chip" onClick={() => setIntentoCarga((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {verMias ? (
        <main aria-busy={cargandoReservas}>
          <MisReservas
            tituloRef={tituloRef}
            reservas={mias}
            yo={yo as Cliente}
            canchas={canchas}
            onCancel={cancelarCliente}
            onUpdateData={actualizarMisDatos}
            onReserve={() => {
              setVerMias(false)
              reiniciar()
            }}
          />
        </main>
      ) : (
        <main className={paso === 1 ? 'main-campos' : paso === 2 ? (inicio === null ? 'main-horario' : 'main-horario tiene-hora-seleccionada') : paso === 3 ? 'main-datos' : paso === 4 ? 'main-completada' : undefined} aria-busy={cargandoReservas}>
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
                const primerLibre = Array.from({ length: DIAS }, (_, d) => d).find((d) =>
                  horarios(reservas, c.id, fechaISO(sumarDias(d)), horas).some((h) => h.libre),
                )
                setDia(primerLibre ?? 0)
                setCancha(c)
                setInicio(null)
                setPaso(2)
              }}
            />
          )}
          {paso === 2 && cancha && (
            <SelectorHorario
              tituloRef={tituloRef}
              cancha={cancha}
              reservas={reservas}
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
