-- Extiende la ventana pública de reservas de 14 a 21 días.
-- Se basa en la definición instalada para conservar todos los cambios
-- anteriores de seguridad, pagos y clientes confiables.
begin;

do $$
declare
  v_obtener text := pg_get_functiondef(
    'public.obtener_horarios_publicos(integer, date, numeric)'::regprocedure
  );
  v_crear text := pg_get_functiondef(
    'public.crear_reserva_publica(integer, date, numeric, numeric, text, text, boolean)'::regprocedure
  );
begin
  if position('v_hoy + 13' in v_obtener) > 0 then
    execute replace(v_obtener, 'v_hoy + 13', 'v_hoy + 20');
  elsif position('v_hoy + 20' in v_obtener) = 0 then
    raise exception 'No se reconoció la ventana de obtener_horarios_publicos';
  end if;

  if position('v_hoy + 13' in v_crear) > 0 then
    execute replace(v_crear, 'v_hoy + 13', 'v_hoy + 20');
  elsif position('v_hoy + 20' in v_crear) = 0 then
    raise exception 'No se reconoció la ventana de crear_reserva_publica';
  end if;
end;
$$;

commit;
