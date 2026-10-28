-- Libera reservas cuyo intento de adelanto venció y hace recuperable un
-- intento de comprobante si la Edge Function se interrumpe entre pasos.
-- Ejecutar después de fix-pagos-escalables.sql y fix-horarios-academia.sql.

create or replace function public.liberar_reservas_pago_expiradas()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_liberadas integer;
begin
  update public.reservas as reserva
  set estado = 'cancelado'
  where reserva.estado = 'activo'
    and reserva.pago_estado in ('pendiente', 'rechazado')
    and reserva.pago_expira_at is not null
    and reserva.pago_expira_at <= now()
    and not exists (
      select 1
      from public.pagos_reserva as pago
      where pago.reserva_id = reserva.id
        and pago.estado = 'confirmado'
    );

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
  update public.reservas as reserva
  set estado = 'cancelado'
  where reserva.id = p_reserva_id
    and reserva.estado = 'activo'
    and reserva.pago_estado in ('pendiente', 'rechazado')
    and reserva.pago_expira_at is not null
    and reserva.pago_expira_at <= now()
    and not exists (
      select 1
      from public.pagos_reserva as pago
      where pago.reserva_id = reserva.id
        and pago.estado = 'confirmado'
    )
  returning true into v_liberada;

  return coalesce(v_liberada, false);
end;
$function$;

revoke all on function public.liberar_reserva_pago_expirada(uuid) from public, anon, authenticated;
grant execute on function public.liberar_reserva_pago_expirada(uuid) to service_role;

drop index if exists public.reservas_pago_expira_idx;
create index if not exists reservas_pago_expira_idx
  on public.reservas (pago_expira_at)
  where pago_estado in ('pendiente', 'rechazado') and pago_expira_at is not null;

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
      hint = 'Revisa y conserva un comprobante por pago_id antes de ejecutar esta migración.';
  end if;
end
$$;

create unique index if not exists pago_comprobantes_pago_unica_idx
  on public.pago_comprobantes (pago_id);

-- La Edge Function usa la clave administrativa únicamente en el servidor.
-- Los grants explícitos evitan depender de privilegios heredados del proyecto.
grant usage on schema public to service_role;
grant select, update on table public.reservas to service_role;
grant select, insert, update on table public.pagos_reserva to service_role;
grant select, insert on table public.pago_comprobantes to service_role;

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

revoke all on function public.obtener_horarios_publicos(integer, date, numeric) from public, anon, authenticated;
grant execute on function public.obtener_horarios_publicos(integer, date, numeric) to anon, authenticated;
revoke all on function public.crear_reserva_publica(integer, date, numeric, numeric, text, text) from public, anon, authenticated;
grant execute on function public.crear_reserva_publica(integer, date, numeric, numeric, text, text) to anon, authenticated;
