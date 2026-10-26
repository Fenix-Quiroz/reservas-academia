-- Permisos necesarios para la función de limpieza de datos de desarrollo.
-- Ejecutar una sola vez en Supabase SQL Editor.
-- No expone SUPABASE_SERVICE_ROLE_KEY al frontend.

grant usage on schema public, storage to service_role;

grant select, delete
on table public.pago_comprobantes,
           public.pagos_reserva,
           public.reservas,
           public.clientes,
           public.bloqueos_eventos,
           public.numeros_bloqueados,
           public.numeros_confiables,
           public.reserva_rate_limits
to service_role;

-- La función usa la API de Storage para listar y eliminar los comprobantes.
grant select, delete on table storage.objects to service_role;
grant select on table storage.buckets to service_role;
