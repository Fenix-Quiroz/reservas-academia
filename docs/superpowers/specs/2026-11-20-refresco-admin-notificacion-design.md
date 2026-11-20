# Refresco del panel al abrir una notificación

## Intención

Cuando el encargado toca una notificación de nueva reserva y el panel `/admin` ya estaba abierto o suspendido en el iPhone, el panel debe volver a consultar las reservas sin obligar al usuario a cerrar y abrir la aplicación.

## Alcance

- El Service Worker enviará un mensaje interno a la ventana existente del panel al abrir una notificación.
- `AdminApp` reutilizará su función actual de refresco para cargar reservas, comprobantes y eventos.
- Si no existe una ventana abierta, la carga inicial actual seguirá funcionando.
- No se modifican el flujo de reservas, Supabase, Web Push ni el contenido de la notificación.

## Enfoques considerados

- Recargar `/admin` completamente: sencillo, pero puede perder filtros, scroll o un modal abierto.
- Enviar un mensaje al panel y refrescar sus datos: elegido porque limita el cambio y conserva la pantalla actual.
- Refrescar cada vez que la ventana recupera foco: más general, pero genera consultas adicionales sin que exista una notificación.

## Criterio de éxito

Al tocar una notificación con `/admin` abierto, la lista debe ejecutar el mismo refresco que se usa al cargar el panel y mostrar la reserva nueva sin cerrar la PWA.
