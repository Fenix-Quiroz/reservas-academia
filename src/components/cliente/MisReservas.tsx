import { useEffect, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { capital, diaDe, nombreDia } from '../../utils/fechasReserva'
import { rangoHablado } from '../../reservas'
import type { Campo, Cliente, Reserva } from '../../types.js'
import { ALIAS_MAXIMO } from '../../validacionCliente'
import { crearBloqueoAccion } from '../../accionUnica'
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
  const [porCancelar, setPorCancelar] = useState<string | null>(null)
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
          'alias-invalido': 'El nombre debe tener entre 2 y 24 caracteres, empezar con una letra y usar solo letras, números, espacios, guiones o apóstrofes.',
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
    </section>
  )
}
