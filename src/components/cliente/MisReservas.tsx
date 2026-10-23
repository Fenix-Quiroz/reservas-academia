import { useEffect, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { capital, diaDe, nombreDia } from '../../utils/fechasReserva'
import { rangoHablado } from '../../reservas'
import type { Campo, Cliente, Reserva } from '../../types.js'
import { ALIAS_MAXIMO } from '../../validacionCliente'

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
type ResultadoDatos = { cliente: Cliente } | { error: ErrorAccion }
type ResultadoCancelacion = { error?: ErrorAccion }

export interface MisReservasProps {
  reservas: Reserva[]
  yo: Cliente | null
  canchas: readonly Campo[]
  permitirEdicion?: boolean
  onCancel: (id: string) => Promise<ResultadoCancelacion>
  onUpdateData: (datos: { alias: string; celular: string }) => Promise<ResultadoDatos>
  onReserve: () => void
  tituloRef: RefObject<HTMLHeadingElement | null>
}

export default function MisReservas({
  reservas,
  yo,
  canchas,
  permitirEdicion = true,
  onCancel,
  onUpdateData,
  onReserve,
  tituloRef,
}: MisReservasProps) {
  const reservasVisibles = reservas.filter((reserva) => reserva.estado !== 'cancelado')
  const [porCancelar, setPorCancelar] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [alias, setAlias] = useState(yo?.alias ?? '')
  const [celular, setCelular] = useState(yo?.celular ?? '')
  const [datosError, setDatosError] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [cancelando, setCancelando] = useState<string | null>(null)

  useEffect(() => {
    if (!exito) return undefined
    const temporizador = window.setTimeout(() => setExito(''), 4000)
    return () => window.clearTimeout(temporizador)
  }, [exito])

  async function editarDatos(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (guardandoDatos) return
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
    }
  }

  async function cancelar(id: string): Promise<void> {
    if (cancelando) return
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
    }
  }

  return (
    <section className="mis-reservas">
      <h1 ref={tituloRef} tabIndex={-1}>Mis reservas</h1>
      <p className="subtitulo">Puedes cancelar tu reserva en cualquier momento.</p>
      {exito && <p className="exito" role="status">{exito}</p>}
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
                  <span className="precio">S/ {c.precioHora * r.horas} · pagas en el campo</span>

                  {porCancelar === r.id ? (
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
