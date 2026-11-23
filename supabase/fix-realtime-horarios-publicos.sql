-- ============================================================================
-- Migración: avisar a la web pública cuando cambian los horarios de academia
-- Ejecutar en el SQL Editor de Supabase.
--
-- El canal recibe únicamente una señal; nunca se envían filas de
-- public.horarios_bloqueados ni su motivo.
-- ============================================================================

create or replace function public.notificar_horarios_publicos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  -- El guardado de horarios puede ejecutar varias sentencias dentro de una
  -- misma transacción. Emitir una sola señal evita avisos duplicados.
  if current_setting('app.horarios_publicos_notificado', true) = '1' then
    return null;
  end if;
  perform set_config('app.horarios_publicos_notificado', '1', true);

  perform realtime.send(
    jsonb_build_object('tipo', 'horarios_actualizados'),
    'horarios_actualizados',
    'reservas-en-tiempo-real',
    false
  );
  return null;
end;
$function$;

revoke all on function public.notificar_horarios_publicos() from public, anon, authenticated;

drop trigger if exists notificar_horarios_publicos_trigger on public.horarios_bloqueados;
create trigger notificar_horarios_publicos_trigger
after insert or update or delete on public.horarios_bloqueados
for each statement
execute function public.notificar_horarios_publicos();
