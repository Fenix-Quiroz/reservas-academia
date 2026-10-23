-- Esquema de reservas. Ejecutar en Supabase > SQL Editor.
-- El acceso a los datos queda reservado para usuarios autenticados con
-- app_metadata.role = 'admin'. La reserva pública usa funciones seguras,
-- no tablas abiertas al navegador.

create extension if not exists btree_gist;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  alias text not null check (char_length(trim(alias)) between 2 and 24),
  celular text not null check (celular ~ '^9[0-9]{8}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists clientes_celular_key
  on public.clientes (celular);

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

-- Los alias son nombres visibles y pueden repetirse entre clientes.
drop index if exists public.clientes_alias_lower_key;

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  cancha_id integer not null,
  fecha date not null,
  inicio smallint not null check (inicio between 8 and 22),
  horas smallint not null check (horas in (1, 2)),
  alias text not null check (char_length(trim(alias)) between 2 and 24),
  celular text not null check (celular ~ '^9[0-9]{8}$'),
  token_hash text,
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
alter table public.reservas add column if not exists token_hash text;

-- Completa el precio de reservas antiguas que todavía no lo tenían guardado.
update public.reservas
set monto_total = case cancha_id
  when 1 then 60 * horas
  when 2 then 60 * horas
  when 3 then 90 * horas
  when 4 then 50 * horas
  else null
end
where monto_total is null or monto_total = 0;

create unique index if not exists reservas_token_hash_key
  on public.reservas (token_hash)
  where token_hash is not null;

-- Actualiza el límite de alias en tablas creadas con el esquema anterior.
-- NOT VALID conserva históricos antiguos, pero valida todos los registros nuevos.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'clientes_alias_check'
      and conrelid = 'public.clientes'::regclass
  ) then
    alter table public.clientes drop constraint clientes_alias_check;
  end if;
  alter table public.clientes
    add constraint clientes_alias_check
    check (char_length(trim(alias)) between 2 and 24) not valid;

  if exists (
    select 1 from pg_constraint
    where conname = 'reservas_alias_check'
      and conrelid = 'public.reservas'::regclass
  ) then
    alter table public.reservas drop constraint reservas_alias_check;
  end if;
  alter table public.reservas
    add constraint reservas_alias_check
    check (char_length(trim(alias)) between 2 and 24) not valid;
end
$$;

-- Los alias nuevos empiezan con una letra y solo usan caracteres legibles.
-- NOT VALID permite conservar datos de prueba antiguos sin bloquear la migración.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clientes_alias_formato_check'
      and conrelid = 'public.clientes'::regclass
  ) then
    alter table public.clientes
      add constraint clientes_alias_formato_check
      check (alias ~ '^[[:alpha:]][[:alnum:] ''-]*$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reservas_alias_formato_check'
      and conrelid = 'public.reservas'::regclass
  ) then
    alter table public.reservas
      add constraint reservas_alias_formato_check
      check (alias ~ '^[[:alpha:]][[:alnum:] ''-]*$') not valid;
  end if;
end
$$;

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

-- El estado tiene un ciclo de vida controlado también en la base de datos.
-- Así ningún cliente autenticado puede saltarse etapas editando directamente la tabla.
create or replace function public.validar_transicion_reserva()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if old.estado = new.estado then
    return new;
  end if;

  if (old.estado = 'activo' and new.estado in ('iniciado', 'cancelado'))
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

-- API pública mínima para reservar sin abrir las tablas al navegador.
-- Estas funciones validan sus argumentos otra vez en PostgreSQL y no devuelven
-- listados de reservas ni datos de otros clientes.
create or replace function public.obtener_horarios_publicos(
  p_cancha_id integer,
  p_fecha date,
  p_horas smallint
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

  if p_horas not in (1, 2) then
    raise exception using errcode = '22023', message = 'duracion_invalida';
  end if;

  return query
  select
    serie.inicio::smallint,
    (p_fecha <> v_hoy or serie.inicio > v_hora_actual)
      and not exists (
        select 1
        from public.reservas r
        where r.cancha_id = p_cancha_id
          and r.fecha = p_fecha
          and r.estado <> 'cancelado'
          and int4range(r.inicio, r.inicio + r.horas, '[)')
            && int4range(serie.inicio, serie.inicio + p_horas, '[)')
      ) as libre
  from generate_series(8, 23 - p_horas) as serie(inicio)
  where (p_fecha <> v_hoy or serie.inicio > v_hora_actual)
  order by serie.inicio;
end;
$function$;

-- La versión anterior no devolvía token; se elimina para poder cambiar su
-- contrato de retorno de forma segura al volver a ejecutar este esquema.
drop function if exists public.crear_reserva_publica(integer, date, smallint, smallint, text, text);

create or replace function public.crear_reserva_publica(
  p_cancha_id integer,
  p_fecha date,
  p_inicio smallint,
  p_horas smallint,
  p_alias text,
  p_celular text
)
returns table (
  id uuid,
  cancha_id integer,
  fecha date,
  inicio smallint,
  horas smallint,
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
    when 1 then 60
    when 2 then 60
    when 3 then 90
    when 4 then 50
    else null
  end;

  if v_precio_hora is null then
    raise exception using errcode = '22023', message = 'cancha_invalida';
  end if;

  if p_fecha < v_hoy or p_fecha > v_hoy + 6 then
    raise exception using errcode = '22023', message = 'fecha_invalida';
  end if;

  if p_inicio not between 8 and 22 or p_horas not in (1, 2) or p_inicio + p_horas > 23 then
    raise exception using errcode = '22023', message = 'horario_invalido';
  end if;

  if p_fecha = v_hoy and p_inicio <= v_hora_actual then
    raise exception using errcode = '22023', message = 'hora_pasada';
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

create or replace function public.obtener_mis_reservas_publicas(p_tokens text[])
returns table (
  id uuid,
  cancha_id integer,
  fecha date,
  inicio smallint,
  horas smallint,
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

revoke all on function public.obtener_horarios_publicos(integer, date, smallint) from public, anon, authenticated;
grant execute on function public.obtener_horarios_publicos(integer, date, smallint) to anon;
revoke all on function public.registrar_intento_reserva(text) from public, anon, authenticated;
revoke all on function public.crear_reserva_publica(integer, date, smallint, smallint, text, text) from public, anon, authenticated;
grant execute on function public.crear_reserva_publica(integer, date, smallint, smallint, text, text) to anon;
revoke all on function public.obtener_mis_reservas_publicas(text[]) from public, anon, authenticated;
grant execute on function public.obtener_mis_reservas_publicas(text[]) to anon;
revoke all on function public.cancelar_reserva_publica(uuid, text) from public, anon, authenticated;
grant execute on function public.cancelar_reserva_publica(uuid, text) to anon;
revoke all on function public.validar_transicion_reserva() from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Cierre del acceso directo: el cliente público solo usa las funciones RPC
-- definidas arriba.
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
