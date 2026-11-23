-- Migración: permite guardar la configuración semanal de entrenamientos desde el
-- panel administrativo mediante una sola RPC.
-- Ejecutarla solo crea o reemplaza la función y sus permisos; no modifica filas
-- hasta que el administrador pulse «Guardar cambios» en el panel.

create or replace function public.guardar_horarios_entrenamiento_admin(
  p_configuracion jsonb
)
returns table (
  cancha_id integer,
  dia_semana smallint,
  inicio_minuto smallint,
  fin_minuto smallint,
  motivo text,
  activo boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_bloques jsonb;
  v_bloque jsonb;
  v_cancha_id integer;
  v_dia_semana integer;
  v_inicio_minuto integer;
  v_fin_minuto integer;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception using errcode = '42501', message = 'no_autorizado';
  end if;

  if p_configuracion is null
     or jsonb_typeof(p_configuracion) <> 'object'
     or coalesce(p_configuracion ->> 'version', '') <> '1' then
    raise exception using errcode = '22023', message = 'configuracion_invalida';
  end if;

  v_bloques := coalesce(p_configuracion -> 'horarios', '[]'::jsonb);
  if jsonb_typeof(v_bloques) <> 'array' then
    raise exception using errcode = '22023', message = 'horarios_invalidos';
  end if;

  -- Un solo candado serializa los cambios de la configuración semanal.
  perform pg_advisory_xact_lock(hashtextextended('horarios-entrenamiento-admin', 0));

  for v_bloque in select value from jsonb_array_elements(v_bloques)
  loop
    if jsonb_typeof(v_bloque) <> 'object' then
      raise exception using errcode = '22023', message = 'bloque_invalido';
    end if;

    v_cancha_id := (v_bloque ->> 'cancha_id')::integer;
    v_dia_semana := (v_bloque ->> 'dia_semana')::integer;
    v_inicio_minuto := (v_bloque ->> 'inicio_minuto')::integer;
    v_fin_minuto := (v_bloque ->> 'fin_minuto')::integer;

    if v_cancha_id not between 1 and 4
       or v_dia_semana not between 0 and 6
       or v_inicio_minuto < 420
       or v_fin_minuto > 1320
       or v_fin_minuto <= v_inicio_minuto
       or v_inicio_minuto % 30 <> 0
       or v_fin_minuto % 30 <> 0 then
      raise exception using errcode = '22023', message = 'bloque_fuera_de_rango';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_to_recordset(v_bloques) as bloque(
      cancha_id integer,
      dia_semana integer,
      inicio_minuto integer,
      fin_minuto integer
    )
    group by bloque.cancha_id, bloque.dia_semana, bloque.inicio_minuto, bloque.fin_minuto
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'bloque_duplicado';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_bloques) as a(
      cancha_id integer,
      dia_semana integer,
      inicio_minuto integer,
      fin_minuto integer
    )
    join jsonb_to_recordset(v_bloques) as b(
      cancha_id integer,
      dia_semana integer,
      inicio_minuto integer,
      fin_minuto integer
    )
      on a.cancha_id = b.cancha_id
     and a.dia_semana = b.dia_semana
     and a.inicio_minuto < b.fin_minuto
     and b.inicio_minuto < a.fin_minuto
     and (
       a.inicio_minuto < b.inicio_minuto
       or (a.inicio_minuto = b.inicio_minuto and a.fin_minuto < b.fin_minuto)
     )
  ) then
    raise exception using errcode = '22023', message = 'bloques_solapados';
  end if;

  if exists (
    select 1
    from public.horarios_bloqueados as existente
    join jsonb_to_recordset(v_bloques) as bloque(
      cancha_id integer,
      dia_semana integer,
      inicio_minuto integer,
      fin_minuto integer
    )
      on existente.cancha_id = bloque.cancha_id
     and existente.dia_semana = bloque.dia_semana
     and existente.inicio_minuto = bloque.inicio_minuto
     and existente.fin_minuto = bloque.fin_minuto
    where existente.motivo <> 'Entrenamiento de academia'
  ) then
    raise exception using errcode = '23P01', message = 'bloque_ya_usa_otro_motivo';
  end if;

  update public.horarios_bloqueados
  set activo = false,
      updated_at = now()
  where public.horarios_bloqueados.motivo = 'Entrenamiento de academia'
    and public.horarios_bloqueados.activo;

  insert into public.horarios_bloqueados (
    cancha_id,
    dia_semana,
    inicio_minuto,
    fin_minuto,
    motivo,
    activo,
    updated_at
  )
  select
    bloque.cancha_id,
    bloque.dia_semana::smallint,
    bloque.inicio_minuto::smallint,
    bloque.fin_minuto::smallint,
    'Entrenamiento de academia',
    true,
    now()
  from jsonb_to_recordset(v_bloques) as bloque(
    cancha_id integer,
    dia_semana integer,
    inicio_minuto integer,
    fin_minuto integer
  )
  on conflict on constraint horarios_bloqueados_pkey
  do update set
    activo = true,
    updated_at = now()
  where public.horarios_bloqueados.motivo = 'Entrenamiento de academia';

  return query
  select
    horario.cancha_id,
    horario.dia_semana,
    horario.inicio_minuto,
    horario.fin_minuto,
    horario.motivo,
    horario.activo,
    horario.created_at,
    horario.updated_at
  from public.horarios_bloqueados as horario
  where horario.motivo = 'Entrenamiento de academia'
    and horario.activo
  order by horario.cancha_id, horario.dia_semana, horario.inicio_minuto;
end;
$function$;

revoke all on function public.guardar_horarios_entrenamiento_admin(jsonb)
  from public, anon, authenticated;
grant execute on function public.guardar_horarios_entrenamiento_admin(jsonb)
  to authenticated;
