-- Permite consultar disponibilidad cada 30 minutos y comenzar reservas cada 30 minutos.
-- La reserva confirmada sigue teniendo una duración mínima de 1 hora.
-- Ejecutar después de schema.sql, fix-horarios-academia.sql y los fixes
-- de reservas que ya estén instalados.
-- Conserva las reservas existentes: 9.5 representa las 9:30 a. m.

alter table public.reservas drop constraint if exists reservas_disponibilidad_excl;
alter table public.reservas
  alter column inicio type numeric(4,1) using inicio::numeric;

alter table public.reservas drop constraint if exists reservas_inicio_check;
alter table public.reservas drop constraint if exists reservas_inicio_horario_check;
alter table public.reservas add constraint reservas_inicio_horario_check
  check (
    inicio between 7 and 24
    and inicio * 2 = trunc(inicio * 2)
  );

alter table public.reservas drop constraint if exists reservas_horas_check;
alter table public.reservas drop constraint if exists reservas_horas_validas_check;
alter table public.reservas add constraint reservas_horas_validas_check
  check (horas in (0.5, 1, 1.5, 2, 2.5, 3));

alter table public.reservas add constraint reservas_disponibilidad_excl exclude using gist (
  cancha_id with =,
  fecha with =,
  numrange(inicio, inicio + horas, '[)') with &&
) where (estado <> 'cancelado');

drop function if exists public.horario_entrenamiento_bloqueado(integer, date, smallint, numeric);
drop function if exists public.horario_entrenamiento_bloqueado(integer, date, numeric, numeric);

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

drop function if exists public.evento_bloquea(integer, date, smallint, numeric);
drop function if exists public.evento_bloquea(integer, date, numeric, numeric);

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
        from public.reservas as reserva
        where reserva.cancha_id = p_cancha_id
          and reserva.fecha = p_fecha
          and reserva.estado <> 'cancelado'
          and numrange(reserva.inicio, reserva.inicio + reserva.horas, '[)')
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

create or replace function public.obtener_mis_reservas_publicas(p_tokens text[])
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
