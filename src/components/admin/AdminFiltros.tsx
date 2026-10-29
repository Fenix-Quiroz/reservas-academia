import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { fechaISO, sumarDias } from '../../reservas'
import type { Campo, FiltrosAdmin, VistaAdmin } from '../../types.js'

export interface AdminFiltrosProps {
  filtros: FiltrosAdmin
  onChange: (siguiente: Partial<FiltrosAdmin>) => void
  canchas: readonly Campo[]
  porRevisar?: number
}

const hoy = (): string => fechaISO(new Date())

export interface AdminFiltroMenuOpcion {
  value: string
  label: string
}

interface AdminFiltroMenuProps {
  id: string
  label: string
  value: string
  opciones: readonly AdminFiltroMenuOpcion[]
  onChange: (value: string) => void
  notificacionValue?: string
  notificacionActiva?: boolean
}

export function AdminFiltroMenu({
  id,
  label,
  value,
  opciones,
  onChange,
  notificacionValue,
  notificacionActiva = false,
}: AdminFiltroMenuProps) {
  const [abierto, setAbierto] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const seleccionada = opciones.find((opcion) => opcion.value === value) ?? opciones[0]

  useEffect(() => {
    const cerrarFuera = (evento: PointerEvent) => {
      if (!menuRef.current?.contains(evento.target as Node)) setAbierto(false)
    }
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('pointerdown', cerrarFuera)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [])

  return (
    <div className="admin-filtro-menu" ref={menuRef}>
      <span className="admin-filtro-menu-label">
        {label}
        {notificacionActiva && <span className="admin-filtro-notificacion" title="Hay reservas por revisar" aria-label="Hay reservas por revisar" />}
      </span>
      <button
        id={id}
        className={`admin-filtro-menu-boton${abierto ? ' abierto' : ''}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${id}-opciones`}
        onClick={() => setAbierto((actual) => !actual)}
      >
        <span className="admin-filtro-menu-boton-texto">
          {seleccionada?.label ?? ''}
        </span>
        <ChevronDown size={18} strokeWidth={2.5} aria-hidden="true" />
      </button>
      {abierto && (
        <div id={`${id}-opciones`} className="admin-filtro-menu-opciones" role="listbox" aria-label={label}>
          {opciones.map((opcion) => {
            const activa = opcion.value === value
            return (
              <button
                key={opcion.value}
                className={`admin-filtro-menu-opcion${activa ? ' activa' : ''}`}
                type="button"
                role="option"
                aria-selected={activa}
                onClick={() => {
                  onChange(opcion.value)
                  setAbierto(false)
                }}
              >
                <span className="admin-filtro-menu-opcion-texto">
                  <strong>{opcion.label}</strong>
                  {notificacionActiva && opcion.value === notificacionValue && (
                    <span className="admin-filtro-notificacion" title="Hay reservas por revisar" aria-label="Hay reservas por revisar" />
                  )}
                </span>
                {activa && <Check size={18} strokeWidth={3} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const opcionesEstado: readonly AdminFiltroMenuOpcion[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'en-curso', label: 'En curso' },
  { value: 'por-revisar', label: 'Por revisar' },
  { value: 'historial', label: 'Historial' },
]

export default function AdminFiltros({ filtros, onChange, porRevisar = 0 }: AdminFiltrosProps) {
  const opcionesFecha: readonly AdminFiltroMenuOpcion[] = [
    { value: 'todas', label: 'Todas las fechas' },
    { value: hoy(), label: 'Hoy' },
    { value: fechaISO(sumarDias(1)), label: 'Mañana' },
  ]

  return (
    <div className="admin-filtros">
      <AdminFiltroMenu
        id="filtro-estado"
        label="Estado"
        value={filtros.vista}
        opciones={opcionesEstado}
        notificacionValue="por-revisar"
        notificacionActiva={porRevisar > 0}
        onChange={(value) => onChange({ vista: value as VistaAdmin })}
      />
      <AdminFiltroMenu
        id="filtro-fecha"
        label="Fecha"
        value={filtros.fecha}
        opciones={opcionesFecha}
        onChange={(value) => onChange({ fecha: value })}
      />
      <label className="admin-buscar">
        <span>Nombre o número</span>
        <input
          type="search"
          value={filtros.buscar}
          onChange={(e) => onChange({ buscar: e.target.value })}
          placeholder="Ej: David o 931..."
        />
      </label>
    </div>
  )
}

export function AdminFiltrosCampos({ filtros, onChange, canchas }: AdminFiltrosProps) {
  return (
    <div className="admin-filtros-campos" role="group" aria-label="Campos">
      <button
        className="admin-filtro-campo"
        type="button"
        aria-pressed={filtros.canchaId === 'todas'}
        onClick={() => onChange({ canchaId: 'todas' })}
      >
        Todos los campos
      </button>
      {canchas.map((cancha) => {
        const seleccionado = String(filtros.canchaId) === String(cancha.id)
        return (
          <button
            key={cancha.id}
            className="admin-filtro-campo"
            type="button"
            aria-pressed={seleccionado}
            onClick={() => onChange({ canchaId: cancha.id })}
          >
            {cancha.id === 4 ? 'Campo de vóley' : `Campo ${cancha.id}`}
          </button>
        )
      })}
    </div>
  )
}
