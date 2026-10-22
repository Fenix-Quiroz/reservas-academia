import type { ResumenAdmin } from '../../admin.js'
import AdminCabecera from './AdminCabecera.js'
import AdminMetricas from './AdminMetricas.js'

const cabecera = AdminCabecera({
  supabaseConfigurado: true,
  porLimpiar: false,
  cargando: false,
  onClearRequest: () => undefined,
  onClearCancel: () => undefined,
  onClearConfirm: () => undefined,
  onRefresh: async () => undefined,
  onLogout: async () => undefined,
})

const resumen: ResumenAdmin = { proximas: 3, hoy: 1 }
const metricas = AdminMetricas({ resumen })

void [cabecera, metricas]
