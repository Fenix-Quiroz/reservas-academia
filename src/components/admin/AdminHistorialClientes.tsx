import { useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  MessageCircle,
  Phone,
  Search,
  Trophy,
  Users,
} from 'lucide-react'
import datosDemo from '../../data/clientes-frecuentes-demo.json'
import type { ClienteFrecuente } from '../../clientesFrecuentes'

export interface AdminHistorialClientesProps {
  clientes?: readonly ClienteFrecuente[]
}

type CriterioOrden = 'total-desc' | 'mes-desc' | 'nombre-asc' | 'horas-desc' | 'reciente-desc'

const CLIENTES_POR_PAGINA = 10

export default function AdminHistorialClientes({ clientes = datosDemo }: AdminHistorialClientesProps) {
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<CriterioOrden>('total-desc')
  const [paginaActual, setPaginaActual] = useState(1)

  // Métricas globales
  const metricas = useMemo(() => {
    const totalClientes = clientes.length
    const totalReservasHistoricas = clientes.reduce((acc, c) => acc + c.reservasTotal, 0)
    const totalReservasMes = clientes.reduce((acc, c) => acc + c.reservasMes, 0)
    const promedioMes = totalClientes > 0 ? (totalReservasMes / totalClientes).toFixed(1) : '0'

    // Cliente con más reservas
    const topCliente = [...clientes].sort((a, b) => b.reservasTotal - a.reservasTotal)[0] ?? null

    return {
      totalClientes,
      totalReservasHistoricas,
      totalReservasMes,
      promedioMes,
      topCliente,
    }
  }, [clientes])

  // Filtrado y ordenado
  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    const filtrados = clientes.filter((c) => {
      if (!termino) return true
      return c.nombre.toLowerCase().includes(termino) || c.celular.includes(termino)
    })

    return filtrados.sort((a, b) => {
      switch (orden) {
        case 'total-desc':
          return b.reservasTotal - a.reservasTotal
        case 'mes-desc':
          return b.reservasMes - a.reservasMes || b.reservasTotal - a.reservasTotal
        case 'nombre-asc':
          return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        case 'horas-desc':
          return b.horasTotales - a.horasTotales
        case 'reciente-desc':
          return b.ultimaReserva.localeCompare(a.ultimaReserva)
        default:
          return 0
      }
    })
  }, [clientes, busqueda, orden])

  // Paginación
  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / CLIENTES_POR_PAGINA))
  const paginaValida = Math.min(paginaActual, totalPaginas)

  const clientesPaginados = useMemo(() => {
    const inicio = (paginaValida - 1) * CLIENTES_POR_PAGINA
    return clientesFiltrados.slice(inicio, inicio + CLIENTES_POR_PAGINA)
  }, [clientesFiltrados, paginaValida])

  function formatearFecha(fechaIso: string): string {
    const partes = fechaIso.split('-')
    if (partes.length !== 3) return fechaIso
    const [año, mes, dia] = partes
    return `${dia}/${mes}/${año}`
  }

  return (
    <section className="admin-historial-clientes" aria-labelledby="titulo-historial-clientes">
      {/* Cabecera de la sección */}
      <div className="admin-historial-cabecera">
        <div className="admin-historial-info">
          <div className="admin-historial-tags">
            <p className="admin-kicker">Frecuencia & Fidelización</p>
            <span className="admin-tag-demo" title="Datos de prueba para visualización">
              Datos de prueba (Demo)
            </span>
          </div>
          <h2 id="titulo-historial-clientes">Historial de Clientes y Reservas</h2>
          <p className="admin-historial-ayuda">
            Monitorea el nombre, teléfono y cantidad de reservas realizadas en total y durante el mes actual.
          </p>
        </div>
      </div>

      {/* Tarjetas de Métricas Generales */}
      <div className="admin-historial-metricas">
        <div className="admin-metrica-card">
          <div className="admin-metrica-icono gold">
            <Users size={22} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="admin-metrica-datos">
            <span className="admin-metrica-label">Clientes Registrados</span>
            <strong className="admin-metrica-valor">{metricas.totalClientes}</strong>
            <span className="admin-metrica-sub">En base de datos de prueba</span>
          </div>
        </div>

        <div className="admin-metrica-card">
          <div className="admin-metrica-icono emerald">
            <Flame size={22} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="admin-metrica-datos">
            <span className="admin-metrica-label">Reservas este mes</span>
            <strong className="admin-metrica-valor">{metricas.totalReservasMes}</strong>
            <span className="admin-metrica-sub">
              Promedio: <strong>{metricas.promedioMes}</strong> reservas / cliente
            </span>
          </div>
        </div>

        <div className="admin-metrica-card">
          <div className="admin-metrica-icono amber">
            <Calendar size={22} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="admin-metrica-datos">
            <span className="admin-metrica-label">Total histórico</span>
            <strong className="admin-metrica-valor">{metricas.totalReservasHistoricas}</strong>
            <span className="admin-metrica-sub">Reservas acumuladas totales</span>
          </div>
        </div>

        {metricas.topCliente && (
          <div className="admin-metrica-card top-cliente">
            <div className="admin-metrica-icono trophy">
              <Trophy size={22} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <div className="admin-metrica-datos">
              <span className="admin-metrica-label">Cliente más frecuente</span>
              <strong className="admin-metrica-valor top-nombre" title={metricas.topCliente.nombre}>
                {metricas.topCliente.nombre}
              </strong>
              <span className="admin-metrica-sub">
                {metricas.topCliente.reservasTotal} reservas ({metricas.topCliente.reservasMes} este mes)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="admin-historial-toolbar">
        <div className="admin-historial-buscador">
          <Search size={18} className="admin-buscador-icono" aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nombre o celular (ej. Mendoza o 987)..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setPaginaActual(1)
            }}
            aria-label="Buscar cliente"
          />
          {busqueda && (
            <button
              type="button"
              className="admin-buscador-limpiar"
              onClick={() => {
                setBusqueda('')
                setPaginaActual(1)
              }}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="admin-historial-orden">
          <label htmlFor="select-orden-clientes">Ordenar por:</label>
          <select
            id="select-orden-clientes"
            value={orden}
            onChange={(e) => {
              setOrden(e.target.value as CriterioOrden)
              setPaginaActual(1)
            }}
          >
            <option value="total-desc">Mayor total de reservas</option>
            <option value="mes-desc">Más reservas en el mes (~7/mes)</option>
            <option value="horas-desc">Más horas jugadas</option>
            <option value="reciente-desc">Última reserva reciente</option>
            <option value="nombre-asc">Nombre (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Tabla de Resultados (Desktop y Tablet) */}
      <div className="admin-historial-tabla-contenedor">
        <table className="admin-historial-tabla">
          <thead>
            <tr>
              <th scope="col" className="col-rank">#</th>
              <th scope="col" className="col-cliente">Nombre y Apellido</th>
              <th scope="col" className="col-celular">Celular</th>
              <th scope="col" className="col-mes">Reservas en el Mes</th>
              <th scope="col" className="col-total">Reservas en Total</th>
              <th scope="col" className="col-horas">Horas Totales</th>
              <th scope="col" className="col-cancha">Cancha habitual</th>
              <th scope="col" className="col-ultima">Última reserva</th>
            </tr>
          </thead>
          <tbody>
            {clientesPaginados.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-historial-vacio">
                  No se encontraron clientes que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              clientesPaginados.map((cliente, index) => {
                const indiceReal = (paginaValida - 1) * CLIENTES_POR_PAGINA + index + 1
                const esTop = indiceReal <= 3 && orden === 'total-desc'

                return (
                  <tr key={cliente.id} className={esTop ? 'fila-destacada' : ''}>
                    <td className="col-rank">
                      <span className={`rank-badge ${esTop ? `rank-${indiceReal}` : ''}`}>
                        {indiceReal}
                      </span>
                    </td>
                    <td className="col-cliente">
                      <div className="cliente-info-celda">
                        <span className="cliente-nombre-principal">{cliente.nombre}</span>
                        {cliente.reservasTotal >= 50 && (
                          <span className="badge-vip" title="Cliente VIP (+50 reservas)">VIP</span>
                        )}
                      </div>
                    </td>
                    <td className="col-celular">
                      <div className="celular-acciones">
                        <a
                          href={`tel:${cliente.celular}`}
                          className="link-celular"
                          title="Llamar al cliente"
                        >
                          <Phone size={14} aria-hidden="true" />
                          <span>{cliente.celular}</span>
                        </a>
                        <a
                          href={`https://wa.me/51${cliente.celular}?text=Hola%20${encodeURIComponent(cliente.nombre.split(' ')[0])},%20te%20saludamos%20del%20polideportivo`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-whatsapp"
                          title="Enviar mensaje por WhatsApp"
                        >
                          <MessageCircle size={14} aria-hidden="true" />
                        </a>
                      </div>
                    </td>
                    <td className="col-mes">
                      <span className="badge-reservas-mes">
                        <Flame size={13} aria-hidden="true" />
                        <strong>{cliente.reservasMes}</strong> este mes
                      </span>
                    </td>
                    <td className="col-total">
                      <span className="valor-reservas-total">
                        <strong>{cliente.reservasTotal}</strong> reservas
                      </span>
                    </td>
                    <td className="col-horas">
                      <span className="valor-horas">
                        <Clock size={13} aria-hidden="true" />
                        {cliente.horasTotales.toFixed(1)} h
                      </span>
                    </td>
                    <td className="col-cancha">
                      <span className="cancha-favorita-pill">
                        {cliente.canchaFavorita}
                      </span>
                    </td>
                    <td className="col-ultima">
                      <span className="fecha-ultima">
                        {formatearFecha(cliente.ultimaReserva)}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="admin-historial-pie">
        <p className="admin-historial-conteo">
          Mostrando <strong>{clientesFiltrados.length === 0 ? 0 : (paginaValida - 1) * CLIENTES_POR_PAGINA + 1}</strong> a{' '}
          <strong>{Math.min(paginaValida * CLIENTES_POR_PAGINA, clientesFiltrados.length)}</strong> de{' '}
          <strong>{clientesFiltrados.length}</strong> clientes
        </p>

        {totalPaginas > 1 && (
          <div className="admin-historial-paginacion" aria-label="Controles de paginación">
            <button
              type="button"
              className="admin-boton-pag"
              disabled={paginaValida <= 1}
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span>Anterior</span>
            </button>

            <span className="admin-paginacion-indicador">
              Página <strong>{paginaValida}</strong> de <strong>{totalPaginas}</strong>
            </span>

            <button
              type="button"
              className="admin-boton-pag"
              disabled={paginaValida >= totalPaginas}
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              aria-label="Página siguiente"
            >
              <span>Siguiente</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
