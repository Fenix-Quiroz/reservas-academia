-- ============================================================================
-- Migración: Permitir editar eventos especiales concluidos / finalizados (Admin)
-- Permite modificar precio cobrado, notas y datos de contacto de eventos pasados,
-- asegurando que se actualice de inmediato en el balance mensual sin error de hora pasada.
-- Ejecutar en el SQL Editor de Supabase si se conecta a la base remota.
-- ============================================================================

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
  v_hora_actual numeric := extract(hour from timezone('America/Lima', now()))
    + extract(minute from timezone('America/Lima', now())) / 60.0;
  v_nombre text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_celular text := regexp_replace(trim(coalesce(p_celular, '')), '[[:space:]-]+', '', 'g');
  v_notas text := trim(coalesce(p_notas, ''));
  v_fecha_original date;
  v_inicio_original numeric;
  v_fin_original numeric;
  v_ya_concluido boolean := false;
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception using errcode = '42501', message = 'no_autorizado';
  end if;

  if p_evento_especial_id is null
     or p_fecha is null
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

  select array_agg(cancha_id order by cancha_id),
         min(fecha),
         min(inicio),
         max(fin)
  into v_cancha_ids,
       v_fecha_original,
       v_inicio_original,
       v_fin_original
  from public.bloqueos_eventos
  where (evento_especial_id = p_evento_especial_id or id = p_evento_especial_id)
    and estado = 'activo';

  if v_cancha_ids is null or cardinality(v_cancha_ids) = 0 then
    raise exception using errcode = 'P0002', message = 'evento_no_encontrado';
  end if;

  v_ya_concluido := (v_fecha_original < v_hoy) or (v_fecha_original = v_hoy and v_fin_original <= v_hora_actual);

  -- Si el evento no ha concluido aun, se impide moverlo a una fecha u hora vencida
  if not v_ya_concluido and (p_fecha < v_hoy or (p_fecha = v_hoy and (p_fin <= v_hora_actual or p_inicio < trunc(v_hora_actual)))) then
    raise exception using errcode = '22023', message = 'hora_pasada';
  end if;

  -- Si ya concluyo, se preservan la fecha y horarios originales
  if v_ya_concluido then
    p_fecha := v_fecha_original;
    p_inicio := v_inicio_original;
    p_fin := v_fin_original;
  else
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
  end if;

  update public.eventos_especiales
  set precio_cobrado = round(p_precio_cobrado, 2), updated_at = now()
  where id = p_evento_especial_id
     or id in (select evento_especial_id from public.bloqueos_eventos where id = p_evento_especial_id and evento_especial_id is not null);

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
