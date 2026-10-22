export interface UsuarioAdmin {
  app_metadata?: {
    role?: string
  }
  user_metadata?: {
    role?: string
  }
}

export const esAdmin = (usuario: UsuarioAdmin | null | undefined): boolean =>
  usuario?.app_metadata?.role === 'admin'
