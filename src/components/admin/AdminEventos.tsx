import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarPlus } from 'lucide-react'
import type { BloqueoEvento, Campo } from '../../types.js'
import {
  validarEventoEspecial,
  horarioEntrenamientoQueBloqueaEvento,
  type EventoEspecialNuevo,
  type ResultadoCancelacionEvento,
  type ResultadoEventoEspecial,
} from '../../eventos.js'
import { fechaISO } from '../../reservas.js'
import { horaVisible } from '../../utils/fechasReserva.js'
import AdminEventoCard from './AdminEventoCard'
import { AdminFiltroMenu } from './AdminFiltros'
import AdminSelectorHorario from './AdminSelectorHorario'

export interface AdminEventosProps {
  eventos: readonly BloqueoEvento[]
  canchas: readonly Campo[]
  cargando: boolean
  procesando: boolean
  onCrear: (evento: EventoEspecialNuevo) => Promise<ResultadoEventoEspecial>
  onCancelar: (grupoId: string) => Promise<ResultadoCancelacionEvento>
}

type SeleccionCancha = number | 'futbol'

function horaEntrenamientoVisible(minuto: number): string {
  return horaVisible(minuto / 60)
}

function mensajeError(resultado: ResultadoEventoEspecial | ResultadoCancelacionEvento): string {
  if (!('error' in resultado)) return ''
  if (resultado.error === 'entrenamiento-ocupado') {
    const horario = 'entrenamiento' in resultado ? resultado.entrenamiento : undefined
    return horario
      ? `No es posible reservar estas horas porque hay entrenamiento de ${horaEntrenamientoVisible(horario.inicioMinuto)} a ${horaEntrenamientoVisible(horario.finMinuto)}.`
      : 'No es posible reservar estas horas porque hay un entrenamiento programado.'
  }
  if (resultado.error === 'ocupado') return 'Ese rango ya está ocupado por una reserva u otro evento.'
  if (resultado.error === 'datos-invalidos') return 'Revisa los datos: el evento debe durar al menos 5 horas.'
  if (resultado.error === 'no-existe') return 'Ese evento ya no existe o ya fue cancelado.'
  return 'No pudimos guardar el evento. Revisa la conexión e inténtalo de nuevo.'
}

function opcionesHora(desde: number, hasta: number): number[] {
  return Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, indice) => desde + indice)
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
  cargando,
  procesando,
  onCrear,
  onCancelar,
}: AdminEventosProps) {
  const [canchaId, setCanchaId] = useState<SeleccionCancha>(canchas[0]?.id ?? 1)
  const [fecha, setFecha] = useState(fechaISO(new Date()))
  const [inicio, setInicio] = useState('7')
  const [fin, setFin] = useState('12')
  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [notas, setNotas] = useState('')
  const [precioCobrado, setPrecioCobrado] = useState('0')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)

  useEffect(() => {
    if (!exito) return undefined
    const temporizador = window.setTimeout(() => setExito(''), 3000)
    return () => window.clearTimeout(temporizador)
  }, [exito])

  const inicioNumero = Number(inicio)
  const finalesDisponibles = useMemo(
    () => opcionesHora(inicioNumero + 5, 25),
    [inicioNumero],
  )
  const opcionesCampo = [
    { value: 'futbol', label: 'Todos los campos de fútbol' },
    ...canchas.map((cancha) => ({ value: String(cancha.id), label: cancha.nombre })),
  ]
  const opcionesDesde = opcionesHora(7, 20).map((hora) => ({ value: String(hora), label: horaVisible(hora) }))
  const opcionesHasta = finalesDisponibles.map((hora) => ({ value: String(hora), label: horaVisible(hora) }))

  function cambiarInicio(valor: string): void {
    const nuevoInicio = Number(valor)
    setInicio(valor)
    if (Number(fin) < nuevoInicio + 5) setFin(String(nuevoInicio + 5))
  }

  async function crear(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (guardandoRef.current) return
    guardandoRef.current = true
    setGuardando(true)
    try {
      setError('')
      setExito('')
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
        setError(mensajeError(resultado))
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

  const activos = eventos.filter((evento) => evento.estado === 'activo')
  const activosAgrupados = agruparEventosEspeciales(activos)

  return (
    <section className="admin-eventos" aria-labelledby="titulo-eventos">
      <div className="admin-eventos-cabecera">
        <div>
          <p className="admin-kicker">Reservas especiales</p>
          <h2 id="titulo-eventos">Bloquear horas para eventos</h2>
          <p className="admin-eventos-ayuda">
            Úsalo para torneos o eventos de 5 horas o más. El cliente verá esas horas como no disponibles.
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
        <button className="admin-boton admin-control-primario admin-eventos-guardar" type="submit" disabled={procesando || guardando}>
          <CalendarPlus size={20} strokeWidth={2.5} aria-hidden="true" />
          <span>{procesando || guardando ? 'Guardando…' : 'Crear evento especial'}</span>
        </button>
      </form>

      <div className="admin-eventos-lista" aria-live="polite">
        <h3>Eventos activos</h3>
        {cargando ? <p>Cargando eventos…</p> : activos.length === 0 ? <p>No hay eventos especiales activos.</p> : activosAgrupados.map((grupo) => (
          <AdminEventoCard
            key={grupo.map((evento) => evento.id).join('-')}
            eventos={grupo}
            canchas={canchas}
            procesando={procesando}
            onCancel={cancelar}
          />
        ))}
      </div>
    </section>
  )
}
