-- Estructura escalable para adelantos y comprobantes.
-- Ejecutar después de fix-comprobantes-pago.sql.
-- Esta migración es aditiva y se puede ejecutar más de una vez.

-- El resumen vive en reservas; los movimientos detallados viven en pagos_reserva.
alter table public.reservas add column if not exists pago_requerido numeric(10, 2);
update public.reservas
set pago_requerido = case
  when pago_estado = 'no_requerido' then 0
  else 10
end
where pago_requerido is null;
alter table public.reservas alter column pago_requerido set default 0;
alter table public.reservas alter column pago_requerido set not null;
alter table public.reservas drop constraint if exists reservas_pago_requerido_check;
alter table public.reservas add constraint reservas_pago_requerido_check
  check (
    (pago_estado = 'no_requerido' and pago_requerido = 0)
    or (pago_estado <> 'no_requerido' and pago_requerido >= 10)
  );

alter table public.reservas add column if not exists pago_expira_at timestamptz;
drop index if exists public.reservas_pago_expira_idx;
create index if not exists reservas_pago_expira_idx
  on public.reservas (pago_expira_at)
  where pago_estado in ('pendiente', 'rechazado') and pago_expira_at is not null;

create table if not exists public.pagos_reserva (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  tipo text not null default 'adelanto'
    check (tipo in ('adelanto', 'saldo', 'reembolso')),
  metodo text not null default 'yape'
    check (char_length(trim(metodo)) between 2 and 32 and metodo ~ '^[a-z0-9_-]+$'),
  monto numeric(10, 2) not null check (monto > 0),
  moneda text not null default 'PEN'
    check (moneda ~ '^[A-Z]{3}$'),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmado', 'rechazado', 'anulado')),
  referencia_externa text not null default ''
    check (char_length(referencia_externa) <= 120),
  motivo_rechazo text not null default ''
    check (char_length(motivo_rechazo) <= 240),
  idempotencia text
    check (idempotencia is null or char_length(trim(idempotencia)) between 8 and 128),
  revisado_por uuid,
  enviado_at timestamptz not null default now(),
  revisado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pagos_reserva_adelanto_minimo_check
    check (tipo <> 'adelanto' or monto >= 10)
);

create index if not exists pagos_reserva_reserva_idx
  on public.pagos_reserva (reserva_id, created_at desc);
create index if not exists pagos_reserva_estado_idx
  on public.pagos_reserva (estado, created_at desc);
create unique index if not exists pagos_reserva_idempotencia_idx
  on public.pagos_reserva (idempotencia)
  where idempotencia is not null;

create table if not exists public.pago_comprobantes (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references public.pagos_reserva(id) on delete cascade,
  storage_path text not null unique
    check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'),
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null
    check (size_bytes between 1 and 5242880),
  sha256 text not null
    check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index if not exists pago_comprobantes_pago_idx
  on public.pago_comprobantes (pago_id, created_at desc);
do $$
declare
  v_duplicados integer;
begin
  select count(*) into v_duplicados
  from (
    select pago_id
    from public.pago_comprobantes
    group by pago_id
    having count(*) > 1
  ) as duplicados;

  if v_duplicados > 0 then
    raise exception using
      errcode = '23505',
      message = 'pago_comprobantes_duplicados',
      detail = format('%s pago(s) tienen más de un comprobante.', v_duplicados),
      hint = 'Revisa y conserva un comprobante por pago_id antes de ejecutar esta migración.';
  end if;
end
$$;

create unique index if not exists pago_comprobantes_pago_unica_idx
  on public.pago_comprobantes (pago_id);

-- La privacidad del bucket se verifica aquí porque el bucket se crea desde el
-- dashboard y no debe poder quedar público por accidente.
do $$
declare
  v_public boolean;
begin
  select bucket.public into v_public
  from storage.buckets as bucket
  where bucket.id = 'comprobantes-pago';

  if v_public is null then
    raise exception using errcode = '22023', message = 'bucket_comprobantes_no_existe';
  end if;
  if v_public then
    raise exception using errcode = '42501', message = 'bucket_comprobantes_debe_ser_privado';
  end if;
end
$$;

create or replace function public.actualizar_updated_at_pagos()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists actualizar_updated_at_pagos on public.pagos_reserva;
create trigger actualizar_updated_at_pagos
before update on public.pagos_reserva
for each row execute function public.actualizar_updated_at_pagos();

revoke all on table public.pagos_reserva, public.pago_comprobantes
  from public, anon, authenticated;
grant select, update on table public.pagos_reserva to authenticated;
grant select on table public.pago_comprobantes to authenticated;
grant usage on schema public to service_role;
grant select, update on table public.reservas to service_role;
grant select, insert, update on table public.pagos_reserva to service_role;
grant select, insert on table public.pago_comprobantes to service_role;

alter table public.pagos_reserva enable row level security;
alter table public.pago_comprobantes enable row level security;

drop policy if exists "admin lee pagos reserva" on public.pagos_reserva;
drop policy if exists "admin actualiza pagos reserva" on public.pagos_reserva;
drop policy if exists "admin lee pago comprobantes" on public.pago_comprobantes;
drop policy if exists "admin lee comprobantes storage" on storage.objects;

create policy "admin lee pagos reserva" on public.pagos_reserva
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin actualiza pagos reserva" on public.pagos_reserva
  for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin lee pago comprobantes" on public.pago_comprobantes
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin lee comprobantes storage" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes-pago'
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

revoke all on function public.actualizar_updated_at_pagos() from public, anon, authenticated;
