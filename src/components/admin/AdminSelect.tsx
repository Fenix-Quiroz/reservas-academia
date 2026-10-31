import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface OpcionAdminSelect<T extends string | number> {
  value: T
  label: string
  detalle?: string
}

export interface AdminSelectProps<T extends string | number> {
  id?: string
  value: T
  opciones: readonly OpcionAdminSelect<T>[]
  disabled?: boolean
  onChange: (value: T) => void
  ariaLabel?: string
}

export default function AdminSelect<T extends string | number>({
  id,
  value,
  opciones,
  disabled = false,
  onChange,
  ariaLabel,
}: AdminSelectProps<T>) {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const listaRef = useRef<HTMLDivElement | null>(null)

  const opcionSeleccionada = opciones.find((op) => op.value === value) ?? opciones[0]

  useEffect(() => {
    if (!abierto) return

    const manejarClickFuera = (e: MouseEvent | PointerEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }

    const manejarTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false)
      }
    }

    document.addEventListener('pointerdown', manejarClickFuera)
    document.addEventListener('keydown', manejarTeclado)
    return () => {
      document.removeEventListener('pointerdown', manejarClickFuera)
      document.removeEventListener('keydown', manejarTeclado)
    }
  }, [abierto])

  useEffect(() => {
    if (abierto && listaRef.current) {
      const activa = listaRef.current.querySelector<HTMLElement>('[aria-selected="true"]')
      if (activa) {
        activa.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [abierto])

  return (
    <div
      ref={contenedorRef}
      className={`admin-custom-select-contenedor${abierto ? ' abierto' : ''}${disabled ? ' deshabilitado' : ''}`}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={ariaLabel}
        className={`admin-custom-select-trigger${abierto ? ' abierto' : ''}`}
        onClick={() => {
          if (!disabled) setAbierto((prev) => !prev)
        }}
      >
        <span className="admin-custom-select-trigger-texto">
          <span className="admin-custom-select-trigger-label">
            {opcionSeleccionada?.label ?? ''}
          </span>
          {opcionSeleccionada?.detalle && (
            <span className="admin-custom-select-trigger-detalle">
              {opcionSeleccionada.detalle}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2.5}
          className={`admin-custom-select-chevron${abierto ? ' rotado' : ''}`}
          aria-hidden="true"
        />
      </button>

      {abierto && (
        <div
          ref={listaRef}
          role="listbox"
          tabIndex={-1}
          className="admin-custom-select-menu"
        >
          {opciones.map((opcion) => {
            const esActiva = opcion.value === value
            return (
              <button
                key={String(opcion.value)}
                type="button"
                role="option"
                aria-selected={esActiva}
                className={`admin-custom-select-opcion${esActiva ? ' activa' : ''}`}
                onClick={() => {
                  onChange(opcion.value)
                  setAbierto(false)
                }}
              >
                <span className="admin-custom-select-opcion-texto">
                  <span className="admin-custom-select-opcion-label">{opcion.label}</span>
                  {opcion.detalle && (
                    <span className="admin-custom-select-opcion-detalle">{opcion.detalle}</span>
                  )}
                </span>
                {esActiva && (
                  <Check
                    size={16}
                    strokeWidth={2.8}
                    className="admin-custom-select-check"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
