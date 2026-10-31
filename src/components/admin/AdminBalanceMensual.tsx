import { useMemo, useRef, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import type { BloqueoEvento, Campo, Reserva } from '../../types.js'
import reservasDemoJson from '../../data/reservasBalanceDemo.json'
import eventosDemoJson from '../../data/eventosBalanceDemo.json'
import { construirBalanceMensual, mesActual } from '../../balanceMensual.js'
import { descargarBalanceMensual } from '../../exportarBalance.js'
import { descargarBalanceTexto } from '../../exportarBalanceTexto.js'
import { crearBloqueoAccion } from '../../accionUnica'

export interface AdminBalanceMensualProps {
  reservas: readonly Reserva[]
  canchas: readonly Campo[]
  eventos: readonly BloqueoEvento[]
  esModoDemo?: boolean
}

const reservasBalanceDemo = reservasDemoJson as readonly Reserva[]
const eventosBalanceDemo = eventosDemoJson as readonly BloqueoEvento[]

export default function AdminBalanceMensual({ reservas, canchas, eventos, esModoDemo: modoDemoProp }: AdminBalanceMensualProps) {
  const [mes, setMes] = useState(mesActual)
  const [descargando, setDescargando] = useState(false)
  const [descargandoTexto, setDescargandoTexto] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState('')
  const bloqueoDescarga = useRef(crearBloqueoAccion())
  const esModoDemo = Boolean(modoDemoProp ?? (import.meta.env.VITE_BALANCE_DEMO === 'true'))
  const reservasParaBalance = esModoDemo ? reservasBalanceDemo : reservas
  const eventosParaBalance = esModoDemo ? eventosBalanceDemo : eventos
  const balance = useMemo(() => construirBalanceMensual(mes, reservasParaBalance, canchas, eventosParaBalance), [mes, reservasParaBalance, canchas, eventosParaBalance])

  function descargarTexto(): void {
    if (!bloqueoDescarga.current.adquirir()) return
    setErrorDescarga('')
    setDescargandoTexto(true)
    try {
      descargarBalanceTexto(balance, canchas)
    } catch {
      setErrorDescarga('No pudimos descargar el reporte de texto. Inténtalo de nuevo.')
    } finally {
      setDescargandoTexto(false)
      bloqueoDescarga.current.liberar()
    }
  }

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
            className="admin-boton admin-control-primario admin-balance-descargar"
            type="button"
            onClick={() => void descargar()}
            disabled={descargando || descargandoTexto}
          >
            <Download size={20} strokeWidth={2.5} aria-hidden="true" />
            <span>{descargando ? 'Preparando balance…' : 'Descargar Excel'}</span>
          </button>
          <button
            className="admin-boton admin-balance-descargar-txt"
            type="button"
            onClick={() => void descargarTexto()}
            disabled={descargando || descargandoTexto}
          >
            <FileText size={20} strokeWidth={2.5} aria-hidden="true" />
            <span>{descargandoTexto ? 'Preparando texto…' : 'Descargar texto (.txt)'}</span>
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
