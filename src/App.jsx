import { useEffect, useRef, useState } from 'react'
import canchas from './data/canchas.json'
import {
  horarios, masCercana, fechaISO, sumarDias, rangoHablado,
  deCliente,
} from './reservas.js'
import {
  leerReservas, cargarReservas, crearReserva, cancelarReserva, registrarCliente, actualizarCliente, buscarPorCelular,
  leerYo, guardarYo, olvidarYo,
} from './almacen.js'
import { supabaseConfigurado } from './supabase.js'
import { suscribirseAReservas } from './supabaseData.js'

const DIAS = 7
const NOMBRES_PASOS = ['Cancha', 'Día y hora', 'Tus datos']
const GRUPOS = [
  // "En la mañana" y no "Mañana", para no confundir con el día de mañana
  { nombre: 'En la mañana', icono: '🌅', desde: 0, hasta: 12 },
  { nombre: 'En la tarde', icono: '☀️', desde: 12, hasta: 18 },
  { nombre: 'En la noche', icono: '🌙', desde: 18, hasta: 24 },
]

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function nombreDiaCorto(dia) {
  const d = sumarDias(dia)
  const semana = d.toLocaleDateString('es-PE', { weekday: 'short' }).replace(/\.$/, '')
  const mes = d.toLocaleDateString('es-PE', { month: 'short' }).replace(/\.$/, '')
  return {
    titulo: dia === 0 ? 'Hoy' : dia === 1 ? 'Mañana' : capital(semana),
    detalle: `${d.getDate()} ${mes}`,
  }
}

// Corto para frases y botones; largo siempre incluye el mes para evitar fechas ambiguas.
function nombreDia(dia, largo = false) {
  const d = sumarDias(dia)
  const semana = d.toLocaleDateString('es-PE', { weekday: largo ? 'long' : 'short' }).replace(/\.$/, '')
  if (!largo) return nombreDiaCorto(dia).titulo
  const mes = d.toLocaleDateString('es-PE', { month: 'long' })
  const prefijo = dia === 0 ? 'hoy' : dia === 1 ? 'mañana' : 'el'
  return `${prefijo} ${semana} ${d.getDate()} de ${mes}`
}

function horaVisible(hora) {
  const horaDelDia = hora % 24
  const hora12 = ((horaDelDia + 11) % 12) + 1
  const periodo = horaDelDia < 12 ? 'a. m.' : 'p. m.'
  return `${hora12} ${periodo}`
}

function rangoVisible(inicio, horas) {
  return `${horaVisible(inicio)} a ${horaVisible(inicio + horas)}`
}

// '2026-10-18' → 1 si es mañana (para reutilizar nombreDia)
const diaDe = (fecha) =>
  Math.round((new Date(`${fecha}T00:00`) - new Date(`${fechaISO(new Date())}T00:00`)) / 86400000)

const tipo = (c) => `Fútbol ${c.jugadores}`

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

  return (
    <div className="app">
      <header className="cabecera">
        {verMias ? (
          <button className="atras" onClick={() => setVerMias(false)}>
            ← Volver
          </button>
        ) : paso > 1 && paso < 4 ? (
          <button className="atras" onClick={() => setPaso(paso - 1)}>
            ← Atrás
          </button>
        ) : (
          <span className="marca"><span aria-hidden="true">⚽</span> Reserva tu cancha</span>
        )}
        {yo && !verMias && (
          <button className="atras" onClick={() => setVerMias(true)}>
            <span aria-hidden="true">📋</span> Mis reservas{mias.length > 0 && ` (${mias.length})`}
          </button>
        )}
      </header>

      {cargandoReservas && <p className="estado-carga" role="status">Cargando reservas…</p>}
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
          mias={mias}
          yo={yo}
          alCancelar={(id) => {
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
          }}
          alActualizarDatos={(datos) => {
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
          }}
          alReservar={() => {
            setVerMias(false)
            reiniciar()
          }}
        />
        </main>
      ) : (
      <>
      {paso < 4 && <Progreso paso={paso} />}

      <main aria-busy={cargandoReservas}>
        {paso === 1 && (
          <PasoCancha
            tituloRef={tituloRef}
            alElegir={(c) => {
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
          <PasoHorario
            tituloRef={tituloRef}
            cancha={cancha}
            reservas={reservas}
            dia={dia}
            setDia={setDia}
            horas={horas}
            setHoras={setHoras}
            fecha={fecha}
            alElegir={(h) => {
              setInicio(h)
              setPaso(3)
            }}
          />
        )}
        {paso === 3 && (
          <PasoDatos
            tituloRef={tituloRef}
            cancha={cancha}
            dia={dia}
            fecha={fecha}
            horas={horas}
            inicio={inicio}
            setInicio={setInicio}
            yo={yo}
            setYo={setYo}
            setReservas={setReservas}
            volverAHorario={() => setPaso(2)}
            alVerMias={() => setVerMias(true)}
            alReservar={(r) => {
              setHecha(r)
              setPaso(4)
            }}
          />
        )}
        {paso === 4 && (
          <PasoListo
            tituloRef={tituloRef}
            reserva={hecha}
            cancha={cancha}
            dia={dia}
            alTerminar={reiniciar}
            alVerMias={() => setVerMias(true)}
          />
        )}
      </main>
      </>
      )}
    </div>
  )
}

