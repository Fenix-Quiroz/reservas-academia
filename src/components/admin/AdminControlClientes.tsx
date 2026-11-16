import { useEffect, useMemo, useState } from 'react'
import { ALIAS_MAXIMO } from '../../validacionCliente'
import type { FormEvent } from 'react'
import { CalendarDays, MoreHorizontal, Search, UserCheck, UserX } from 'lucide-react'
import type {
  NumeroBloqueado,
  NumeroConfiable,
  ResultadoControlCliente,
} from '../../controlClientes.js'

export interface AdminControlClientesProps {
  bloqueados: readonly NumeroBloqueado[]
  confiables: readonly NumeroConfiable[]
  cargando: boolean
  procesandoConfiables: boolean
  procesandoBloqueados: boolean
  onBloquear: (celular: string, motivo: string) => Promise<ResultadoControlCliente>
  onDesbloquear: (celular: string) => Promise<ResultadoControlCliente>
  onAgregarConfiable: (celular: string, alias: string) => Promise<ResultadoControlCliente>
  onQuitarConfiable: (celular: string) => Promise<ResultadoControlCliente>
  onNuevaReserva?: (cliente?: NumeroConfiable) => void
}

function mensajeError(resultado: ResultadoControlCliente): string {
  if (!('error' in resultado)) return ''
  if (resultado.error === 'celular-invalido') return 'El celular debe tener 9 números y empezar con 9.'
  if (resultado.error === 'alias-invalido') return `El nombre debe empezar con una letra y tener entre 2 y ${ALIAS_MAXIMO} caracteres.`
  if (resultado.error === 'no-existe') return 'Ese número ya no está registrado.'
  return 'No pudimos guardar el cambio. Revisa la conexión e inténtalo de nuevo.'
}

