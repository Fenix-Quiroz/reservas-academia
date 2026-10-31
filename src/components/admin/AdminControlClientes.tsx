import { useState } from 'react'
import type { FormEvent } from 'react'
import { UserCheck, UserX } from 'lucide-react'
import type {
  NumeroBloqueado,
  NumeroConfiable,
  ResultadoControlCliente,
} from '../../controlClientes.js'

export interface AdminControlClientesProps {
  bloqueados: readonly NumeroBloqueado[]
  confiables: readonly NumeroConfiable[]
  cargando: boolean
  procesando: boolean
  onBloquear: (celular: string, motivo: string) => Promise<ResultadoControlCliente>
  onDesbloquear: (celular: string) => Promise<ResultadoControlCliente>
  onAgregarConfiable: (celular: string, alias: string) => Promise<ResultadoControlCliente>
  onQuitarConfiable: (celular: string) => Promise<ResultadoControlCliente>
}

function mensajeError(resultado: ResultadoControlCliente): string {
  if (!('error' in resultado)) return ''
  if (resultado.error === 'celular-invalido') return 'El celular debe tener 9 números y empezar con 9.'
  if (resultado.error === 'alias-invalido') return 'El nombre debe empezar con una letra y tener entre 2 y 24 caracteres.'
  if (resultado.error === 'no-existe') return 'Ese número ya no está registrado.'
  return 'No pudimos guardar el cambio. Revisa la conexión e inténtalo de nuevo.'
}

export default function AdminControlClientes({
  bloqueados,
  confiables,
  cargando,
  procesando,
  onBloquear,
  onDesbloquear,
  onAgregarConfiable,
  onQuitarConfiable,
}: AdminControlClientesProps) {
  const [celularBloqueado, setCelularBloqueado] = useState('')
  const [motivo, setMotivo] = useState('Dos inasistencias')
  const [celularConfiable, setCelularConfiable] = useState('')
  const [aliasConfiable, setAliasConfiable] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  async function bloquear(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setError('')
    setExito('')
    const resultado = await onBloquear(celularBloqueado, motivo)
    if ('error' in resultado) {
      setError(mensajeError(resultado))
      return
    }
    setCelularBloqueado('')
    setExito('Número bloqueado.')
  }

  async function agregarConfiable(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setError('')
    setExito('')
    const resultado = await onAgregarConfiable(celularConfiable, aliasConfiable)
    if ('error' in resultado) {
      setError(mensajeError(resultado))
      return
    }
    setCelularConfiable('')
    setAliasConfiable('')
    setExito('Cliente confiable guardado.')
  }

  async function cambiarEstado(
    accion: () => Promise<ResultadoControlCliente>,
  ): Promise<void> {
    setError('')
    setExito('')
    const resultado = await accion()
    if ('error' in resultado) setError(mensajeError(resultado))
    else setExito('Cambio guardado.')
  }

  const bloqueadosActivos = bloqueados.filter((numero) => numero.activo)
  const confiablesActivos = confiables.filter((numero) => numero.activo)

  return (
    <section className="admin-control-clientes" aria-labelledby="titulo-control-clientes">
      <div className="admin-control-cabecera">
        <div>
          <p className="admin-kicker">Control de clientes</p>
          <h2 id="titulo-control-clientes">Bloqueados y confiables</h2>
          <p className="admin-control-ayuda">
            Gestiona los celulares que no pueden reservar y los clientes habituales.
          </p>
        </div>
      </div>

      {(error || exito) && (
        <p className={error ? 'error' : 'exito'} role={error ? 'alert' : 'status'}>
          {error || exito}
        </p>
      )}

      <div className="admin-control-grid">
        <section className="admin-control-card" aria-labelledby="titulo-bloqueados">
          <div>
            <h3 id="titulo-bloqueados">Números bloqueados</h3>
            <p>Después de 2 inasistencias, el bloqueo se crea automáticamente.</p>
          </div>
          <form className="admin-control-form" onSubmit={(evento) => void bloquear(evento)}>
            <label>
              <span>Celular</span>
              <input
                type="tel"
                value={celularBloqueado}
                required
                maxLength={9}
                inputMode="numeric"
                placeholder="987654321"
                onChange={(evento) => setCelularBloqueado(evento.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label>
              <span>Motivo</span>
              <input
                value={motivo}
                required
                maxLength={120}
                placeholder="Motivo del bloqueo"
                onChange={(evento) => setMotivo(evento.target.value)}
              />
            </label>
            <button className="admin-boton admin-control-primario admin-control-guardar" type="submit" disabled={procesando}>
              <UserX size={20} strokeWidth={2.5} aria-hidden="true" />
              <span>{procesando ? 'Guardando…' : 'Bloquear número'}</span>
            </button>
          </form>
          <div className="admin-control-lista" aria-live="polite">
            {cargando ? <p>Cargando números bloqueados…</p> : bloqueadosActivos.length === 0 ? (
              <p>No hay números bloqueados.</p>
            ) : bloqueadosActivos.map((numero) => (
              <article className="admin-control-fila" key={numero.celular}>
                <div>
                  <strong>{numero.celular}</strong>
                  <span>{numero.motivo} · {numero.inasistencias} inasistencias</span>
                </div>
                <button
                  className="admin-boton admin-control-secundario"
                  type="button"
                  disabled={procesando}
                  onClick={() => void cambiarEstado(() => onDesbloquear(numero.celular))}
                >
                  Desbloquear
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-control-card" aria-labelledby="titulo-confiables">
          <div>
            <h3 id="titulo-confiables">Clientes confiables</h3>
            <p>Quedarán preparados para omitir el adelanto cuando ese cobro esté activo.</p>
          </div>
          <form className="admin-control-form" onSubmit={(evento) => void agregarConfiable(evento)}>
            <label>
              <span>Celular</span>
              <input
                type="tel"
                value={celularConfiable}
                required
                maxLength={9}
                inputMode="numeric"
                placeholder="987654321"
                onChange={(evento) => setCelularConfiable(evento.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label>
              <span>Nombre o apodo</span>
              <input
                value={aliasConfiable}
                required
                maxLength={24}
                placeholder="Cliente habitual"
                onChange={(evento) => setAliasConfiable(evento.target.value)}
              />
            </label>
            <button className="admin-boton admin-control-primario admin-control-guardar" type="submit" disabled={procesando}>
              <UserCheck size={20} strokeWidth={2.5} aria-hidden="true" />
              <span>{procesando ? 'Guardando…' : 'Agregar confiable'}</span>
            </button>
          </form>
          <div className="admin-control-lista" aria-live="polite">
            {cargando ? <p>Cargando clientes confiables…</p> : confiablesActivos.length === 0 ? (
              <p>No hay clientes confiables.</p>
            ) : confiablesActivos.map((numero) => (
              <article className="admin-control-fila" key={numero.celular}>
                <div>
                  <strong>{numero.alias}</strong>
                  <span>{numero.celular}</span>
                </div>
                <button
                  className="admin-boton admin-control-secundario"
                  type="button"
                  disabled={procesando}
                  onClick={() => void cambiarEstado(() => onQuitarConfiable(numero.celular))}
                >
                  Quitar
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
