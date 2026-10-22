-- Esquema inicial de reservas. Ejecutar una sola vez en Supabase > SQL Editor.
-- Este proyecto todavía no tiene login de administrador; las políticas públicas
-- son solo para la demo. Antes de producción hay que proteger el panel con Auth.

create extension if not exists btree_gist;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  alias text not null check (char_length(trim(alias)) between 2 and 20),
  celular text not null check (celular ~ '^9[0-9]{8}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists clientes_celular_key
  on public.clientes (celular);

-- Los alias son nombres visibles y pueden repetirse entre clientes.
drop index if exists public.clientes_alias_lower_key;

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  cancha_id integer not null,
  fecha date not null,
  inicio smallint not null check (inicio between 8 and 22),
  horas smallint not null check (horas in (1, 2)),
  alias text not null check (char_length(trim(alias)) between 2 and 20),
  celular text not null check (celular ~ '^9[0-9]{8}$'),
  estado text not null default 'activo' check (estado in ('activo', 'iniciado', 'finalizado', 'cancelado')),
  monto_total numeric(10, 2) check (monto_total is null or monto_total >= 0),
  created_at timestamptz not null default now(),
  constraint reservas_disponibilidad_excl exclude using gist (
    cancha_id with =,
    fecha with =,
    int4range(inicio, inicio + horas, '[)') with &&
  ) where (estado <> 'cancelado')
);

-- Migración segura para tablas creadas antes de agregar el ciclo de vida.
alter table public.reservas add column if not exists estado text;
update public.reservas set estado = 'activo' where estado is null;
alter table public.reservas alter column estado set default 'activo';
alter table public.reservas alter column estado set not null;
alter table public.reservas add column if not exists monto_total numeric(10, 2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservas_estado_check'
      and conrelid = 'public.reservas'::regclass
  ) then
    alter table public.reservas
      add constraint reservas_estado_check
      check (estado in ('activo', 'iniciado', 'finalizado', 'cancelado'));
  end if;
end
$$;

-- Las reservas canceladas conservan el histórico, pero no deben bloquear un nuevo turno.
do $$
declare
  nombre_constraint text;
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservas_disponibilidad_excl'
      and conrelid = 'public.reservas'::regclass
  ) then
    select conname into nombre_constraint
    from pg_constraint
    where conrelid = 'public.reservas'::regclass
      and contype = 'x'
    limit 1;

    if nombre_constraint is not null then
      execute format('alter table public.reservas drop constraint %I', nombre_constraint);
    end if;

    alter table public.reservas
      add constraint reservas_disponibilidad_excl exclude using gist (
        cancha_id with =,
        fecha with =,
        int4range(inicio, inicio + horas, '[)') with &&
      ) where (estado <> 'cancelado');
  end if;
end
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.clientes to anon, authenticated;
grant select, insert, update on public.reservas to anon, authenticated;
revoke delete on public.reservas from anon, authenticated;

alter table public.clientes enable row level security;
alter table public.reservas enable row level security;

drop policy if exists "demo lee clientes" on public.clientes;
create policy "demo lee clientes" on public.clientes
  for select to anon, authenticated using (true);

drop policy if exists "demo crea clientes" on public.clientes;
create policy "demo crea clientes" on public.clientes
  for insert to anon, authenticated with check (true);

drop policy if exists "demo actualiza clientes" on public.clientes;
create policy "demo actualiza clientes" on public.clientes
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "demo lee reservas" on public.reservas;
create policy "demo lee reservas" on public.reservas
  for select to anon, authenticated using (true);

drop policy if exists "demo crea reservas" on public.reservas;
create policy "demo crea reservas" on public.reservas
  for insert to anon, authenticated with check (true);

drop policy if exists "demo cancela reservas" on public.reservas;

drop policy if exists "demo actualiza reservas" on public.reservas;
create policy "demo actualiza reservas" on public.reservas
  for update to anon, authenticated using (true) with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.reservas'::regclass
  ) then
    alter publication supabase_realtime add table public.reservas;
  end if;
end
$$;
