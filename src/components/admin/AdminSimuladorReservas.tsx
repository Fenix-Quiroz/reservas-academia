import { useEffect, useMemo, useState } from 'react'
import type { Campo, ComprobanteAdmin, EstadoReserva, Reserva } from '../../types.js'
import { fechaISO } from '../../reservas.js'
import AdminReservaCard from './AdminReservaCard'
import AdminModalComprobante from './AdminModalComprobante'

type IdEscenario = 'proxima' | 'en-curso' | 'terminada-pendiente' | 'terminada-confirmada' | 'sin-adelanto'

interface Escenario {
  id: IdEscenario
  nombre: string
  descripcion: string
  inicioEnMinutos: number
  finEnMinutos: number
  comprobante: 'pendiente' | 'confirmado' | 'sin-adelanto'
}

const escenarios: readonly Escenario[] = [
  {
    id: 'proxima',
    nombre: 'Reserva próxima',
    descripcion: 'El turno todavía no empieza. El comprobante sigue pendiente.',
    inicioEnMinutos: 5,
    finEnMinutos: 15,
    comprobante: 'pendiente',
  },
  {
    id: 'en-curso',
    nombre: 'Reserva en curso',
    descripcion: 'El turno ya comenzó, pero la reserva continúa activa.',
    inicioEnMinutos: -5,
    finEnMinutos: 5,
    comprobante: 'pendiente',
  },
  {
    id: 'terminada-pendiente',
    nombre: 'Turno terminado sin confirmar',
    descripcion: 'Este es el caso que requiere revisión: el comprobante sigue pendiente después del turno.',
    inicioEnMinutos: -15,
    finEnMinutos: -5,
    comprobante: 'pendiente',
  },
  {
    id: 'terminada-confirmada',
    nombre: 'Turno terminado con comprobante confirmado',
    descripcion: 'El comprobante ya fue confirmado; desaparece la acción para confirmarlo.',
    inicioEnMinutos: -15,
    finEnMinutos: -5,
    comprobante: 'confirmado',
  },
  {
    id: 'sin-adelanto',
    nombre: 'Reserva sin adelanto',
    descripcion: 'No tiene comprobante de pago. Al terminar solo se finaliza la reserva.',
    inicioEnMinutos: 5,
    finEnMinutos: 15,
    comprobante: 'sin-adelanto',
  },
]

