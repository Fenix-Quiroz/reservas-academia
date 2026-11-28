import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Gift,
  HelpCircle,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import AdminMarca from './AdminMarca'
import AdminHistorialClientes from './AdminHistorialClientes'
import type { Reserva } from '../../types'
import {
  DATOS_SORTEO_DEMO,
  crearParticipantesDemo,
  crearTicketsDemo,
  ventanaSlot,
  type TicketSorteo,
} from '../../sorteoDemo'
import { crearParticipantesDesdeTickets, prepararSorteoReal } from '../../sorteoReal'
import { ejecutarSorteoRemoto, type ResumenSorteo, type ResultadoSorteoRemoto } from '../../sorteoSupabase'
import {
  INICIO_DESACELERACION_GIRO_DEMO_MS,
  INTERVALO_GIRO_RAPIDO_DEMO_MS,
  calcularIntervaloGiroDemo,
  calcularSaltoRapidoGiroDemo,
  crearIntervalosDesaceleracionDemo,
  crearRutaGiroDemo,
} from '../../sorteoConfiguracion'

export interface AdminSorteosVistaProps {
  onVolver: () => void
  reservas: readonly Reserva[]
  ultimoSorteo: ResumenSorteo | null
  ultimoGanador: TicketSorteo | null
  onSorteoEjecutado: (resultado: ResultadoSorteoRemoto) => void
  supabaseConfigurado: boolean
  cargandoDatos: boolean
  errorDatos?: string
}

function reproducirSonidoTick(frecuencia = 420, duracion = 0.025): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(frecuencia, ctx.currentTime)
    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duracion)
  } catch {
    // El navegador puede bloquear Web Audio hasta que exista interacción.
  }
}

function reproducirSonidoVictoria(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const notas = [523.25, 659.25, 783.99, 1046.5]
    notas.forEach((frecuencia, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const inicio = ctx.currentTime + index * 0.09
      osc.type = 'sine'
      osc.frequency.setValueAtTime(frecuencia, inicio)
      gain.gain.setValueAtTime(0.1, inicio)
      gain.gain.exponentialRampToValueAtTime(0.001, inicio + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(inicio)
      osc.stop(inicio + 0.45)
    })
  } catch {
    // El sonido es decorativo y no debe bloquear el sorteo demo.
  }
}

function formatearPorcentaje(valor: number): string {
  return `${valor.toFixed(1)}%`
}

function formatearCorteSorteo(hasta: string | null | undefined): string {
  if (!hasta) return 'Al girar'
  const fecha = new Date(hasta)
  if (Number.isNaN(fecha.getTime())) return 'Al girar'
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long' }).format(fecha)
}

type PosicionTicketSlot = 'anterior-2' | 'anterior' | 'actual' | 'siguiente' | 'siguiente-2'

const POSICIONES_TICKET_SLOT: PosicionTicketSlot[] = ['anterior-2', 'anterior', 'actual', 'siguiente', 'siguiente-2']

function TicketSlot({ ticket, posicion, ganador, nombreVisible }: {
  ticket: TicketSorteo
  posicion: PosicionTicketSlot
  ganador: boolean
  nombreVisible?: string
}) {
  const nombreMostrado = nombreVisible ?? ticket.nombre

  return (
    <article className={`sorteo-slot-ticket sorteo-slot-ticket-${posicion} ${ganador ? 'sorteo-slot-ticket-ganador' : ''}`}>
      <div className="sorteo-slot-ticket-topline">
        <span className="sorteo-slot-ticket-label">
          <Ticket size={15} aria-hidden="true" />
          Ticket
        </span>
        <span className="sorteo-slot-ticket-order">
          {ticket.ticketIndex}/{ticket.totalTickets}
        </span>
      </div>
      <strong className="sorteo-slot-ticket-number">#{ticket.numeroGlobal}</strong>
      <span className="sorteo-slot-ticket-name">{nombreMostrado}</span>
      <span className="sorteo-slot-ticket-phone">{ticket.celular}</span>
    </article>
  )
}

