-- Agrupa un evento especial y sus campos asociados.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

create table if not exists public.eventos_especiales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('individual', 'todos_los_campos')),
  precio_cobrado numeric(10, 2) not null default 0 check (precio_cobrado >= 0),
  estado text not null default 'activo' check (estado in ('activo', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bloqueos_eventos
  add column if not exists evento_especial_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bloqueos_eventos_evento_especial_id_fkey'
      and conrelid = 'public.bloqueos_eventos'::regclass
  ) then
    alter table public.bloqueos_eventos
      add constraint bloqueos_eventos_evento_especial_id_fkey
      foreign key (evento_especial_id)
      references public.eventos_especiales(id)
      on delete cascade;
  end if;
end
$$;

create index if not exists bloqueos_eventos_evento_especial_idx
  on public.bloqueos_eventos (evento_especial_id);

alter table public.eventos_especiales enable row level security;
revoke all on table public.eventos_especiales from public, anon, authenticated;
drop policy if exists "admin lee eventos especiales" on public.eventos_especiales;
drop policy if exists "admin administra eventos especiales" on public.eventos_especiales;
create policy "admin lee eventos especiales" on public.eventos_especiales
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin administra eventos especiales" on public.eventos_especiales
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop function if exists public.obtener_bloqueos_eventos_admin();
create or replace function public.obtener_bloqueos_eventos_admin()
returns table (
  id uuid,
  evento_especial_id uuid,
  cancha_id integer,
  fecha date,
  inicio smallint,
  fin smallint,
  nombre text,
  celular text,
  notas text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz,
  tipo text,
  precio_cobrado numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception using errcode = '42501', message = 'no_autorizado';
  end if;

  return query
  select evento.id,
    evento.evento_especial_id,
    evento.cancha_id,
    evento.fecha,
    evento.inicio,
    evento.fin,
    evento.nombre,
    evento.celular,
    evento.notas,
    evento.estado,
    evento.created_at,
    evento.updated_at,
    coalesce(grupo.tipo, 'individual') as tipo,
    coalesce(grupo.precio_cobrado, 0)::numeric as precio_cobrado
  from public.bloqueos_eventos as evento
  left join public.eventos_especiales as grupo on grupo.id = evento.evento_especial_id
  order by evento.fecha, evento.inicio, evento.created_at;
end;
$function$;

drop function if exists public.crear_evento_especial_admin(integer[], date, smallint, smallint, text, text, text, text, numeric);
create or replace function public.crear_evento_especial_admin(
  p_cancha_ids integer[],
  p_fecha date,
  p_inicio smallint,
  p_fin smallint,
  p_nombre text,
  p_celular text default '',
  p_notas text default '',
  p_tipo text default 'individual',
  p_precio_cobrado numeric default 0
)
returns setof public.bloqueos_eventos
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_evento_especial public.eventos_especiales%rowtype;
  v_entrenamiento record;
  v_cancha_id integer;
  v_cancha_ids integer[];
  v_hoy date := timezone('America/Lima', now())::date;
  v_nombre text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_celular text := regexp_replace(trim(coalesce(p_celular, '')), '[[:space:]-]+', '', 'g');
  v_notas text := trim(coalesce(p_notas, ''));
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception using errcode = '42501', message = 'no_autorizado';
  end if;

  v_cancha_ids := array(select ids.cancha_id from unnest(coalesce(p_cancha_ids, '{}'::integer[])) as ids(cancha_id) order by ids.cancha_id);

  if p_cancha_ids is null
     or cardinality(v_cancha_ids) not between 1 and 4
     or exists (select 1 from unnest(p_cancha_ids) as ids(cancha_id)
               where ids.cancha_id is null or ids.cancha_id not between 1 and 4)
     or cardinality(p_cancha_ids) <> cardinality(array(select distinct ids.cancha_id from unnest(p_cancha_ids) as ids(cancha_id)))
     or p_tipo is null
     or p_tipo not in ('individual', 'todos_los_campos')
     or (p_tipo = 'individual' and cardinality(v_cancha_ids) <> 1)
     or (p_tipo = 'todos_los_campos' and v_cancha_ids <> array[1, 2, 3])
     or p_fecha is null
     or p_fecha < v_hoy
     or p_inicio is null
     or p_inicio not between 7 and 24
     or p_fin is null
     or p_fin not between 8 and 25
     or p_fin - p_inicio < 5
     or char_length(v_nombre) not between 2 and 80
     or char_length(v_notas) > 240
     or (v_celular <> '' and v_celular !~ '^9[0-9]{8}$')
     or p_precio_cobrado is null
     or p_precio_cobrado < 0 then
    raise exception using errcode = '22023', message = 'evento_invalido';
  end if;

  for v_cancha_id in
    select ids.cancha_id from unnest(v_cancha_ids) as ids(cancha_id) order by ids.cancha_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(format('agenda:%s:%s', v_cancha_id, p_fecha), 0));

    select horario.inicio_minuto, horario.fin_minuto
    into v_entrenamiento
    from public.horarios_bloqueados as horario
    where horario.cancha_id = v_cancha_id
      and horario.dia_semana = extract(dow from p_fecha)::smallint
      and horario.activo
      and p_inicio * 60 < horario.fin_minuto
      and horario.inicio_minuto < p_fin * 60
    order by horario.inicio_minuto
    limit 1;

    if found then
      raise exception using
        errcode = '23P01',
        message = format('horario_entrenamiento_ocupado:%s:%s', v_entrenamiento.inicio_minuto, v_entrenamiento.fin_minuto);
    end if;

    if exists (
      select 1
      from public.reservas as reserva
      where reserva.cancha_id = v_cancha_id
        and reserva.fecha = p_fecha
        and reserva.estado <> 'cancelado'
        and numrange(reserva.inicio::numeric, reserva.inicio::numeric + reserva.horas, '[)')
          && numrange(p_inicio::numeric, p_fin::numeric, '[)')
    ) or public.evento_bloquea(v_cancha_id, p_fecha, p_inicio, p_fin - p_inicio) then
      raise exception using errcode = '23P01', message = 'evento_ocupado';
    end if;
  end loop;

  insert into public.eventos_especiales (tipo, precio_cobrado)
  values (p_tipo, round(p_precio_cobrado, 2))
  returning * into v_evento_especial;

  insert into public.bloqueos_eventos (
    evento_especial_id, cancha_id, fecha, inicio, fin, nombre, celular, notas
  )
  select v_evento_especial.id, ids.cancha_id, p_fecha, p_inicio, p_fin, v_nombre, v_celular, v_notas
  from unnest(v_cancha_ids) as ids(cancha_id)
  order by ids.cancha_id;

  return query
  select evento.*
  from public.bloqueos_eventos as evento
  where evento.evento_especial_id = v_evento_especial.id
  order by evento.cancha_id;
end;
$function$;

create or replace function public.cancelar_evento_especial_admin(p_evento_especial_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_cancelado boolean;
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception using errcode = '42501', message = 'no_autorizado';
  end if;

  update public.eventos_especiales
  set estado = 'cancelado', updated_at = now()
  where id = p_evento_especial_id and estado = 'activo'
  returning true into v_cancelado;

  if coalesce(v_cancelado, false) then
    update public.bloqueos_eventos
    set estado = 'cancelado', updated_at = now()
    where evento_especial_id = p_evento_especial_id and estado = 'activo';
  end if;

  return coalesce(v_cancelado, false);
end;
$function$;

revoke all on function public.obtener_bloqueos_eventos_admin()
  from public, anon, authenticated;
grant execute on function public.obtener_bloqueos_eventos_admin() to authenticated;
revoke all on function public.crear_evento_especial_admin(integer[], date, smallint, smallint, text, text, text, text, numeric)
  from public, anon, authenticated;
grant execute on function public.crear_evento_especial_admin(integer[], date, smallint, smallint, text, text, text, text, numeric)
  to authenticated;
revoke all on function public.cancelar_evento_especial_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.cancelar_evento_especial_admin(uuid)
  to authenticated;
