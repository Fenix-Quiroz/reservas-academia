-- Permite reservar sin adelanto solo a números confiables activos.
-- Ejecutar al final de las migraciones de pagos y control de clientes.

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

revoke all on function public.es_numero_confiable_publico(text) from public, anon, authenticated;
grant execute on function public.es_numero_confiable_publico(text) to anon, authenticated;

-- Elimina las variantes antiguas para que no exista una RPC pública que pueda
-- crear reservas sin el parámetro server-side de beneficio.
drop function if exists public.crear_reserva_publica(integer, date, smallint, smallint, text, text);
drop function if exists public.crear_reserva_publica(integer, date, smallint, numeric, text, text);
drop function if exists public.crear_reserva_publica(integer, date, numeric, numeric, text, text);
drop function if exists public.crear_reserva_publica(integer, date, numeric, numeric, text, text, boolean);

create function public.crear_reserva_publica(
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

  perform pg_advisory_xact_lock(hashtextextended(v_celular, 0));
  perform pg_advisory_xact_lock(hashtextextended(format('agenda:%s:%s', p_cancha_id, p_fecha), 0));

  -- Un número bloqueado nunca puede usar el beneficio de número confiable.
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

  v_monto_total := v_precio_hora * p_horas;
  v_pago_estado := case when p_sin_adelanto then 'no_requerido' else 'pendiente' end;
  v_pago_requerido := case when p_sin_adelanto then 0 else 10 end;
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

revoke all on function public.crear_reserva_publica(integer, date, numeric, numeric, text, text, boolean) from public, anon, authenticated;
grant execute on function public.crear_reserva_publica(integer, date, numeric, numeric, text, text, boolean) to anon, authenticated;
