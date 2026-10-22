import AdminLogin from './AdminLogin.js'
import AdminMarca from './AdminMarca.js'
import AdminNoAutorizado from './AdminNoAutorizado.js'

const marca = AdminMarca()
const login = AdminLogin({
  errorInicial: '',
  onLogin: async () => ({ error: null }),
})
const noAutorizado = AdminNoAutorizado({ onLogout: () => undefined })

void [marca, login, noAutorizado]
