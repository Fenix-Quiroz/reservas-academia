import { useEffect, useRef, useState } from 'react'
import type { Campo, Reserva } from '../../types.js'
import { finDeReserva, ordenarPorFin, patronAlarma, reservasDePrueba } from '../../utils/alarmaTurno'

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
  const [errorSonido, setErrorSonido] = useState('')
  const emitidas = useRef(new Set<string>())
  const contextoAudio = useRef<AudioContext | null>(null)

  useEffect(() => {
    const ahora = Date.now()

    // Las reservas que ya terminaron antes de abrir el panel no generan una alarma atrasada.
    for (const reserva of reservas) {
      if (finDeReserva(reserva).getTime() <= ahora) emitidas.current.add(reserva.id)
    }

    const revisarTurnos = () => {
      const instante = Date.now()
      const terminadas = reservas.filter((reserva) => (
        !emitidas.current.has(reserva.id) && finDeReserva(reserva).getTime() <= instante
      ))

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

  async function activarSonido(): Promise<void> {
    try {
      if (!contextoAudio.current) contextoAudio.current = new AudioContext()
      await contextoAudio.current.resume()
      emitirTono(contextoAudio.current)
      setSonidoActivado(true)
      setErrorSonido('')
    } catch {
      setErrorSonido('No pudimos activar el sonido. Revisa el volumen del dispositivo.')
    }
  }

  function marcarAvisada(id: string): void {
    setAlertas((actuales) => actuales.filter((reserva) => reserva.id !== id))
  }

  async function simularAlarma(): Promise<void> {
    if (!sonidoActivado) await activarSonido()
    setAlertas((actuales) => ordenarPorFin([...actuales, ...reservasDePrueba()]))
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
