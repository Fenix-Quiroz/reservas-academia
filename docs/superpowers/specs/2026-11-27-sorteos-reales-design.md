# Sorteos reales con reservas de Supabase

## Intención

Convertir la vista de sorteos, actualmente demo, en un módulo conectado a las reservas reales del panel administrativo. El módulo debe mostrar un ticket por cada reserva elegible, ejecutar el sorteo de forma segura en Supabase y conservar un historial verificable.

## Reglas confirmadas

- Una reserva genera exactamente un ticket, sin importar si dura 30 minutos, 1, 2 o 3 horas.
- Solo participan reservas finalizadas con el pago confirmado o sin adelanto requerido, usando la regla existente `esTicket`.
- El primer sorteo incluye todas las reservas elegibles existentes hasta el momento de su corte.
- Cada sorteo posterior incluye reservas creadas después del corte del sorteo anterior y hasta su propio corte.
- El corte usa `reservas.created_at`, no la fecha del partido (`reservas.fecha`).
- Las reservas se guardan como snapshot en el sorteo para que el historial no cambie si luego se edita una reserva.

## Objetivos

- Reutilizar la carga autenticada de reservas del panel.
- Mostrar tickets reales antes de girar.
- Ejecutar la selección y persistencia dentro de Supabase mediante una RPC.
- Impedir sorteos simultáneos y duplicados para el mismo periodo.
- Mantener el modo demo cuando Supabase no esté configurado para desarrollo local.
- Mostrar estados de carga, error y ausencia de tickets.

## Fuera de alcance

- Cambiar el diseño visual del slot salvo los estados necesarios para datos reales.
- Notificaciones automáticas por WhatsApp.
- Crear un backend externo o exponer una `service_role` en el navegador.

## Arquitectura elegida

La opción elegida es una migración SQL con tres tablas (`sorteos`, `sorteo_tickets` y `sorteo_resultados`) y una función RPC `ejecutar_sorteo`. El frontend puede previsualizar los tickets usando las reservas autenticadas ya cargadas, pero el ganador y el snapshot definitivo se calculan dentro de una transacción de Supabase. La RPC valida el rol `admin`, toma un bloqueo transaccional, obtiene el corte anterior, copia las reservas elegibles y guarda un único resultado.

La vista seguirá usando el animador actual de 15 segundos. En producción, la RPC se ejecutará al iniciar el giro y la animación terminará en el ticket ganador devuelto; en demo se conservará la selección local.

## Modelo de datos

`sorteos` guarda el periodo, estado, usuario ejecutor y totales.

`sorteo_tickets` guarda una fila por reserva y conserva alias, celular y `created_at` de la reserva.

`sorteo_resultados` guarda el ticket ganador y una copia de sus datos.

Las inserciones y actualizaciones quedan restringidas a la RPC. El administrador autenticado solo necesita permisos de lectura para consultar historial y resultados.

## Criterios de seguridad

- La RPC usa `security definer`, `set search_path = public, extensions, pg_temp` y valida `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`.
- La función obtiene un bloqueo con `pg_advisory_xact_lock` para que dos administradores no creen dos sorteos con el mismo corte.
- La selección aleatoria ocurre en PostgreSQL usando `pgcrypto`, no con `Math.random()` para un sorteo real.
- El navegador no recibe ni usa la clave `service_role`.

## Criterios de aceptación

- Con reservas reales, la vista deja de mostrar `DATOS_SORTEO_DEMO`.
- Una reserva elegible aparece una sola vez como ticket.
- Una reserva no finalizada, con pago pendiente, cancelada o `no_asistio` no aparece.
- El primer sorteo usa todas las reservas elegibles existentes.
- El segundo sorteo no reutiliza tickets del primero.
- Al finalizar el giro, el ganador coincide con el resultado persistido en Supabase.
- Recargar la página conserva el historial del sorteo y no permite repetirlo sin nuevas reservas elegibles.