function Progreso({ paso }) {
  return (
    <div
      className="progreso"
      role="progressbar"
      aria-valuemin="1"
      aria-valuemax="3"
      aria-valuenow={paso}
      aria-valuetext={`Paso ${paso} de 3: ${NOMBRES_PASOS[paso - 1]}`}
    >
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= paso ? 'punto activo' : 'punto'} aria-hidden="true" />
      ))}
      <span className="progreso-texto">Paso {paso} de 3 · {NOMBRES_PASOS[paso - 1]}</span>
    </div>
  )
}

function DibujoCancha({ color, jugadores }) {
  return (
    <svg viewBox="0 0 120 70" className="dibujo" aria-hidden="true">
      <rect x="1" y="1" width="118" height="68" rx="6" fill={color} />
      <g fill="none" stroke="#fff" strokeWidth="2" opacity="0.85">
        <rect x="6" y="6" width="108" height="58" rx="2" />
        <line x1="60" y1="6" x2="60" y2="64" />
        <circle cx="60" cy="35" r="11" fill={color} />
        <rect x="6" y="22" width="12" height="26" />
        <rect x="102" y="22" width="12" height="26" />
      </g>
      <text x="60" y="40" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">
        {jugadores}
      </text>
    </svg>
  )
}

function PasoCancha({ alElegir, tituloRef }) {
  return (
    <section>
      <h1 ref={tituloRef} tabIndex="-1">¿En qué cancha quieres jugar?</h1>
      <div className="canchas">
        {canchas.map((c) => (
          <button key={c.id} className="tarjeta-cancha" onClick={() => alElegir(c)}>
            <DibujoCancha color={c.color} jugadores={c.jugadores} />
            <span className="cancha-info">
              <strong>{c.nombre}</strong>
              <span>
                {tipo(c)} · {c.jugadores} contra {c.jugadores}
              </span>
              <small className="jugadores">Para {c.jugadores * 2} jugadores</small>
              <span className="precio">S/ {c.precioHora} la hora</span>
              <span className="seleccionar-cancha">
                Elegir esta cancha <span aria-hidden="true">→</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function PasoHorario({ cancha, reservas, dia, setDia, horas, setHoras, fecha, alElegir, tituloRef }) {
  const lista = horarios(reservas, cancha.id, fecha, horas)
  const hayLibres = lista.some((h) => h.libre)

  return (
    <section>
      <h1 ref={tituloRef} tabIndex="-1">¿Qué día y a qué hora?</h1>
      <p className="subtitulo">
        {cancha.nombre} · {tipo(cancha)} · para {cancha.jugadores * 2} jugadores
      </p>

      <fieldset className="selector-grupo">
        <legend>1. Elige el día</legend>
        <div className="dias">
          {Array.from({ length: DIAS }, (_, d) => (
            <button key={d} className="chip dia" aria-label={nombreDia(d, true)} aria-pressed={d === dia} onClick={() => setDia(d)}>
              <span>{nombreDiaCorto(d).titulo}</span>
              <small>{nombreDiaCorto(d).detalle}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="selector-grupo">
        <legend>2. ¿Cuánto tiempo quieres jugar?</legend>
        <div className="duraciones">
          {[1, 2].map((h) => (
            <button key={h} className="chip grande" aria-pressed={h === horas} onClick={() => setHoras(h)}>
              {h === 1 ? '1 hora' : '2 horas'}
              <small>S/ {cancha.precioHora * h}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="selector-grupo">
        <legend>3. Elige una hora</legend>
      {!hayLibres && (
        <div className="aviso" role="status">Ya no quedan horas libres {nombreDia(dia, true)}.
          {dia < DIAS - 1 && (
            <button className="enlace" onClick={() => setDia(dia + 1)}>
              Ver {nombreDia(dia + 1, true)} →
            </button>
          )}
        </div>
      )}
      {GRUPOS.map((g) => {
        const delGrupo = lista.filter((h) => h.inicio >= g.desde && h.inicio < g.hasta)
        if (!delGrupo.length) return null
        return (
          <div key={g.nombre} className="grupo">
            <h3>
              <span aria-hidden="true">{g.icono}</span> {g.nombre}
            </h3>
            <div className="horas">
              {delGrupo.map((h) => (
                <button key={h.inicio} className="hora" disabled={!h.libre} onClick={() => alElegir(h.inicio)}>
                  {rangoVisible(h.inicio, horas)}
                  <small>{h.libre ? 'Libre' : 'Ocupado'}</small>
                </button>
              ))}
            </div>
          </div>
        )
      })}
      </fieldset>
    </section>
  )
}

function PasoDatos({
  cancha, dia, fecha, horas, inicio, setInicio, yo, setYo, setReservas, volverAHorario, alVerMias, alReservar, tituloRef,
}) {
  const [modo, setModo] = useState('nuevo') // 'nuevo' | 'volver'
  const [alias, setAlias] = useState('')
  const [celular, setCelular] = useState('')
  const [error, setError] = useState('')
  const [encontrado, setEncontrado] = useState(null) // cliente que ya existe con ese celular
  const [conflicto, setConflicto] = useState(null) // { alternativa } cuando alguien ganó la hora
  const [procesando, setProcesando] = useState('')

  const celularValido = /^9\d{8}$/.test(celular)

  async function reservar(cliente, hora = inicio, yaProcesando = false) {
    if (!yaProcesando && procesando) return
    if (!yaProcesando) setProcesando('reserva')
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
        setConflicto({ alternativa: masCercana(horarios(actuales, cancha.id, fecha, horas), hora) })
        return
      }
      if (r.error === 'limite') {
        setError('Ya tienes 2 reservas pendientes. Cuando juegues una, podrás reservar otra.')
        return
      }
      if (r.error) {
        setError('No pudimos guardar la reserva. Revisa tu conexión e inténtalo de nuevo.')
        return
      }
      alReservar(r.reserva)
    } catch {
      setError('No pudimos guardar la reserva. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      if (!yaProcesando) setProcesando('')
    }
  }

  function recordar(cliente) {
    guardarYo(cliente)
    setYo(cliente)
  }

  async function crearYReservar() {
    setError('')
    if (alias.trim().length < 2) return setError('Escribe tu nombre o apodo (mínimo 2 letras).')
    if (!celularValido) return setError('El celular debe tener 9 números y empezar con 9.')
    if (procesando) return
    setProcesando('datos')
    try {
      const r = await Promise.resolve(registrarCliente(alias, celular))
      if (r.error === 'celular') {
        const existente = await Promise.resolve(buscarPorCelular(celular))
        return setEncontrado(existente)
      }
      if (r.error) return setError('No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.')
      recordar(r.cliente)
      await reservar(r.cliente, inicio, true)
    } catch {
      setError('No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setProcesando('')
    }
  }

  async function buscar() {
    setError('')
    if (!celularValido) return setError('El celular debe tener 9 números y empezar con 9.')
    if (procesando) return
    setProcesando('buscar')
    try {
      const c = await Promise.resolve(buscarPorCelular(celular))
      if (c) setEncontrado(c)
      else setError('No encontramos ese celular. Elige "Es mi primera vez" para crear tu nombre.')
    } catch {
      setError('No pudimos buscar tus datos. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setProcesando('')
    }
  }

  const resumen = (
    <div className="resumen">
      <DibujoCancha color={cancha.color} jugadores={cancha.jugadores} />
      <div>
        <strong>{cancha.nombre}</strong>
        <span>
          {capital(nombreDia(dia, true))}, {rangoHablado(inicio, horas)}
        </span>
        <span className="precio">S/ {cancha.precioHora * horas} · pagas en la cancha</span>
      </div>
    </div>
  )

  const textoAccion = procesando === 'buscar'
    ? 'Buscando…'
    : procesando
      ? 'Guardando…'
      : modo === 'nuevo'
        ? '✅ Confirmar reserva'
        : 'Buscar mi nombre'

  if (conflicto) {
    const alt = conflicto.alternativa
    return (
      <section>
        <h1 ref={tituloRef} tabIndex="-1">😕 Alguien reservó esa hora antes que tú</h1>
        {alt ? (
          <>
            <p className="subtitulo">Pero esta hora está libre:</p>
            <button
              className="boton-principal"
              disabled={Boolean(procesando)}
              onClick={() => {
                setInicio(alt.inicio)
                setConflicto(null)
                reservar(yo, alt.inicio)
              }}
            >
              {procesando ? 'Guardando…' : `Reservar ${rangoHablado(alt.inicio, horas)}`}
            </button>
          </>
        ) : (
          <p className="subtitulo">Ya no quedan horas libres {nombreDia(dia, true)}.</p>
        )}
        <button className="boton-secundario" disabled={Boolean(procesando)} onClick={volverAHorario}>
          Elegir otra hora
        </button>
      </section>
    )
  }

  if (encontrado) {
    return (
      <section>
        <h1 ref={tituloRef} tabIndex="-1">¿Eres {encontrado.alias}?</h1>
        <p className="subtitulo">Ese celular ya reservó antes con ese nombre.</p>
        <button
          className="boton-principal"
          onClick={() => {
            recordar(encontrado)
            setEncontrado(null)
          }}
        >
          Sí, soy {encontrado.alias}
        </button>
        <button
          className="boton-secundario"
          onClick={() => {
            setEncontrado(null)
            setCelular('')
          }}
        >
          No, usar otro celular
        </button>
      </section>
    )
  }

  if (yo) {
    return (
      <section>
        <h1 ref={tituloRef} tabIndex="-1">¿Todo bien, {yo.alias}?</h1>
        <p className="reserva-a-nombre">Reserva a nombre de <strong>{yo.alias}</strong></p>
        {resumen}
        {error && <p className="error" role="alert">{error}</p>}
        {error && (
          <button className="enlace" onClick={alVerMias}>
            Ver mis reservas
          </button>
        )}
        <button className="boton-principal" disabled={Boolean(procesando)} onClick={() => reservar(yo)}>
          {procesando ? 'Guardando…' : '✅ Confirmar reserva'}
        </button>
        <button
          className="enlace"
          onClick={() => {
            olvidarYo()
            setYo(null)
          }}
        >
          No soy {yo.alias}
        </button>
      </section>
    )
  }

  return (
    <section>
      <h1 ref={tituloRef} tabIndex="-1">{modo === 'nuevo' ? '¿A nombre de quién reservamos?' : '¡Hola de nuevo!'}</h1>
      {resumen}

      <form
        className="formulario"
        onSubmit={(e) => {
          e.preventDefault()
          modo === 'nuevo' ? crearYReservar() : buscar()
        }}
      >
        {modo === 'nuevo' && (
          <label>
            <span>Nombre o apodo para la reserva</span>
            <input
              id="alias-reserva"
              value={alias}
              required
              disabled={Boolean(procesando)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'datos-error' : undefined}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej: Juan o LosPibes"
              autoComplete="nickname"
              maxLength={20}
            />
          </label>
        )}
        <label>
          <span>Número de celular de quien reserva</span>
          <input
            id="celular-reserva"
            value={celular}
            type="tel"
            required
            disabled={Boolean(procesando)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'ayuda-celular datos-error' : 'ayuda-celular'}
            onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 987654321"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={9}
          />
          <small id="ayuda-celular" className="ayuda-campo">Lo usamos para encontrar tu reserva. No necesitas crear una cuenta.</small>
        </label>
        {error && <p id="datos-error" className="error" role="alert">{error}</p>}
        <button className="boton-principal" type="submit" disabled={Boolean(procesando)}>
          {textoAccion}
        </button>
      </form>

      <button
        className="enlace"
        disabled={Boolean(procesando)}
        onClick={() => {
          setError('')
          setModo(modo === 'nuevo' ? 'volver' : 'nuevo')
        }}
      >
        {modo === 'nuevo' ? 'Ya reservé antes' : 'Es mi primera vez'}
      </button>
      {modo === 'nuevo' && <p className="nota">La próxima vez te recordaremos en este navegador.</p>}
    </section>
  )
}

function PasoListo({ reserva, cancha, dia, alTerminar, alVerMias, tituloRef }) {
  const frase = `Jugarás en la ${cancha.nombre} ${nombreDia(dia, true)} ${rangoHablado(reserva.inicio, reserva.horas)}.`
  const total = cancha.precioHora * reserva.horas
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`⚽ Reservé cancha: ${frase} Pago S/ ${total} en la cancha.`)}`

  return (
    <section className="listo">
      <div className="check" aria-hidden="true">✅</div>
      <h1 ref={tituloRef} tabIndex="-1">¡Listo, {reserva.alias}!</h1>
      <p className="reserva-a-nombre">Reserva a nombre de <strong>{reserva.alias}</strong></p>
      <p className="frase">{frase}</p>
      <p className="precio grande">Pagas S/ {total} en la cancha</p>
      <p className="subtitulo">Puedes verla en “Mis reservas” o avisar a tu equipo.</p>
      <a className="boton-principal whatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Avisar a mis amigos por WhatsApp (se abre en una nueva pestaña)">
        Avisar a mis amigos por WhatsApp
      </a>
      <button className="boton-secundario" onClick={alTerminar}>
        Hacer otra reserva
      </button>
      <button className="enlace" onClick={alVerMias}>
        Ver mis reservas
      </button>
    </section>
  )
}

function MisReservas({ mias, yo, alCancelar, alActualizarDatos, alReservar, tituloRef }) {
  const [porCancelar, setPorCancelar] = useState(null) // id de la reserva que pide "¿Seguro?"
  const [editando, setEditando] = useState(false)
  const [alias, setAlias] = useState(yo.alias)
  const [celular, setCelular] = useState(yo.celular)
  const [datosError, setDatosError] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [cancelando, setCancelando] = useState(null)

  useEffect(() => {
    if (!exito) return undefined
    const temporizador = window.setTimeout(() => setExito(''), 4000)
    return () => window.clearTimeout(temporizador)
  }, [exito])

  async function editarDatos(e) {
    e.preventDefault()
    if (guardandoDatos) return
    setDatosError('')
    setGuardandoDatos(true)
    try {
      const r = await alActualizarDatos({ alias, celular })
      if (r.error) {
        const mensajes = {
          'alias-invalido': 'Escribe un nombre o apodo de al menos 2 letras.',
          'celular-invalido': 'El celular debe tener 9 números y empezar con 9.',
          celular: 'Ese celular ya está registrado por otra persona.',
          conexion: 'No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.',
        }
        setDatosError(mensajes[r.error] ?? 'No pudimos actualizar tus datos.')
        return
      }
      setEditando(false)
      setExito('✔ Tus datos se actualizaron correctamente.')
    } catch {
      setDatosError('No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setGuardandoDatos(false)
    }
  }

  async function cancelar(id) {
    if (cancelando) return
    setCancelando(id)
    try {
      const r = await alCancelar(id)
      setPorCancelar(null)
      setExito(r.error ? '' : '✔ Reserva cancelada. La cancha quedó libre para otros.')
      if (r.error === 'tarde') setError('No pudimos cancelar la reserva. Inténtalo de nuevo.')
      else if (r.error === 'conexion') setError('No pudimos cancelar la reserva. Revisa tu conexión e inténtalo de nuevo.')
      else if (r.error) setError('Esta reserva no se puede cancelar desde aquí. Llama a la academia.')
      else setError('')
    } catch {
      setError('No pudimos cancelar la reserva. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setCancelando(null)
    }
  }

  return (
    <section>
      <h1 ref={tituloRef} tabIndex="-1">Mis reservas</h1>
      <p className="subtitulo">Puedes cancelar tu reserva en cualquier momento.</p>
      {exito && <p className="exito" role="status">{exito}</p>}
      {editando ? (
        <form className="editor-datos" onSubmit={editarDatos}>
          <h2>Editar mis datos</h2>
          <label>
            <span>Tu nombre o apodo</span>
            <input
              id="editar-alias"
              value={alias}
              required
              disabled={guardandoDatos}
              aria-invalid={Boolean(datosError)}
              aria-describedby={datosError ? 'editar-datos-error' : undefined}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
            />
          </label>
          <label>
            <span>Tu celular</span>
            <input
              id="editar-celular"
              value={celular}
              type="tel"
              required
              disabled={guardandoDatos}
              aria-invalid={Boolean(datosError)}
              aria-describedby={datosError ? 'editar-celular-ayuda editar-datos-error' : 'editar-celular-ayuda'}
              onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={9}
              autoComplete="tel"
            />
            <small id="editar-celular-ayuda" className="ayuda-campo">Lo usamos para encontrar tus reservas.</small>
          </label>
          {datosError && <p id="editar-datos-error" className="error" role="alert">{datosError}</p>}
          <div className="editor-acciones">
            <button className="boton-principal" type="submit" disabled={guardandoDatos}>
              {guardandoDatos ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              className="boton-secundario"
              type="button"
              disabled={guardandoDatos}
              onClick={() => {
                setAlias(yo.alias)
                setCelular(yo.celular)
                setDatosError('')
                setEditando(false)
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button className="boton-secundario editar-datos" onClick={() => setEditando(true)}>
          ✏️ Editar mis datos
        </button>
      )}
      {!mias.length ? (
        <>
          <h2>Aún no tienes reservas</h2>
          <p className="subtitulo">Cuando reserves una cancha, aparecerá aquí.</p>
          <button className="boton-principal" onClick={alReservar}>
            <span aria-hidden="true">⚽</span> Reservar una cancha
          </button>
        </>
      ) : (
        <>
      {error && <p className="error" role="alert">{error}</p>}
      {mias.map((r) => {
        const c = canchas.find((x) => x.id === r.canchaId)
        return (
          <div key={r.id} className="resumen">
            <DibujoCancha color={c.color} jugadores={c.jugadores} />
            <div>
              <strong>{c.nombre}</strong>
              <span>
                {capital(nombreDia(diaDe(r.fecha), true))}, {rangoHablado(r.inicio, r.horas)}
              </span>
              <span className="precio">S/ {c.precioHora * r.horas} · pagas en la cancha</span>

              {porCancelar === r.id ? (
                <div className="confirmar" role="group" aria-labelledby={`confirmar-cancelar-${r.id}`}>
                  <span id={`confirmar-cancelar-${r.id}`}>¿Seguro que quieres cancelar?</span>
                  <div className="duraciones">
                    <button className="chip peligro" disabled={cancelando === r.id} onClick={() => cancelar(r.id)}>
                      {cancelando === r.id ? 'Cancelando…' : 'Sí, cancelar'}
                    </button>
                    <button className="chip" disabled={Boolean(cancelando)} onClick={() => setPorCancelar(null)}>
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <button className="enlace izquierda" onClick={() => setPorCancelar(r.id)}>
                  Cancelar reserva
                </button>
              )}
            </div>
          </div>
        )
      })}
        </>
      )}
    </section>
  )
}
