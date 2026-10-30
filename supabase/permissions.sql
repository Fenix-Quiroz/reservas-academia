-- Ejecuta este ajuste si ya habías ejecutado una versión anterior de schema.sql.
-- El cliente público usa funciones RPC seguras, no acceso directo a tablas.
create extension if not exists pgcrypto with schema extensions;
alter table public.reservas add column if not exists monto_total numeric(10, 2);
alter table public.reservas add column if not exists token_hash text;
alter table public.reservas add column if not exists pago_estado text;
update public.reservas set pago_estado = 'no_requerido' where pago_estado is null;
alter table public.reservas alter column pago_estado set default 'no_requerido';
alter table public.reservas alter column pago_estado set not null;
alter table public.reservas drop constraint if exists reservas_pago_estado_check;
alter table public.reservas add constraint reservas_pago_estado_check
  check (pago_estado in ('no_requerido', 'pendiente', 'confirmado', 'rechazado'));
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

-- Reservas especiales de eventos: solo administración puede ver sus detalles.
create table if not exists public.eventos_especiales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('individual', 'todos_los_campos')),
  precio_cobrado numeric(10, 2) not null default 0 check (precio_cobrado >= 0),
  estado text not null default 'activo' check (estado in ('activo', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.eventos_especiales
  add column if not exists tipo text,
  add column if not exists precio_cobrado numeric(10, 2),
  add column if not exists estado text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.eventos_especiales
  alter column tipo set default 'individual',
  alter column precio_cobrado set default 0,
  alter column estado set default 'activo';

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

create table if not exists public.bloqueos_eventos (
  id uuid primary key default gen_random_uuid(),
  evento_especial_id uuid references public.eventos_especiales(id) on delete cascade,
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

create index if not exists bloqueos_eventos_fecha_cancha_idx
  on public.bloqueos_eventos (fecha, cancha_id);
create index if not exists bloqueos_eventos_evento_especial_idx
  on public.bloqueos_eventos (evento_especial_id);

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
  v_entrenamiento record;
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

  select horario.inicio_minuto, horario.fin_minuto
  into v_entrenamiento
  from public.horarios_bloqueados as horario
  where horario.cancha_id = p_cancha_id
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
    where reserva.cancha_id = p_cancha_id
      and reserva.fecha = p_fecha
      and reserva.estado <> 'cancelado'
      and numrange(reserva.inicio::numeric, reserva.inicio::numeric + reserva.horas, '[)')
        && numrange(p_inicio::numeric, p_fin::numeric, '[)')
  ) or public.evento_bloquea(p_cancha_id, p_fecha, p_inicio, p_fin - p_inicio) then
    raise exception using errcode = '23P01', message = 'evento_ocupado';
  end if;

  insert into public.bloqueos_eventos (cancha_id, fecha, inicio, fin, nombre, celular, notas)
  values (p_cancha_id, p_fecha, p_inicio, p_fin, v_nombre, v_celular, v_notas)
  returning * into v_evento;

  return next v_evento;
end;
$function$;

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
     or cardinality(v_cancha_ids) not between 1 and 3
     or exists (select 1 from unnest(p_cancha_ids) as ids(cancha_id)
               where ids.cancha_id is null or ids.cancha_id not between 1 and 3)
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
  set estado = 'cancelado'
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
revoke all on function public.crear_evento_especial_admin(integer[], date, smallint, smallint, text, text, text, text, numeric)
  from public, anon, authenticated;
grant execute on function public.crear_evento_especial_admin(integer[], date, smallint, smallint, text, text, text, text, numeric)
  to authenticated;
revoke all on function public.cancelar_evento_especial_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.cancelar_evento_especial_admin(uuid)
  to authenticated;
revoke all on function public.cancelar_bloqueo_evento_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.cancelar_bloqueo_evento_admin(uuid) to authenticated;

-- Se define antes de la sección de pagos porque este archivo agrega las
-- columnas/tablas de pagos más abajo; el SQL se resuelve al invocarla.
create or replace function public.liberar_reservas_pago_expiradas()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_liberadas integer;
begin
  execute $sql$
    update public.reservas as reserva
    set estado = 'cancelado'
    where reserva.estado = 'activo'
      and reserva.pago_estado in ('pendiente', 'rechazado')
      and reserva.pago_expira_at is not null
      and reserva.pago_expira_at <= now()
      and not exists (
        select 1 from public.pagos_reserva as pago
        where pago.reserva_id = reserva.id and pago.estado = 'confirmado'
      )
  $sql$;
  get diagnostics v_liberadas = row_count;
  return v_liberadas;
end;
$function$;

revoke all on function public.liberar_reservas_pago_expiradas() from public, anon, authenticated;

create or replace function public.liberar_reserva_pago_expirada(p_reserva_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_liberada boolean;
begin
  execute $sql$
    update public.reservas as reserva
    set estado = 'cancelado'
    where reserva.id = $1
      and reserva.estado = 'activo'
      and reserva.pago_estado in ('pendiente', 'rechazado')
      and reserva.pago_expira_at is not null
      and reserva.pago_expira_at <= now()
      and not exists (
        select 1 from public.pagos_reserva as pago
        where pago.reserva_id = reserva.id and pago.estado = 'confirmado'
      )
    returning true
  $sql$ into v_liberada using p_reserva_id;
  return coalesce(v_liberada, false);
end;
$function$;

revoke all on function public.liberar_reserva_pago_expirada(uuid) from public, anon, authenticated;
grant execute on function public.liberar_reserva_pago_expirada(uuid) to service_role;

-- API pública mínima para reservar sin abrir las tablas al navegador.
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
  perform public.liberar_reservas_pago_expiradas();

  if p_cancha_id not between 1 and 4 then
    raise exception using errcode = '22023', message = 'cancha_invalida';
  end if;

  if p_fecha < v_hoy or p_fecha > v_hoy + 20 then
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
        from public.reservas r
        where r.cancha_id = p_cancha_id
          and r.fecha = p_fecha
          and r.estado <> 'cancelado'
          and numrange(r.inicio::numeric, r.inicio::numeric + r.horas, '[)')
            && numrange(serie.media_hora / 2.0, serie.media_hora / 2.0 + p_horas, '[)')
      ) as libre
  from generate_series(14, floor((25 - p_horas) * 2)::integer) as serie(media_hora)
  where (p_fecha <> v_hoy or serie.media_hora / 2.0 > v_hora_actual)
  order by serie.media_hora;
end;
$function$;

create or replace function public.es_numero_confiable_publico(p_celular text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_celular text := regexp_replace(trim(p_celular), '[[:space:]-]+', '', 'g');
begin
  if v_celular is null or v_celular !~ '^9[0-9]{8}$' then
    return false;
  end if;
  return exists (
    select 1
    from public.numeros_confiables as confiable
    where confiable.celular = v_celular
      and confiable.activo
  );
end;
$function$;

drop function if exists public.crear_reserva_publica(integer, date, smallint, smallint, text, text);
drop function if exists public.crear_reserva_publica(integer, date, smallint, numeric, text, text);
drop function if exists public.crear_reserva_publica(integer, date, numeric, numeric, text, text);
drop function if exists public.crear_reserva_publica(integer, date, numeric, numeric, text, text, boolean);

create or replace function public.crear_reserva_publica(
  p_cancha_id integer,
  p_fecha date,
  p_inicio numeric,
  p_horas numeric(2,1),
  p_alias text,
  p_celular text,
  p_sin_adelanto boolean default false
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
  pago_estado text,
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
  v_numero_confiable boolean;
  v_pago_estado text;
  v_pago_requerido numeric(10, 2);
  v_pago_expira_at timestamptz;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_reserva public.reservas%rowtype;
begin
  perform public.liberar_reservas_pago_expiradas();

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

  if p_fecha < v_hoy or p_fecha > v_hoy + 20 then
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

  if exists (
    select 1
    from public.numeros_bloqueados as bloqueado
    where bloqueado.celular = v_celular
      and bloqueado.activo
  ) then
    raise exception using errcode = 'P0001', message = 'celular_bloqueado';
  end if;

  v_numero_confiable := public.es_numero_confiable_publico(v_celular);
  if p_sin_adelanto and not v_numero_confiable then
    raise exception using errcode = 'P0001', message = 'numero_no_confiable';
  end if;

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

  v_pago_estado := case when p_sin_adelanto then 'no_requerido' else 'pendiente' end;
  v_pago_requerido := case when p_sin_adelanto then 0 else 15 end;
  v_pago_expira_at := case when p_sin_adelanto then null else now() + interval '30 minutes' end;

  insert into public.clientes (alias, celular)
  select v_alias, v_celular
  where not exists (
    select 1
    from public.clientes as cliente
    where cliente.celular = v_celular
  );

  insert into public.reservas (
    cancha_id, fecha, inicio, horas, alias, celular, token_hash, estado,
    monto_total, pago_estado, pago_requerido, pago_expira_at
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
    v_monto_total,
    v_pago_estado,
    v_pago_requerido,
    v_pago_expira_at
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
    v_reserva.pago_estado,
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
revoke all on function public.es_numero_confiable_publico(text) from public, anon, authenticated;
grant execute on function public.es_numero_confiable_publico(text) to anon;
revoke all on function public.crear_reserva_publica(integer, date, numeric, numeric, text, text, boolean) from public, anon, authenticated;
grant execute on function public.crear_reserva_publica(integer, date, numeric, numeric, text, text, boolean) to anon;
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

create or replace function public.confirmar_pago_admin(p_pago_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_pago public.pagos_reserva%rowtype;
  v_reserva public.reservas%rowtype;
  v_limite_confirmacion timestamptz;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception using errcode = '42501', message = 'admin_no_autorizado';
  end if;
  select * into v_pago from public.pagos_reserva where id = p_pago_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'pago_no_existe';
  end if;
  if v_pago.estado = 'confirmado' then return true; end if;
  if v_pago.estado <> 'pendiente' then
    raise exception using errcode = 'P0001', message = 'pago_no_confirmable';
  end if;
  if not exists (select 1 from public.pago_comprobantes where pago_id = v_pago.id) then
    raise exception using errcode = 'P0001', message = 'comprobante_no_existe';
  end if;
  select * into v_reserva from public.reservas
  where id = v_pago.reserva_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'reserva_no_activa';
  end if;
  if v_reserva.estado not in ('activo', 'iniciado', 'finalizado') then
    raise exception using errcode = 'P0001', message = 'reserva_no_activa';
  end if;
  v_limite_confirmacion := (
    v_reserva.fecha::timestamp
    + (v_reserva.inicio + v_reserva.horas) * interval '1 hour'
    + interval '2 hours'
  ) at time zone 'America/Lima';
  if now() > v_limite_confirmacion then
    raise exception using errcode = 'P0001', message = 'confirmacion_fuera_de_plazo';
  end if;
  update public.pagos_reserva
  set estado = 'confirmado', revisado_por = auth.uid(), revisado_at = now()
  where id = v_pago.id;
  update public.reservas
  set pago_estado = 'confirmado', pago_expira_at = null
  where id = v_pago.reserva_id;
  return true;
end;
$function$;
revoke all on function public.confirmar_pago_admin(uuid) from public, anon;
grant execute on function public.confirmar_pago_admin(uuid) to authenticated;

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

-- Estructura escalable para adelantos y comprobantes.
alter table public.reservas add column if not exists pago_requerido numeric(10, 2);
update public.reservas
set pago_requerido = case when pago_estado = 'no_requerido' then 0 else 10 end
where pago_requerido is null;
alter table public.reservas alter column pago_requerido set default 0;
alter table public.reservas alter column pago_requerido set not null;
alter table public.reservas drop constraint if exists reservas_pago_requerido_check;
alter table public.reservas add constraint reservas_pago_requerido_check
  check ((pago_estado = 'no_requerido' and pago_requerido = 0)
    or (pago_estado <> 'no_requerido' and pago_requerido >= 10));
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
  referencia_externa text not null default '' check (char_length(referencia_externa) <= 120),
  motivo_rechazo text not null default '' check (char_length(motivo_rechazo) <= 240),
  idempotencia text check (idempotencia is null or char_length(trim(idempotencia)) between 8 and 128),
  revisado_por uuid,
  enviado_at timestamptz not null default now(),
  revisado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pagos_reserva_adelanto_minimo_check check (tipo <> 'adelanto' or monto >= 10)
);
create index if not exists pagos_reserva_reserva_idx on public.pagos_reserva (reserva_id, created_at desc);
create index if not exists pagos_reserva_estado_idx on public.pagos_reserva (estado, created_at desc);
create unique index if not exists pagos_reserva_idempotencia_idx
  on public.pagos_reserva (idempotencia) where idempotencia is not null;

create table if not exists public.pago_comprobantes (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references public.pagos_reserva(id) on delete cascade,
  storage_path text not null unique
    check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists pago_comprobantes_pago_idx on public.pago_comprobantes (pago_id, created_at desc);
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
      hint = 'Revisa y conserva un comprobante por pago_id antes de ejecutar este esquema.';
  end if;
end
$$;
create unique index if not exists pago_comprobantes_pago_unica_idx on public.pago_comprobantes (pago_id);

create or replace function public.actualizar_updated_at_pagos()
returns trigger language plpgsql set search_path = public, pg_temp as $function$
begin new.updated_at = now(); return new; end;
$function$;
drop trigger if exists actualizar_updated_at_pagos on public.pagos_reserva;
create trigger actualizar_updated_at_pagos before update on public.pagos_reserva
for each row execute function public.actualizar_updated_at_pagos();

revoke all on table public.pagos_reserva, public.pago_comprobantes from public, anon, authenticated;
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
create policy "admin lee pagos reserva" on public.pagos_reserva for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin actualiza pagos reserva" on public.pagos_reserva for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin lee pago comprobantes" on public.pago_comprobantes for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin lee comprobantes storage" on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes-pago'
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
revoke all on function public.actualizar_updated_at_pagos() from public, anon, authenticated;
