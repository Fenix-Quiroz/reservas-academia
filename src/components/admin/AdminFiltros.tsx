import { fechaISO, sumarDias } from '../../reservas'
import type { Campo, FiltrosAdmin } from '../../types.js'

export interface AdminFiltrosProps {
  filtros: FiltrosAdmin
  onChange: (siguiente: Partial<FiltrosAdmin>) => void
  canchas: readonly Campo[]
}

const hoy = (): string => fechaISO(new Date())

export default function AdminFiltros({ filtros, onChange }: AdminFiltrosProps) {
  return (
    <div className="admin-filtros">
      <label>
        <span>Estado</span>
        <select value={filtros.vista} onChange={(e) => onChange({ vista: e.target.value as FiltrosAdmin['vista'] })}>
          <option value="proximas">Próximas</option>
          <option value="en-curso">En curso</option>
          <option value="por-revisar">Por revisar</option>
          <option value="finalizadas">Finalizadas</option>
          <option value="no-asistieron">No asistieron</option>
          <option value="canceladas">Canceladas</option>
          <option value="todas">Todas</option>
        </select>
      </label>
      <label>
        <span>Fecha</span>
        <select value={filtros.fecha} onChange={(e) => onChange({ fecha: e.target.value })}>
          <option value="todas">Todas las fechas</option>
          <option value={hoy()}>Hoy</option>
          <option value={fechaISO(sumarDias(1))}>Mañana</option>
        </select>
      </label>
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
