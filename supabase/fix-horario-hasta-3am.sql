-- Amplía el horario operativo hasta las 3:00 a. m.
-- No modifica filas existentes; solo ajusta restricciones y funciones.
begin;

alter table public.reservas drop constraint if exists reservas_inicio_check;
alter table public.reservas drop constraint if exists reservas_inicio_horario_check;
alter table public.reservas add constraint reservas_inicio_horario_check
  check (inicio between 7 and 27 and inicio * 2 = trunc(inicio * 2));

do $migration$
declare
  v_horarios_publicos text := pg_get_functiondef(
    'public.obtener_horarios_publicos(integer, date, numeric)'::regprocedure
  );
  v_crear_publica text := pg_get_functiondef(
    'public.crear_reserva_publica(integer, date, numeric, numeric, text, text, boolean)'::regprocedure
  );
  v_horarios_admin text := pg_get_functiondef(
    'public.obtener_horarios_admin_fuera_horario(integer, date, numeric)'::regprocedure
  );
  v_crear_admin text := pg_get_functiondef(
    'public.crear_reserva_admin_fuera_horario(integer, date, numeric, numeric, text, text)'::regprocedure
  );
  v_horarios_publicos_actualizado text;
  v_crear_publica_actualizada text;
  v_horarios_admin_actualizado text;
  v_crear_admin_actualizada text;
begin
  v_horarios_publicos_actualizado := regexp_replace(
    v_horarios_publicos,
    $$generate_series\(14,[[:space:]]*floor\(\(25[[:space:]]*-[[:space:]]*p_horas\)[[:space:]]*\*[[:space:]]*2\)::integer\)$$,
    $$generate_series(14, floor((27 - p_horas) * 2)::integer)$$,
    'g'
  );

  v_crear_publica_actualizada := regexp_replace(
    v_crear_publica,
    $$p_inicio[[:space:]]+not[[:space:]]+between[[:space:]]+7[[:space:]]+and[[:space:]]+24$$,
    $$p_inicio not between 7 and 26.5$$,
    'g'
  );
  v_crear_publica_actualizada := regexp_replace(
    v_crear_publica_actualizada,
    $$p_inicio[[:space:]]*\+[[:space:]]*p_horas[[:space:]]*>[[:space:]]*25$$,
    $$p_inicio + p_horas > 27$$,
    'g'
  );

  v_horarios_admin_actualizado := regexp_replace(
    v_horarios_admin,
    $$generate_series\(50,[[:space:]]*floor\(\(26\.5[[:space:]]*-[[:space:]]*p_horas\)[[:space:]]*\*[[:space:]]*2\)::integer\)$$,
    $$generate_series(50, floor((27 - p_horas) * 2)::integer)$$,
    'g'
  );

  v_crear_admin_actualizada := regexp_replace(
    v_crear_admin,
    $$p_inicio[[:space:]]*>=[[:space:]]*26\.5$$,
    $$p_inicio >= 27$$,
    'g'
  );
  v_crear_admin_actualizada := regexp_replace(
    v_crear_admin_actualizada,
    $$p_inicio[[:space:]]*\+[[:space:]]*p_horas[[:space:]]*>[[:space:]]*26\.5$$,
    $$p_inicio + p_horas > 27$$,
    'g'
  );

  if position('27 - p_horas' in v_horarios_publicos_actualizado) = 0
     or position('p_inicio not between 7 and 26.5' in v_crear_publica_actualizada) = 0
     or position('p_inicio + p_horas > 27' in v_crear_publica_actualizada) = 0 then
    raise exception 'No se reconoció el límite público de las 3am';
  end if;

  if position('27 - p_horas' in v_horarios_admin_actualizado) = 0
     or position('p_inicio >= 27' in v_crear_admin_actualizada) = 0
     or position('p_inicio + p_horas > 27' in v_crear_admin_actualizada) = 0 then
    raise exception 'No se reconoció el límite administrativo de las 3am';
  end if;

  execute v_horarios_publicos_actualizado;
  execute v_crear_publica_actualizada;
  execute v_horarios_admin_actualizado;
  execute v_crear_admin_actualizada;
end;
$migration$;

commit;
