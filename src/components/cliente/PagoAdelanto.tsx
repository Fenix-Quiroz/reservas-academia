import { useEffect, useRef, useState } from 'react'
import { ADELANTO_YAPE, MAX_COMPROBANTE_BYTES, NUMERO_YAPE, TITULAR_YAPE } from '../../pagos'
import { crearBloqueoAccion } from '../../accionUnica'

export interface PagoAdelantoProps {
  archivo: File | null
  disabled: boolean
  error?: string
  onArchivoChange: (archivo: File | null) => void
}

export default function PagoAdelanto({ archivo, disabled, error, onArchivoChange }: PagoAdelantoProps) {
  const [copiado, setCopiado] = useState(false)
  const [errorCopiado, setErrorCopiado] = useState('')
  const [vistaPrevia, setVistaPrevia] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const bloqueoCopia = useRef(crearBloqueoAccion())

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia('')
      return
    }

    const vistaPrevia = URL.createObjectURL(archivo)
    setVistaPrevia(vistaPrevia)
    return () => URL.revokeObjectURL(vistaPrevia)
  }, [archivo])

  function cambiarImagen(): void {
    onArchivoChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function copiarNumero(): Promise<void> {
    if (disabled || !bloqueoCopia.current.adquirir()) return
    try {
      await navigator.clipboard.writeText(NUMERO_YAPE)
      setCopiado(true)
      setErrorCopiado('')
      window.setTimeout(() => setCopiado(false), 1800)
    } catch {
      setCopiado(false)
      setErrorCopiado('No se pudo copiar. Mantén presionado el número para copiarlo manualmente.')
    } finally {
      bloqueoCopia.current.liberar()
    }
  }

  return (
    <div className="pago-adelanto" aria-labelledby="pago-adelanto-titulo">
      <h2 id="pago-adelanto-titulo">Asegura tu reserva con Yape</h2>
      <p>
        Para reservar y asegurar debes yapear mínimo <strong>{ADELANTO_YAPE} soles</strong>, al NRO
      </p>
      <div className="numero-yape" aria-label={`NRO (${NUMERO_YAPE} ${TITULAR_YAPE})`}>
        <strong>{NUMERO_YAPE}</strong>
        <span>{TITULAR_YAPE}</span>
        <button className="boton-copiar" type="button" onClick={() => void copiarNumero()} disabled={disabled}>
          {copiado ? 'Número copiado' : 'Copiar número'}
        </button>
      </div>
      {errorCopiado && <small className="ayuda-campo" role="status">{errorCopiado}</small>}
      <p className="pago-instruccion">Tómale captura y súbela aquí 👇🏼</p>
      {archivo && vistaPrevia ? (
        <div className="comprobante-preview" aria-live="polite">
          <img src={vistaPrevia} alt="Vista previa del comprobante" />
          <div className="comprobante-preview-info">
            <strong>{archivo.name}</strong>
            <span>{(archivo.size / (1024 * 1024)).toFixed(2)} MB</span>
            <button
              className="boton-cambiar-comprobante"
              type="button"
              disabled={disabled}
              onClick={cambiarImagen}
            >
              Cambiar imagen
            </button>
          </div>
        </div>
      ) : (
        <label className="comprobante-campo">
          <span>Subir captura de Yape</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={(evento) => onArchivoChange(evento.target.files?.[0] ?? null)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'comprobante-ayuda comprobante-error' : 'comprobante-ayuda'}
          />
        </label>
      )}
      <small id="comprobante-ayuda" className="ayuda-campo">
        JPG, PNG o WEBP · máximo {MAX_COMPROBANTE_BYTES / (1024 * 1024)} MB
      </small>
      {error && <p id="comprobante-error" className="error" role="alert">{error}</p>}
    </div>
  )
}
