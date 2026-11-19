const TITULO_POR_DEFECTO = 'Nueva reserva recibida'
const CUERPO_POR_DEFECTO = 'Ingresa al panel para revisar el comprobante.'

self.addEventListener('push', (evento) => {
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch {
    datos = {}
  }

  const titulo = typeof datos.title === 'string' && datos.title ? datos.title : TITULO_POR_DEFECTO
  const cuerpo = typeof datos.body === 'string' && datos.body ? datos.body : CUERPO_POR_DEFECTO
  const url = typeof datos.url === 'string' && datos.url.startsWith('/') ? datos.url : '/admin'

  evento.waitUntil(self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/favicon-jaguar.png',
    badge: '/favicon-jaguar.png',
    tag: 'nueva-reserva',
    renotify: true,
    data: { url },
  }))
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = evento.notification.data?.url || '/admin'

  evento.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const clienteAdmin = clientes.find((cliente) => {
      try {
        return new URL(cliente.url).pathname.startsWith('/admin')
      } catch {
        return false
      }
    })

    if (clienteAdmin && 'focus' in clienteAdmin) {
      await clienteAdmin.focus()
      if ('navigate' in clienteAdmin && new URL(clienteAdmin.url).pathname !== destino) await clienteAdmin.navigate(destino)
      return
    }

    if (self.clients.openWindow) await self.clients.openWindow(destino)
  })())
})
