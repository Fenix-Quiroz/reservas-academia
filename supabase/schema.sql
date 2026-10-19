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
  created_at timestamptz not null default now(),
  exclude using gist (
    cancha_id with =,
    fecha with =,
    int4range(inicio, inicio + horas, '[)') with &&
  )
);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.clientes to anon, authenticated;
grant select, insert, update, delete on public.reservas to anon, authenticated;

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
create policy "demo cancela reservas" on public.reservas
  for delete to anon, authenticated using (true);

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
