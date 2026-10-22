import type { ResumenAdmin } from '../../admin.js'

export interface AdminMetricasProps {
  resumen: ResumenAdmin
}

export default function AdminMetricas({ resumen }: AdminMetricasProps) {
  return (
    <section className="admin-metricas" aria-label="Resumen de reservas">
      <article className="admin-metrica">
        <span>Próximas reservas</span>
        <strong>{resumen.proximas}</strong>
      </article>
      <article className="admin-metrica">
        <span>Reservas de hoy</span>
        <strong>{resumen.hoy}</strong>
      </article>
    </section>
  )
}
