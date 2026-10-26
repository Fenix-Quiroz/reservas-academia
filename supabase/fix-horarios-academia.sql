-- Horarios reales de la academia y horario de atención del polideportivo.
-- Ejecutar después de schema.sql, fix-monto-reservas.sql y fix-control-clientes.sql.
-- Los turnos bloqueados se muestran al cliente como no disponibles. La función
-- pública también los valida en PostgreSQL para impedir reservas manipuladas.

create table if not exists public.horarios_bloqueados (
  cancha_id integer not null check (cancha_id between 1 and 4),
  dia_semana smallint not null check (dia_semana between 0 and 6),
  inicio_minuto smallint not null check (inicio_minuto between 420 and 1440),
  fin_minuto smallint not null check (fin_minuto between 421 and 1500),
  motivo text not null default 'Entrenamiento de academia',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cancha_id, dia_semana, inicio_minuto, fin_minuto),
  constraint horarios_bloqueados_rango_check check (fin_minuto > inicio_minuto)
);

insert into public.horarios_bloqueados
  (cancha_id, dia_semana, inicio_minuto, fin_minuto, motivo, activo)
values
  (1, 1, 960, 1225, 'Entrenamiento de academia', true),
  (2, 1, 960, 1225, 'Entrenamiento de academia', true),
  (3, 1, 1050, 1225, 'Entrenamiento de academia', true),
  (4, 1, 1080, 1165, 'Entrenamiento de academia', true),
  (1, 2, 930, 1195, 'Entrenamiento de academia', true),
  (2, 2, 930, 1195, 'Entrenamiento de academia', true),
  (3, 2, 1020, 1195, 'Entrenamiento de academia', true),
  (4, 2, 990, 1165, 'Entrenamiento de academia', true),
  (1, 3, 960, 1225, 'Entrenamiento de academia', true),
  (2, 3, 960, 1225, 'Entrenamiento de academia', true),
  (3, 3, 1050, 1225, 'Entrenamiento de academia', true),
  (4, 3, 1080, 1165, 'Entrenamiento de academia', true),
  (1, 4, 930, 1195, 'Entrenamiento de academia', true),
  (2, 4, 930, 1195, 'Entrenamiento de academia', true),
  (3, 4, 1020, 1195, 'Entrenamiento de academia', true),
  (4, 4, 990, 1165, 'Entrenamiento de academia', true),
  (1, 5, 960, 1225, 'Entrenamiento de academia', true),
  (2, 5, 960, 1225, 'Entrenamiento de academia', true),
  (3, 5, 1050, 1225, 'Entrenamiento de academia', true),
  (4, 5, 1080, 1165, 'Entrenamiento de academia', true),
  (4, 6, 1260, 1435, 'Entrenamiento de academia', true)
on conflict (cancha_id, dia_semana, inicio_minuto, fin_minuto) do update
set motivo = excluded.motivo,
    activo = excluded.activo,
    updated_at = now();

alter table public.reservas drop constraint if exists reservas_disponibilidad_excl;
alter table public.reservas
  alter column inicio type numeric(4,1) using inicio::numeric;
alter table public.reservas
  alter column horas type numeric(2,1) using horas::numeric;
alter table public.reservas drop constraint if exists reservas_horas_check;
alter table public.reservas drop constraint if exists reservas_horas_validas_check;
alter table public.reservas add constraint reservas_horas_validas_check
  check (horas in (0.5, 1, 1.5, 2, 2.5, 3));
alter table public.reservas drop constraint if exists reservas_disponibilidad_excl;
alter table public.reservas add constraint reservas_disponibilidad_excl exclude using gist (
  cancha_id with =,
  fecha with =,
  numrange(inicio::numeric, inicio::numeric + horas, '[)') with &&
) where (estado <> 'cancelado');

alter table public.reservas drop constraint if exists reservas_inicio_check;
alter table public.reservas drop constraint if exists reservas_inicio_horario_check;
alter table public.reservas add constraint reservas_inicio_horario_check
  check (inicio between 7 and 24 and inicio * 2 = trunc(inicio * 2));

alter table public.horarios_bloqueados enable row level security;
revoke all on table public.horarios_bloqueados from public, anon, authenticated;
grant select, insert, update, delete on table public.horarios_bloqueados to authenticated;
drop policy if exists "admin lee horarios bloqueados" on public.horarios_bloqueados;
drop policy if exists "admin administra horarios bloqueados" on public.horarios_bloqueados;
create policy "admin lee horarios bloqueados" on public.horarios_bloqueados
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin administra horarios bloqueados" on public.horarios_bloqueados
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.horario_entrenamiento_bloqueado(
  p_cancha_id integer,
  p_fecha date,
  p_inicio numeric,
  p_horas numeric(2,1)
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.horarios_bloqueados as horario
    where horario.cancha_id = p_cancha_id
      and horario.dia_semana = extract(dow from p_fecha)::smallint
      and horario.activo
      and p_inicio * 60 < horario.fin_minuto
      and horario.inicio_minuto < (p_inicio + p_horas) * 60
  );
