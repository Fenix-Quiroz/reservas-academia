import { useState } from 'react'
import { capital, nombreDia } from '../../utils/fechasReserva.js'
import { rangoHablado } from '../../reservas.js'

export default function DatosReserva({
  cancha, dia, horas, inicio, onInicioChange, yo, onRememberClient, onForgetClient,
  onBack, onViewBookings, onReserved, tituloRef, actions,
}) {
  const [modo, setModo] = useState('nuevo') // 'nuevo' | 'volver'
  const [alias, setAlias] = useState('')
  const [celular, setCelular] = useState('')
  const [error, setError] = useState('')
  const [encontrado, setEncontrado] = useState(null) // cliente que ya existe con ese celular
  const [conflicto, setConflicto] = useState(null) // { alternativa } cuando alguien ganó la hora
  const [procesando, setProcesando] = useState('')
  const [clientePendiente, setClientePendiente] = useState(null)

  const celularValido = /^9\d{8}$/.test(celular)

  async function reservar(cliente, hora = inicio, yaProcesando = false, recordarCliente = false) {
    if (!yaProcesando && procesando) return false
    if (!yaProcesando) setProcesando('reserva')
    try {
      const r = await actions.reserve(cliente, hora)
      if (r.error === 'ocupado') {
        setConflicto({ alternativa: r.alternativa })
        return false
      }
      if (r.error === 'limite') {
        setError('Ya tienes 2 reservas pendientes. Cuando juegues una, podrás reservar otra.')
        return false
      }
      if (r.error) {
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

  async function crearYReservar() {
    setError('')
    if (alias.trim().length < 2) return setError('Escribe tu nombre o apodo (mínimo 2 letras).')
    if (!celularValido) return setError('El celular debe tener 9 números y empezar con 9.')
    if (procesando) return
    setProcesando('datos')
    try {
      const r = await actions.createClient(alias, celular)
      if (r.error === 'celular') {
        const existente = await actions.findClient(celular)
        return setEncontrado(existente)
      }
      if (r.error) return setError('No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.')
      setClientePendiente(r.cliente)
      await reservar(r.cliente, inicio, true, true)
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
      const c = await actions.findClient(celular)
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
        <h1 ref={tituloRef} tabIndex="-1">😕 Alguien reservó esa hora antes que tú</h1>
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
                reservar(clienteActual, alt.inicio, false, Boolean(clientePendiente))
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
        <h1 ref={tituloRef} tabIndex="-1">¿Eres {encontrado.alias}?</h1>
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
        <h1 ref={tituloRef} tabIndex="-1">¿Todo bien, {yo.alias}?</h1>
        <p className="reserva-a-nombre">Reserva a nombre de <strong>{yo.alias}</strong></p>
        {resumen}
        {error && <p className="error" role="alert">{error}</p>}
        {error && (
          <button className="enlace" onClick={onViewBookings}>
            Ver mis reservas
          </button>
        )}
        <button className="boton-principal" disabled={Boolean(procesando)} onClick={() => reservar(yo)}>
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
