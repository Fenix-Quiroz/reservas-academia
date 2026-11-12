import { useEffect, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { capital, diaDe, nombreDia } from '../../utils/fechasReserva'
import { rangoHablado } from '../../reservas'
import type { Campo, Cliente, Reserva } from '../../types.js'
import { ALIAS_MAXIMO } from '../../validacionCliente'
import { crearBloqueoAccion } from '../../accionUnica'
import { Phone, Ticket } from 'lucide-react'
import datosDemo from '../../data/clientes-frecuentes-demo.json'
import PopupPromocion from './PopupPromocion'

export const NUMERO_CONSULTAS = '997621348'
type ErrorAccion =
  | 'ocupado'
  | 'limite'
  | 'celular-bloqueado'
  | 'celular'
  | 'conexion'
  | 'no-existe'
  | 'tarde'
  | 'duracion-invalida'
  | 'alias-invalido'
  | 'celular-invalido'
  | 'numero-no-confiable'
type ResultadoDatos = { cliente: Cliente } | { error: ErrorAccion }
type ResultadoCancelacion = { error?: ErrorAccion }

export interface MisReservasProps {
  reservas: Reserva[]
  yo: Cliente | null
  canchas: readonly Campo[]
  cargando?: boolean
  errorCarga?: string
  permitirEdicion?: boolean
  onCancel: (id: string) => Promise<ResultadoCancelacion>
  onUpdateData: (datos: { alias: string; celular: string }) => Promise<ResultadoDatos>
  onReserve: () => void
  onRetry: () => void
  tituloRef: RefObject<HTMLHeadingElement | null>
  esReservaVisible?: (reserva: Reserva) => boolean
}

export default function MisReservas({
  reservas,
  yo,
  canchas,
  cargando = false,
  errorCarga = '',
  permitirEdicion = true,
  onCancel,
  onUpdateData,
  onReserve,
  onRetry,
  tituloRef,
  esReservaVisible,
}: MisReservasProps) {
  const reservasVisibles = reservas
    .filter((reserva) => reserva.estado !== 'cancelado' || (esReservaVisible ? esReservaVisible(reserva) : true))
    .sort((a, b) => {
      const aCancelada = a.estado === 'cancelado'
      const bCancelada = b.estado === 'cancelado'
      if (aCancelada !== bCancelada) return aCancelada ? 1 : -1
      return a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio
    })
  const clienteDemo = yo ? datosDemo.find((c) => c.celular === yo.celular) : null
  const reservasFinalizadas = reservas.filter((r) => r.estado === 'finalizado').length
  const ticketsAcumulados = clienteDemo ? clienteDemo.reservasMes + reservasFinalizadas : reservasFinalizadas
  const [porCancelar, setPorCancelar] = useState<string | null>(null)
  const [verSorteo, setVerSorteo] = useState(false)
  const [editando, setEditando] = useState(false)
  const [alias, setAlias] = useState(yo?.alias ?? '')
  const [celular, setCelular] = useState(yo?.celular ?? '')
  const [datosError, setDatosError] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const bloqueoEdicion = useRef(crearBloqueoAccion())
  const bloqueoCancelacion = useRef(crearBloqueoAccion())
  const numeroContactoVisible = NUMERO_CONSULTAS.match(/.{1,3}/g)?.join(' ') ?? NUMERO_CONSULTAS
  const numeroLimpio = NUMERO_CONSULTAS.replace(/\D/g, '')

  useEffect(() => {
    if (!exito) return undefined
    const temporizador = window.setTimeout(() => setExito(''), 4000)
    return () => window.clearTimeout(temporizador)
  }, [exito])

  useEffect(() => {
    if (!error) return undefined
    const temporizador = window.setTimeout(() => setError(''), 5000)
    return () => window.clearTimeout(temporizador)
  }, [error])

  useEffect(() => {
    if (!datosError) return undefined
    const temporizador = window.setTimeout(() => setDatosError(''), 5000)
    return () => window.clearTimeout(temporizador)
  }, [datosError])

  async function editarDatos(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!bloqueoEdicion.current.adquirir()) return
    setDatosError('')
    setGuardandoDatos(true)
    try {
      const r = await onUpdateData({ alias, celular })
      if ('error' in r) {
        const mensajes: Partial<Record<ErrorAccion, string>> = {
          'alias-invalido': `El nombre debe tener entre 2 y ${ALIAS_MAXIMO} caracteres, empezar con una letra y usar solo letras, números, espacios, guiones o apóstrofes.`,
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
      bloqueoEdicion.current.liberar()
    }
  }

  async function cancelar(id: string): Promise<void> {
    if (!bloqueoCancelacion.current.adquirir()) return
    setCancelando(id)
    try {
      const r = await onCancel(id)
      setPorCancelar(null)
      setExito(r.error ? '' : '✔ Reserva cancelada. El campo quedó libre para otros.')
      if (r.error === 'tarde') setError('No pudimos cancelar la reserva. Inténtalo de nuevo.')
      else if (r.error === 'conexion') setError('No pudimos cancelar la reserva. Revisa tu conexión e inténtalo de nuevo.')
      else if (r.error) setError('Esta reserva no se puede cancelar desde aquí. Llama a la academia.')
      else setError('')
    } catch {
      setError('No pudimos cancelar la reserva. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setCancelando(null)
      bloqueoCancelacion.current.liberar()
    }
  }

  return (
    <section className="mis-reservas">
      {/* Ticket de Gran Sorteo Navideño (Variante A - Golden Voucher) */}
      <aside className="ticket-sorteo-voucher" aria-label="Ticket de Gran Sorteo Navideño">
        <div className="ticket-sorteo-cuerpo">
          <div className="ticket-sorteo-cabecera-fila">
            <span className="ticket-sorteo-badge">
              <span aria-hidden="true">🎟️</span> Gran Sorteo Navideño
            </span>
            <button
              type="button"
              className="ticket-sorteo-btn-ver"
              onClick={() => setVerSorteo(true)}
              aria-label="Ver sorteo navideño"
            >
              <span>Ver sorteo</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="ticket-sorteo-contador-fila">
            <div className="ticket-sorteo-icono-caja" aria-hidden="true">
              <Ticket size={28} strokeWidth={2.4} />
            </div>
            <div className="ticket-sorteo-info">
              <div className="ticket-sorteo-conteo-principal">
                <strong className="ticket-sorteo-numero">{ticketsAcumulados}</strong>
                <span className="ticket-sorteo-etiqueta">
                  {ticketsAcumulados === 1 ? 'Ticket acumulado' : 'Tickets acumulados'}
                </span>
              </div>
              <span className="ticket-sorteo-subconteo">
                {ticketsAcumulados} {ticketsAcumulados === 1 ? 'reserva completada y pagada' : 'reservas completadas y pagadas'}
              </span>
            </div>
          </div>

          <div className="ticket-sorteo-divisor" aria-hidden="true" />

          <p className="ticket-sorteo-regla">
            <span className="ticket-sorteo-regla-icono" aria-hidden="true">💡</span>
            <span>Cada reserva completada y pagada al 100% te da 1 ticket.</span>
          </p>
        </div>
      </aside>

      <h1 ref={tituloRef} tabIndex={-1}>Mis reservas</h1>
      <p className="subtitulo">Puedes cancelar tu reserva en cualquier momento.</p>
      {exito && <p className="exito" role="status">{exito}</p>}
      {cargando ? (
        <p className="aviso" role="status" aria-live="polite">Cargando tus reservas…</p>
      ) : errorCarga ? (
        <div className="error error-conexion" role="alert">
          <span>{errorCarga}</span>
          <button className="chip" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {permitirEdicion && yo && (editando ? (
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
                  minLength={2}
                  maxLength={ALIAS_MAXIMO}
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
                    setAlias(yo?.alias ?? '')
                    setCelular(yo?.celular ?? '')
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
          ))}
          {!reservasVisibles.length ? (
            <>
              <h2>Aún no tienes reservas</h2>
              <p className="subtitulo">Cuando reserves un campo, aparecerá aquí.</p>
              <button className="boton-principal" onClick={onReserve}>
                <span aria-hidden="true">⚽</span> Reservar un campo
              </button>
            </>
          ) : (
            <>
              {error && <p className="error" role="alert">{error}</p>}
              {reservasVisibles.map((r) => {
                const c = canchas.find((x) => x.id === r.canchaId)
                if (!c) return null
                const comprobanteConfirmado = r.pagoEstado === 'confirmado'
                return (
                  <div key={r.id} className="resumen">
                    <img
                      className="resumen-imagen"
                      src={c.imagen}
                      alt={`Vista del ${c.nombre}, ${c.deporte}`}
                    />
                    <div>
                      <strong>{c.nombre}</strong>
                      <span>
                        {capital(nombreDia(diaDe(r.fecha), true))}, {rangoHablado(r.inicio, r.horas)}
                      </span>
                      <span className="precio">S/ {c.precioHora * r.horas} · total a pagar</span>
                      {r.estado === 'cancelado' ? (
                        <span className="pago-cancelado" role="status">Cancelada</span>
                      ) : r.pagoEstado === 'confirmado' || r.pagoEstado === 'no_requerido' ? (
                        <span className="pago-confirmado" role="status">Reserva confirmada</span>
                      ) : r.pagoEstado === 'pendiente' ? (
                        <span className="pago-pendiente" role="status">Esperando verificación</span>
                      ) : null}

                      {r.estado === 'cancelado' && (
                        <span className="aviso-cancelada" role="note">
                          Esta reserva fue cancelada y desaparecerá de tu lista en 5 horas.
                        </span>
                      )}

                      {r.estado !== 'cancelado' && comprobanteConfirmado && (
                        <span className="aviso-cancelacion-confirmada" role="note">
                          Reserva asegurada. Para cambios o cancelaciones, comunícate con la academia.
                        </span>
                      )}

                      {r.estado !== 'cancelado' && !comprobanteConfirmado && (porCancelar === r.id ? (
                        <div className="confirmar" role="group" aria-labelledby={`confirmar-cancelar-${r.id}`}>
                          <span id={`confirmar-cancelar-${r.id}`}>¿Seguro que quieres cancelar?</span>
                          <div className="duraciones">
                            <button className="chip peligro" disabled={cancelando === r.id} onClick={() => void cancelar(r.id)}>
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
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </>
      )}
      <div className="contacto-soporte" aria-labelledby="contacto-soporte-titulo">
        <p id="contacto-soporte-titulo" className="contacto-soporte-titulo">
          Para dudas o consultas llamar a este número:
        </p>
        <div className="contacto-soporte-numero">
          <a
            href={`tel:+51${numeroLimpio}`}
            className="contacto-soporte-telefono"
            aria-label={`Llamar al ${numeroContactoVisible}`}
          >
            <Phone size={18} aria-hidden="true" />
            <strong>{numeroContactoVisible}</strong>
          </a>
        </div>
        <a
          href={`https://wa.me/51${numeroLimpio}`}
          target="_blank"
          rel="noopener noreferrer"
          className="boton-whatsapp"
          aria-label="Contactar por WhatsApp"
        >
          <svg
            className="icono-whatsapp"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.98-.277-.101-.478-.15-.678.15-.2.302-.777.98-.953 1.181-.176.202-.352.227-.652.076-.302-.152-1.272-.469-2.424-1.496-.897-.798-1.502-1.784-1.678-2.086-.176-.302-.019-.465.132-.615.136-.135.302-.352.453-.528.151-.177.201-.302.302-.503.101-.202.05-.378-.026-.528-.075-.152-.677-1.634-.928-2.238-.244-.588-.492-.508-.677-.518-.176-.008-.377-.01-.578-.01-.2 0-.528.075-.804.377-.276.302-1.055 1.03-1.055 2.512 0 1.482 1.08 2.912 1.231 3.113.151.201 2.125 3.245 5.148 4.551.719.311 1.281.497 1.719.636.722.23 1.378.197 1.898.12.579-.087 1.78-.727 2.03-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.202-.578-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.982-1.396A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.564 0-3.023-.42-4.288-1.155l-.307-.181-3.18.891.85-3.097-.199-.319A8.13 8.13 0 013.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
          </svg>
          <span>Escribir por WhatsApp</span>
        </a>
      </div>
      <PopupPromocion abierto={verSorteo} onCerrar={() => setVerSorteo(false)} />
    </section>
  )
}
