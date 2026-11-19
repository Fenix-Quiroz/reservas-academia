# Notificaciones Web Push de nuevas reservas

## Intención

Avisar al encargado en su celular Android cuando se cree una nueva reserva. La notificación solo informa que debe entrar al panel para revisar el comprobante; no confirma ni rechaza pagos desde la notificación.

## Objetivos

- Mostrar en el panel privado un botón `Activar notificaciones en este celular`.
- Registrar el permiso y la suscripción Web Push del dispositivo del administrador.
- Enviar una notificación genérica cuando ocurra un `INSERT` en `public.reservas`.
- Abrir `/admin` al tocar la notificación para que el encargado revise y confirme el comprobante con el flujo existente.
- Mantener la creación de reservas, la carga de comprobantes y `confirmar_pago_admin` sin cambios de comportamiento.

## Fuera de alcance

- Envío por WhatsApp, SMS o correo.
- Botones de confirmar/rechazar dentro de la notificación.
- Cambiar los estados actuales de reservas o pagos.
- Exponer datos del cliente en la notificación.

## Enfoques considerados

1. **Web Push + Service Worker + función asíncrona de Supabase (elegido).** Funciona con Chrome en Android aunque el panel no esté visible. Añade una tabla de suscripciones, un Service Worker y una Edge Function activada por un webhook de inserción; el envío no participa de la transacción de reserva.
2. **Notificación con Supabase Realtime desde React.** Es menor cambio, pero solo funciona con el panel abierto y no cumple el objetivo del encargado cuando Chrome está minimizado o cerrado.
3. **WhatsApp Business API.** Tiene buena entrega, pero agrega proveedor, credenciales y costos por mensaje; se deja fuera de esta entrega.

## Diseño elegido

- `public/service-worker.js` recibirá el evento push y mostrará título, texto y enlace a `/admin`.
- El panel registrará la suscripción solo después de que el administrador pulse el botón y el navegador conceda permiso.
- `admin_push_subscriptions` guardará una suscripción por dispositivo/usuario, con RLS limitada al administrador autenticado.
- Una Edge Function pública para webhooks validará un secreto configurado y enviará el aviso a las suscripciones activas con VAPID. Las suscripciones inválidas se eliminarán; los errores se registrarán sin fallar la reserva.
- El webhook se configurará para `INSERT` de `public.reservas`. No se agregará lógica de notificación dentro de `crear_reserva_publica`.
- Las claves VAPID y el secreto del webhook vivirán solo en secretos de Supabase; la aplicación recibirá únicamente la clave pública.

## Restricciones y verificación

- La funcionalidad requiere HTTPS, permisos del navegador y claves VAPID configuradas.
- Se probará que el botón funciona sin Supabase configurado, que una denegación de permiso no rompe el panel, que una suscripción duplicada se actualiza, y que el flujo actual de reserva y confirmación de comprobantes conserva sus pruebas existentes.
- La recepción en un Android real requiere una prueba manual después de desplegar la Edge Function y configurar el webhook; el repositorio cubrirá la lógica verificable localmente.
