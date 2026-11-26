import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import type { BloqueoEvento, Campo, ComprobanteAdmin, Reserva } from '../../types.js'
import { construirBalanceMensual, mesActual } from '../../balanceMensual.js'
import { descargarBalanceMensual } from '../../exportarBalance.js'
import { descargarBalanceTexto } from '../../exportarBalanceTexto.js'
import { descargarDatosReservas, type ResolverComprobante, type ResolverUrlComprobante } from '../../exportarDatosReservas.js'
import { crearBloqueoAccion } from '../../accionUnica'

export interface AdminBalanceMensualProps {
  reservas: readonly Reserva[]
  canchas: readonly Campo[]
  eventos: readonly BloqueoEvento[]
  comprobantes: readonly ComprobanteAdmin[]
  resolverComprobante?: ResolverComprobante
  resolverUrlComprobante?: ResolverUrlComprobante
  datosCargados: boolean
}

export default function AdminBalanceMensual({
  reservas,
  canchas,
  eventos,
  comprobantes,
  resolverComprobante,
  resolverUrlComprobante,
  datosCargados,
}: AdminBalanceMensualProps) {
  const [mes, setMes] = useState(mesActual)
  const [descargando, setDescargando] = useState(false)
  const [descargandoTexto, setDescargandoTexto] = useState(false)
  const [descargandoDatos, setDescargandoDatos] = useState(false)
  const [progresoDatos, setProgresoDatos] = useState<{ completados: number; total: number } | null>(null)
  const [errorDescarga, setErrorDescarga] = useState('')
  const [errorDatosDescarga, setErrorDatosDescarga] = useState('')
  const bloqueoDescarga = useRef(crearBloqueoAccion())

  useEffect(() => {
    if (!errorDescarga) return undefined
    const temporizador = window.setTimeout(() => setErrorDescarga(''), 5000)
    return () => window.clearTimeout(temporizador)
  }, [errorDescarga])

  useEffect(() => {
    if (!errorDatosDescarga) return undefined
    const temporizador = window.setTimeout(() => setErrorDatosDescarga(''), 5000)
    return () => window.clearTimeout(temporizador)
  }, [errorDatosDescarga])

  const balance = useMemo(() => construirBalanceMensual(mes, reservas, canchas, eventos), [mes, reservas, canchas, eventos])

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
      await descargarBalanceMensual(balance, canchas)
    } catch {
      setErrorDescarga('No pudimos descargar el balance. Inténtalo de nuevo.')
    } finally {
      setDescargando(false)
      bloqueoDescarga.current.liberar()
    }
  }

  async function descargarDatos(): Promise<void> {
    if (!bloqueoDescarga.current.adquirir()) return
    setErrorDatosDescarga('')
    setDescargandoDatos(true)
    setProgresoDatos(null)
    try {
      await descargarDatosReservas(
        reservas,
        canchas,
        comprobantes,
        resolverComprobante,
        (completados, total) => setProgresoDatos({ completados, total }),
        resolverUrlComprobante,
      )
    } catch {
      setErrorDatosDescarga('No pudimos descargar los datos de reservas. Inténtalo de nuevo.')
    } finally {
      setDescargandoDatos(false)
      setProgresoDatos(null)
      bloqueoDescarga.current.liberar()
    }
  }

  return (
    <section className="admin-balance" aria-labelledby="titulo-balance">
      <div className="admin-balance-cabecera">
        <div className="admin-balance-info">
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
            className="admin-boton admin-control-primario admin-balance-descargar"
            type="button"
            onClick={() => void descargar()}
            disabled={descargando || descargandoTexto || descargandoDatos}
          >
            <Download size={20} strokeWidth={2.5} aria-hidden="true" />
            <span>{descargando ? 'Preparando balance…' : 'Descargar balance'}</span>
          </button>
          <button
            className="admin-boton admin-balance-descargar-txt"
            type="button"
            onClick={() => void descargarTexto()}
            disabled={descargando || descargandoTexto || descargandoDatos}
          >
            <FileText size={20} strokeWidth={2.5} aria-hidden="true" />
            <span>{descargandoTexto ? 'Preparando texto…' : 'Descargar texto (.txt)'}</span>
          </button>
          <button
            className="admin-boton admin-balance-descargar-txt"
            type="button"
            onClick={() => void descargarDatos()}
            disabled={!datosCargados || descargando || descargandoTexto || descargandoDatos}
          >
            <Download size={20} strokeWidth={2.5} aria-hidden="true" />
            <span>
              {descargandoDatos
                ? progresoDatos && progresoDatos.total > 0
                  ? `Preparando comprobantes ${progresoDatos.completados}/${progresoDatos.total}…`
                  : 'Preparando datos…'
                : 'Descargar datos de reservas'}
            </span>
          </button>
        </div>
      </div>

      {errorDescarga && <p className="admin-balance-error" role="alert">{errorDescarga}</p>}
      {errorDatosDescarga && <p className="admin-balance-error" role="alert">{errorDatosDescarga}</p>}

      <div className="admin-balance-resumen" aria-live="polite">
        <span><strong>{balance.reservasFinalizadas}</strong> reservas finalizadas</span>
        <span><strong>{balance.horasAlquiladas}</strong> horas alquiladas</span>
        <span><strong>S/ {balance.ingresosTotales}</strong> generados</span>
        <span><strong>S/ {balance.ingresosEventosEspeciales}</strong> en eventos especiales</span>
      </div>
    </section>
  )
}
