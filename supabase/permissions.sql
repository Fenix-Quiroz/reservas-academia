-- Ejecuta este ajuste si ya habías ejecutado una versión anterior de schema.sql.
-- El cliente público usa funciones RPC seguras, no acceso directo a tablas.
create extension if not exists pgcrypto with schema extensions;
alter table public.reservas add column if not exists monto_total numeric(10, 2);
alter table public.reservas add column if not exists token_hash text;
alter table public.reservas drop constraint if exists reservas_disponibilidad_excl;
alter table public.reservas
  alter column horas type numeric(2,1) using horas::numeric;
alter table public.reservas drop constraint if exists reservas_horas_check;
alter table public.reservas drop constraint if exists reservas_horas_validas_check;
alter table public.reservas add constraint reservas_horas_validas_check
  check (horas in (1, 1.5, 2, 3));
alter table public.reservas drop constraint if exists reservas_disponibilidad_excl;
alter table public.reservas add constraint reservas_disponibilidad_excl exclude using gist (
  cancha_id with =,
  fecha with =,
  numrange(inicio::numeric, inicio::numeric + horas, '[)') with &&
) where (estado <> 'cancelado');
update public.reservas
set monto_total = case cancha_id
  when 1 then 55 * horas
  when 2 then 50 * horas
  when 3 then 60 * horas
  when 4 then 30 * horas
  else null
end
where monto_total is null or monto_total = 0;
create unique index if not exists reservas_token_hash_key
  on public.reservas (token_hash)
  where token_hash is not null;

-- Limita ráfagas anormales de intentos de reserva por celular.
create table if not exists public.reserva_rate_limits (
  celular_hash text primary key,
  ventana_inicio timestamptz not null,
  intentos integer not null check (intentos between 1 and 5),
  updated_at timestamptz not null default now()
);

alter table public.reserva_rate_limits enable row level security;
revoke all on table public.reserva_rate_limits from public, anon, authenticated;

