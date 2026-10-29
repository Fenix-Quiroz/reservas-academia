import { useEffect, useState } from 'react'
import { BarChart3, CalendarDays, Home, Star, Users } from 'lucide-react'

type SeccionAdmin = 'admin-inicio' | 'admin-agenda' | 'admin-reservas-especiales' | 'admin-clientes' | 'admin-balance'

interface ItemNavegacion {
  id: SeccionAdmin
  etiqueta: string
  Icono: typeof Home
}

const ITEMS_NAVEGACION: readonly ItemNavegacion[] = [
  { id: 'admin-inicio', etiqueta: 'Inicio', Icono: Home },
  { id: 'admin-agenda', etiqueta: 'Agenda', Icono: CalendarDays },
  { id: 'admin-reservas-especiales', etiqueta: 'Reservas especiales', Icono: Star },
  { id: 'admin-clientes', etiqueta: 'Clientes', Icono: Users },
  { id: 'admin-balance', etiqueta: 'Balance mensual', Icono: BarChart3 },
]

const POSICION_ACTIVA = 180

function seccionMasCercana(): SeccionAdmin {
  if (window.scrollY < POSICION_ACTIVA) return 'admin-inicio'

  let mejor: { id: SeccionAdmin; distancia: number } | null = null
  let ultimaVisible: { id: SeccionAdmin; top: number } | null = null
  for (const item of ITEMS_NAVEGACION.slice(1)) {
    const elemento = document.getElementById(item.id)
    if (!elemento) continue
    const rectangulo = elemento.getBoundingClientRect()
    if (rectangulo.bottom <= 0 || rectangulo.top >= window.innerHeight) continue
    if (!ultimaVisible || rectangulo.top > ultimaVisible.top) {
      ultimaVisible = { id: item.id, top: rectangulo.top }
    }
    if (rectangulo.top > POSICION_ACTIVA + 40) continue
    const distancia = Math.abs(rectangulo.top - POSICION_ACTIVA)
    if (!mejor || distancia < mejor.distancia) mejor = { id: item.id, distancia }
  }

  return mejor?.id ?? ultimaVisible?.id ?? 'admin-inicio'
}

export default function AdminNavegacion() {
  const [activa, setActiva] = useState<SeccionAdmin>('admin-inicio')

  useEffect(() => {
    const actualizarActiva = () => setActiva(seccionMasCercana())
    actualizarActiva()
    window.addEventListener('scroll', actualizarActiva, { passive: true })
    window.addEventListener('resize', actualizarActiva)
    return () => {
      window.removeEventListener('scroll', actualizarActiva)
      window.removeEventListener('resize', actualizarActiva)
    }
  }, [])

  function navegar(evento: React.MouseEvent<HTMLAnchorElement>, id: SeccionAdmin): void {
    evento.preventDefault()
    setActiva(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <nav className="admin-navegacion" aria-label="Secciones del panel">
      <div className="admin-navegacion-contenido">
        {ITEMS_NAVEGACION.map(({ id, etiqueta, Icono }) => (
          <a
            className="admin-navegacion-enlace"
            href={`#${id}`}
            key={id}
            aria-current={activa === id ? 'page' : undefined}
            onClick={(evento) => navegar(evento, id)}
          >
            <Icono size={22} strokeWidth={2.4} aria-hidden="true" />
            <span>{etiqueta}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}
