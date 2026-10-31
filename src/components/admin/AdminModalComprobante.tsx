import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, Loader2, Maximize2, Minimize2, X } from 'lucide-react'
import type { Campo, ComprobanteAdmin, Reserva } from '../../types.js'
import { rangoHablado } from '../../reservas.js'
import { fechaVisible } from './AdminReservaCard.js'

export interface AdminModalComprobanteProps {
  comprobante: ComprobanteAdmin
  reserva?: Reserva
  cancha?: Campo
  url: string | null
  cargando: boolean
  error: string | null
  onClose: () => void
  onDownload?: (comprobante: ComprobanteAdmin) => void | Promise<void>
  onReintentar?: () => void
}

export default function AdminModalComprobante({
  comprobante,
  reserva,
  cancha,
  url,
  cargando,
  error,
  onClose,
  onDownload,
  onReintentar,
}: AdminModalComprobanteProps) {
  const [zoomed, setZoomed] = useState(false)
  const [imagenCargada, setImagenCargada] = useState(false)
  const botonCerrarRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setImagenCargada(false)
  }, [url])

  useEffect(() => {
    // Foco inicial en el botón de cerrar
    const frame = window.requestAnimationFrame(() => {
      botonCerrarRef.current?.focus()
    })

    // Bloquear scroll de la página de fondo
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', manejarTecla)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = overflowPrevio
      window.removeEventListener('keydown', manejarTecla)
    }
  }, [onClose])

  const esConfirmado = comprobante.estado === 'confirmado'

  return (
    <div
      className="admin-modal-comprobante-capa"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-comprobante-titulo"
    >
      <article
        className="admin-modal-comprobante"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="admin-modal-comprobante-cabecera">
          <div className="admin-modal-comprobante-info">
            <div className="admin-modal-comprobante-kicker">
              <span>Comprobante de pago</span>
              <span className={`estado estado-${comprobante.estado}`}>
                {esConfirmado ? 'Comprobante confirmado' : comprobante.estado === 'pendiente' ? 'Pendiente' : comprobante.estado}
              </span>
            </div>
            <h3 id="modal-comprobante-titulo" className="admin-modal-comprobante-titulo">
              {reserva?.alias ?? 'Cliente'} {reserva?.celular ? `· ${reserva.celular}` : ''}
            </h3>
            <span className="admin-modal-comprobante-subtitulo">
              {cancha?.nombre ?? 'Campo'}
              {reserva ? ` · ${fechaVisible(reserva.fecha)} (${rangoHablado(reserva.inicio, reserva.horas)})` : ''}
              {reserva?.montoTotal ? ` · S/ ${reserva.montoTotal}` : ''}
            </span>
          </div>
          <button
            ref={botonCerrarRef}
            type="button"
            className="admin-modal-comprobante-cerrar"
            aria-label="Cerrar comprobante"
            onClick={onClose}
          >
            <X size={20} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </header>

        <div className="admin-modal-comprobante-cuerpo">
          {cargando ? (
            <div className="admin-modal-comprobante-cargando" role="status">
              <Loader2 size={32} className="admin-modal-comprobante-spinner" aria-hidden="true" />
              <span>Cargando imagen del comprobante…</span>
            </div>
          ) : error ? (
            <div className="admin-modal-comprobante-error" role="alert">
              <AlertCircle size={32} strokeWidth={2} aria-hidden="true" />
              <span>{error}</span>
              {onReintentar && (
                <button
                  type="button"
                  className="admin-modal-btn admin-modal-btn-secundario"
                  onClick={onReintentar}
                >
                  Reintentar
                </button>
              )}
            </div>
          ) : url ? (
            <div className="admin-modal-comprobante-visor">
              {!imagenCargada && (
                <div className="admin-modal-comprobante-cargando" role="status">
                  <Loader2 size={28} className="admin-modal-comprobante-spinner" aria-hidden="true" />
                  <span>Cargando comprobante…</span>
                </div>
              )}
              <img
                src={url}
                alt={`Comprobante de pago de ${reserva?.alias ?? 'reserva'}`}
                decoding="async"
                loading="eager"
                style={{ display: imagenCargada ? 'block' : 'none' }}
                className={`admin-modal-comprobante-img${zoomed ? ' zoomed' : ''}`}
                onLoad={() => setImagenCargada(true)}
                onClick={() => setZoomed((actual) => !actual)}
              />
              {imagenCargada && (
                <button
                  type="button"
                  className="admin-modal-comprobante-zoom-badge"
                  onClick={() => setZoomed((actual) => !actual)}
                  aria-label={zoomed ? 'Reducir imagen' : 'Ampliar imagen'}
                >
                  {zoomed ? <Minimize2 size={13} aria-hidden="true" /> : <Maximize2 size={13} aria-hidden="true" />}
                  <span>{zoomed ? 'Reducir' : 'Ampliar'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="admin-modal-comprobante-error">
              <span>No se pudo cargar la imagen del comprobante.</span>
            </div>
          )}
        </div>

        <footer className="admin-modal-comprobante-pie">
          <div className="admin-modal-comprobante-acciones">
            {onDownload && (
              <button
                type="button"
                className="admin-modal-btn admin-modal-btn-secundario"
                onClick={() => onDownload(comprobante)}
              >
                <Download size={15} strokeWidth={2.2} aria-hidden="true" />
                <span>Descargar</span>
              </button>
            )}
          </div>
          <button
            type="button"
            className="admin-modal-btn admin-modal-btn-cerrar"
            onClick={onClose}
          >
            Cerrar
          </button>
        </footer>
      </article>
    </div>
  )
}
