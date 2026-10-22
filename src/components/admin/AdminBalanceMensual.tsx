import { useMemo, useState } from 'react'
import type { Campo, Reserva } from '../../types.js'
import { construirBalanceMensual, mesActual } from '../../balanceMensual.js'
import { descargarBalanceMensual } from '../../exportarBalance.js'

export interface AdminBalanceMensualProps {
  reservas: readonly Reserva[]
  canchas: readonly Campo[]
}

export default function AdminBalanceMensual({ reservas, canchas }: AdminBalanceMensualProps) {
  const [mes, setMes] = useState(mesActual)
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState('')
  const balance = useMemo(() => construirBalanceMensual(mes, reservas, canchas), [mes, reservas, canchas])

  async function descargar(): Promise<void> {
    setErrorDescarga('')
    setDescargando(true)
    try {
      await descargarBalanceMensual(balance)
    } catch {
      setErrorDescarga('No pudimos descargar el balance. Inténtalo de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section className="admin-balance" aria-labelledby="titulo-balance">
      <div className="admin-balance-cabecera">
        <div>
          <p className="admin-kicker">Reportes</p>
          <h2 id="titulo-balance">Balance mensual</h2>
          <p className="admin-balance-ayuda">
            Descarga un resumen ordenado de reservas finalizadas, horas e ingresos.
          </p>
        </div>
        <div className="admin-balance-controles">
          <label htmlFor="mes-balance">Mes del reporte</label>
          <input
            id="mes-balance"
            type="month"
            value={mes}
            onChange={(evento) => setMes(evento.target.value || mesActual())}
          />
          <button
            className="admin-boton admin-balance-descargar"
            type="button"
            onClick={() => void descargar()}
            disabled={descargando}
          >
            {descargando ? 'Preparando balance…' : 'Descargar balance mensual'}
          </button>
        </div>
      </div>

      {errorDescarga && <p className="admin-balance-error" role="alert">{errorDescarga}</p>}

      <div className="admin-balance-resumen" aria-live="polite">
        <span><strong>{balance.reservasFinalizadas}</strong> reservas finalizadas</span>
        <span><strong>{balance.horasAlquiladas}</strong> horas alquiladas</span>
        <span><strong>S/ {balance.ingresosTotales}</strong> generados</span>
      </div>
    </section>
  )
}
