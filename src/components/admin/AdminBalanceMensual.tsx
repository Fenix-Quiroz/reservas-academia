import { useMemo, useRef, useState } from 'react'
import type { BloqueoEvento, Campo, Reserva } from '../../types.js'
import reservasDemoJson from '../../data/reservasBalanceDemo.json'
import { construirBalanceMensual, mesActual } from '../../balanceMensual.js'
import { descargarBalanceMensual } from '../../exportarBalance.js'
import { crearBloqueoAccion } from '../../accionUnica'

export interface AdminBalanceMensualProps {
  reservas: readonly Reserva[]
  canchas: readonly Campo[]
  eventos: readonly BloqueoEvento[]
}

const reservasBalanceDemo = reservasDemoJson as readonly Reserva[]

export default function AdminBalanceMensual({ reservas, canchas, eventos }: AdminBalanceMensualProps) {
  const [mes, setMes] = useState(mesActual)
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState('')
  const bloqueoDescarga = useRef(crearBloqueoAccion())
  const esModoDemo = import.meta.env.DEV || import.meta.env.VITE_BALANCE_DEMO === 'true'
  const reservasParaBalance = esModoDemo ? reservasBalanceDemo : reservas
  const balance = useMemo(() => construirBalanceMensual(mes, reservasParaBalance, canchas, eventos), [mes, reservasParaBalance, canchas, eventos])

  async function descargar(): Promise<void> {
    if (!bloqueoDescarga.current.adquirir()) return
    setErrorDescarga('')
    setDescargando(true)
    try {
      await descargarBalanceMensual(balance)
    } catch {
      setErrorDescarga('No pudimos descargar el balance. Inténtalo de nuevo.')
    } finally {
      setDescargando(false)
      bloqueoDescarga.current.liberar()
    }
  }

  return (
    <section className="admin-balance" aria-labelledby="titulo-balance">
      <div className="admin-balance-cabecera">
        <div>
          <p className="admin-kicker">Reportes</p>
          <h2 id="titulo-balance">Balance mensual</h2>
          <p className="admin-balance-ayuda">
            {esModoDemo
              ? 'Modo prueba local: se usan reservas ficticias de agosto, septiembre y octubre de 2026.'
              : 'Descarga un resumen ordenado de reservas finalizadas, horas e ingresos.'}
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
        <span><strong>S/ {balance.ingresosEventosEspeciales}</strong> en eventos especiales</span>
      </div>
    </section>
  )
}
