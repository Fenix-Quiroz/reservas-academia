import { useEffect, useRef, useState } from 'react'
import canchas from './data/canchas.json'
import {
  horarios, masCercana, fechaISO, sumarDias,
  deCliente,
} from './reservas.js'
import {
  leerReservas, cargarReservas, crearReserva, cancelarReserva, registrarCliente, actualizarCliente, buscarPorCelular,
  leerYo, guardarYo, olvidarYo,
} from './almacen.js'
import { supabaseConfigurado } from './supabase.js'
import { suscribirseAReservas } from './supabaseData.js'
import CabeceraCliente from './components/cliente/CabeceraCliente.jsx'
import ProgresoReserva from './components/cliente/ProgresoReserva.jsx'
import SelectorCampos from './components/cliente/SelectorCampos.jsx'
import SelectorHorario from './components/cliente/SelectorHorario.jsx'
import DatosReserva from './components/cliente/DatosReserva.jsx'
import ReservaCompletada from './components/cliente/ReservaCompletada.jsx'
import MisReservas from './components/cliente/MisReservas.jsx'

const DIAS = 7
const NOMBRES_PASOS = ['Campo', 'Día y hora', 'Tus datos']

export default function App() {
  const [paso, setPaso] = useState(1)
  const [cancha, setCancha] = useState(null)
  const [dia, setDia] = useState(0)
  const [horas, setHoras] = useState(1)
  const [inicio, setInicio] = useState(null)
  const [reservas, setReservas] = useState(leerReservas)
  const [yo, setYo] = useState(leerYo)
  const [hecha, setHecha] = useState(null)
  const [errorConexion, setErrorConexion] = useState('')
  const [cargandoReservas, setCargandoReservas] = useState(supabaseConfigurado)
  const [intentoCarga, setIntentoCarga] = useState(0)
  // "Mis reservas" se abre encima del paso actual, así al volver no se pierde lo elegido
  const [verMias, setVerMias] = useState(false)
  const tituloRef = useRef(null)
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

  function reiniciar() {
    setPaso(1)
    setCancha(null)
    setDia(0)
    setHoras(1)
    setInicio(null)
    setHecha(null)
  }

  function recordarCliente(cliente) {
    guardarYo(cliente)
    setYo(cliente)
  }

  function olvidarCliente() {
    olvidarYo()
    setYo(null)
  }

  async function crearCliente(alias, celular) {
    return Promise.resolve(registrarCliente(alias, celular))
  }

  async function buscarCliente(celular) {
    return Promise.resolve(buscarPorCelular(celular))
  }

  async function reservarCliente(cliente, hora) {
    try {
      const r = await Promise.resolve(crearReserva({ canchaId: cancha.id, fecha, inicio: hora, horas, ...cliente }))
      let actuales
      try {
        actuales = await cargarReservas()
      } catch {
        actuales = leerReservas()
      }
      setReservas(actuales)
      if (r.error === 'ocupado') {
        return {
          ...r,
          alternativa: masCercana(horarios(actuales, cancha.id, fecha, horas), hora),
        }
      }
      return r
    } catch {
      return { error: 'conexion' }
    }
  }

  async function cancelarCliente(id) {
    return Promise.resolve(cancelarReserva(id)).then(async (r) => {
      if (!r.error) {
        try {
          setReservas(await cargarReservas())
        } catch {
          return { error: 'conexion' }
        }
      }
      return r
    })
  }

  async function actualizarMisDatos(datos) {
    return Promise.resolve(actualizarCliente(yo.celular, datos.alias, datos.celular)).then(async (r) => {
      if (!r.error) {
        try {
          setYo(r.cliente)
          setReservas(await cargarReservas())
        } catch {
          return { error: 'conexion' }
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
            yo={yo}
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
          {paso === 2 && (
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
          {paso === 3 && (
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
          {paso === 4 && (
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
