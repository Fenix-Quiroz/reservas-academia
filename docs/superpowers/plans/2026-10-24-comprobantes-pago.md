# Comprobantes de adelanto — Plan de implementación

## Objetivo

Agregar un flujo seguro de adelanto por Yape vinculado a cada reserva, manteniendo separadas la reserva, el comprobante y el estado de pago.

## Orden

1. Crear la estructura SQL y validarla localmente.
2. Ejecutar la migración en Supabase y verificarla.
3. Crear el bucket privado y su acceso seguro.
4. Cambiar la RPC pública para crear reservas pendientes, respetando números confiables.
5. Agregar al cliente el mensaje, la captura y el envío.
6. Agregar al panel la revisión, aprobación y rechazo.
7. Agregar expiración/limpieza de reservas pendientes.

## Primer paso

Crear `supabase/fix-comprobantes-pago.sql` con:

- `reservas.pago_estado` con valores `no_requerido`, `pendiente`, `confirmado` y `rechazado`.
- Valor por defecto `no_requerido` para no alterar reservas existentes.
- `comprobantes_pago.reserva_id` como clave foránea a `reservas.id`.
- Un solo comprobante actual por reserva.
- Estado, monto declarado, ruta privada, motivo de rechazo y marcas de tiempo.
- RLS para que solo administración autenticada lea/modifique comprobantes.
- Sin permisos para `anon`.

La migración no modificará todavía el comportamiento de `crear_reserva_publica`.