$function$;

revoke all on function public.horario_entrenamiento_bloqueado(integer, date, numeric, numeric)
  from public, anon, authenticated;

-- Reservas especiales de eventos. Sus detalles solo están disponibles para
-- administración; en la web pública se reflejan únicamente como no disponible.
create table if not exists public.bloqueos_eventos (
  id uuid primary key default gen_random_uuid(),
  cancha_id integer not null check (cancha_id between 1 and 4),
  fecha date not null,
  inicio smallint not null check (inicio between 7 and 24),
  fin smallint not null check (fin between 8 and 25),
  nombre text not null check (char_length(trim(nombre)) between 2 and 80),
  celular text not null default '' check (celular = '' or celular ~ '^9[0-9]{8}$'),
  notas text not null default '' check (char_length(notas) <= 240),
  estado text not null default 'activo' check (estado in ('activo', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bloqueos_eventos_duracion_check check (fin > inicio and fin - inicio >= 5),
  constraint bloqueos_eventos_disponibilidad_excl exclude using gist (
    cancha_id with =,
    fecha with =,
    int4range(inicio, fin, '[)') with &&
  ) where (estado = 'activo')
);

create index if not exists bloqueos_eventos_fecha_cancha_idx
  on public.bloqueos_eventos (fecha, cancha_id);

alter table public.bloqueos_eventos enable row level security;
revoke all on table public.bloqueos_eventos from public, anon, authenticated;
drop policy if exists "admin lee bloqueos eventos" on public.bloqueos_eventos;
drop policy if exists "admin administra bloqueos eventos" on public.bloqueos_eventos;
create policy "admin lee bloqueos eventos" on public.bloqueos_eventos
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin administra bloqueos eventos" on public.bloqueos_eventos
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.evento_bloquea(
  p_cancha_id integer,
  p_fecha date,
  p_inicio numeric,
  p_horas numeric(2,1)
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.bloqueos_eventos as evento
    where evento.estado = 'activo'
      and evento.cancha_id = p_cancha_id
      and evento.fecha = p_fecha
      and evento.inicio < p_inicio + p_horas
      and p_inicio < evento.fin
  );
$function$;

revoke all on function public.evento_bloquea(integer, date, numeric, numeric)
  from public, anon, authenticated;

drop function if exists public.crear_bloqueo_evento_admin(integer, date, smallint, smallint, text, text, text);
create or replace function public.crear_bloqueo_evento_admin(
  p_cancha_id integer,
  p_fecha date,
  p_inicio smallint,
  p_fin smallint,
  p_nombre text,
  p_celular text default '',
  p_notas text default ''
)
returns setof public.bloqueos_eventos
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_evento public.bloqueos_eventos%rowtype;
  v_hoy date := timezone('America/Lima', now())::date;
  v_nombre text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_celular text := regexp_replace(trim(coalesce(p_celular, '')), '[[:space:]-]+', '', 'g');
  v_notas text := trim(coalesce(p_notas, ''));
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception using errcode = '42501', message = 'no_autorizado';
  end if;

  if p_cancha_id not between 1 and 4
     or p_fecha < v_hoy
     or p_inicio not between 7 and 24
     or p_fin not between 8 and 25
     or p_fin - p_inicio < 5
     or char_length(v_nombre) not between 2 and 80
     or char_length(v_notas) > 240
     or (v_celular <> '' and v_celular !~ '^9[0-9]{8}$') then
    raise exception using errcode = '22023', message = 'evento_invalido';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('agenda:%s:%s', p_cancha_id, p_fecha), 0));

  if exists (
    select 1
    from public.reservas as reserva
    where reserva.cancha_id = p_cancha_id
      and reserva.fecha = p_fecha
      and reserva.estado <> 'cancelado'
      and numrange(reserva.inicio::numeric, reserva.inicio::numeric + reserva.horas, '[)')
        && numrange(p_inicio::numeric, p_fin::numeric, '[)')
  ) or public.evento_bloquea(p_cancha_id, p_fecha, p_inicio, p_fin - p_inicio)
    or public.horario_entrenamiento_bloqueado(p_cancha_id, p_fecha, p_inicio, p_fin - p_inicio) then
    raise exception using errcode = '23P01', message = 'evento_ocupado';
  end if;

  insert into public.bloqueos_eventos (cancha_id, fecha, inicio, fin, nombre, celular, notas)
  values (p_cancha_id, p_fecha, p_inicio, p_fin, v_nombre, v_celular, v_notas)
  returning * into v_evento;

  return next v_evento;
