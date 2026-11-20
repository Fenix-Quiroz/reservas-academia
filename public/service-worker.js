const TITULO_POR_DEFECTO = 'Nueva reserva recibida'
const CUERPO_POR_DEFECTO = 'Ingresa al panel para revisar el comprobante.'

function urlInterna(valor) {
  return typeof valor === 'string'
    && valor.startsWith('/')
    && !valor.startsWith('//')
    && !valor.includes('\\')
    ? valor
    : '/admin'
}

self.addEventListener('push', (evento) => {
  let datos = {}
  try {
    const datosRecibidos = evento.data ? evento.data.json() : {}
    if (typeof datosRecibidos === 'object' && datosRecibidos !== null && !Array.isArray(datosRecibidos)) {
      datos = datosRecibidos
    }
  } catch {
    datos = {}
  }

  const titulo = typeof datos.title === 'string' && datos.title ? datos.title : TITULO_POR_DEFECTO
  const cuerpo = typeof datos.body === 'string' && datos.body ? datos.body : CUERPO_POR_DEFECTO
  const url = urlInterna(datos.url)

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
  const destino = urlInterna(evento.notification.data?.url)

  evento.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const clienteAdmin = clientes.find((cliente) => {
      try {
        const ruta = new URL(cliente.url).pathname
        return ruta === '/admin' || ruta.startsWith('/admin/')
      } catch {
        return false
      }
    })

    if (clienteAdmin && 'focus' in clienteAdmin) {
      await clienteAdmin.focus()
      if ('postMessage' in clienteAdmin) clienteAdmin.postMessage({ type: 'nueva-reserva' })
      if ('navigate' in clienteAdmin && new URL(clienteAdmin.url).pathname !== destino) {
        await clienteAdmin.navigate(destino)
        return
      }
      return
    }

    if (self.clients.openWindow) await self.clients.openWindow(destino)
  })())
})
