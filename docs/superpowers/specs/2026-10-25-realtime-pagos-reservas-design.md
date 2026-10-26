# Sincronización automática de pagos y reservas

## Intención

El panel administrativo debe mostrar los controles del comprobante en cuanto el comprobante exista, y la vista pública “Mis reservas” debe reflejar la confirmación administrativa sin recargar la página.

## Objetivos

- Escuchar en el panel los cambios de `reservas`, `pagos_reserva` y `pago_comprobantes`.
- Agrupar eventos cercanos para evitar consultas duplicadas.
- Mantener los botones del comprobante basados en datos reales, no en estado optimista.
- Actualizar “Mis reservas” automáticamente mientras está abierta.
- No exponer la tabla `reservas` mediante una suscripción Realtime pública; la vista pública seguirá usando la RPC protegida por token.

## No objetivos

- Cambiar el flujo de subida o aprobación del comprobante.
- Mostrar comprobantes o reservas de otros clientes.
- Añadir polling global cuando el usuario no está viendo “Mis reservas”.

## Enfoque elegido

El administrador usará una única suscripción Realtime con las tres tablas y una notificación agrupada de 150 ms. La base de datos habilitará esas tablas en la publicación `supabase_realtime` mediante una migración idempotente.

La vista pública actualizará sus reservas con un intervalo corto solo mientras `verMias` esté activo. Cada ciclo reutilizará la RPC existente con los tokens del cliente y cancelará el intervalo al salir de la vista o desmontar el componente.

## Restricciones

- No usar `service_role` en el frontend.
- No relajar las políticas RLS de las tablas de reservas o pagos.
- Conservar el estado operativo `activo` mientras el adelanto esté pendiente.
- La confirmación seguirá siendo la única operación que cambia `pago_estado` a `confirmado`.

## Criterios de aceptación

- Un comprobante nuevo provoca una sola recarga agrupada del panel y muestra sus botones sin refresco manual.
- Una confirmación administrativa provoca que “Mis reservas” pase de “Esperando verificación” a “Reserva confirmada” automáticamente mientras la vista está abierta.
- Al salir de la vista pública no quedan intervalos activos.
- Las comprobaciones, el typecheck, lint y build continúan pasando.