end;
$function$;

create or replace function public.obtener_bloqueos_eventos_admin()
returns setof public.bloqueos_eventos
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception using errcode = '42501', message = 'no_autorizado';
  end if;

  return query
  select evento.*
  from public.bloqueos_eventos as evento
  order by evento.fecha, evento.inicio, evento.created_at;
end;
$function$;

create or replace function public.cancelar_bloqueo_evento_admin(p_id uuid)
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

  update public.bloqueos_eventos
  set estado = 'cancelado', updated_at = now()
  where id = p_id and estado = 'activo'
  returning true into v_cancelado;

  return coalesce(v_cancelado, false);
end;
$function$;

revoke all on function public.crear_bloqueo_evento_admin(integer, date, smallint, smallint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.crear_bloqueo_evento_admin(integer, date, smallint, smallint, text, text, text)
  to authenticated;
revoke all on function public.obtener_bloqueos_eventos_admin()
  from public, anon, authenticated;
grant execute on function public.obtener_bloqueos_eventos_admin() to authenticated;
revoke all on function public.cancelar_bloqueo_evento_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.cancelar_bloqueo_evento_admin(uuid) to authenticated;

drop function if exists public.obtener_horarios_publicos(integer, date, smallint);
drop function if exists public.obtener_horarios_publicos(integer, date, numeric);

create or replace function public.obtener_horarios_publicos(
  p_cancha_id integer,
  p_fecha date,
  p_horas numeric(2,1)
)
returns table (inicio numeric, libre boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_hoy date := timezone('America/Lima', now())::date;
  v_hora_actual numeric := extract(hour from timezone('America/Lima', now()))
    + extract(minute from timezone('America/Lima', now())) / 60.0;
begin
  if p_cancha_id not between 1 and 4 then
    raise exception using errcode = '22023', message = 'cancha_invalida';
  end if;

  if p_fecha < v_hoy or p_fecha > v_hoy + 13 then
    raise exception using errcode = '22023', message = 'fecha_invalida';
  end if;

  if p_horas not in (0.5, 1, 1.5, 2, 2.5, 3) then
    raise exception using errcode = '22023', message = 'duracion_invalida';
  end if;

  return query
  select
    (serie.media_hora / 2.0)::numeric(4,1),
    (p_fecha <> v_hoy or serie.media_hora / 2.0 > v_hora_actual)
      and not public.horario_entrenamiento_bloqueado(
        p_cancha_id, p_fecha, serie.media_hora / 2.0, p_horas
      )
      and not public.evento_bloquea(
        p_cancha_id, p_fecha, serie.media_hora / 2.0, p_horas
      )
      and not exists (
        select 1
        from public.reservas as reserva
        where reserva.cancha_id = p_cancha_id
          and reserva.fecha = p_fecha
          and reserva.estado <> 'cancelado'
          and numrange(reserva.inicio::numeric, reserva.inicio::numeric + reserva.horas, '[)')
            && numrange(serie.media_hora / 2.0, serie.media_hora / 2.0 + p_horas, '[)')
      ) as libre
  from generate_series(14, floor((25 - p_horas) * 2)::integer) as serie(media_hora)
  where (p_fecha <> v_hoy or serie.media_hora / 2.0 > v_hora_actual)
  order by serie.media_hora;
end;
$function$;

drop function if exists public.crear_reserva_publica(integer, date, smallint, smallint, text, text);
drop function if exists public.crear_reserva_publica(integer, date, smallint, numeric, text, text);
drop function if exists public.crear_reserva_publica(integer, date, numeric, numeric, text, text);

create or replace function public.crear_reserva_publica(
  p_cancha_id integer,
  p_fecha date,
  p_inicio numeric,
  p_horas numeric(2,1),
  p_alias text,
  p_celular text
)
returns table (
  id uuid,
  cancha_id integer,
  fecha date,
  inicio numeric,
  horas numeric(2,1),
  alias text,
  celular text,
  estado text,
  monto_total numeric(10, 2),
  token text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_hoy date := timezone('America/Lima', now())::date;
  v_hora_actual numeric := extract(hour from timezone('America/Lima', now()))
    + extract(minute from timezone('America/Lima', now())) / 60.0;
  v_alias text := regexp_replace(trim(p_alias), '\s+', ' ', 'g');
  v_celular text := regexp_replace(trim(p_celular), '[[:space:]-]+', '', 'g');
  v_precio_hora numeric(10, 2);
  v_monto_total numeric(10, 2);
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_reserva public.reservas%rowtype;
begin
  v_precio_hora := case p_cancha_id
    when 1 then 55
    when 2 then 50
    when 3 then 60
    when 4 then 30
    else null
  end;

  if v_precio_hora is null then
    raise exception using errcode = '22023', message = 'cancha_invalida';
  end if;

  if p_fecha < v_hoy or p_fecha > v_hoy + 13 then
    raise exception using errcode = '22023', message = 'fecha_invalida';
  end if;

  if p_inicio not between 7 and 24
     or p_inicio * 2 <> trunc(p_inicio * 2)
     or p_horas not in (0.5, 1, 1.5, 2, 2.5, 3)
     or p_inicio + p_horas > 25 then
    raise exception using errcode = '22023', message = 'horario_invalido';
  end if;

  if p_fecha = v_hoy and p_inicio <= v_hora_actual then
    raise exception using errcode = '22023', message = 'hora_pasada';
  end if;

  if public.horario_entrenamiento_bloqueado(p_cancha_id, p_fecha, p_inicio, p_horas) then
    raise exception using errcode = '23P01', message = 'horario_entrenamiento_ocupado';
  end if;

  if char_length(v_alias) not between 2 and 24
     or v_alias !~ '^[[:alpha:]][[:alnum:] ''-]*$' then
    raise exception using errcode = '22023', message = 'alias_invalido';
  end if;

  if v_celular !~ '^9[0-9]{8}$' then
    raise exception using errcode = '22023', message = 'celular_invalido';
  end if;

  v_monto_total := v_precio_hora * p_horas;

  perform pg_advisory_xact_lock(hashtextextended(v_celular, 0));
  perform pg_advisory_xact_lock(hashtextextended(format('agenda:%s:%s', p_cancha_id, p_fecha), 0));

  if public.evento_bloquea(p_cancha_id, p_fecha, p_inicio, p_horas) then
    raise exception using errcode = '23P01', message = 'evento_ocupado';
  end if;

  if (
    select count(*)
    from public.reservas as reserva
    where reserva.celular = v_celular
      and reserva.estado not in ('cancelado', 'finalizado')
      and (
        reserva.fecha > v_hoy
        or (reserva.fecha = v_hoy and reserva.inicio + reserva.horas > v_hora_actual)
      )
  ) >= 2 then
    raise exception using errcode = 'P0001', message = 'limite_reservas';
  end if;

  perform public.registrar_intento_reserva(v_celular);

  insert into public.clientes (alias, celular)
  select v_alias, v_celular
  where not exists (
    select 1
    from public.clientes as cliente
    where cliente.celular = v_celular
  );

  insert into public.reservas (
    cancha_id, fecha, inicio, horas, alias, celular, token_hash, estado, monto_total
  )
  values (
    p_cancha_id,
    p_fecha,
    p_inicio,
    p_horas,
    v_alias,
    v_celular,
    encode(digest(v_token, 'sha256'), 'hex'),
    'activo',
    v_monto_total
  )
  returning * into v_reserva;

  return query
  select
    v_reserva.id,
    v_reserva.cancha_id,
    v_reserva.fecha,
    v_reserva.inicio,
    v_reserva.horas,
    v_reserva.alias,
    v_reserva.celular,
    v_reserva.estado,
    v_reserva.monto_total,
    v_token;
end;
$function$;

drop function if exists public.obtener_mis_reservas_publicas(text[]);

create function public.obtener_mis_reservas_publicas(p_tokens text[])
returns table (
  id uuid,
  cancha_id integer,
  fecha date,
  inicio numeric,
  horas numeric(2,1),
  alias text,
  celular text,
  estado text,
  pago_estado text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_hashes text[];
begin
  if p_tokens is null or cardinality(p_tokens) not between 1 and 20 then
    raise exception using errcode = '22023', message = 'tokens_invalidos';
  end if;

  if exists (
    select 1
    from unnest(p_tokens) as token(valor)
    where token.valor is null or token.valor !~ '^[0-9a-f]{48}$'
  ) then
    raise exception using errcode = '22023', message = 'tokens_invalidos';
  end if;

  select array_agg(encode(digest(token.valor, 'sha256'), 'hex'))
  into v_hashes
  from unnest(p_tokens) as token(valor);

  return query
  select r.id, r.cancha_id, r.fecha, r.inicio, r.horas, r.alias, r.celular, r.estado, r.pago_estado
  from public.reservas r
  where r.token_hash = any(v_hashes)
  order by r.fecha, r.inicio;
end;
$function$;

revoke all on function public.obtener_horarios_publicos(integer, date, numeric)
  from public, anon, authenticated;
grant execute on function public.obtener_horarios_publicos(integer, date, numeric) to anon;
revoke all on function public.crear_reserva_publica(integer, date, numeric, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.crear_reserva_publica(integer, date, numeric, numeric, text, text) to anon;
revoke all on function public.obtener_mis_reservas_publicas(text[])
  from public, anon, authenticated;
grant execute on function public.obtener_mis_reservas_publicas(text[]) to anon;
