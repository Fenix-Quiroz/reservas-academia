# Comprobantes de pago en el panel administrativo

## Intención

Permitir que el encargado vea, descargue y confirme el comprobante Yape asociado a cada reserva desde la tarjeta de agenda, sin abrir el bucket privado al público ni mezclar la confirmación administrativa con la finalización del turno.

## Experiencia aprobada

En cada reserva que tenga comprobante aparecerá una columna intermedia entre los datos del campo y las acciones de estado/cancelación. El bloque mostrará `Comprobante de pago` y los botones verticales:

- `Ver`: abre una URL firmada temporal para visualizar la imagen.
- `Descargar`: solicita una URL firmada con descarga.
- `Confirmar comprobante`: confirma el adelanto y actualiza la reserva.

Cuando el pago ya esté confirmado, el botón de confirmación se reemplaza por la etiqueta `Comprobante confirmado`. Si una reserva no tiene comprobante, no se muestra ese bloque.

## Decisión técnica

- El panel usa la sesión autenticada del administrador y consulta `pagos_reserva` con la relación `pago_comprobantes`; no usa `service_role` en `src/`.
- `Ver` y `Descargar` generan URLs firmadas desde el bucket privado `comprobantes-pago`, con expiración corta y sin exponer rutas a clientes no autorizados.
- `confirmar_pago_admin(uuid)` será una RPC `SECURITY DEFINER` que verifica `app_metadata.role = 'admin'`, confirma `pagos_reserva`, actualiza `reservas.pago_estado = 'confirmado'`, limpia `pago_expira_at` y registra `revisado_at`/`revisado_por` en una sola operación.
- La confirmación será idempotente: confirmar un pago ya confirmado no duplica datos ni falla por una segunda pulsación.
- La reserva conserva su estado operativo `activo`; confirmar el comprobante no finaliza el turno.

## Seguridad y estados

- Solo administradores autenticados pueden leer metadatos, generar URLs firmadas o confirmar pagos.
- Un pago sin comprobante no se puede confirmar mediante la RPC.
- Una reserva cancelada o un pago anulado/rechazado no se puede confirmar.
- Los botones se bloquean mientras se genera la URL o se procesa la confirmación.

## No incluye

No incluye todavía rechazo manual con motivo, reemplazo de comprobante ni un historial de revisiones; esos flujos pueden agregarse después.

## Criterios de aceptación

- La tarjeta muestra el bloque en la columna intermedia y los tres botones en orientación vertical.
- Ver y Descargar funcionan solo con sesión administrativa y URL firmada.
- Confirmar cambia ambos estados de forma atómica y refresca la tarjeta.
- Las reservas sin comprobante y las reservas demo no muestran controles falsos.
