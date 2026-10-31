-- ============================================================================
-- Migración: Permitir eventos especiales en Campo 4 (Vóley)
-- y Detalle de Conflicto con Reservas Existentes
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================================

drop function if exists public.crear_evento_especial_admin(integer[], date, smallint, smallint, text, text, text, text, numeric);
drop function if exists public.crear_evento_especial_admin(integer[], date, numeric, numeric, text, text, text, text, numeric);

create or replace function public.crear_evento_especial_admin(
  p_cancha_ids integer[],
  p_fecha date,
  p_inicio numeric,
  p_fin numeric,
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
  v_reserva_conflicto record;
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
     or p_inicio * 2 <> trunc(p_inicio * 2)
     or p_fin is null
     or p_fin not between 8 and 25
     or p_fin * 2 <> trunc(p_fin * 2)
     or p_fin - p_inicio < 1
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

    select reserva.alias, reserva.inicio
    into v_reserva_conflicto
    from public.reservas as reserva
    where reserva.cancha_id = v_cancha_id
      and reserva.fecha = p_fecha
      and reserva.estado <> 'cancelado'
      and numrange(reserva.inicio::numeric, reserva.inicio::numeric + reserva.horas, '[)')
        && numrange(p_inicio::numeric, p_fin::numeric, '[)')
    order by reserva.inicio
    limit 1;

    if found then
      raise exception using
        errcode = '23P01',
        message = format('evento_ocupado_reserva:%s:%s:%s', v_cancha_id, v_reserva_conflicto.inicio, v_reserva_conflicto.alias);
    end if;

    if exists (
      select 1
      from public.bloqueos_eventos as b
      where b.cancha_id = v_cancha_id
        and b.fecha = p_fecha
        and b.estado = 'activo'
        and numrange(b.inicio::numeric, b.fin::numeric, '[)')
          && numrange(p_inicio::numeric, p_fin::numeric, '[)')
    ) then
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

revoke all on function public.crear_evento_especial_admin(integer[], date, numeric, numeric, text, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.crear_evento_especial_admin(integer[], date, numeric, numeric, text, text, text, text, numeric) to authenticated;


-- ----------------------------------------------------------------------------
-- Actualizar evento especial (horario, fecha, cliente, precio cobrado)
-- ----------------------------------------------------------------------------
drop function if exists public.actualizar_evento_especial_admin(uuid, date, smallint, smallint, text, text, text, numeric);
drop function if exists public.actualizar_evento_especial_admin(uuid, date, numeric, numeric, text, text, text, numeric);
create or replace function public.actualizar_evento_especial_admin(
  p_evento_especial_id uuid,
  p_fecha date,
  p_inicio numeric,
  p_fin numeric,
  p_nombre text,
  p_celular text default '',
  p_notas text default '',
  p_precio_cobrado numeric default 0
)
returns setof public.bloqueos_eventos
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_cancha_ids integer[];
  v_cancha_id integer;
  v_entrenamiento record;
  v_reserva_conflicto record;
  v_hoy date := timezone('America/Lima', now())::date;
  v_nombre text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_celular text := regexp_replace(trim(coalesce(p_celular, '')), '[[:space:]-]+', '', 'g');
  v_notas text := trim(coalesce(p_notas, ''));
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception using errcode = '42501', message = 'no_autorizado';
  end if;

  if p_evento_especial_id is null
     or p_fecha is null
     or p_fecha < v_hoy
     or p_inicio is null
     or p_inicio not between 7 and 24
     or p_inicio * 2 <> trunc(p_inicio * 2)
     or p_fin is null
     or p_fin not between 8 and 25
     or p_fin * 2 <> trunc(p_fin * 2)
     or p_fin - p_inicio < 1
     or char_length(v_nombre) not between 2 and 80
     or char_length(v_notas) > 240
     or (v_celular <> '' and v_celular !~ '^9[0-9]{8}$')
     or p_precio_cobrado is null
     or p_precio_cobrado < 0 then
    raise exception using errcode = '22023', message = 'evento_invalido';
  end if;

  select array_agg(cancha_id order by cancha_id)
  into v_cancha_ids
  from public.bloqueos_eventos
  where (evento_especial_id = p_evento_especial_id or id = p_evento_especial_id)
    and estado = 'activo';

  if v_cancha_ids is null or cardinality(v_cancha_ids) = 0 then
    raise exception using errcode = 'P0002', message = 'evento_no_encontrado';
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

    select reserva.alias, reserva.inicio
    into v_reserva_conflicto
    from public.reservas as reserva
    where reserva.cancha_id = v_cancha_id
      and reserva.fecha = p_fecha
      and reserva.estado <> 'cancelado'
      and numrange(reserva.inicio::numeric, reserva.inicio::numeric + reserva.horas, '[)')
        && numrange(p_inicio::numeric, p_fin::numeric, '[)')
    order by reserva.inicio
    limit 1;

    if found then
      raise exception using
        errcode = '23P01',
        message = format('evento_ocupado_reserva:%s:%s:%s', v_cancha_id, v_reserva_conflicto.inicio, v_reserva_conflicto.alias);
    end if;

    if exists (
      select 1
      from public.bloqueos_eventos as b
      where b.cancha_id = v_cancha_id
        and b.fecha = p_fecha
        and b.estado = 'activo'
        and b.evento_especial_id is distinct from p_evento_especial_id
        and b.id <> p_evento_especial_id
        and numrange(b.inicio::numeric, b.fin::numeric, '[)')
          && numrange(p_inicio::numeric, p_fin::numeric, '[)')
    ) then
      raise exception using errcode = '23P01', message = 'evento_ocupado';
    end if;
  end loop;

  update public.eventos_especiales
  set precio_cobrado = round(p_precio_cobrado, 2), updated_at = now()
  where id = p_evento_especial_id;

  update public.bloqueos_eventos
  set fecha = p_fecha,
      inicio = p_inicio,
      fin = p_fin,
      nombre = v_nombre,
      celular = v_celular,
      notas = v_notas,
      updated_at = now()
  where (evento_especial_id = p_evento_especial_id or id = p_evento_especial_id)
    and estado = 'activo';

  return query
  select evento.*
  from public.bloqueos_eventos as evento
  where (evento.evento_especial_id = p_evento_especial_id or evento.id = p_evento_especial_id)
    and evento.estado = 'activo'
  order by evento.cancha_id;
end;
$function$;

revoke all on function public.actualizar_evento_especial_admin(uuid, date, numeric, numeric, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.actualizar_evento_especial_admin(uuid, date, numeric, numeric, text, text, text, numeric) to authenticated;
