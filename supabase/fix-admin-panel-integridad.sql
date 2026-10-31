-- ============================================================================
-- Migración: Sincronización Realtime de Eventos y Protección contra Solapamientos
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================================

-- 1. Habilitar Realtime para Eventos Especiales (bloqueos_eventos)
-- Permite que los bloqueos y eventos especiales se sincronicen en vivo sin recargar la página.
do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.bloqueos_eventos'::regclass
  ) then
    alter publication supabase_realtime add table public.bloqueos_eventos;
  end if;
end
$$;

-- 2. Asegurar que evento_bloquea acepte numeric flexible para inicio y horas
create or replace function public.evento_bloquea(
  p_cancha_id integer,
  p_fecha date,
  p_inicio numeric,
  p_horas numeric
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

-- 3. Trigger en tabla reservas: impide a nivel de base de datos que una reserva
-- regular choque con un evento especial activo al ser creada o reprogramada por el admin
create or replace function public.validar_reserva_no_evento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.estado = 'cancelado' then
    return new;
  end if;

  if public.evento_bloquea(new.cancha_id, new.fecha, new.inicio, new.horas) then
    raise exception using errcode = '23P01', message = 'evento_ocupado';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_reserva_no_evento on public.reservas;
create trigger validar_reserva_no_evento
before insert or update of cancha_id, fecha, inicio, horas, estado on public.reservas
for each row execute function public.validar_reserva_no_evento();
