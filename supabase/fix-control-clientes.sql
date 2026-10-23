-- Controla inasistencias, números bloqueados y clientes confiables.
-- Ejecutar después de schema.sql/permissions.sql en una base ya existente.

create table if not exists public.numeros_bloqueados (
  celular text primary key check (celular ~ '^9[0-9]{8}$'),
  motivo text not null default 'Bloqueado por administración',
  inasistencias integer not null default 0 check (inasistencias >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.numeros_confiables (
  celular text primary key check (celular ~ '^9[0-9]{8}$'),
  alias text not null default 'Cliente confiable'
    check (char_length(trim(alias)) between 2 and 24),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reservas drop constraint if exists reservas_estado_check;
alter table public.reservas
  add constraint reservas_estado_check
  check (estado in ('activo', 'iniciado', 'finalizado', 'cancelado', 'no_asistio'));

create or replace function public.validar_transicion_reserva()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if old.estado = new.estado then
    return new;
  end if;

  if (old.estado = 'activo' and new.estado in ('iniciado', 'finalizado', 'cancelado', 'no_asistio'))
     or (old.estado = 'iniciado' and new.estado in ('finalizado', 'cancelado')) then
    return new;
  end if;

  raise exception using errcode = 'P0001', message = 'transicion_estado_invalida';
end;
$function$;

create or replace function public.verificar_numero_bloqueado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if exists (
    select 1
    from public.numeros_bloqueados as bloqueado
    where bloqueado.celular = new.celular
      and bloqueado.activo
  ) then
    raise exception using errcode = 'P0001', message = 'celular_bloqueado';
  end if;
  return new;
end;
$function$;

create or replace function public.actualizar_bloqueo_por_inasistencia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_inasistencias integer;
begin
  if new.estado = 'no_asistio' and old.estado is distinct from new.estado then
    select count(*)
    into v_inasistencias
    from public.reservas as reserva
    where reserva.celular = new.celular
      and reserva.estado = 'no_asistio';

    if v_inasistencias >= 2 then
      insert into public.numeros_bloqueados (
        celular, motivo, inasistencias, activo, updated_at
      )
      values (
        new.celular,
        'Bloqueado automáticamente después de 2 inasistencias',
        v_inasistencias,
        true,
        now()
      )
      on conflict (celular) do update
        set motivo = excluded.motivo,
            inasistencias = excluded.inasistencias,
            activo = true,
            updated_at = excluded.updated_at;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists validar_transicion_reserva on public.reservas;
create trigger validar_transicion_reserva
before update of estado on public.reservas
for each row execute function public.validar_transicion_reserva();

drop trigger if exists verificar_numero_bloqueado on public.reservas;
create trigger verificar_numero_bloqueado
before insert on public.reservas
for each row execute function public.verificar_numero_bloqueado();

drop trigger if exists actualizar_bloqueo_por_inasistencia on public.reservas;
create trigger actualizar_bloqueo_por_inasistencia
after update of estado on public.reservas
for each row execute function public.actualizar_bloqueo_por_inasistencia();

revoke all on table public.numeros_bloqueados, public.numeros_confiables from public, anon, authenticated;
grant select, insert, update, delete on table public.numeros_bloqueados, public.numeros_confiables to authenticated;

alter table public.numeros_bloqueados enable row level security;
alter table public.numeros_confiables enable row level security;

drop policy if exists "admin lee numeros bloqueados" on public.numeros_bloqueados;
drop policy if exists "admin administra numeros bloqueados" on public.numeros_bloqueados;
drop policy if exists "admin lee numeros confiables" on public.numeros_confiables;
drop policy if exists "admin administra numeros confiables" on public.numeros_confiables;

create policy "admin lee numeros bloqueados" on public.numeros_bloqueados
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin administra numeros bloqueados" on public.numeros_bloqueados
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin lee numeros confiables" on public.numeros_confiables
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin administra numeros confiables" on public.numeros_confiables
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

revoke all on function public.verificar_numero_bloqueado() from public, anon, authenticated;
revoke all on function public.actualizar_bloqueo_por_inasistencia() from public, anon, authenticated;
revoke all on function public.validar_transicion_reserva() from public, anon, authenticated;
