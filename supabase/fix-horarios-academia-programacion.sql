-- Reemplaza la programación semanal de C1, C2 y C3.
-- C4/vóley queda intacto. Esta migración no cambia tipos, triggers ni funciones.

begin;

delete from public.horarios_bloqueados
where cancha_id in (1, 2, 3)
  and motivo = 'Entrenamiento de academia';

insert into public.horarios_bloqueados
  (cancha_id, dia_semana, inicio_minuto, fin_minuto, motivo, activo)
values
  (1, 1, 1050, 1135, 'Entrenamiento de academia', true),
  (2, 1, 960, 1045, 'Entrenamiento de academia', true),
  (3, 1, 960, 1045, 'Entrenamiento de academia', true),
  (2, 1, 1050, 1135, 'Entrenamiento de academia', true),
  (3, 1, 1050, 1135, 'Entrenamiento de academia', true),
  (2, 1, 1140, 1225, 'Entrenamiento de academia', true),
  (3, 1, 1140, 1225, 'Entrenamiento de academia', true),
  (1, 2, 930, 990, 'Entrenamiento de academia', true),
  (2, 2, 930, 990, 'Entrenamiento de academia', true),
  (1, 2, 1020, 1105, 'Entrenamiento de academia', true),
  (2, 2, 1020, 1105, 'Entrenamiento de academia', true),
  (3, 2, 1020, 1105, 'Entrenamiento de academia', true),
  (3, 2, 1110, 1190, 'Entrenamiento de academia', true),
  (1, 3, 960, 1045, 'Entrenamiento de academia', true),
  (3, 3, 960, 1045, 'Entrenamiento de academia', true),
  (1, 3, 1050, 1135, 'Entrenamiento de academia', true),
  (2, 3, 1050, 1135, 'Entrenamiento de academia', true),
  (3, 3, 1050, 1135, 'Entrenamiento de academia', true),
  (1, 3, 1140, 1225, 'Entrenamiento de academia', true),
  (3, 3, 1140, 1225, 'Entrenamiento de academia', true),
  (1, 4, 930, 990, 'Entrenamiento de academia', true),
  (2, 4, 930, 990, 'Entrenamiento de academia', true),
  (2, 4, 1020, 1105, 'Entrenamiento de academia', true),
  (3, 4, 1020, 1105, 'Entrenamiento de academia', true),
  (1, 4, 1110, 1190, 'Entrenamiento de academia', true),
  (2, 4, 1110, 1190, 'Entrenamiento de academia', true),
  (3, 4, 1110, 1190, 'Entrenamiento de academia', true),
  (1, 5, 960, 1045, 'Entrenamiento de academia', true),
  (2, 5, 960, 1045, 'Entrenamiento de academia', true),
  (3, 5, 960, 1045, 'Entrenamiento de academia', true),
  (1, 5, 1050, 1135, 'Entrenamiento de academia', true),
  (2, 5, 1050, 1135, 'Entrenamiento de academia', true),
  (3, 5, 1050, 1135, 'Entrenamiento de academia', true),
  (1, 5, 1140, 1225, 'Entrenamiento de academia', true),
  (2, 5, 1140, 1225, 'Entrenamiento de academia', true),
  (3, 5, 1140, 1225, 'Entrenamiento de academia', true)
on conflict (cancha_id, dia_semana, inicio_minuto, fin_minuto) do update
set motivo = excluded.motivo,
    activo = excluded.activo,
    updated_at = now();

commit;
