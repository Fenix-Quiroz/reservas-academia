# Confirmar comprobantes pendientes sin vencimiento

## Intención

Permitir que el administrador confirme un comprobante pendiente aunque hayan pasado más de dos horas desde el final del turno. Esto evita que un comprobante quede bloqueado solo por haber sido revisado tarde.

## Alcance

- Mostrar “Confirmar comprobante” cuando exista un comprobante pendiente y la reserva esté `activo`, `iniciado` o `finalizado`.
- Aplicar la misma regla en la RPC `confirmar_pago_admin` de Supabase.
- Mantener oculto el botón para comprobantes ya confirmados y reservas `cancelado` o `no_asistio`.

## Enfoques considerados

- Quitar el vencimiento de dos horas: elegido porque coincide con la necesidad de revisar comprobantes sin importar cuándo se revisen.
- Ampliar el plazo a 24 horas: descartado porque volvería a bloquear comprobantes legítimos después de una nueva ventana arbitraria.

## Fuera de alcance

No se cambia la expiración de reservas pendientes de pago ni la visibilidad de reservas canceladas en “Mis reservas”.
