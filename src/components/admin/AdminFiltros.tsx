import { fechaISO, sumarDias } from '../../reservas'
import type { Campo, FiltrosAdmin } from '../../types.js'

export interface AdminFiltrosProps {
  filtros: FiltrosAdmin
  onChange: (siguiente: Partial<FiltrosAdmin>) => void
  canchas: readonly Campo[]
}

const hoy = (): string => fechaISO(new Date())

export default function AdminFiltros({ filtros, onChange, canchas }: AdminFiltrosProps) {
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
      <label>
        <span>Campo</span>
        <select value={filtros.canchaId} onChange={(e) => onChange({ canchaId: e.target.value })}>
          <option value="todas">Todos los campos</option>
          {canchas.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}
        </select>
      </label>
      <label className="admin-buscar">
        <span>Alias o nombre</span>
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