export default function AdminSorteosVista({
  onVolver,
  reservas,
  ultimoSorteo,
  ultimoGanador,
  onSorteoEjecutado,
  supabaseConfigurado,
  cargandoDatos,
  errorDatos,
}: AdminSorteosVistaProps) {
  const [girando, setGirando] = useState(false)
  const [ganador, setGanador] = useState<TicketSorteo | null>(null)
  const [resultadoRemoto, setResultadoRemoto] = useState<ResultadoSorteoRemoto | null>(null)
  const [errorSorteo, setErrorSorteo] = useState('')
  const [indiceVisible, setIndiceVisible] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true)
  const [tabActual, setTabActual] = useState<'sorteo' | 'historial'>('sorteo')
  const temporizadorPasoGiroRef = useRef<number | null>(null)

  const hastaVista = useMemo(() => new Date().toISOString(), [reservas, ultimoSorteo?.id])
  const preparacionReal = useMemo(
    () => prepararSorteoReal(reservas, ultimoSorteo?.hasta, hastaVista),
    [reservas, hastaVista, ultimoSorteo?.hasta],
  )
  const participantesDemo = useMemo(() => crearParticipantesDemo(DATOS_SORTEO_DEMO), [])
  const ticketsDemo = useMemo(() => crearTicketsDemo(participantesDemo), [participantesDemo])
  const participantesRemotos = useMemo(
    () => resultadoRemoto ? crearParticipantesDesdeTickets(resultadoRemoto.tickets) : null,
    [resultadoRemoto],
  )
  const participantes = participantesRemotos ?? (supabaseConfigurado ? preparacionReal.participantes : participantesDemo)
  const tickets = resultadoRemoto?.tickets ?? (supabaseConfigurado ? preparacionReal.tickets : ticketsDemo)
  const ticketsSlot = useMemo(() => ventanaSlot(tickets, indiceVisible), [tickets, indiceVisible])
  const totalTickets = tickets.length
  const totalParticipantes = participantes.length
  const promedioTickets = totalParticipantes > 0 ? (totalTickets / totalParticipantes).toFixed(1) : '0.0'
  const ganadorVisible = ganador ?? (!girando && supabaseConfigurado ? ultimoGanador : null)
  const ganadorHistorico = Boolean(!ganador && ganadorVisible)
  const clienteGanador = ganadorVisible ? participantes.find((participante) => participante.cliente.id === ganadorVisible.clienteId) : null
  const textoCorte = supabaseConfigurado ? formatearCorteSorteo(ultimoSorteo?.hasta) : '24 diciembre'
  const etiquetaCorte = supabaseConfigurado ? (ultimoSorteo ? 'último corte' : 'corte al ejecutar') : 'cierre'

  function limpiarTemporizadores(): void {
    if (temporizadorPasoGiroRef.current !== null) window.clearTimeout(temporizadorPasoGiroRef.current)
    temporizadorPasoGiroRef.current = null
  }

  useEffect(() => () => limpiarTemporizadores(), [])

  async function girarSorteo(): Promise<void> {
    if (cargandoDatos || errorDatos || girando || tickets.length === 0 || (supabaseConfigurado && resultadoRemoto)) return

    limpiarTemporizadores()
    setGirando(true)
    setGanador(null)
    setErrorSorteo('')

    let ticketsParaGiro = tickets
    let indiceGanador = 0

    if (supabaseConfigurado) {
      try {
        const resultado = await ejecutarSorteoRemoto()
        ticketsParaGiro = resultado.tickets
        indiceGanador = ticketsParaGiro.findIndex((ticket) => ticket.id === resultado.ganador.id)
        if (indiceGanador < 0 || ticketsParaGiro.length === 0) throw new Error('ganador-no-encontrado')
        setResultadoRemoto(resultado)
        onSorteoEjecutado(resultado)
      } catch {
        setGirando(false)
        setErrorSorteo('No se pudo ejecutar el sorteo. Verifica que la migración SQL esté aplicada y vuelve a intentarlo.')
        return
      }
    } else {
      indiceGanador = Math.floor(Math.random() * tickets.length)
    }

    const indiceInicial = ((indiceVisible % ticketsParaGiro.length) + ticketsParaGiro.length) % ticketsParaGiro.length
    setIndiceVisible(indiceInicial)
    const rutaGiro = crearRutaGiroDemo(indiceInicial, indiceGanador, ticketsParaGiro.length)
    const intervalosDesaceleracion = crearIntervalosDesaceleracionDemo()
    let indiceActual = indiceInicial
    let pasoRapido = 0
    let pasoDesaceleracion = 0
    const inicioGiro = performance.now()

    const avanzarSlot = (): void => {
      const transcurrido = performance.now() - inicioGiro

      if (transcurrido < INICIO_DESACELERACION_GIRO_DEMO_MS) {
        indiceActual = (indiceActual + calcularSaltoRapidoGiroDemo(ticketsParaGiro.length, pasoRapido)) % ticketsParaGiro.length
        setIndiceVisible(indiceActual)
        if (sonidoHabilitado && pasoRapido % 5 === 0) reproducirSonidoTick(440 + (pasoRapido % 3) * 50)
        pasoRapido += 1

        const tiempoRestanteRapido = INICIO_DESACELERACION_GIRO_DEMO_MS - transcurrido
        temporizadorPasoGiroRef.current = window.setTimeout(
          avanzarSlot,
          Math.min(INTERVALO_GIRO_RAPIDO_DEMO_MS, Math.max(1, tiempoRestanteRapido)),
        )
        return
      }

      const paso = rutaGiro[pasoDesaceleracion]
      if (!paso) return

      indiceActual = paso.indice
      setIndiceVisible(indiceActual)
      if (sonidoHabilitado) reproducirSonidoTick(420 + (pasoDesaceleracion % 4) * 35, 0.035)
      pasoDesaceleracion += 1

      if (pasoDesaceleracion >= rutaGiro.length) {
        setGanador(ticketsParaGiro[indiceGanador] ?? null)
        setGirando(false)
        temporizadorPasoGiroRef.current = null
        if (sonidoHabilitado) reproducirSonidoVictoria()
        return
      }

      const progresoDesaceleracion = pasoDesaceleracion / (rutaGiro.length - 1)
      const intervaloBase = intervalosDesaceleracion[pasoDesaceleracion - 1]
      const intervalo = intervaloBase ?? calcularIntervaloGiroDemo(progresoDesaceleracion)
      temporizadorPasoGiroRef.current = window.setTimeout(avanzarSlot, intervalo)
    }

    avanzarSlot()
  }

  function reiniciarSorteo(): void {
    limpiarTemporizadores()
    setGirando(false)
    setGanador(null)
    setIndiceVisible(0)
  }

  async function copiarListaTickets(): Promise<void> {
    const texto = participantes
      .map((participante) => `${participante.cliente.nombre} (${participante.cliente.celular}) - ${participante.tickets} tickets (${formatearPorcentaje(participante.probabilidad)})`)
      .join('\n')
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    window.setTimeout(() => setCopiado(false), 3000)
  }

  const ticketCentral = ticketsSlot[2]

  return (
    <main className="admin-app admin-sorteos-app sorteo-page">
      <header className="sorteo-page-header">
        <div className="sorteo-page-brand">
          <AdminMarca />
          <div className="sorteo-page-heading">
            <span className="sorteo-page-eyebrow">Módulo independiente</span>
            <h1>Sorteo de clientes frecuentes</h1>
          </div>
        </div>

        <div className="sorteo-page-header-actions">
          <span className="sorteo-demo-badge"><span aria-hidden="true" /> {supabaseConfigurado ? 'Datos reales' : 'Modo demo'}</span>
          <button type="button" className="sorteo-header-button" onClick={onVolver}>
            <ArrowLeft size={17} aria-hidden="true" />
            Volver al panel
          </button>
          <a className="sorteo-header-link" href="/">Vista del cliente</a>
        </div>
      </header>

      <section className="sorteo-main-grid sorteo-main-grid-slot-first" aria-label="Sorteo y detalles de campaña">
        <article className="sorteo-slot-panel">
          <div className="sorteo-section-heading">
            <div>
              <span className="sorteo-panel-kicker">El momento del sorteo</span>
              <h2>Gira el slot y descubre el ticket</h2>
            </div>
            <button
              type="button"
              className="sorteo-sound-button"
              onClick={() => setSonidoHabilitado((actual) => !actual)}
              title={sonidoHabilitado ? 'Silenciar efectos' : 'Activar efectos de sonido'}
            >
              {sonidoHabilitado ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {sonidoHabilitado ? 'Sonido activo' : 'Sonido apagado'}
            </button>
          </div>

          <div className={`sorteo-slot-machine ${girando ? 'sorteo-slot-machine-girando' : ''}`}>
            <div className="sorteo-slot-machine-topline">
              <span><span className="sorteo-slot-light" /> SLOT DE TICKETS</span>
              <span>{girando ? 'SELECCIONANDO…' : 'LISTO PARA GIRAR'}</span>
            </div>

            <div className="sorteo-slot-frame">
              <div className="sorteo-slot-pointer" aria-hidden="true" />
              <div className="sorteo-slot-viewport" aria-live="polite" aria-label="Ticket seleccionado">
                <div className="sorteo-slot-focus-window" aria-hidden="true" />
                {ticketsSlot.length === 0 ? (
                  <div className="sorteo-slot-empty">
                    {errorDatos ? 'No se pudieron cargar los tickets' : cargandoDatos ? 'Cargando reservas reales…' : 'No hay tickets elegibles'}
                  </div>
                ) : (
                  <div className="sorteo-slot-ticket-stack">
                    {ticketsSlot.map((ticket, index) => (
                      <TicketSlot
                        key={`${ticket.id}-${index}-${indiceVisible}`}
                        ticket={ticket}
                        posicion={POSICIONES_TICKET_SLOT[index] ?? 'actual'}
                        ganador={Boolean(ganador && ticket.id === ganador.id && index === 2)}
                        nombreVisible={ganador && ticket.id === ganador.id
                          ? participantes.find((participante) => participante.cliente.id === ticket.clienteId)?.cliente.nombre ?? ticket.nombre
                          : ticket.nombre}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sorteo-slot-current-caption">
              <span>{girando ? 'Buscando entre todos los tickets' : ganador ? 'Resultado del sorteo' : 'Ticket bajo el puntero'}</span>
              <strong>{ticketCentral ? `Ticket #${ticketCentral.numeroGlobal}` : '—'}</strong>
            </div>
          </div>

          <div className="sorteo-slot-actions">
            <button
              type="button"
              className="sorteo-primary-action"
              onClick={() => void girarSorteo()}
              disabled={cargandoDatos || Boolean(errorDatos) || girando || tickets.length === 0 || (supabaseConfigurado && Boolean(resultadoRemoto))}
            >
              <Sparkles size={19} aria-hidden="true" />
              {girando ? 'Girando el sorteo…' : resultadoRemoto ? 'Sorteo guardado' : ganador ? 'Girar de nuevo' : 'Girar sorteo'}
            </button>
            {ganador && !supabaseConfigurado && (
              <button type="button" className="sorteo-secondary-action" onClick={reiniciarSorteo} disabled={girando}>
                <RotateCcw size={16} aria-hidden="true" />
                Reiniciar
              </button>
            )}
          </div>
        </article>

        <aside className="sorteo-side-column">
          {ganadorVisible ? (
            <article className="sorteo-winner-card" role="alert">
              <div className="sorteo-winner-card-heading">
                <span className="sorteo-winner-icon"><Trophy size={21} aria-hidden="true" /></span>
                <div>
                  <span>{ganadorHistorico ? 'Último resultado' : 'Resultado del sorteo'}</span>
                  <strong>{ganadorHistorico ? 'Ganador registrado' : '¡Tenemos ganador!'}</strong>
                </div>
              </div>
              <div className="sorteo-winner-ticket-number">#{ganadorVisible.numeroGlobal}</div>
              <h3>{ganadorVisible.nombre}</h3>
              <p>Ganó con su oportunidad {ganadorVisible.ticketIndex} de {ganadorVisible.totalTickets} reservas en la campaña.</p>
              <div className="sorteo-winner-meta">
                <span><strong>Celular</strong>{ganadorVisible.celular}</span>
                <span><strong>Premio</strong>5 pavos</span>
              </div>
              <a
                className="sorteo-whatsapp-action"
                href={`https://wa.me/51${ganadorVisible.celular}?text=¡Hola%20${encodeURIComponent(ganadorVisible.nombre.split(' ')[0])}!%20🎉%20Ganaste%20el%20sorteo%20del%20Polideportivo%20El%20Jaguar%20con%20el%20Ticket%20%23${ganadorVisible.numeroGlobal}.`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} aria-hidden="true" />
                Notificar por WhatsApp
              </a>
            </article>
          ) : (
            <article className="sorteo-info-card">
              <div className="sorteo-info-card-title">
                <span className="sorteo-info-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
                <div>
                  <span>Transparencia del sorteo</span>
                  <strong>Todo listo para girar</strong>
                </div>
              </div>
              <ul className="sorteo-check-list">
                <li><CheckCircle2 size={17} aria-hidden="true" /> Todos los tickets tienen una oportunidad proporcional.</li>
                <li><CheckCircle2 size={17} aria-hidden="true" /> El número ganador queda visible al detenerse.</li>
                <li><CheckCircle2 size={17} aria-hidden="true" /> {supabaseConfigurado ? 'Los tickets vienen de reservas finalizadas en Supabase.' : 'Los datos mostrados corresponden a una demo.'}</li>
              </ul>
              <div className="sorteo-info-stat">
                <span>Rango de tickets</span>
                <strong>#1 — #{totalTickets}</strong>
              </div>
            </article>
          )}

          <article className="sorteo-rules-card">
            <div className="sorteo-rules-heading">
              <Gift size={19} aria-hidden="true" />
              <h3>Reglas de la campaña</h3>
            </div>
            <p>{supabaseConfigurado ? 'Participan solo reservas finalizadas con el pago verificado. Cada reserva genera un ticket.' : 'Participan los clientes frecuentes con reservas registradas durante el periodo activo.'}</p>
            <div className="sorteo-rule-row"><span>1</span><strong>reserva</strong><em>=</em><strong>1 ticket</strong></div>
            <div className="sorteo-rule-row sorteo-rule-row-corte"><span>{textoCorte}</span><em>·</em><strong>{etiquetaCorte}</strong></div>
          </article>
        </aside>
      </section>

      {(errorDatos || errorSorteo) && (
        <div className="sorteo-data-error" role="alert">
          {errorDatos || errorSorteo}
        </div>
      )}

      <section className="sorteo-intro" aria-labelledby="sorteo-titulo-principal">
        <div>
          <p className="sorteo-kicker"><Sparkles size={15} aria-hidden="true" /> Fidelidad que se celebra</p>
          <h2 id="sorteo-titulo-principal">Gran Sorteo Navideño</h2>
          <p>Un ticket por cada reserva elegible. El slot se detiene en un número y revela al ganador de la campaña.</p>
        </div>
        <div className="sorteo-campaign-pill">
          <Calendar size={17} aria-hidden="true" />
          <span><strong>Campaña activa</strong> · 1 al 24 de diciembre</span>
        </div>
      </section>

      <section className="sorteo-summary-grid" aria-label="Resumen de la campaña">
        <article className="sorteo-summary-card sorteo-summary-card-campaign">
          <div className="sorteo-summary-icon"><Gift size={21} aria-hidden="true" /></div>
          <div>
            <span>Premio de la campaña</span>
            <strong>5 pavos</strong>
            <small>Para el ticket ganador</small>
          </div>
        </article>
        <article className="sorteo-summary-card">
          <div className="sorteo-summary-icon"><Users size={21} aria-hidden="true" /></div>
          <div>
            <span>Participantes</span>
            <strong>{totalParticipantes} clientes</strong>
            <small>Con reservas elegibles</small>
          </div>
        </article>
        <article className="sorteo-summary-card">
          <div className="sorteo-summary-icon"><Ticket size={21} aria-hidden="true" /></div>
          <div>
            <span>Tickets en juego</span>
            <strong>{totalTickets} tickets</strong>
            <small>Promedio: {promedioTickets} por cliente</small>
          </div>
        </article>
        <article className="sorteo-summary-card sorteo-summary-card-success">
          <div className="sorteo-summary-icon"><ShieldCheck size={21} aria-hidden="true" /></div>
          <div>
            <span>Transparencia</span>
            <strong>1 ticket = 1 oportunidad</strong>
            <small>{supabaseConfigurado ? 'Selección guardada en Supabase' : 'Selección aleatoria demo'}</small>
          </div>
        </article>
      </section>

      <section className="sorteo-data-section" aria-label="Datos y transparencia">
        <div className="sorteo-data-header">
          <div className="sorteo-tabs" role="tablist" aria-label="Datos del sorteo">
            <button type="button" role="tab" aria-selected={tabActual === 'sorteo'} className={tabActual === 'sorteo' ? 'activo' : ''} onClick={() => setTabActual('sorteo')}>
              <HelpCircle size={16} aria-hidden="true" /> Probabilidades
            </button>
            <button type="button" role="tab" aria-selected={tabActual === 'historial'} className={tabActual === 'historial' ? 'activo' : ''} onClick={() => setTabActual('historial')}>
              <Users size={16} aria-hidden="true" /> Historial de clientes
            </button>
          </div>
          <button type="button" className="sorteo-copy-action" onClick={() => void copiarListaTickets()}>
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            {copiado ? 'Lista copiada' : 'Copiar lista de tickets'}
          </button>
        </div>

        {tabActual === 'sorteo' ? (
          <div className="sorteo-table-wrapper">
            <div className="sorteo-table-intro">
              <div><Ticket size={18} aria-hidden="true" /><span>Distribución de oportunidades</span></div>
              <strong>{totalTickets} tickets · {totalParticipantes} participantes</strong>
            </div>
            <div className="probabilidades-tabla-responsive">
              <table className="probabilidades-tabla sorteo-table">
                <thead>
                  <tr><th>#</th><th>Cliente</th><th>Celular</th><th>Tickets</th><th>Probabilidad</th><th>Distribución</th></tr>
                </thead>
                <tbody>
                  {participantes.map((participante, index) => (
                    <tr key={participante.cliente.id} className={ganadorVisible?.clienteId === participante.cliente.id ? 'fila-ganadora' : ''}>
                      <td className="col-rank">{index + 1}</td>
                      <td><strong className="nombre-cliente-tab">{participante.cliente.nombre}</strong>{participante.tickets >= 8 && <span className="badge-top-tickets">Frecuente</span>}</td>
                      <td className="col-celular-tab">{participante.cliente.celular}</td>
                      <td><span className="pill-tickets"><Ticket size={13} aria-hidden="true" /> {participante.tickets}</span></td>
                      <td><span className="prob-porcentaje">{formatearPorcentaje(participante.probabilidad)}</span></td>
                      <td className="col-barra-prob"><div className="barra-progreso-bg"><div className="barra-progreso-fill" style={{ width: `${Math.min(100, participante.probabilidad * 12)}%` }} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="admin-historial-embed">
            <AdminHistorialClientes clientes={participantes.map((participante) => participante.cliente)} />
          </div>
        )}
      </section>

      {clienteGanador && <span className="sorteo-visually-hidden">Ganador: {clienteGanador.cliente.nombre}</span>}
    </main>
  )
}
