import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  HelpCircle,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import AdminMarca from './AdminMarca'
import AdminHistorialClientes from './AdminHistorialClientes'
import datosDemo from '../../data/clientes-frecuentes-demo.json'
import type { ClienteFrecuente } from '../../clientesFrecuentes'

export interface AdminSorteosVistaProps {
  onVolver: () => void
}

export interface TicketSorteo {
  id: string
  clienteId: string
  nombre: string
  celular: string
  ticketIndex: number
  totalTickets: number
  numeroGlobal: number
}

export interface ParticipanteSorteo {
  cliente: ClienteFrecuente
  tickets: number
  probabilidad: number
}

const CARD_WIDTH = 164
const CARD_GAP = 12
const CARD_STEP = CARD_WIDTH + CARD_GAP
const POSICION_GANADOR_STRIP = 96
const TOTAL_CARDS_STRIP = 135

// Efectos de sonido sintetizados mediante Web Audio API (100% nativo, sin archivos externos)
function reproducirSonidoTick(frecuencia = 420, duracion = 0.025): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(frecuencia, ctx.currentTime)
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duracion)
  } catch {
    // Ignorar si el navegador bloquea audio sin interacción
  }
}

function reproducirSonidoVictoria(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const notas = [523.25, 659.25, 783.99, 1046.50] // Acorde Do Mayor alegre
    notas.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + idx * 0.09
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.12, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.45)
    })
  } catch {
    // Ignorar
  }
}

