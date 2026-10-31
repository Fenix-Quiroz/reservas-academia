-- Corregir horario de entrenamiento de vóley los sábados (9:00 a. m. a 12:00 p. m. turno mañana)
delete from public.horarios_bloqueados
where cancha_id = 4
  and dia_semana = 6
  and inicio_minuto = 1260
  and fin_minuto = 1435;

insert into public.horarios_bloqueados
  (cancha_id, dia_semana, inicio_minuto, fin_minuto, motivo, activo)
values
  (4, 6, 540, 720, 'Entrenamiento de academia', true)
on conflict (cancha_id, dia_semana, inicio_minuto, fin_minuto) do update
set motivo = excluded.motivo,
    activo = excluded.activo,
    updated_at = now();
