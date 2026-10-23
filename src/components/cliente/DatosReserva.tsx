import { useState } from 'react'
import type { RefObject } from 'react'
import { capital, nombreDia } from '../../utils/fechasReserva'
import { rangoHablado, type HorarioDisponible } from '../../reservas'
import type { Campo, Cliente, Reserva } from '../../types.js'
import {
  ALIAS_MAXIMO,
  normalizarAlias,
  normalizarCelular,
  validarAlias,
  validarCelular,
} from '../../validacionCliente'

type Modo = 'nuevo' | 'volver'
type Procesando = '' | 'reserva' | 'datos' | 'buscar'
type ErrorAccion =
  | 'ocupado'
  | 'limite'
  | 'limite-intentos'
  | 'celular'
  | 'conexion'
  | 'no-existe'
  | 'tarde'
  | 'alias-invalido'
  | 'celular-invalido'
type ResultadoClienteAccion = { cliente: Cliente } | { error: ErrorAccion }
type ResultadoReservaConAlternativa =
  | { reserva: Reserva }
  | { error: ErrorAccion; alternativa?: HorarioDisponible }

export interface DatosReservaActions {
  createClient: (alias: string, celular: string) => Promise<ResultadoClienteAccion>
  findClient: (celular: string) => Promise<Cliente | null | undefined>
  reserve: (cliente: Cliente, hora: number) => Promise<ResultadoReservaConAlternativa>
}

export interface DatosReservaProps {
  cancha: Campo
  dia: number
  fecha: string
  horas: number
  inicio: number
  onInicioChange: (inicio: number) => void
  yo: Cliente | null
  onRememberClient: (cliente: Cliente) => void
  onForgetClient: () => void
  onBack: () => void
  onViewBookings: () => void
  onReserved: (reserva: Reserva) => void
  tituloRef: RefObject<HTMLHeadingElement | null>
  actions: DatosReservaActions
}

