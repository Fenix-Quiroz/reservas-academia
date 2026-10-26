# Plazo de revisión del comprobante Yape

## Intención

Eliminar la interpretación de que el cliente tiene 15 minutos para subir una imagen. El comprobante se selecciona y se envía en el mismo paso final; el plazo relevante es el tiempo que administración tiene para revisar la carga recibida.

## Decisión aprobada

El intento iniciado al pulsar `Asegurar reserva` tendrá un único plazo de 30 minutos. Ese plazo se guarda en `reservas.pago_expira_at` y cubre la carga y la revisión, sin mostrar una cuenta regresiva ni pedir al cliente que permanezca en la pantalla.

Mientras el adelanto esté pendiente, la reserva conserva `estado = 'activo'` para que el horario no se venda dos veces. Si transcurren 30 minutos sin un pago confirmado, la limpieza existente cancela la reserva y libera el horario.

## Alcance

- Cambiar la constante de expiración de la Edge Function de 15 a 30 minutos.
- Actualizar el mensaje de error y la documentación para describir el plazo de revisión.
- Mantener la validación, idempotencia, bucket privado y uso exclusivo de `service_role` en servidor.
- Conservar la limpieza SQL existente; no se agrega una segunda columna ni un segundo temporizador.

## No incluye

No incluye todavía el panel administrativo para confirmar o rechazar pagos. La carga continuará quedando `pendiente` hasta esa futura revisión.

## Criterios de aceptación

- La función usa exactamente 30 minutos y ya no anuncia 15 minutos.
- Una carga aceptada continúa mostrando que el comprobante está pendiente de revisión.
- La expiración conserva la reserva activa mientras está pendiente y la limpieza existente puede cancelarla al vencer.
- Las comprobaciones, el typecheck, lint y build siguen pasando.
