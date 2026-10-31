import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Ban, CalendarDays, CalendarPlus, CheckCircle2 } from 'lucide-react'
import type { BloqueoEvento, Campo, Reserva } from '../../types.js'
import {
  validarEventoEspecial,
  horarioEntrenamientoQueBloqueaEvento,
  buscarConflictosEvento,
  eventoYaTermino,
  type EventoEspecialNuevo,
  type EventoEspecialActualizado,
  type ResultadoCancelacionEvento,
  type ResultadoEventoEspecial,
} from '../../eventos.js'
import { fechaISO } from '../../reservas.js'
import { horaVisible } from '../../utils/fechasReserva.js'
import AdminEventoCard from './AdminEventoCard'
import AdminModalEditarEvento from './AdminModalEditarEvento'
import { AdminFiltroMenu } from './AdminFiltros'
import AdminSelectorHorario from './AdminSelectorHorario'

export interface AdminEventosProps {
  eventos: readonly BloqueoEvento[]
  canchas: readonly Campo[]
  reservas?: readonly Reserva[]
  cargando: boolean
  procesando: boolean
  onCrear: (evento: EventoEspecialNuevo) => Promise<ResultadoEventoEspecial>
  onCancelar: (grupoId: string) => Promise<ResultadoCancelacionEvento>
  onEditar?: (actualizado: EventoEspecialActualizado) => Promise<ResultadoEventoEspecial>
}

type SeleccionCancha = number | 'futbol'

function horaEntrenamientoVisible(minuto: number): string {
  return horaVisible(minuto / 60)
}

function mensajeError(
  resultado: ResultadoEventoEspecial | ResultadoCancelacionEvento,
  canchas?: readonly Campo[],
): string {
  if (!('error' in resultado)) return ''
  if (resultado.error === 'entrenamiento-ocupado') {
    const horario = 'entrenamiento' in resultado ? resultado.entrenamiento : undefined
    return horario
      ? `No es posible reservar estas horas porque hay entrenamiento de ${horaEntrenamientoVisible(horario.inicioMinuto)} a ${horaEntrenamientoVisible(horario.finMinuto)}.`
      : 'No es posible reservar estas horas porque hay un entrenamiento programado.'
  }
  if (resultado.error === 'ocupado') {
    if ('detalleReserva' in resultado && resultado.detalleReserva) {
      const cancha = canchas?.find((c) => c.id === resultado.detalleReserva?.canchaId)
      const nombreCancha = cancha?.nombre ?? `Campo ${resultado.detalleReserva.canchaId}`
      const hora = horaVisible(resultado.detalleReserva.inicio)
      return `No es posible crear el evento: ese horario ya está ocupado por la reserva de ${resultado.detalleReserva.cliente} en ${nombreCancha} a las ${hora}.`
    }
    return 'Ese rango ya está ocupado por una reserva u otro evento.'
  }
  if (resultado.error === 'datos-invalidos') return 'Revisa los datos del evento.'
  if (resultado.error === 'no-existe') return 'Ese evento ya no existe o ya fue cancelado.'
  return 'No pudimos guardar el evento. Revisa la conexión e inténtalo de nuevo.'
}

function opcionesHora(desde: number, hasta: number, paso = 0.5): number[] {
  return Array.from(
    { length: Math.max(0, Math.round((hasta - desde) / paso) + 1) },
    (_, indice) => Math.round((desde + indice * paso) * 10) / 10,
  )
}

export function agruparEventosEspeciales(eventos: readonly BloqueoEvento[]): BloqueoEvento[][] {
  const grupos = new Map<string, BloqueoEvento[]>()
  for (const evento of eventos) {
    const clave = evento.grupoId?.trim() || evento.id
    const grupo = grupos.get(clave) ?? []
    grupo.push(evento)
    grupos.set(clave, grupo)
  }
  return [...grupos.values()]
}