const COMPROBANTE_DEMO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="380" height="520" viewBox="0 0 380 520" fill="none"><rect width="380" height="520" rx="20" fill="%23742284"/><circle cx="190" cy="80" r="32" fill="%2300d6aa"/><path d="M180 80l7 7 15-15" stroke="%23fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="190" y="140" fill="%23fff" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle">¡Yapeaste!</text><text x="190" y="180" fill="%2300d6aa" font-size="34" font-family="sans-serif" font-weight="900" text-anchor="middle">S/ 60.00</text><text x="190" y="215" fill="%23e2b2f0" font-size="14" font-family="sans-serif" text-anchor="middle">Polideportivo El Jaguar</text><rect x="30" y="250" width="320" height="1" fill="%23a854ba"/><text x="40" y="290" fill="%23e2b2f0" font-size="13" font-family="sans-serif">Número de celular</text><text x="340" y="290" fill="%23fff" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="end">999 999 999</text><text x="40" y="330" fill="%23e2b2f0" font-size="13" font-family="sans-serif">Destino</text><text x="340" y="330" fill="%23fff" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="end">Canchas Jaguar</text><text x="40" y="370" fill="%23e2b2f0" font-size="13" font-family="sans-serif">Número de operación</text><text x="340" y="370" fill="%23fff" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="end">08472910</text><text x="40" y="410" fill="%23e2b2f0" font-size="13" font-family="sans-serif">Fecha y hora</text><text x="340" y="410" fill="%23fff" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="end">Hoy · 14:32</text><rect x="30" y="440" width="320" height="48" rx="10" fill="%238a2e9c"/><text x="190" y="470" fill="%2300d6aa" font-size="13" font-family="sans-serif" font-weight="bold" text-anchor="middle">Pago de adelanto verificado</text></svg>`

function relojBase(): Date {
  const fecha = new Date()
  fecha.setSeconds(0, 0)
  return fecha
}

function fechaConDesplazamiento(base: Date, minutos: number): Date {
  const fecha = new Date(base)
  fecha.setMinutes(fecha.getMinutes() + minutos)
  return fecha
}

function horaDecimal(fecha: Date): number {
  return fecha.getHours() + fecha.getMinutes() / 60
}

function reservaSimulada(
  escenario: Escenario,
  base: Date,
  estado: EstadoReserva,
  pagoConfirmado: boolean,
): { reserva: Reserva; comprobante?: ComprobanteAdmin; inicio: Date; fin: Date } {
  const inicio = fechaConDesplazamiento(base, escenario.inicioEnMinutos)
  const fin = fechaConDesplazamiento(base, escenario.finEnMinutos)
  const id = `simulador-${escenario.id}`
  const tieneComprobante = escenario.comprobante !== 'sin-adelanto'
  const reserva: Reserva = {
    id,
    canchaId: 1,
    fecha: fechaISO(inicio),
    inicio: horaDecimal(inicio),
    horas: (fin.getTime() - inicio.getTime()) / 3600000,
    alias: 'Cliente de prueba',
    celular: '999999999',
    estado,
    pagoEstado: escenario.comprobante === 'sin-adelanto'
      ? 'no_requerido'
      : pagoConfirmado ? 'confirmado' : 'pendiente',
    montoTotal: 60,
  }

  return {
    reserva,
    inicio,
    fin,
    comprobante: tieneComprobante ? {
      pagoId: `pago-${id}`,
      reservaId: id,
      estado: pagoConfirmado ? 'confirmado' : 'pendiente',
      storagePath: 'simulador/comprobante.png',
      mimeType: 'image/png',
      sizeBytes: 1,
    } : undefined,
  }
}

export interface AdminSimuladorReservasProps {
  cancha: Campo
}

export default function AdminSimuladorReservas({ cancha }: AdminSimuladorReservasProps) {
  const [escenarioId, setEscenarioId] = useState<IdEscenario>('terminada-pendiente')
  const [segundos, setSegundos] = useState(0)
  const [ejecutando, setEjecutando] = useState(false)
  const [estado, setEstado] = useState<EstadoReserva>('activo')
  const [pagoConfirmado, setPagoConfirmado] = useState(false)
  const [porCancelar, setPorCancelar] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [modalComprobanteVisible, setModalComprobanteVisible] = useState(false)
  const [base] = useState(relojBase)

  const escenario = escenarios.find((item) => item.id === escenarioId) ?? escenarios[0]
  const ahora = useMemo(() => new Date(base.getTime() + segundos * 60000), [base, segundos])
  const simulacion = useMemo(
    () => reservaSimulada(escenario, base, estado, pagoConfirmado),
    [escenario, base, estado, pagoConfirmado],
  )

  useEffect(() => {
    if (!ejecutando) return undefined
    const temporizador = window.setInterval(() => setSegundos((actual) => Math.min(actual + 1, 20)), 1000)
    return () => window.clearInterval(temporizador)
  }, [ejecutando])

  useEffect(() => {
    if (segundos >= 20) setEjecutando(false)
  }, [segundos])

  function reiniciar(): void {
    setEjecutando(false)
    setSegundos(0)
    setEstado('activo')
    setPagoConfirmado(escenario.comprobante === 'confirmado')
    setPorCancelar(null)
    setMensaje('')
  }

  function cambiarEscenario(id: IdEscenario): void {
    setEscenarioId(id)
    setEjecutando(false)
    setSegundos(0)
    setEstado('activo')
    setPagoConfirmado(escenarios.find((item) => item.id === id)?.comprobante === 'confirmado')
    setPorCancelar(null)
    setMensaje('')
  }

  function cambiarEstado(_id: string, siguiente: EstadoReserva): void {
    setEstado(siguiente)
    setMensaje(siguiente === 'finalizado'
      ? 'Simulación: la reserva fue finalizada.'
      : 'Simulación: la reserva fue marcada como no asistió.')
  }

  const fase = estado !== 'activo'
    ? 'La reserva ya tiene un estado manual.'
    : ahora < simulacion.inicio
      ? 'Todavía no empieza: la card muestra la reserva como próxima.'
      : ahora < simulacion.fin
        ? 'El turno está en curso: sigue activo y todavía puede cancelarse.'
        : 'El turno terminó: la card pasa a “Por revisar” y muestra las acciones de decisión.'

  return (
    <section className="admin-simulador" aria-labelledby="titulo-simulador">
      <div className="admin-simulador-cabecera">
        <div>
          <p className="admin-kicker">Guía para administración</p>
          <h2 id="titulo-simulador">Simulador de reservas</h2>
          <p className="admin-simulador-ayuda">
            Esta herramienta no modifica reservas reales. Cada segundo real avanza un minuto simulado para que puedas explicar qué ocurre en cada caso.
          </p>
        </div>
      </div>

      <div className="admin-simulador-controles">
        <label>
          <span>Escenario</span>
          <select value={escenarioId} onChange={(evento) => cambiarEscenario(evento.target.value as IdEscenario)}>
            {escenarios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </label>
        <div className="admin-simulador-reloj" aria-live="polite">
          <span>Reloj simulado</span>
          <strong>+{segundos} min</strong>
        </div>
        <button className="admin-boton admin-control-primario" type="button" onClick={() => setEjecutando((actual) => !actual)} disabled={segundos >= 20}>
          {ejecutando ? 'Pausar reloj' : 'Iniciar reloj'}
        </button>
        <button className="admin-boton admin-control-secundario" type="button" onClick={() => setSegundos((actual) => Math.min(actual + 1, 20))} disabled={segundos >= 20}>
          Avanzar 1 segundo
        </button>
        <button className="admin-boton admin-control-secundario" type="button" onClick={reiniciar}>
          Reiniciar
        </button>
      </div>

      <div className="admin-simulador-explicacion">
        <strong>{escenario.nombre}</strong>
        <span>{escenario.descripcion}</span>
        <span>{fase}</span>
      </div>

      {mensaje && <p className="exito" role="status">{mensaje}</p>}

      <div className="admin-simulador-preview">
        <div className="admin-simulador-preview-cabecera">
          <h3>Vista de la card</h3>
          <span>{cancha.nombre}</span>
        </div>
        <AdminReservaCard
          reserva={simulacion.reserva}
          ahora={ahora}
          cancha={cancha}
          comprobante={simulacion.comprobante}
          puedeCancelar={estado === 'activo'}
          porCancelar={porCancelar}
          cancelando={null}
          onRequestCancel={() => setPorCancelar(simulacion.reserva.id)}
          onCancel={() => {
            setEstado('cancelado')
            setPorCancelar(null)
            setMensaje('Simulación: la reserva fue cancelada.')
          }}
          onCancelRequest={() => setPorCancelar(null)}
          onStatus={cambiarEstado}
          actualizandoEstado={null}
          procesandoComprobante={null}
          onViewComprobante={() => setModalComprobanteVisible(true)}
          onDownloadComprobante={() => setMensaje('Simulación: aquí se descargaría el comprobante.')}
          onConfirmarComprobante={() => {
            setPagoConfirmado(true)
            setMensaje('Simulación: comprobante confirmado.')
          }}
        />
      </div>
      {modalComprobanteVisible && simulacion.comprobante && (
        <AdminModalComprobante
          comprobante={simulacion.comprobante}
          reserva={simulacion.reserva}
          cancha={cancha}
          url={COMPROBANTE_DEMO_SVG}
          cargando={false}
          error={null}
          onClose={() => setModalComprobanteVisible(false)}
          onDownload={() => setMensaje('Simulación: comprobante descargado.')}
        />
      )}
    </section>
  )
}
