import { useEffect, useRef, useState } from 'react'
import type { Campo, Reserva } from '../../types.js'
import { crearBloqueoAccion } from '../../accionUnica'
import {
  filtrarAlertasCanceladas,
  finDeReserva,
  ordenarPorFin,
  patronAlarma,
  reservasDePrueba,
  reservasTerminadasParaAlerta,
} from '../../utils/alarmaTurno'

export interface AdminAlarmaTurnoProps {
  reservas: readonly Reserva[]
  canchas: readonly Campo[]
}

function horaVisible(fecha: Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(fecha)
}

function emitirTono(contexto: AudioContext): void {
  const inicio = contexto.currentTime
  const oscilador = contexto.createOscillator()
  const volumen = contexto.createGain()

  oscilador.type = 'square'
  oscilador.frequency.setValueAtTime(patronAlarma.frecuenciaGrave, inicio)
  oscilador.frequency.setValueAtTime(patronAlarma.frecuenciaAguda, inicio + patronAlarma.cambioDeTonoEn)
  volumen.gain.setValueAtTime(0.0001, inicio)
  volumen.gain.exponentialRampToValueAtTime(0.22, inicio + 0.02)
  volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + patronAlarma.duracion - 0.05)
  oscilador.connect(volumen)
  volumen.connect(contexto.destination)
  oscilador.start(inicio)
  oscilador.stop(inicio + patronAlarma.duracion)
}

export default function AdminAlarmaTurno({ reservas, canchas }: AdminAlarmaTurnoProps) {
  const [alertas, setAlertas] = useState<Reserva[]>([])
  const [sonidoActivado, setSonidoActivado] = useState(false)
  const [mostrarPopupActivar, setMostrarPopupActivar] = useState(true)
  const [errorSonido, setErrorSonido] = useState('')
  const emitidas = useRef(new Set<string>())
  const contextoAudio = useRef<AudioContext | null>(null)
  const bloqueoSonido = useRef(crearBloqueoAccion())
  const bloqueoPrueba = useRef(crearBloqueoAccion())

  useEffect(() => {
    const ahora = Date.now()

    setAlertas((actuales) => filtrarAlertasCanceladas(actuales, reservas))

    // Las reservas que ya terminaron antes de abrir el panel no generan una alarma atrasada.
    for (const reserva of reservas) {
      if (reserva.estado !== 'cancelado' && finDeReserva(reserva).getTime() <= ahora) {
        emitidas.current.add(reserva.id)
      }
    }

    const revisarTurnos = () => {
      const instante = Date.now()
      const terminadas = reservasTerminadasParaAlerta(reservas, emitidas.current, instante)

      if (terminadas.length === 0) return

      for (const reserva of terminadas) emitidas.current.add(reserva.id)
      setAlertas((actuales) => {
        const idsActuales = new Set(actuales.map((reserva) => reserva.id))
        return ordenarPorFin([...actuales, ...terminadas.filter((reserva) => !idsActuales.has(reserva.id))])
      })
    }

    const temporizador = window.setInterval(revisarTurnos, 1000)
    return () => window.clearInterval(temporizador)
  }, [reservas])

  useEffect(() => {
    if (!sonidoActivado || alertas.length === 0) return undefined

    const reproducir = () => {
      const contexto = contextoAudio.current
      if (!contexto) return
      if (contexto.state === 'suspended') void contexto.resume()
      emitirTono(contexto)
    }

    reproducir()
    const temporizador = window.setInterval(reproducir, patronAlarma.intervalo)
    return () => window.clearInterval(temporizador)
  }, [alertas.length, sonidoActivado])

  async function activarSonido(): Promise<boolean> {
    if (!bloqueoSonido.current.adquirir()) return false
    try {
      if (!contextoAudio.current) contextoAudio.current = new AudioContext()
      await contextoAudio.current.resume()
      if (contextoAudio.current.state !== 'running') throw new Error('audio-no-disponible')
      emitirTono(contextoAudio.current)
      setSonidoActivado(true)
      setMostrarPopupActivar(false)
      setErrorSonido('')
      return true
    } catch {
      setErrorSonido('No pudimos activar el sonido. Revisa el volumen del dispositivo.')
      setMostrarPopupActivar(true)
      return false
    } finally {
      bloqueoSonido.current.liberar()
    }
  }

  function marcarAvisada(id: string): void {
    setAlertas((actuales) => actuales.filter((reserva) => reserva.id !== id))
  }

  async function simularAlarma(): Promise<void> {
    if (!bloqueoPrueba.current.adquirir()) return
    try {
      if (!sonidoActivado) await activarSonido()
      setAlertas((actuales) => ordenarPorFin([...actuales, ...reservasDePrueba()]))
    } finally {
      bloqueoPrueba.current.liberar()
    }
  }

  return (
    <section className={`admin-alarma${alertas.length > 0 ? ' tiene-alertas' : ''}`} aria-labelledby="titulo-alarmas">
      <div className="admin-alarma-cabecera">
        <div>
          <p className="admin-kicker">Avisos de turnos</p>
          <h2 id="titulo-alarmas">Alarma de fin de reserva</h2>
          <p className="admin-alarma-ayuda">
            {sonidoActivado
              ? 'El sonido está activado y el panel vigilará los turnos abiertos.'
              : 'Activa el sonido una vez para escuchar los avisos de este dispositivo.'}
          </p>
        </div>
        <div className="admin-alarma-acciones">
          <button
            className="admin-boton admin-alarma-activar"
            type="button"
            onClick={() => void activarSonido()}
            disabled={sonidoActivado}
          >
            {sonidoActivado ? '🔔 Sonido activado' : '🔔 Activar sonido'}
          </button>
          <button className="admin-boton admin-alarma-prueba" type="button" onClick={() => void simularAlarma()}>
            ⏱ Probar alarmas
          </button>
        </div>
      </div>

      {mostrarPopupActivar && !sonidoActivado && (
        <div className="admin-alarma-popup" role="dialog" aria-modal="true" aria-labelledby="titulo-popup-alarmas">
          <div className="admin-alarma-popup-contenido">
            <p className="admin-kicker">Avisos de turnos</p>
            <h3 id="titulo-popup-alarmas">Activar alarmas</h3>
            <p>Activa el sonido para recibir un aviso cuando termine una reserva.</p>
            <div className="admin-alarma-popup-acciones">
              <button className="admin-boton admin-alarma-activar" type="button" onClick={() => void activarSonido()}>
                🔔 Activar alarmas
              </button>
              <button className="admin-alarma-popup-cerrar" type="button" onClick={() => setMostrarPopupActivar(false)}>
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}

      {errorSonido && <p className="error" role="alert">{errorSonido}</p>}

      {alertas.length > 0 && (
        <div className="admin-alarma-alertas" role="alert" aria-live="assertive">
          <strong>⏰ Terminó {alertas.length === 1 ? 'el turno' : 'un turno'}</strong>
          <div className="admin-alarma-lista">
            {alertas.map((reserva) => {
              const cancha = canchas.find((item) => item.id === reserva.canchaId)
              return (
                <div className="admin-alarma-item" key={reserva.id}>
                  <div>
                    <strong>{cancha?.nombre ?? 'Campo desconocido'}</strong>
                    <span>{reserva.alias} · terminó a las {horaVisible(finDeReserva(reserva))}</span>
                  </div>
                  <button className="admin-boton admin-alarma-confirmar" type="button" onClick={() => marcarAvisada(reserva.id)}>
                    Marcar avisado
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
