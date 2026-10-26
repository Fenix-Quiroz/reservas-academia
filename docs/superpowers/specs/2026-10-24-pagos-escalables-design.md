# Diseño de pagos y comprobantes escalables

## Intención

Registrar el adelanto mínimo de una reserva sin confundirlo con el precio total, permitir rechazos y reintentos, y dejar preparada la base para Yape, Plin, efectivo, saldo, reembolsos y más de un comprobante.

## Decisión

- `reservas.monto_total` conserva el precio completo de la reserva.
- `reservas.pago_estado` conserva un resumen rápido del estado del adelanto.
- `reservas.pago_requerido` guarda cuánto debe adelantar el cliente.
- `reservas.pago_expira_at` permite liberar reservas pendientes que nunca reciben comprobante.
- `pagos_reserva` es la fuente de verdad para cada movimiento: adelanto, saldo o reembolso.
- `pago_comprobantes` guarda uno o más archivos asociados a un movimiento.
- `pagos_reserva.metodo` se guarda como código normalizado, no como una lista cerrada, para poder añadir métodos sin cambiar el esquema.
- La tabla existente `comprobantes_pago` se conserva durante la transición para no perder datos ya guardados; no se usará para nuevos flujos.
- El bucket `comprobantes-pago` permanece privado.

## Reglas

- Un adelanto debe ser de al menos S/10.
- El adelanto no representa el pago total; el saldo se paga en el campo.
- Los números confiables pueden tener `pago_requerido = 0` y `pago_estado = 'no_requerido'`.
- Un cliente público no inserta directamente en las tablas; la Edge Function validará reserva + token y usará `service_role` solo en el servidor.
- Las políticas RLS permiten lectura y revisión únicamente a administradores autenticados.
- Los archivos se guardan con rutas basadas en UUID, sin celular ni nombre del cliente.
- La migración falla si el bucket no existe o está configurado como público.

## Fuera de alcance de esta migración

- Cambiar todavía la RPC pública.
- Implementar la Edge Function.
- Añadir la interfaz de carga o revisión.
- Automatizar la expiración; aquí solo se deja la columna y los índices necesarios.

## Compatibilidad

La migración es aditiva y repetible. No elimina `comprobantes_pago`, no modifica comprobantes existentes y deja la tabla anterior disponible para una transición posterior.