export default function AdminSorteosVista({ onVolver }: AdminSorteosVistaProps) {
  const [girando, setGirando] = useState(false)
  const [ganador, setGanador] = useState<TicketSorteo | null>(null)
  const [offsetRueda, setOffsetRueda] = useState(0)
  const [duracionAnimacion, setDuracionAnimacion] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true)
  const [tabActual, setTabActual] = useState<'tambor' | 'probabilidades' | 'historial'>('tambor')

  const contenedorRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const ticketElegidoRef = useRef<TicketSorteo | null>(null)
  const animacionCompletadaRef = useRef(false)
  const temporizadoresTick = useRef<number[]>([])

  // 1. Calcular los participantes y sus tickets de la campaña activa (1 reserva = 1 ticket)
  const { participantes, totalTickets, ticketsIntercalados } = useMemo(() => {
    const listado: ParticipanteSorteo[] = datosDemo.map((c) => ({
      cliente: c,
      tickets: c.reservasMes,
      probabilidad: 0,
    }))

    const total = listado.reduce((acc, p) => acc + p.tickets, 0)

    listado.forEach((p) => {
      p.probabilidad = total > 0 ? Math.round((p.tickets / total) * 1000) / 10 : 0
    })

    // Algoritmo de dispersión: Intercalar tickets para que los de una misma persona NO queden juntos
    const colas = listado.map((p) => ({
      clienteId: p.cliente.id,
      nombre: p.cliente.nombre,
      celular: p.cliente.celular,
      totalTickets: p.tickets,
      restantes: p.tickets,
    })).sort((a, b) => b.restantes - a.restantes)

    const intercalados: TicketSorteo[] = []
    let ultimoId = ''
    let penultimoId = ''

    for (let i = 0; i < total; i += 1) {
      let mejor = colas.find((c) => c.restantes > 0 && c.clienteId !== ultimoId && c.clienteId !== penultimoId)
      if (!mejor) {
        mejor = colas.find((c) => c.restantes > 0 && c.clienteId !== ultimoId)
      }
      if (!mejor) {
        mejor = colas.find((c) => c.restantes > 0)
      }
      if (!mejor) break

      const numTicketCliente = mejor.totalTickets - mejor.restantes + 1
      intercalados.push({
        id: `${mejor.clienteId}-t${numTicketCliente}`,
        clienteId: mejor.clienteId,
        nombre: mejor.nombre,
        celular: mejor.celular,
        ticketIndex: numTicketCliente,
        totalTickets: mejor.totalTickets,
        numeroGlobal: i + 1,
      })

      mejor.restantes -= 1
      penultimoId = ultimoId
      ultimoId = mejor.clienteId
      colas.sort((a, b) => b.restantes - a.restantes)
    }

    return {
      participantes: listado.sort((a, b) => b.tickets - a.tickets),
      totalTickets: total,
      ticketsIntercalados: intercalados,
    }
  }, [])

  // 2. Strip de tarjetas para el tambor horizontal
  const [stripTarjetas, setStripTarjetas] = useState<TicketSorteo[]>([])

  // Función constructora de tira con espectro completo (para que pasen tickets de todo el rango 1..N)
  function armarTiraEspectroCompleto(
    tickets: TicketSorteo[],
    ticketGanador: TicketSorteo | null,
  ): TicketSorteo[] {
    const tira: TicketSorteo[] = []
    const total = tickets.length
    if (total === 0) return tira

    for (let i = 0; i < TOTAL_CARDS_STRIP; i += 1) {
      if (ticketGanador && i === POSICION_GANADOR_STRIP) {
        tira.push(ticketGanador)
      } else if (ticketGanador && Math.abs(i - POSICION_GANADOR_STRIP) <= 5) {
        // En los alrededores inmediatos del ganador durante la frenada final, colocar boletos reales adyacentes
        const offset = i - POSICION_GANADOR_STRIP
        const indiceReal = (ticketGanador.numeroGlobal - 1 + offset + total) % total
        tira.push(tickets[indiceReal])
      } else {
        // En el resto del tambor (especialmente al inicio y alta velocidad):
        // Mapear de forma que se recorra TODO el rango (boletos del #1 al #374 repetidas veces)
        // Usamos una progresión que garantiza que tickets de los cientos 300, 200, 100 y 10 pasen por pantalla
        const salto = Math.floor((i * (total / 12) + (i % 5) * 17)) % total
        tira.push(tickets[salto] ?? tickets[i % total])
      }
    }
    return tira
  }

  useEffect(() => {
    // Al cambiar el periodo o iniciar, armar la tira inicial mostrando diversidad de tickets
    if (ticketsIntercalados.length === 0) return
    const tiraInicial = armarTiraEspectroCompleto(ticketsIntercalados, null)
    setStripTarjetas(tiraInicial)
    setOffsetRueda(0)
    setDuracionAnimacion(0)
    setGanador(null)
  }, [ticketsIntercalados])

  // Limpiar temporizadores de sonido al desmontar
  useEffect(() => {
    return () => {
      temporizadoresTick.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  // 3. Ejecución del giro del tambor
  function finalizarGiro(): void {
    if (animacionCompletadaRef.current) return
    animacionCompletadaRef.current = true
    setGirando(false)
    if (ticketElegidoRef.current) {
      setGanador(ticketElegidoRef.current)
    }
    if (sonidoHabilitado) {
      reproducirSonidoVictoria()
    }
  }

  function girarTambor(): void {
    if (girando || ticketsIntercalados.length === 0) return

    setGirando(true)
    setGanador(null)
    animacionCompletadaRef.current = false

    // Limpiar temporizadores de ticks anteriores
    temporizadoresTick.current.forEach((id) => window.clearTimeout(id))
    temporizadoresTick.current = []

    // 1. ELECCIÓN MATEMÁTICA REAL Y EQUITATIVA ENTRE TODOS LOS TICKETS (1..N)
    // Cada uno de los N tickets tiene exactamente 1/N de probabilidad de ganar
    const indiceGanadorPool = Math.floor(Math.random() * ticketsIntercalados.length)
    const ticketElegido = ticketsIntercalados[indiceGanadorPool]
    ticketElegidoRef.current = ticketElegido

    // 2. Construir la tira que recorre boletos de todo el bombo y se frena en POSICION_GANADOR_STRIP
    const nuevaTira = armarTiraEspectroCompleto(ticketsIntercalados, ticketElegido)
    setStripTarjetas(nuevaTira)

    // Reseteo inmediato del DOM y forzado de reflow:
    // Evita al 100% que el navegador reutilice el offset previo al girar por segunda o tercera vez
    if (trackRef.current) {
      trackRef.current.style.transition = 'none'
      trackRef.current.style.transform = 'translateX(0px)'
      void trackRef.current.offsetHeight // Fuerza reflow sincrónico en el navegador
    }

    setDuracionAnimacion(0)
    setOffsetRueda(0)

    // Doble requestAnimationFrame para garantizar que el nuevo frame en 0px se haya pintado antes de transicionar
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const anchoContenedor = contenedorRef.current?.clientWidth ?? 900
        const centroContenedor = anchoContenedor / 2
        const centroTarjetaGanadora = POSICION_GANADOR_STRIP * CARD_STEP + CARD_WIDTH / 2
        // Jitter aleatorio leve (+/- 14px) para caída realista dentro de la tarjeta
        const jitter = Math.random() * 28 - 14
        const offsetFinal = centroTarjetaGanadora - centroContenedor + jitter

        const tiempoGiro = 6.8 // 6.8 segundos de alta emoción con desaceleración progresiva y continua
        setDuracionAnimacion(tiempoGiro)
        setOffsetRueda(offsetFinal)

        // Programar ticks de sonido durante la desaceleración visible (de 3.8s a 6.8s)
        if (sonidoHabilitado) {
          // Fase media rápida: se empieza a percibir la reducción de velocidad
          const tiemposFaseMedia = [3.8, 4.15, 4.5, 4.85, 5.2]
          tiemposFaseMedia.forEach((t) => {
            const id = window.setTimeout(() => reproducirSonidoTick(500), t * 1000)
            temporizadoresTick.current.push(id)
          })

          // Fase final de suspenso: desaceleración tarjeta por tarjeta hasta el centro
          const tiemposFaseFinal = [5.55, 5.9, 6.2, 6.45, 6.65, 6.8]
          tiemposFaseFinal.forEach((t, i) => {
            const id = window.setTimeout(
              () => reproducirSonidoTick(400 + i * 40, 0.035),
              t * 1000,
            )
            temporizadoresTick.current.push(id)
          })
        }

        // Respaldo por si el navegador no emite onTransitionEnd (ej. pestaña en segundo plano)
        const safetyId = window.setTimeout(() => {
          finalizarGiro()
        }, (tiempoGiro + 0.3) * 1000)
        temporizadoresTick.current.push(safetyId)
      })
    })
  }

  function reiniciarTambor(): void {
    temporizadoresTick.current.forEach((id) => window.clearTimeout(id))
    temporizadoresTick.current = []
    if (trackRef.current) {
      trackRef.current.style.transition = 'none'
      trackRef.current.style.transform = 'translateX(0px)'
      void trackRef.current.offsetHeight
    }
    setOffsetRueda(0)
    setDuracionAnimacion(0)
    setGirando(false)
    setGanador(null)
    animacionCompletadaRef.current = false
  }

  function copiarListaTickets(): void {
    const texto = participantes
      .map((p) => `${p.cliente.nombre} (${p.cliente.celular}) - ${p.tickets} tickets (${p.probabilidad}%)`)
      .join('\n')
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  return (
    <main className="admin-app admin-sorteos-app">
      {/* Cabecera con marca y botón volver */}
      <header className="admin-sorteos-cabecera">
        <div className="admin-sorteos-marca-grupo">
          <AdminMarca />
          <div className="admin-sorteos-titulos">
            <p className="admin-kicker">Módulo de Sorteos por Fidelidad</p>
            <h1>Sorteo de Clientes Frecuentes</h1>
          </div>
        </div>

        <div className="admin-sorteos-acciones-cabecera">
          <button
            type="button"
            className="boton-secundario admin-boton admin-boton-volver"
            onClick={onVolver}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Volver al Panel</span>
          </button>
          <a className="boton-secundario admin-boton" href="/">
            Vista del cliente
          </a>
        </div>
      </header>

      {/* Campaña y regla del sorteo */}
      <section className="admin-sorteo-configuracion">
        <div className="admin-sorteo-regla">
          <div className="regla-icono">
            <Gift size={24} strokeWidth={2.4} aria-hidden="true" />
          </div>
          <div className="regla-texto">
            <h2>Regla: 1 Reserva = 1 Ticket de Sorteo</h2>
            <p>
              Todos los clientes que reservaron durante la campaña participan automáticamente.
              Quien tiene más reservas tiene más tickets repartidos en el tambor de forma separada.
            </p>
          </div>
        </div>

        <div className="admin-sorteo-campana-box" aria-label="Campaña activa del sorteo">
          <div className="admin-sorteo-campana-etiqueta">
            <Calendar size={15} aria-hidden="true" />
            <span>Campaña activa:</span>
          </div>
          <strong className="admin-sorteo-campana-nombre">
            Gran Sorteo Navideño
          </strong>
          <span className="admin-sorteo-campana-fecha">
            Válido hasta el 22 de Diciembre
          </span>
        </div>
      </section>

      {/* Transparencia y Métricas del bombo */}
      <div className="admin-sorteo-metricas-bar">
        <div className="metrica-item">
          <Users size={18} />
          <span>Participantes: <strong>{participantes.length} clientes</strong></span>
        </div>
        <div className="metrica-item">
          <Sparkles size={18} />
          <span>Tickets en el bombo: <strong>{totalTickets} tickets (del #1 al #{totalTickets})</strong></span>
        </div>
        <div className="metrica-item">
          <Clock size={18} />
          <span>Promedio: <strong>{(totalTickets / Math.max(1, participantes.length)).toFixed(1)} reservas / cliente</strong></span>
        </div>
        <div className="metrica-item transparencia-item" title="Todos los tickets participan con probabilidades equitativas">
          <ShieldCheck size={18} />
          <span>Sorteo 100% transparente: <strong>Todos los números giran en el tambor</strong></span>
        </div>
      </div>

      {/* EL TAMBOR DE SORTEO HORIZONTAL (REEL) */}
      <section className="admin-sorteo-tambor-wrapper" aria-label="Tambor del sorteo">
        {/* Banner superior de estado del tambor */}
        <div className="tambor-status-banner">
          {girando ? (
            <span className="status-girando">
              ⚡ Girando a toda velocidad por los <strong>{totalTickets} tickets</strong> en juego…
            </span>
          ) : ganador ? (
            <span className="status-ganador">
              🏆 ¡La aguja se detuvo en el <strong>Ticket #{ganador.numeroGlobal}</strong>!
            </span>
          ) : (
            <span className="status-listo">
              🎯 Puntero listo para girar entre los <strong>{totalTickets} boletos numerados</strong>.
            </span>
          )}

          <button
            type="button"
            className="boton-toggle-sonido"
            onClick={() => setSonidoHabilitado((prev) => !prev)}
            title={sonidoHabilitado ? 'Silenciar efectos' : 'Activar efectos de sonido'}
          >
            {sonidoHabilitado ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{sonidoHabilitado ? 'Sonido ON' : 'Sonido OFF'}</span>
          </button>
        </div>

        {/* Contenedor del visor panorámico con agujas relativas */}
        <div className="admin-sorteo-tambor-visor-container">
          <div className={`tambor-indicador-superior ${girando ? 'animando-aguja' : ''}`} aria-hidden="true">
            <div className="flecha-puntero abajo" />
          </div>
          <div className="tambor-linea-central" aria-hidden="true" />
          <div className={`tambor-indicador-inferior ${girando ? 'animando-aguja' : ''}`} aria-hidden="true">
            <div className="flecha-puntero arriba" />
          </div>

          {/* Visor con overflow hidden que ocupa casi todo el ancho */}
          <div className="admin-sorteo-tambor-visor" ref={contenedorRef}>
            <div
              ref={trackRef}
              className="admin-sorteo-tambor-track"
              style={{
                transform: `translateX(-${offsetRueda}px)`,
                transition: duracionAnimacion > 0
                  ? `transform ${duracionAnimacion}s cubic-bezier(0.16, 0.65, 0.14, 1.0)`
                  : 'none',
              }}
              onTransitionEnd={(e) => {
                if (e.propertyName === 'transform') {
                  finalizarGiro()
                }
              }}
            >
              {stripTarjetas.map((ticket, index) => {
                const esElGanador = ganador && index === POSICION_GANADOR_STRIP
                return (
                  <div
                    key={`${ticket.id}-${index}`}
                    className={`tambor-ticket-card ${esElGanador ? 'ticket-ganador-activo' : ''}`}
                    style={{ width: `${CARD_WIDTH}px` }}
                  >
                    <div className="ticket-header">
                      <span className="ticket-badge">🎟️ Ticket #{ticket.numeroGlobal}</span>
                      <span className="ticket-contador">{ticket.ticketIndex}/{ticket.totalTickets}</span>
                    </div>
                    <strong className="ticket-nombre" title={ticket.nombre}>
                      {ticket.nombre}
                    </strong>
                    <span className="ticket-celular">{ticket.celular}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Controles de giro */}
        <div className="tambor-acciones">
          <button
            type="button"
            className="admin-boton-girar-tambor"
            onClick={girarTambor}
            disabled={girando}
          >
            <Sparkles size={20} aria-hidden="true" />
            <span>{girando ? '¡Recorriendo todos los tickets…!' : '🎰 ¡Girar Tambor de Sorteo!'}</span>
          </button>

          {ganador && (
            <button
              type="button"
              className="admin-boton-reiniciar-tambor"
              onClick={girarTambor}
              disabled={girando}
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span>Girar de nuevo</span>
            </button>
          )}
        </div>
      </section>

      {/* Tarjeta de Ganador Celebratorio */}
      {ganador && (
        <section className="admin-sorteo-ganador-seccion" role="alert">
          <div className="ganador-tarjeta-premium">
            <div className="ganador-trofeo-animado">
              <Trophy size={48} strokeWidth={2.4} />
            </div>

            <div className="ganador-info-principal">
              <span className="ganador-kicker">🎉 ¡TICKET GANADOR DEL SORTEO!</span>
              <h2 className="ganador-nombre-destacado">{ganador.nombre}</h2>
              <div className="ganador-detalles-grid">
                <div className="detalle-pill">
                  <span>Teléfono:</span>
                  <strong>{ganador.celular}</strong>
                </div>
                <div className="detalle-pill">
                  <span>Ticket premiado:</span>
                  <strong>#{ganador.numeroGlobal} (Oportunidad {ganador.ticketIndex} de {ganador.totalTickets})</strong>
                </div>
                <div className="detalle-pill">
                  <span>Reservas en la campaña:</span>
                  <strong>{ganador.totalTickets} reservas</strong>
                </div>
              </div>
            </div>

            <div className="ganador-accion-whatsapp">
              <a
                href={`https://wa.me/51${ganador.celular}?text=¡Hola%20${encodeURIComponent(ganador.nombre.split(' ')[0])}!%20🎉🏆%20Te%20saludamos%20del%20Polideportivo%20El%20Jaguar.%20¡Acabas%20de%20ganar%20el%20sorteo%20con%20tu%20Ticket%20%23${ganador.numeroGlobal}%20gracias%20a%20tus%20${ganador.totalTickets}%20reservas!`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp-ganador"
              >
                <MessageCircle size={20} aria-hidden="true" />
                <span>Notificar por WhatsApp</span>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Tabs inferiores: Tabla de Probabilidades y Listado de Clientes */}
      <section className="admin-sorteos-tabs-seccion">
        <div className="admin-sorteos-tabs-cabecera">
          <div className="tabs-botones">
            <button
              type="button"
              className={`tab-btn ${tabActual === 'tambor' ? 'activo' : ''}`}
              onClick={() => setTabActual('tambor')}
            >
              🎲 Tickets & Probabilidades ({participantes.length} clientes)
            </button>
            <button
              type="button"
              className={`tab-btn ${tabActual === 'historial' ? 'activo' : ''}`}
              onClick={() => setTabActual('historial')}
            >
              👥 Historial Completo de Clientes
            </button>
          </div>

          <button
            type="button"
            className="boton-copiar-tickets"
            onClick={copiarListaTickets}
            title="Copiar lista de tickets para usar en otra app o compartir"
          >
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiado ? '¡Copiado al portapapeles!' : 'Copiar lista de tickets'}</span>
          </button>
        </div>

        {tabActual === 'tambor' ? (
          <div className="admin-probabilidades-contenedor">
            <div className="probabilidades-ayuda">
              <HelpCircle size={16} />
              <span>
                Los <strong>{totalTickets} tickets</strong> numerados están distribuidos en el tambor de manera intercalada.
                Durante el giro, la animación recorre boletos de todos los rangos (desde números bajos hasta altos).
              </span>
            </div>

            <div className="probabilidades-tabla-responsive">
              <table className="probabilidades-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Celular</th>
                    <th>Tickets (Reservas)</th>
                    <th>Probabilidad</th>
                    <th>Distribución en el Tambor</th>
                  </tr>
                </thead>
                <tbody>
                  {participantes.map((p, index) => (
                    <tr key={p.cliente.id} className={ganador?.clienteId === p.cliente.id ? 'fila-ganadora' : ''}>
                      <td className="col-rank">{index + 1}</td>
                      <td>
                        <strong className="nombre-cliente-tab">{p.cliente.nombre}</strong>
                        {p.tickets >= 8 && <span className="badge-top-tickets">Favorito</span>}
                      </td>
                      <td className="col-celular-tab">{p.cliente.celular}</td>
                      <td className="col-tickets-tab">
                        <span className="pill-tickets">🎟️ {p.tickets} tickets</span>
                      </td>
                      <td className="col-prob-tab">
                        <span className="prob-porcentaje">{p.probabilidad}%</span>
                      </td>
                      <td className="col-barra-prob">
                        <div className="barra-progreso-bg">
                          <div
                            className="barra-progreso-fill"
                            style={{ width: `${Math.min(100, p.probabilidad * 12)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="admin-historial-embed">
            <AdminHistorialClientes />
          </div>
        )}
      </section>
    </main>
  )
}
