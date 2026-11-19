import { useEffect, useState } from 'react'
import {
  ETIQUETA_BOTON_ACTIVAR_NOTIFICACIONES,
  activarNotificacionesPush,
  estadoNotificacionesPush,
  leerEstadoNotificacionesPush,
  mensajeEstadoNotificaciones,
  type EstadoNotificacionesPush,
} from '../../notificacionesPush'

export interface AdminNotificacionesProps {
  supabaseConfigurado: boolean
}

export default function AdminNotificaciones({ supabaseConfigurado }: AdminNotificacionesProps) {
  const [estado, setEstado] = useState<EstadoNotificacionesPush>(
    estadoNotificacionesPush('default', false, supabaseConfigurado),
  )
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (!supabaseConfigurado) return undefined
    let montado = true
    void leerEstadoNotificacionesPush().then((siguiente) => {
      if (montado) setEstado(siguiente)
    })
    return () => {
      montado = false
    }
  }, [supabaseConfigurado])

  if (!supabaseConfigurado) return null

  async function activar(): Promise<void> {
    if (procesando || estado === 'activadas' || estado === 'bloqueadas') return
    setProcesando(true)
    try {
      const resultado = await activarNotificacionesPush()
      setEstado(resultado.estado)
    } finally {
      setProcesando(false)
    }
  }

  const activadas = estado === 'activadas'
  const bloqueadas = estado === 'bloqueadas'
  return (
    <div className="admin-notificaciones" aria-live="polite">
      <button
        className="boton-secundario admin-boton admin-notificaciones-boton"
        type="button"
        onClick={() => void activar()}
        disabled={procesando || activadas || bloqueadas}
        title={mensajeEstadoNotificaciones(estado)}
      >
        {procesando ? 'Activando…' : activadas ? '🔔 Notificaciones activadas' : ETIQUETA_BOTON_ACTIVAR_NOTIFICACIONES}
      </button>
      {!activadas && <span className="admin-notificaciones-mensaje" role="status">{mensajeEstadoNotificaciones(estado)}</span>}
    </div>
  )
}
