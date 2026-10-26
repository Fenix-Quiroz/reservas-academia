# Comprobantes de adelanto para reservas

## Objetivo

Permitir que un cliente envíe una captura de Yape por un adelanto mínimo de S/ 10 antes de asegurar una reserva. El comprobante debe quedar vinculado a `reservas.id` y ser visible únicamente para administración.

## Reglas iniciales

- El número de Yape y el nombre del receptor se muestran desde el cliente.
- El adelanto mínimo es S/ 10.
- Los números confiables no requieren adelanto.
- El estado del adelanto se mantiene separado del ciclo de la reserva (`activo`, `cancelado`, `finalizado`, etc.).
- Una reserva pública normal tendrá `pago_estado = 'pendiente'` hasta que administración revise el comprobante.
- Una reserva de número confiable tendrá `pago_estado = 'no_requerido'`.
- El comprobante se almacena en un bucket privado; nunca se usa una URL pública.
- La autorización de subida se hará mediante una función segura y el token de la reserva, no usando solo el UUID.

## Primer alcance

Esta primera migración solo crea la estructura SQL: columnas de estado y la tabla `comprobantes_pago`. No cambia todavía la RPC pública ni el frontend.

## Fuera de alcance de esta migración

- Crear el bucket de Storage.
- Subir archivos desde el navegador.
- Mostrar el comprobante en el panel.
- Aprobar o rechazar pagos.
- Expirar automáticamente reservas pendientes.