export default function AdminEventos({
  eventos,
  canchas,
  reservas = [],
  cargando,
  procesando,
  onCrear,
  onCancelar,
  onEditar,
}: AdminEventosProps) {
  const [canchaId, setCanchaId] = useState<SeleccionCancha>(canchas[0]?.id ?? 1)
  const [fecha, setFecha] = useState(fechaISO(new Date()))
  const [inicio, setInicio] = useState('7')
  const [fin, setFin] = useState('9')
  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [notas, setNotas] = useState('')
  const [precioCobrado, setPrecioCobrado] = useState('0')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)
  const [eventoAEditar, setEventoAEditar] = useState<readonly BloqueoEvento[] | null>(null)
  const [filtroPill, setFiltroPill] = useState<'activos' | 'finalizados' | 'cancelados'>('activos')

  useEffect(() => {
    if (!exito) return undefined
    const temporizador = window.setTimeout(() => setExito(''), 3000)
    return () => window.clearTimeout(temporizador)
  }, [exito])

  const inicioNumero = Number(inicio)
  const finalesDisponibles = useMemo(
    () => opcionesHora(inicioNumero + 2, 25, 0.5),
    [inicioNumero],
  )
  const opcionesCampo = [
    { value: 'futbol', label: 'Todos los campos de fútbol' },
    ...canchas.map((cancha) => ({ value: String(cancha.id), label: cancha.nombre })),
  ]
  const opcionesDesde = opcionesHora(7, 23, 0.5).map((hora) => ({ value: String(hora), label: horaVisible(hora) }))
  const opcionesHasta = finalesDisponibles.map((hora) => ({ value: String(hora), label: horaVisible(hora) }))

  function cambiarInicio(valor: string): void {
    const nuevoInicio = Number(valor)
    setInicio(valor)
    if (Number(fin) < nuevoInicio + 2) setFin(String(nuevoInicio + 2))
  }

  const activos = eventos.filter((evento) => evento.estado === 'activo')
  const activosAgrupados = agruparEventosEspeciales(activos)
  const cancelados = eventos.filter((evento) => evento.estado === 'cancelado')
  const canceladosAgrupados = useMemo(() => {
    const grupos = agruparEventosEspeciales(cancelados)
    grupos.sort((a, b) => (b[0]?.fecha ?? '').localeCompare(a[0]?.fecha ?? '') || (b[0]?.inicio ?? 0) - (a[0]?.inicio ?? 0))
    return grupos
  }, [cancelados])
  const ahora = useMemo(() => new Date(), [])
  const { proximosAgrupados, concluidosAgrupados } = useMemo(() => {
    const prox: BloqueoEvento[][] = []
    const conc: BloqueoEvento[][] = []
    for (const grupo of activosAgrupados) {
      const principal = grupo[0]
      if (principal && eventoYaTermino(principal, ahora)) {
        conc.push(grupo)
      } else {
        prox.push(grupo)
      }
    }
    prox.sort((a, b) => (a[0]?.fecha ?? '').localeCompare(b[0]?.fecha ?? '') || (a[0]?.inicio ?? 0) - (b[0]?.inicio ?? 0))
    conc.sort((a, b) => (b[0]?.fecha ?? '').localeCompare(a[0]?.fecha ?? '') || (b[0]?.inicio ?? 0) - (a[0]?.inicio ?? 0))
    return { proximosAgrupados: prox, concluidosAgrupados: conc }
  }, [activosAgrupados, ahora])

  const idsCanchaSeleccionadas = useMemo(() => (
    canchaId === 'futbol'
      ? canchas.filter((cancha) => cancha.deporte.startsWith('Fútbol')).map((cancha) => cancha.id)
      : [canchaId]
  ), [canchaId, canchas])

  const finNumero = Number(fin)

  const conflictos = useMemo(() => {
    return buscarConflictosEvento(
      idsCanchaSeleccionadas,
      fecha,
      inicioNumero,
      finNumero,
      reservas,
      activos,
      canchas,
    )
  }, [idsCanchaSeleccionadas, fecha, inicioNumero, finNumero, reservas, activos, canchas])

  const hayConflictos = conflictos.reservas.length > 0 || conflictos.eventos.length > 0

  async function crear(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (guardandoRef.current) return
    guardandoRef.current = true
    setGuardando(true)
    try {
      setError('')
      setExito('')
      if (conflictos.reservas.length > 0) {
        const primera = conflictos.reservas[0]
        setError(
          `No es posible crear el evento: ese horario ya está ocupado por la reserva de ${primera.cliente} en ${primera.canchaNombre} (${primera.horarioTexto}). Reprograma o cancela primero la reserva en conflicto.`
        )
        return
      }
      if (conflictos.eventos.length > 0) {
        const primero = conflictos.eventos[0]
        setError(
          `No es posible crear el evento: coincide con el evento especial "${primero.nombre}" en ${primero.canchaNombre} (${primero.horarioTexto}).`
        )
        return
      }
      const idsCanchaSeleccionadas = canchaId === 'futbol'
        ? canchas.filter((cancha) => cancha.deporte.startsWith('Fútbol')).map((cancha) => cancha.id)
        : [canchaId]
      const nuevo: EventoEspecialNuevo = {
        canchaIds: idsCanchaSeleccionadas,
        fecha,
        inicio: inicioNumero,
        fin: Number(fin),
        nombre: nombre.trim(),
        celular: celular.trim(),
        notas: notas.trim(),
        tipo: canchaId === 'futbol' ? 'todos_los_campos' : 'individual',
        precioCobrado: Number(precioCobrado),
      }

      if (!validarEventoEspecial(nuevo)) {
        setError(mensajeError({ error: 'datos-invalidos' }))
        return
      }
      for (const id of idsCanchaSeleccionadas) {
        const entrenamiento = horarioEntrenamientoQueBloqueaEvento({
          canchaId: id,
          fecha: nuevo.fecha,
          inicio: nuevo.inicio,
          fin: nuevo.fin,
        })
        if (entrenamiento) {
          setError(mensajeError({ error: 'entrenamiento-ocupado', entrenamiento }))
          return
        }
      }

      const resultado = await onCrear(nuevo)
      if ('error' in resultado) {
        setError(mensajeError(resultado, canchas))
        return
      }
      setError('')
      setNombre('')
      setCelular('')
      setNotas('')
      setPrecioCobrado('0')
      setExito(canchaId === 'futbol'
        ? 'Evento guardado en todos los campos de fútbol. Esas horas ya no aparecen disponibles para los clientes.'
        : 'Evento guardado. Esas horas ya no aparecen disponibles para los clientes.')
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  async function cancelar(grupoId: string): Promise<void> {
    setError('')
    setExito('')
    const resultado = await onCancelar(grupoId)
    if ('error' in resultado) {
      setError(mensajeError(resultado))
      return
    }
    setExito('Evento cancelado. El horario puede volver a reservarse.')
  }

  return (
    <section className="admin-eventos" aria-labelledby="titulo-eventos">
      <div className="admin-eventos-cabecera">
        <div>
          <p className="admin-kicker">Reservas especiales</p>
          <h2 id="titulo-eventos">Bloquear horas para eventos</h2>
          <p className="admin-eventos-ayuda">
            Úsalo para torneos o eventos especiales (mínimo 2 horas). El cliente verá esas horas como no disponibles.
          </p>
        </div>
      </div>

      {(error || exito) && (
        <p className={error ? 'error' : 'exito'} role={error ? 'alert' : 'status'}>
          {error || exito}
        </p>
      )}

      <form className="admin-eventos-form" onSubmit={(evento) => void crear(evento)}>
        <AdminFiltroMenu
          id="evento-campo"
          label="Campo"
          value={String(canchaId)}
          opciones={opcionesCampo}
          onChange={(valor) => setCanchaId(valor === 'futbol' ? 'futbol' : Number(valor))}
        />
        <label>
          <span>Fecha</span>
          <input type="date" value={fecha} min={fechaISO(new Date())} required onChange={(evento) => setFecha(evento.target.value)} />
        </label>
        <AdminSelectorHorario
          inicio={inicio}
          fin={fin}
          opcionesDesde={opcionesDesde}
          opcionesHasta={opcionesHasta}
          onChangeInicio={cambiarInicio}
          onChangeFin={setFin}
        />
        <label>
          <span>Nombre del evento</span>
          <input value={nombre} required maxLength={80} placeholder="Ej.: torneo escolar" onChange={(evento) => setNombre(evento.target.value)} />
        </label>
        <label>
          <span>Precio cobrado</span>
          <input type="number" min="0" step="0.01" inputMode="decimal" value={precioCobrado} required onChange={(evento) => setPrecioCobrado(evento.target.value)} />
        </label>
        <label>
          <span>Celular (opcional)</span>
          <input type="tel" inputMode="numeric" value={celular} maxLength={9} placeholder="987654321" onChange={(evento) => setCelular(evento.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="admin-eventos-notas">
          <span>Notas (opcional)</span>
          <textarea value={notas} maxLength={240} rows={2} placeholder="Información para el encargado" onChange={(evento) => setNotas(evento.target.value)} />
        </label>
        {hayConflictos && (
          <div className="admin-eventos-conflicto" role="alert">
            <div className="admin-eventos-conflicto-titulo">
              <AlertTriangle size={18} strokeWidth={2.5} aria-hidden="true" />
              <h4>
                {conflictos.reservas.length > 0 && conflictos.eventos.length > 0
                  ? `Conflicto: ${conflictos.reservas.length} reserva(s) y ${conflictos.eventos.length} evento(s) en este horario`
                  : conflictos.reservas.length > 0
                    ? `Conflicto con ${conflictos.reservas.length} reserva(s) de clientes en este horario`
                    : `Conflicto con ${conflictos.eventos.length} evento(s) especial(es) en este horario`}
              </h4>
            </div>

            {conflictos.reservas.length > 0 && (
              <div className="admin-eventos-conflicto-seccion">
                <span className="admin-eventos-conflicto-subtitulo">Reservas afectadas:</span>
                <ul className="admin-eventos-conflicto-lista">
                  {conflictos.reservas.map((item) => (
                    <li key={item.id} className="admin-eventos-conflicto-item">
                      <span className="admin-eventos-conflicto-campo">{item.canchaNombre}</span>
                      <span className="admin-eventos-conflicto-horario">{item.horarioTexto}</span>
                      <span className="admin-eventos-conflicto-cliente">
                        <strong>{item.cliente}</strong> · Cel: {item.celular}
                      </span>
                      <span className={`admin-eventos-conflicto-badge estado-${item.estado}`}>
                        {item.estado === 'confirmado' ? 'Confirmada' : item.estado === 'pendiente' ? 'Pendiente' : item.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {conflictos.eventos.length > 0 && (
              <div className="admin-eventos-conflicto-seccion">
                <span className="admin-eventos-conflicto-subtitulo">Eventos coincidentes:</span>
                <ul className="admin-eventos-conflicto-lista">
                  {conflictos.eventos.map((item) => (
                    <li key={item.id} className="admin-eventos-conflicto-item">
                      <span className="admin-eventos-conflicto-campo">{item.canchaNombre}</span>
                      <span className="admin-eventos-conflicto-horario">{item.horarioTexto}</span>
                      <span className="admin-eventos-conflicto-cliente">
                        <strong>{item.nombre}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="admin-eventos-conflicto-aviso">
              Para bloquear estas horas para el evento, primero debes contactar a los clientes y cancelar o reprogramar sus reservas.
            </p>
          </div>
        )}

        <button className="admin-boton admin-control-primario admin-eventos-guardar" type="submit" disabled={procesando || guardando}>
          <CalendarPlus size={20} strokeWidth={2.5} aria-hidden="true" />
          <span>{procesando || guardando ? 'Guardando…' : 'Crear evento especial'}</span>
        </button>
      </form>

      <div className="admin-eventos-lista" aria-live="polite">
        <div className="admin-eventos-lista-cabecera">
          <div className="admin-eventos-lista-titulos">
            <h3>Eventos especiales</h3>
            <p className="admin-eventos-lista-subtitulo">
              Consulta y gestiona los eventos activos y el historial de eventos concluidos.
            </p>
          </div>

          <div className="admin-eventos-pills" role="tablist" aria-label="Filtrar eventos especiales">
            <button
              type="button"
              role="tab"
              aria-selected={filtroPill === 'activos'}
              className={`admin-eventos-pill ${filtroPill === 'activos' ? 'activa' : ''}`}
              onClick={() => setFiltroPill('activos')}
            >
              <CalendarDays size={16} aria-hidden="true" />
              <span>Eventos activos</span>
              <span className="admin-eventos-pill-badge">{proximosAgrupados.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filtroPill === 'finalizados'}
              className={`admin-eventos-pill ${filtroPill === 'finalizados' ? 'activa' : ''}`}
              onClick={() => setFiltroPill('finalizados')}
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Eventos finalizados</span>
              <span className="admin-eventos-pill-badge">{concluidosAgrupados.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filtroPill === 'cancelados'}
              className={`admin-eventos-pill ${filtroPill === 'cancelados' ? 'activa' : ''}`}
              onClick={() => setFiltroPill('cancelados')}
            >
              <Ban size={16} aria-hidden="true" />
              <span>Cancelados</span>
              <span className="admin-eventos-pill-badge">{canceladosAgrupados.length}</span>
            </button>
          </div>
        </div>

        {cargando ? (
          <p>Cargando eventos…</p>
        ) : filtroPill === 'activos' ? (
          proximosAgrupados.length === 0 ? (
            <p className="admin-eventos-vacio">No hay eventos especiales activos.</p>
          ) : (
            proximosAgrupados.map((grupo) => (
              <AdminEventoCard
                key={grupo.map((evento) => evento.id).join('-')}
                eventos={grupo}
                canchas={canchas}
                procesando={procesando}
                onCancel={cancelar}
                onEditar={onEditar ? (grupo) => setEventoAEditar(grupo) : undefined}
                ahora={ahora}
              />
            ))
          )
        ) : filtroPill === 'finalizados' ? (
          concluidosAgrupados.length === 0 ? (
            <p className="admin-eventos-vacio">No hay eventos especiales finalizados.</p>
          ) : (
            concluidosAgrupados.map((grupo) => (
              <AdminEventoCard
                key={grupo.map((evento) => evento.id).join('-')}
                eventos={grupo}
                canchas={canchas}
                procesando={procesando}
                onCancel={cancelar}
                onEditar={onEditar ? (grupo) => setEventoAEditar(grupo) : undefined}
                ahora={ahora}
              />
            ))
          )
        ) : (
          canceladosAgrupados.length === 0 ? (
            <p className="admin-eventos-vacio">No hay eventos especiales cancelados.</p>
          ) : (
            canceladosAgrupados.map((grupo) => (
              <AdminEventoCard
                key={grupo.map((evento) => evento.id).join('-')}
                eventos={grupo}
                canchas={canchas}
                procesando={procesando}
                onCancel={cancelar}
                onEditar={onEditar ? (grupo) => setEventoAEditar(grupo) : undefined}
                ahora={ahora}
              />
            ))
          )
        )}
      </div>

      {eventoAEditar && onEditar && (
        <AdminModalEditarEvento
          eventos={eventoAEditar}
          canchas={canchas}
          reservas={reservas}
          todosLosEventos={eventos}
          procesando={procesando}
          onClose={() => setEventoAEditar(null)}
          onGuardar={async (actualizado) => {
            const res = await onEditar(actualizado)
            if (!('error' in res)) {
              setExito('Evento especial actualizado correctamente.')
            }
            return res
          }}
        />
      )}
    </section>
  )
}
