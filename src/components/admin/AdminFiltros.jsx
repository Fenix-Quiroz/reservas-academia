import { fechaISO, sumarDias } from '../../reservas.js'

const hoy = () => fechaISO(new Date())

export default function AdminFiltros({ filtros, onChange, canchas }) {
  return (
    <div className="admin-filtros">
      <label>
        <span>Ver</span>
        <select value={filtros.vista} onChange={(e) => onChange({ vista: e.target.value })}>
          <option value="proximas">Próximas</option>
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
