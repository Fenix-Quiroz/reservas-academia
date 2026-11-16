-- La academia no entrena vóley los viernes.
-- Libera únicamente C4 los viernes; conserva C1-C3 y el resto de C4.

begin;

delete from public.horarios_bloqueados
where cancha_id = 4
  and dia_semana = 5
  and motivo = 'Entrenamiento de academia';

commit;