export default function DatosReserva({
  cancha,
  dia,
  horas,
  inicio,
  onInicioChange,
  yo,
  onRememberClient,
  onForgetClient,
  onBack,
  onViewBookings,
  onReserved,
  tituloRef,
  actions,
}: DatosReservaProps) {
  const [modo, setModo] = useState<Modo>('nuevo')
  const [alias, setAlias] = useState('')
  const [celular, setCelular] = useState('')
  const [error, setError] = useState('')
  const [encontrado, setEncontrado] = useState<Cliente | null>(null)
  const [conflicto, setConflicto] = useState<{ alternativa?: HorarioDisponible } | null>(null)
  const [procesando, setProcesando] = useState<Procesando>('')
  const [clientePendiente, setClientePendiente] = useState<Cliente | null>(null)

  const errorCelular = validarCelular(celular)
  const celularValido = errorCelular === null

  async function reservar(cliente: Cliente, hora = inicio, yaProcesando = false, recordarCliente = false): Promise<boolean> {
    if (!yaProcesando && procesando) return false
    if (!yaProcesando) setProcesando('reserva')
    try {
      const r = await actions.reserve(cliente, hora)
      if ('error' in r) {
        if (r.error === 'ocupado') {
          setConflicto({ alternativa: r.alternativa })
          return false
        }
        if (r.error === 'limite') {
          setError('Ya tienes 2 reservas pendientes. Cuando juegues una, podrás reservar otra.')
          return false
        }
        if (r.error === 'limite-intentos') {
          setError('Hiciste varios intentos seguidos. Espera 10 minutos y vuelve a intentarlo.')
          return false
        }
        if (r.error === 'tarde') {
          setError('La fecha o la hora ya no está disponible. Elige otro turno.')
          return false
        }
        setError('No pudimos guardar la reserva. Revisa tu conexión e inténtalo de nuevo.')
        return false
      }
      onReserved(r.reserva)
      if (recordarCliente) {
        onRememberClient(cliente)
        setClientePendiente(null)
      }
      return true
    } catch {
      setError('No pudimos guardar la reserva. Revisa tu conexión e inténtalo de nuevo.')
      return false
    } finally {
      if (!yaProcesando) setProcesando('')
    }
  }

  async function crearYReservar(): Promise<void> {
    setError('')
    if (validarAlias(alias)) {
      setError('El nombre debe tener entre 2 y 24 caracteres, empezar con una letra y usar solo letras, números, espacios, guiones o apóstrofes.')
      return
    }
    if (!celularValido) {
      setError('El celular debe tener 9 números y empezar con 9.')
      return
    }
    if (procesando) return
    setProcesando('datos')
    try {
      const r = await actions.createClient(normalizarAlias(alias), normalizarCelular(celular))
      if ('error' in r && r.error === 'celular') {
        const existente = await actions.findClient(normalizarCelular(celular))
        setEncontrado(existente ?? null)
        return
      }
      if ('error' in r) {
        setError('No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.')
        return
      }
      setClientePendiente(r.cliente)
      await reservar(r.cliente, inicio, true, true)
    } catch {
      setError('No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setProcesando('')
    }
  }

  async function buscar(): Promise<void> {
    setError('')
    if (!celularValido) {
      setError('El celular debe tener 9 números y empezar con 9.')
      return
    }
    if (procesando) return
    setProcesando('buscar')
    try {
      const c = await actions.findClient(normalizarCelular(celular))
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
      <img
        className="resumen-imagen"
        src={cancha.imagen}
        alt={`Vista del ${cancha.nombre}, ${cancha.deporte}`}
      />
      <div>
        <strong>{cancha.nombre}</strong>
        <span>
          {capital(nombreDia(dia, true))}, {rangoHablado(inicio, horas)}
        </span>
        <span className="precio">S/ {cancha.precioHora * horas} · pagas en el campo</span>
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
        <h1 ref={tituloRef} tabIndex={-1}>😕 Alguien reservó esa hora antes que tú</h1>
        {alt ? (
          <>
            <p className="subtitulo">Pero esta hora está libre:</p>
            <button
              className="boton-principal"
              disabled={Boolean(procesando)}
              onClick={() => {
                const clienteActual = yo ?? clientePendiente
                if (!clienteActual) {
                  setError('No pudimos identificar tus datos. Vuelve a intentarlo.')
                  return
                }
                onInicioChange(alt.inicio)
                setConflicto(null)
                void reservar(clienteActual, alt.inicio, false, Boolean(clientePendiente))
              }}
            >
              {procesando ? 'Guardando…' : `Reservar ${rangoHablado(alt.inicio, horas)}`}
            </button>
          </>
        ) : (
          <p className="subtitulo">Ya no quedan horas libres {nombreDia(dia, true)}.</p>
        )}
        <button className="boton-secundario" disabled={Boolean(procesando)} onClick={onBack}>
          Elegir otra hora
        </button>
      </section>
    )
  }

  if (encontrado) {
    return (
      <section>
        <h1 ref={tituloRef} tabIndex={-1}>¿Eres {encontrado.alias}?</h1>
        <p className="subtitulo">Ese celular ya reservó antes con ese nombre.</p>
        <button
          className="boton-principal"
          onClick={() => {
            onRememberClient(encontrado)
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
        <h1 ref={tituloRef} tabIndex={-1}>¿Todo bien, {yo.alias}?</h1>
        <p className="reserva-a-nombre">Reserva a nombre de <strong>{yo.alias}</strong></p>
        {resumen}
        {error && <p className="error" role="alert">{error}</p>}
        {error && (
          <button className="enlace" onClick={onViewBookings}>
            Ver mis reservas
          </button>
        )}
        <button className="boton-principal" disabled={Boolean(procesando)} onClick={() => void reservar(yo)}>
          {procesando ? 'Guardando…' : '✅ Confirmar reserva'}
        </button>
        <button className="enlace" onClick={onForgetClient}>
          No soy {yo.alias}
        </button>
      </section>
    )
  }

  return (
    <section>
      <h1 ref={tituloRef} tabIndex={-1}>{modo === 'nuevo' ? '¿A nombre de quién reservamos?' : '¡Hola de nuevo!'}</h1>
      {resumen}

      <form
        className="formulario"
        onSubmit={(e) => {
          e.preventDefault()
          void (modo === 'nuevo' ? crearYReservar() : buscar())
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
              minLength={2}
              maxLength={ALIAS_MAXIMO}
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
