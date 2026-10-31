import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { capital, nombreDia } from '../../utils/fechasReserva'
import { rangoHablado, type HorarioDisponible } from '../../reservas'
import { validarComprobante, optimizarComprobante, type ErrorComprobante } from '../../pagos'
import type { Campo, Cliente, Reserva } from '../../types.js'
import PagoAdelanto from './PagoAdelanto'
import {
  ALIAS_MAXIMO,
  normalizarAlias,
  normalizarCelular,
  validarAlias,
  validarCelular,
} from '../../validacionCliente'
import { crearBloqueoAccion } from '../../accionUnica'

type Procesando = '' | 'reserva' | 'datos'
type ErrorAccion =
  | 'ocupado'
  | 'limite'
  | 'limite-intentos'
  | 'celular-bloqueado'
  | 'celular'
  | 'conexion'
  | 'no-existe'
  | 'tarde'
  | 'duracion-invalida'
  | 'alias-invalido'
  | 'celular-invalido'
  | 'numero-no-confiable'
type ResultadoClienteAccion = { cliente: Cliente } | { error: ErrorAccion }
type ResultadoReservaConAlternativa =
  | { reserva: Reserva; token?: string }
  | { error: ErrorAccion; alternativa?: HorarioDisponible }
type ErrorPagoAccion =
  | 'archivo-invalido'
  | 'reserva-no-autorizada'
  | 'pago-expirado'
  | 'pago-ya-confirmado'
  | 'idempotencia-repetida'
  | 'conexion'
type ResultadoPagoAccion = Record<string, never> | { error: ErrorPagoAccion }

export interface DatosReservaActions {
  createClient: (alias: string, celular: string) => Promise<ResultadoClienteAccion>
  reserve: (cliente: Cliente, hora: number, sinAdelanto: boolean) => Promise<ResultadoReservaConAlternativa>
  checkTrustedNumber: (celular: string) => Promise<boolean>
  prewarmPayment: () => Promise<void>
  submitPayment: (
    reserva: Reserva,
    token: string | undefined,
    comprobante: File,
    idempotencia: string,
  ) => Promise<ResultadoPagoAccion>
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
  const [alias, setAlias] = useState('')
  const [celular, setCelular] = useState('')
  const [error, setError] = useState('')
  const [conflicto, setConflicto] = useState<{ alternativa?: HorarioDisponible } | null>(null)
  const [procesando, setProcesando] = useState<Procesando>('')
  const [clientePendiente, setClientePendiente] = useState<Cliente | null>(null)
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [errorComprobante, setErrorComprobante] = useState('')
  const [reservaPendientePago, setReservaPendientePago] = useState<{ reserva: Reserva; token?: string } | null>(null)
  const [numeroConfiable, setNumeroConfiable] = useState<boolean | null>(null)
  const [comprobandoConfiable, setComprobandoConfiable] = useState(false)
  const [idempotencia] = useState(() => crypto.randomUUID())
  const bloqueoAccion = useRef(crearBloqueoAccion())
  const errorRef = useRef<HTMLParagraphElement | null>(null)
  const comprobarNumeroRef = useRef(actions.checkTrustedNumber)
  comprobarNumeroRef.current = actions.checkTrustedNumber

  const celularActual = yo?.celular ?? celular
  const errorCelular = validarCelular(celularActual)
  const celularValido = errorCelular === null

  useEffect(() => {
    const celularNormalizado = normalizarCelular(celularActual)
    if (validarCelular(celularNormalizado)) {
      setNumeroConfiable(null)
      setComprobandoConfiable(false)
      return
    }
    let montado = true
    setComprobandoConfiable(true)
    setNumeroConfiable(null)
    void comprobarNumeroRef.current(celularNormalizado)
      .then((esConfiable) => {
        if (!montado) return
        setNumeroConfiable(esConfiable)
      })
      .catch(() => {
        if (montado) setNumeroConfiable(false)
      })
      .finally(() => {
        if (montado) setComprobandoConfiable(false)
      })
    return () => {
      montado = false
    }
  }, [celularActual])

