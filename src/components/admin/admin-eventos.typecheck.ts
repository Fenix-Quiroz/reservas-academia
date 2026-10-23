import type { BloqueoEvento, Campo } from '../../types.js'
import type { BloqueoEventoNuevo, ResultadoCancelacionEvento, ResultadoEvento } from '../../eventos.js'
import type { AdminEventosProps } from './AdminEventos.js'

const campos: readonly Campo[] = []
const eventos: readonly BloqueoEvento[] = []
const crear = async (_evento: BloqueoEventoNuevo): Promise<ResultadoEvento> => ({ error: 'conexion' })
const cancelar = async (_id: string): Promise<ResultadoCancelacionEvento> => ({ error: 'conexion' })

const props: AdminEventosProps = {
  eventos,
  canchas: campos,
  cargando: false,
  procesando: false,
  onCrear: crear,
  onCancelar: cancelar,
}

void props
