import { esAdmin, type UsuarioAdmin } from './adminAuth.js'

const usuario: UsuarioAdmin = {
  app_metadata: { role: 'admin' },
}

const autorizado: boolean = esAdmin(usuario)
const rechazado: boolean = esAdmin(null)

void [autorizado, rechazado]