  useEffect(() => {
    if (!error) return undefined
    const frame = window.requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const temporizador = window.setTimeout(() => setError(''), 5000)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(temporizador)
    }
  }, [error])

  useEffect(() => {
    if (!errorComprobante) return undefined
    const temporizador = window.setTimeout(() => setErrorComprobante(''), 5000)
    return () => window.clearTimeout(temporizador)
  }, [errorComprobante])

  function mensajeErrorComprobante(error: ErrorComprobante): string {
    if (error === 'archivo-requerido') return 'Selecciona la captura de tu Yape para asegurar la reserva.'
    if (error === 'archivo-vacio') return 'El comprobante está vacío. Selecciona otra imagen.'
    if (error === 'tipo-no-admitido') return 'El comprobante debe ser JPG, PNG o WEBP.'
    return 'El comprobante no debe superar los 5 MB.'
  }

  function mensajeErrorPago(error: ErrorPagoAccion): string {
    if (error === 'archivo-invalido') return 'El comprobante debe ser JPG, PNG o WEBP y pesar como máximo 5 MB.'
    if (error === 'reserva-no-autorizada') return 'No pudimos vincular el comprobante con esta reserva. Vuelve a intentarlo.'
    if (error === 'pago-expirado') return 'El plazo de revisión venció después de 30 minutos. Elige nuevamente el horario.'
    if (error === 'pago-ya-confirmado') return 'Este adelanto ya fue confirmado por la administración.'
    if (error === 'idempotencia-repetida') return 'Este comprobante ya fue recibido. Revisa “Mis reservas”.'
    return 'No pudimos subir el comprobante. Revisa tu conexión e inténtalo de nuevo.'
  }

  function cambiarComprobante(archivo: File | null): void {
    setComprobante(archivo)
    if (!archivo) {
      setErrorComprobante('')
      setError('')
      return
    }
    const errorArchivo = validarComprobante(archivo)
    setErrorComprobante(errorArchivo ? mensajeErrorComprobante(errorArchivo) : '')
    setError('')
    if (!errorArchivo) {
      void actions.prewarmPayment()
      void optimizarComprobante(archivo).then((optimizado) => {
        if (optimizado !== archivo) setComprobante(optimizado)
      })
    }
  }

  async function reservar(
    cliente: Cliente,
    hora = inicio,
    yaProcesando = false,
    recordarCliente = false,
    bloqueoAdquirido = false,
  ): Promise<boolean> {
    if (!bloqueoAdquirido && !bloqueoAccion.current.adquirir()) return false
    const liberaBloqueo = !bloqueoAdquirido
    try {
      let archivoParaSubir = comprobante
      const sinAdelanto = !reservaPendientePago && numeroConfiable === true
      if (!sinAdelanto) {
        const errorArchivo = validarComprobante(archivoParaSubir)
        if (errorArchivo) {
          setErrorComprobante(mensajeErrorComprobante(errorArchivo))
          return false
        }
        if (!archivoParaSubir) return false
        archivoParaSubir = await optimizarComprobante(archivoParaSubir)
      }
      if (!yaProcesando) setProcesando('reserva')
      let reservaConToken = reservaPendientePago
      if (!reservaConToken) {
        const r = await actions.reserve(cliente, hora, sinAdelanto)
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
          if (r.error === 'celular-bloqueado') {
            setError('Este celular está bloqueado para nuevas reservas. Comunícate con la administración.')
            return false
          }
          if (r.error === 'numero-no-confiable') {
            setNumeroConfiable(false)
            setError('Este número ya no está autorizado para reservar sin adelanto. Selecciona tu comprobante para continuar.')
            return false
          }
          if (r.error === 'tarde') {
            setError('La fecha o la hora ya no está disponible. Elige otro turno.')
            return false
          }
          if (r.error === 'duracion-invalida') {
            setError('Elige una duración válida para la reserva.')
            return false
          }
          setError('No pudimos guardar la reserva. Revisa tu conexión e inténtalo de nuevo.')
          return false
        }
        reservaConToken = r
        setReservaPendientePago(r)
      }
      if (reservaConToken.reserva.pagoEstado === 'no_requerido') {
        setReservaPendientePago(null)
        onReserved(reservaConToken.reserva)
        if (recordarCliente) {
          onRememberClient(cliente)
          setClientePendiente(null)
        }
        return true
      }
      if (!archivoParaSubir) {
        setErrorComprobante(mensajeErrorComprobante('archivo-requerido'))
        return false
      }
      const pago = await actions.submitPayment(reservaConToken.reserva, reservaConToken.token, archivoParaSubir, idempotencia)
      if ('error' in pago) {
        setError(mensajeErrorPago(pago.error))
        return false
      }
      setReservaPendientePago(null)
      onReserved(reservaConToken.reserva)
      if (recordarCliente) {
        onRememberClient(cliente)
        setClientePendiente(null)
      }
      return true
    } catch {
      setError('No pudimos asegurar la reserva. Revisa tu conexión e inténtalo de nuevo.')
      return false
    } finally {
      if (!yaProcesando) setProcesando('')
      if (liberaBloqueo) bloqueoAccion.current.liberar()
    }
  }

  async function crearYReservar(): Promise<void> {
    setError('')
    setErrorComprobante('')
    if (reservaPendientePago && clientePendiente) {
      if (!bloqueoAccion.current.adquirir()) return
      try {
        await reservar(clientePendiente, inicio, false, true, true)
      } finally {
        bloqueoAccion.current.liberar()
      }
      return
    }
    if (validarAlias(alias)) {
      setError('El nombre debe tener entre 2 y 24 caracteres, empezar con una letra y usar solo letras, números, espacios, guiones o apóstrofes.')
      return
    }
    if (!celularValido) {
      setError('El celular debe tener 9 números y empezar con 9.')
      return
    }
    if (numeroConfiable !== true) {
      const errorArchivo = validarComprobante(comprobante)
      if (errorArchivo) {
        setErrorComprobante(mensajeErrorComprobante(errorArchivo))
        return
      }
    }
    if (!bloqueoAccion.current.adquirir()) return
    setProcesando('datos')
    try {
      const r = await actions.createClient(normalizarAlias(alias), normalizarCelular(celular))
      if ('error' in r && r.error === 'celular') {
        setError('Ese celular ya está registrado en este navegador. Usa el mismo cliente recordado o prueba con otro celular.')
        return
      }
      if ('error' in r) {
        setError('No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.')
        return
      }
      setClientePendiente(r.cliente)
      await reservar(r.cliente, inicio, true, true, true)
    } catch {
      setError('No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setProcesando('')
      bloqueoAccion.current.liberar()
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
        <span className="precio">S/ {cancha.precioHora * horas} · total a pagar</span>
        <span className="resumen-oferta" role="note">
          Reclama tu agua GRATIS de 2.5 litros al cancelar el total de tu reserva
        </span>
      </div>
    </div>
  )

  const sinAdelanto = numeroConfiable === true
  const puedeConfirmar = sinAdelanto || Boolean(comprobante && !errorComprobante)
  const textoAccion = procesando
    ? sinAdelanto ? 'Confirmando reserva…' : 'Asegurando reserva…'
    : sinAdelanto ? 'Confirmar reserva' : puedeConfirmar ? 'Asegurar reserva' : 'Selecciona tu comprobante'

  if (procesando) {
    const pantallaCarga = (
      <section className="reserva-cargando" role="status" aria-live="polite" aria-busy="true">
        <div className="reserva-cargando-contenido">
          <div className="reserva-cargando-spinner" aria-hidden="true" />
          <h1 ref={tituloRef} tabIndex={-1}>Asegurando tu reserva…</h1>
          <p>
            {sinAdelanto
              ? 'Estamos verificando el horario y confirmando tus datos.'
              : 'Estamos verificando el horario y procesando tu comprobante.'}
          </p>
          <span>No cierres esta pantalla.</span>
        </div>
      </section>
    )
    return createPortal(pantallaCarga, document.body)
  }

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
              disabled={Boolean(procesando) || comprobandoConfiable || !puedeConfirmar}
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
              {textoAccion}
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

  if (yo) {
    return (
      <section>
        <h1 ref={tituloRef} tabIndex={-1}>¿Todo bien, {yo.alias}?</h1>
        <p className="reserva-a-nombre">Reserva a nombre de <strong>{yo.alias}</strong></p>
        {resumen}
        {!sinAdelanto && (
          <PagoAdelanto
            archivo={comprobante}
            disabled={Boolean(procesando)}
            error={errorComprobante}
            onArchivoChange={cambiarComprobante}
          />
        )}
        {comprobandoConfiable && <p className="ayuda-campo" role="status">Verificando si este número tiene beneficio…</p>}
        {error && <p ref={errorRef} className="error" role="alert" tabIndex={-1}>{error}</p>}
        {error && (
          <button className="enlace" onClick={onViewBookings}>
            Ver mis reservas
          </button>
        )}
        <button className="boton-principal" disabled={Boolean(procesando) || comprobandoConfiable || !puedeConfirmar} onClick={() => void reservar(yo)}>
          {textoAccion}
        </button>
        <button className="enlace" onClick={onForgetClient}>
          No soy {yo.alias}
        </button>
      </section>
    )
  }

  return (
    <section>
      <h1 ref={tituloRef} tabIndex={-1}>¿A nombre de quién reservamos?</h1>
      {resumen}

      <form
        className="formulario"
        onSubmit={(e) => {
          e.preventDefault()
          void crearYReservar()
        }}
      >
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
        {!sinAdelanto && (
          <PagoAdelanto
            archivo={comprobante}
            disabled={Boolean(procesando)}
            error={errorComprobante}
            onArchivoChange={cambiarComprobante}
          />
        )}
        {comprobandoConfiable && <p className="ayuda-campo" role="status">Verificando si este número tiene beneficio…</p>}
        {error && <p ref={errorRef} id="datos-error" className="error" role="alert" tabIndex={-1}>{error}</p>}
        <button className="boton-principal" type="submit" disabled={Boolean(procesando) || comprobandoConfiable || !puedeConfirmar}>
          {textoAccion}
        </button>
      </form>

      <p className="nota">La próxima vez te recordaremos en este navegador.</p>
    </section>
  )
}