create or replace function public.registrar_intento_reserva(p_celular text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_celular text := regexp_replace(trim(p_celular), '[[:space:]-]+', '', 'g');
  v_hash text := encode(digest(v_celular, 'sha256'), 'hex');
  v_ahora timestamptz := now();
  v_ventana_inicio timestamptz;
  v_intentos integer;
begin
  if v_celular !~ '^9[0-9]{8}$' then
    raise exception using errcode = '22023', message = 'celular_invalido';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rate:' || v_celular, 0));

  select limite.ventana_inicio, limite.intentos
  into v_ventana_inicio, v_intentos
  from public.reserva_rate_limits as limite
  where limite.celular_hash = v_hash;

  if not found or v_ventana_inicio <= v_ahora - interval '10 minutes' then
    insert into public.reserva_rate_limits (celular_hash, ventana_inicio, intentos, updated_at)
    values (v_hash, v_ahora, 1, v_ahora)
    on conflict (celular_hash) do update
      set ventana_inicio = excluded.ventana_inicio,
          intentos = excluded.intentos,
          updated_at = excluded.updated_at;
    return true;
  end if;

  if v_intentos >= 5 then
    raise exception using errcode = 'P0001', message = 'limite_intentos_reserva';
  end if;

  update public.reserva_rate_limits as limite
  set intentos = limite.intentos + 1,
      updated_at = v_ahora
  where limite.celular_hash = v_hash;

  return true;
end;
$function$;

revoke all on function public.registrar_intento_reserva(text) from public, anon, authenticated;

-- El estado tiene un ciclo de vida controlado también en la base de datos.
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

drop trigger if exists validar_transicion_reserva on public.reservas;
create trigger validar_transicion_reserva
before update of estado on public.reservas
for each row execute function public.validar_transicion_reserva();

-- Horarios semanales ocupados por los entrenamientos de la academia.
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

alter table public.reservas drop constraint if exists reservas_inicio_check;
alter table public.reservas drop constraint if exists reservas_inicio_horario_check;
alter table public.reservas add constraint reservas_inicio_horario_check
  check (inicio between 7 and 24);

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
  p_inicio smallint,
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

revoke all on function public.horario_entrenamiento_bloqueado(integer, date, smallint, numeric)
  from public, anon, authenticated;

-- Reservas especiales de eventos: solo administración puede ver sus detalles.
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
  p_inicio smallint,
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

revoke all on function public.evento_bloquea(integer, date, smallint, numeric)
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

-- API pública mínima para reservar sin abrir las tablas al navegador.
drop function if exists public.obtener_horarios_publicos(integer, date, smallint);
drop function if exists public.obtener_horarios_publicos(integer, date, numeric);

create or replace function public.obtener_horarios_publicos(
  p_cancha_id integer,
  p_fecha date,
  p_horas numeric(2,1)
)
returns table (inicio smallint, libre boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_hoy date := timezone('America/Lima', now())::date;
  v_hora_actual integer := extract(hour from timezone('America/Lima', now()));
begin
  if p_cancha_id not between 1 and 4 then
    raise exception using errcode = '22023', message = 'cancha_invalida';
  end if;

  if p_fecha < v_hoy or p_fecha > v_hoy + 6 then
    raise exception using errcode = '22023', message = 'fecha_invalida';
  end if;

  if p_horas not in (1, 1.5, 2, 3) then
    raise exception using errcode = '22023', message = 'duracion_invalida';
  end if;

  return query
  select
    serie.inicio::smallint,
    (p_fecha <> v_hoy or serie.inicio > v_hora_actual)
      and not public.horario_entrenamiento_bloqueado(
        p_cancha_id, p_fecha, serie.inicio::smallint, p_horas
      )
      and not public.evento_bloquea(
        p_cancha_id, p_fecha, serie.inicio::smallint, p_horas
      )
      and not exists (
        select 1
        from public.reservas r
        where r.cancha_id = p_cancha_id
          and r.fecha = p_fecha
          and r.estado <> 'cancelado'
          and numrange(r.inicio::numeric, r.inicio::numeric + r.horas, '[)')
            && numrange(serie.inicio::numeric, serie.inicio::numeric + p_horas, '[)')
      ) as libre
  from generate_series(7, floor(25 - p_horas)::integer) as serie(inicio)
  where (p_fecha <> v_hoy or serie.inicio > v_hora_actual)
  order by serie.inicio;
end;
$function$;

drop function if exists public.crear_reserva_publica(integer, date, smallint, smallint, text, text);
drop function if exists public.crear_reserva_publica(integer, date, smallint, numeric, text, text);

create or replace function public.crear_reserva_publica(
  p_cancha_id integer,
  p_fecha date,
  p_inicio smallint,
  p_horas numeric(2,1),
  p_alias text,
  p_celular text
)
returns table (
  id uuid,
  cancha_id integer,
  fecha date,
  inicio smallint,
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
  v_hora_actual integer := extract(hour from timezone('America/Lima', now()));
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

  if p_fecha < v_hoy or p_fecha > v_hoy + 6 then
    raise exception using errcode = '22023', message = 'fecha_invalida';
  end if;

  if p_inicio not between 7 and 24 or p_horas not in (1, 1.5, 2, 3) or p_inicio + p_horas > 25 then
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
    from public.reservas r
    where r.celular = v_celular
      and r.estado not in ('cancelado', 'finalizado')
      and (
        r.fecha > v_hoy
        or (r.fecha = v_hoy and r.inicio + r.horas > v_hora_actual)
      )
  ) >= 2 then
    raise exception using errcode = 'P0001', message = 'limite_reservas';
  end if;

  -- El límite se aplica dentro de la operación protegida para que ningún
  -- cliente pueda saltarse el control llamando directamente a este RPC.
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
  inicio smallint,
  horas numeric(2,1),
  alias text,
  celular text,
  estado text
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
  select r.id, r.cancha_id, r.fecha, r.inicio, r.horas, r.alias, r.celular, r.estado
  from public.reservas r
  where r.token_hash = any(v_hashes)
  order by r.fecha, r.inicio;
end;
$function$;

create or replace function public.cancelar_reserva_publica(p_reserva_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_cancelada boolean;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then
    return false;
  end if;

  update public.reservas
  set estado = 'cancelado'
  where id = p_reserva_id
    and token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and estado in ('activo', 'iniciado')
  returning true into v_cancelada;

  return coalesce(v_cancelada, false);
end;
$function$;

revoke all on function public.obtener_horarios_publicos(integer, date, numeric) from public, anon, authenticated;
grant execute on function public.obtener_horarios_publicos(integer, date, numeric) to anon;
revoke all on function public.registrar_intento_reserva(text) from public, anon, authenticated;
revoke all on function public.crear_reserva_publica(integer, date, smallint, numeric, text, text) from public, anon, authenticated;
grant execute on function public.crear_reserva_publica(integer, date, smallint, numeric, text, text) to anon;
revoke all on function public.obtener_mis_reservas_publicas(text[]) from public, anon, authenticated;
grant execute on function public.obtener_mis_reservas_publicas(text[]) to anon;
revoke all on function public.cancelar_reserva_publica(uuid, text) from public, anon, authenticated;
grant execute on function public.cancelar_reserva_publica(uuid, text) to anon;
revoke all on function public.validar_transicion_reserva() from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
revoke all on table public.clientes, public.reservas from anon, authenticated;
grant select, update on table public.clientes, public.reservas to authenticated;

alter table public.clientes enable row level security;
alter table public.reservas enable row level security;

drop policy if exists "demo lee clientes" on public.clientes;
drop policy if exists "demo crea clientes" on public.clientes;
drop policy if exists "demo actualiza clientes" on public.clientes;
drop policy if exists "demo lee reservas" on public.reservas;
drop policy if exists "demo crea reservas" on public.reservas;
drop policy if exists "demo cancela reservas" on public.reservas;
drop policy if exists "demo actualiza reservas" on public.reservas;
drop policy if exists "admin lee clientes" on public.clientes;
drop policy if exists "admin actualiza clientes" on public.clientes;
drop policy if exists "admin lee reservas" on public.reservas;
drop policy if exists "admin actualiza reservas" on public.reservas;

create policy "admin lee clientes" on public.clientes
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin actualiza clientes" on public.clientes
  for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin lee reservas" on public.reservas
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin actualiza reservas" on public.reservas
  for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Control de inasistencias, números bloqueados y clientes confiables.
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
  alias text not null default 'Cliente confiable' check (char_length(trim(alias)) between 2 and 24),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reservas drop constraint if exists reservas_estado_check;
alter table public.reservas add constraint reservas_estado_check
  check (estado in ('activo', 'iniciado', 'finalizado', 'cancelado', 'no_asistio'));

create or replace function public.validar_transicion_reserva()
returns trigger language plpgsql set search_path = public, pg_temp as $function$
begin
  if old.estado = new.estado then return new; end if;
  if (old.estado = 'activo' and new.estado in ('iniciado', 'finalizado', 'cancelado', 'no_asistio'))
     or (old.estado = 'iniciado' and new.estado in ('finalizado', 'cancelado')) then return new; end if;
  raise exception using errcode = 'P0001', message = 'transicion_estado_invalida';
end;
$function$;
create or replace function public.verificar_numero_bloqueado()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $function$
begin
  if exists (select 1 from public.numeros_bloqueados as bloqueado where bloqueado.celular = new.celular and bloqueado.activo) then
    raise exception using errcode = 'P0001', message = 'celular_bloqueado';
  end if;
  return new;
end;
$function$;
create or replace function public.actualizar_bloqueo_por_inasistencia()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $function$
declare v_inasistencias integer;
begin
  if new.estado = 'no_asistio' and old.estado is distinct from new.estado then
    select count(*) into v_inasistencias from public.reservas as reserva
    where reserva.celular = new.celular and reserva.estado = 'no_asistio';
    if v_inasistencias >= 2 then
      insert into public.numeros_bloqueados (celular, motivo, inasistencias, activo, updated_at)
      values (new.celular, 'Bloqueado automáticamente después de 2 inasistencias', v_inasistencias, true, now())
      on conflict (celular) do update set motivo = excluded.motivo, inasistencias = excluded.inasistencias, activo = true, updated_at = excluded.updated_at;
    end if;
  end if;
  return new;
end;
$function$;
drop trigger if exists validar_transicion_reserva on public.reservas;
create trigger validar_transicion_reserva before update of estado on public.reservas for each row execute function public.validar_transicion_reserva();
drop trigger if exists verificar_numero_bloqueado on public.reservas;
create trigger verificar_numero_bloqueado before insert on public.reservas for each row execute function public.verificar_numero_bloqueado();
drop trigger if exists actualizar_bloqueo_por_inasistencia on public.reservas;
create trigger actualizar_bloqueo_por_inasistencia after update of estado on public.reservas for each row execute function public.actualizar_bloqueo_por_inasistencia();

revoke all on table public.numeros_bloqueados, public.numeros_confiables from public, anon, authenticated;
grant select, insert, update, delete on table public.numeros_bloqueados, public.numeros_confiables to authenticated;
alter table public.numeros_bloqueados enable row level security;
alter table public.numeros_confiables enable row level security;
drop policy if exists "admin lee numeros bloqueados" on public.numeros_bloqueados;
drop policy if exists "admin administra numeros bloqueados" on public.numeros_bloqueados;
drop policy if exists "admin lee numeros confiables" on public.numeros_confiables;
drop policy if exists "admin administra numeros confiables" on public.numeros_confiables;
create policy "admin lee numeros bloqueados" on public.numeros_bloqueados for select to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin administra numeros bloqueados" on public.numeros_bloqueados for all to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin lee numeros confiables" on public.numeros_confiables for select to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin administra numeros confiables" on public.numeros_confiables for all to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
revoke all on function public.verificar_numero_bloqueado() from public, anon, authenticated;
revoke all on function public.actualizar_bloqueo_por_inasistencia() from public, anon, authenticated;