export default function AdminControlClientes({
  bloqueados,
  confiables,
  cargando,
  procesandoConfiables,
  procesandoBloqueados,
  onBloquear,
  onDesbloquear,
  onAgregarConfiable,
  onQuitarConfiable,
  onNuevaReserva,
}: AdminControlClientesProps) {
  const [celularBloqueado, setCelularBloqueado] = useState('')
  const [motivo, setMotivo] = useState('Dos inasistencias')
  const [celularConfiable, setCelularConfiable] = useState('')
  const [aliasConfiable, setAliasConfiable] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [busquedaConfiables, setBusquedaConfiables] = useState('')
  const [menuConfiableAbierto, setMenuConfiableAbierto] = useState<string | null>(null)

  const [bloqueando, setBloqueando] = useState(false)
  const [agregandoConfiable, setAgregandoConfiable] = useState(false)
  const [desbloqueandoNumero, setDesbloqueandoNumero] = useState<string | null>(null)
  const [quitandoNumero, setQuitandoNumero] = useState<string | null>(null)

  useEffect(() => {
    if (!error) return undefined
    const temporizador = window.setTimeout(() => setError(''), 5000)
    return () => window.clearTimeout(temporizador)
  }, [error])

  useEffect(() => {
    if (!exito) return undefined
    const temporizador = window.setTimeout(() => setExito(''), 4000)
    return () => window.clearTimeout(temporizador)
  }, [exito])

  const accionConfiableEnCurso = procesandoConfiables || agregandoConfiable || Boolean(quitandoNumero)
  const accionBloqueadaEnCurso = procesandoBloqueados || bloqueando || Boolean(desbloqueandoNumero)

  async function bloquear(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (accionBloqueadaEnCurso) return
    setError('')
    setExito('')
    setBloqueando(true)
    try {
      const resultado = await onBloquear(celularBloqueado, motivo)
      if ('error' in resultado) {
        setError(mensajeError(resultado))
        return
      }
      setCelularBloqueado('')
      setExito('Número bloqueado.')
    } finally {
      setBloqueando(false)
    }
  }

  async function agregarConfiable(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (accionConfiableEnCurso) return
    setError('')
    setExito('')
    setAgregandoConfiable(true)
    try {
      const resultado = await onAgregarConfiable(celularConfiable, aliasConfiable)
      if ('error' in resultado) {
        setError(mensajeError(resultado))
        return
      }
      setCelularConfiable('')
      setAliasConfiable('')
      setExito('Cliente confiable guardado.')
    } finally {
      setAgregandoConfiable(false)
    }
  }

  async function desbloquear(celular: string): Promise<void> {
    if (accionBloqueadaEnCurso) return
    setError('')
    setExito('')
    setDesbloqueandoNumero(celular)
    try {
      const resultado = await onDesbloquear(celular)
      if ('error' in resultado) setError(mensajeError(resultado))
      else setExito('Número desbloqueado.')
    } finally {
      setDesbloqueandoNumero(null)
    }
  }

  async function quitarConfiable(celular: string): Promise<void> {
    if (accionConfiableEnCurso) return
    setError('')
    setExito('')
    setQuitandoNumero(celular)
    try {
      const resultado = await onQuitarConfiable(celular)
      if ('error' in resultado) setError(mensajeError(resultado))
      else setExito('Cliente confiable removido.')
    } finally {
      setQuitandoNumero(null)
    }
  }

  const bloqueadosActivos = bloqueados.filter((numero) => numero.activo)
  const confiablesActivos = confiables.filter((numero) => numero.activo)
  const confiablesVisibles = useMemo(() => {
    const termino = busquedaConfiables.trim().toLocaleLowerCase()
    if (!termino) return confiablesActivos
    return confiablesActivos.filter((numero) =>
      `${numero.alias} ${numero.celular}`.toLocaleLowerCase().includes(termino),
    )
  }, [busquedaConfiables, confiablesActivos])

  return (
    <>
      <section
        id="admin-clientes-confiables"
        className="admin-control-clientes admin-control-clientes-confiables"
        aria-labelledby="titulo-control-clientes-confiables"
      >
        <div className="admin-control-cabecera">
          <div className="admin-control-cabecera-contenido">
            <p className="admin-kicker">Control de clientes</p>
            <h2 id="titulo-control-clientes-confiables">Clientes confiables</h2>
            <p className="admin-control-ayuda">
              Reserva manualmente para clientes que prefieren llamar.
            </p>
          </div>
        </div>

        {(error || exito) && (
          <p className={error ? 'error' : 'exito'} role={error ? 'alert' : 'status'}>
            {error || exito}
          </p>
        )}

        <section className="admin-control-card admin-control-confiables" aria-labelledby="titulo-confiables">
          <div className="admin-control-confiables-cabecera">
            <div>
              <h3 id="titulo-confiables">Clientes confiables</h3>
              <p>Selecciona un cliente para iniciar una reserva a su nombre.</p>
            </div>
          </div>

          <form className="admin-control-form admin-control-form-confiable" onSubmit={(evento) => void agregarConfiable(evento)}>
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
                maxLength={ALIAS_MAXIMO}
                placeholder="Cliente habitual"
                onChange={(evento) => setAliasConfiable(evento.target.value)}
              />
            </label>
            <button className="admin-boton admin-control-primario admin-control-guardar" type="submit" disabled={accionConfiableEnCurso}>
              <UserCheck size={20} strokeWidth={2.5} aria-hidden="true" />
              <span>{agregandoConfiable ? 'Guardando…' : 'Guardar cliente'}</span>
            </button>
          </form>

          <label className="admin-confiables-buscador">
            <span className="sr-only">Buscar clientes confiables</span>
            <Search size={20} strokeWidth={2.4} aria-hidden="true" />
            <input
              type="search"
              value={busquedaConfiables}
              placeholder="Buscar por nombre o celular"
              onChange={(evento) => setBusquedaConfiables(evento.target.value)}
            />
          </label>

          <div className="admin-control-lista admin-confiables-lista" aria-live="polite" aria-busy={cargando}>
            {cargando && confiablesActivos.length === 0 ? <p>Cargando clientes confiables…</p> : confiablesActivos.length === 0 ? (
              <p>No hay clientes confiables.</p>
            ) : confiablesVisibles.length === 0 ? (
              <p>No encontramos clientes con esa búsqueda.</p>
            ) : confiablesVisibles.map((numero) => (
              <article className="admin-confiable-card" key={numero.celular}>
                <div className="admin-confiable-identidad">
                  <span className="admin-confiable-avatar" aria-hidden="true">
                    {numero.alias.trim().charAt(0).toLocaleUpperCase() || '?'}
                  </span>
                  <div>
                    <strong>{numero.alias}</strong>
                    <span>{numero.celular}</span>
                  </div>
                </div>
                <div className="admin-confiable-acciones">
                  <button
                    className="admin-boton admin-confiable-reservar"
                    type="button"
                    disabled={!onNuevaReserva}
                    onClick={() => onNuevaReserva?.(numero)}
                  >
                    <CalendarDays size={18} strokeWidth={2.5} aria-hidden="true" />
                    <span>Reservar</span>
                  </button>
                  <div className="admin-confiable-menu-contenedor">
                    <button
                      className="admin-confiable-mas"
                      type="button"
                      aria-label={`Más acciones para ${numero.alias}`}
                      aria-expanded={menuConfiableAbierto === numero.celular}
                      onClick={() => setMenuConfiableAbierto((actual) => actual === numero.celular ? null : numero.celular)}
                    >
                      <MoreHorizontal size={20} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                    {menuConfiableAbierto === numero.celular && (
                      <div className="admin-confiable-menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          disabled={accionConfiableEnCurso}
                          onClick={() => {
                            setMenuConfiableAbierto(null)
                            void quitarConfiable(numero.celular)
                          }}
                        >
                          {quitandoNumero === numero.celular ? 'Quitando…' : 'Quitar cliente'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

        </section>

      </section>

      <section
        id="admin-clientes-bloqueados"
        className="admin-control-clientes admin-control-clientes-bloqueados"
        aria-labelledby="titulo-control-clientes-bloqueados"
      >
        <div className="admin-control-cabecera">
          <div className="admin-control-cabecera-contenido">
            <p className="admin-kicker">Control de clientes</p>
            <h2 id="titulo-control-clientes-bloqueados">Clientes bloqueados</h2>
            <p className="admin-control-ayuda">
              Administra los números que no pueden reservar por inasistencias.
            </p>
          </div>
        </div>

        <section className="admin-control-card admin-control-bloqueados-card" aria-labelledby="titulo-bloqueados">
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
            <button className="admin-boton admin-control-primario admin-control-guardar" type="submit" disabled={accionBloqueadaEnCurso}>
              <UserX size={20} strokeWidth={2.5} aria-hidden="true" />
              <span>{bloqueando ? 'Guardando…' : 'Bloquear número'}</span>
            </button>
          </form>
          <div className="admin-control-lista" aria-live="polite" aria-busy={cargando}>
            {cargando && bloqueadosActivos.length === 0 ? <p>Cargando números bloqueados…</p> : bloqueadosActivos.length === 0 ? (
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
                  disabled={accionBloqueadaEnCurso}
                  onClick={() => void desbloquear(numero.celular)}
                >
                  {desbloqueandoNumero === numero.celular ? 'Desbloqueando…' : 'Desbloquear'}
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  )
}
