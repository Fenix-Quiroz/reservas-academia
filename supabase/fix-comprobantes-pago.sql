-- Estructura inicial para comprobantes de adelanto por Yape.
-- Esta migración no cambia todavía la RPC pública ni crea el bucket de Storage.
-- Las reservas existentes quedan como no_requerido para no alterar su historial.

alter table public.reservas add column if not exists pago_estado text;
update public.reservas
set pago_estado = 'no_requerido'
where pago_estado is null;

alter table public.reservas alter column pago_estado set default 'no_requerido';
alter table public.reservas alter column pago_estado set not null;
alter table public.reservas drop constraint if exists reservas_pago_estado_check;
alter table public.reservas add constraint reservas_pago_estado_check
  check (pago_estado in ('no_requerido', 'pendiente', 'confirmado', 'rechazado'));
