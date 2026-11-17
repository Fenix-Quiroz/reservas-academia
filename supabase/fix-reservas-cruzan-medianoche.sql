-- Corrige el cálculo de reservas activas que cruzan medianoche.
-- Conserva la fecha operativa guardada y solo cambia la comparación temporal.
begin;

do $migration$
declare
  v_crear text := pg_get_functiondef(
    'public.crear_reserva_publica(integer, date, numeric, numeric, text, text, boolean)'::regprocedure
  );
  v_admin text := pg_get_functiondef(
    'public.crear_reserva_admin_fuera_horario(integer, date, numeric, numeric, text, text)'::regprocedure
  );
  v_crear_actualizado text;
  v_admin_actualizado text;
  v_publico_nuevo_r text := $$and r.fecha::timestamp + (r.inicio + r.horas) * interval '1 hour'
        > timezone('America/Lima', now())$$;
  v_publico_nuevo_reserva text := $$and reserva.fecha::timestamp + (reserva.inicio + reserva.horas) * interval '1 hour'
        > timezone('America/Lima', now())$$;
  v_admin_nuevo text := $$and reserva.fecha::timestamp + (reserva.inicio + reserva.horas) * interval '1 hour'
        > timezone('America/Lima', now())$$;
begin
  v_crear_actualizado := regexp_replace(
    v_crear,
    $$and[[:space:]]*\([[:space:]]*r\.fecha[[:space:]]*>[[:space:]]*v_hoy[[:space:]]*or[[:space:]]*\([[:space:]]*r\.fecha[[:space:]]*=[[:space:]]*v_hoy[[:space:]]*and[[:space:]]*r\.inicio[[:space:]]*\+[[:space:]]*r\.horas[[:space:]]*>[[:space:]]*v_hora_actual[[:space:]]*\)[[:space:]]*\)$$,
    v_publico_nuevo_r,
    'n'
  );

  if position('r.fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$and[[:space:]]*r\.fecha[[:space:]]*>=[[:space:]]*v_hoy$$,
      v_publico_nuevo_r,
      'n'
    );
  end if;

  if position('r.fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$and[[:space:]]*\([[:space:]]*reserva\.fecha[[:space:]]*>[[:space:]]*v_hoy[[:space:]]*or[[:space:]]*\([[:space:]]*reserva\.fecha[[:space:]]*=[[:space:]]*v_hoy[[:space:]]*and[[:space:]]*reserva\.inicio[[:space:]]*\+[[:space:]]*reserva\.horas[[:space:]]*>[[:space:]]*v_hora_actual[[:space:]]*\)[[:space:]]*\)$$,
      v_publico_nuevo_reserva,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$and[[:space:]]*reserva\.fecha[[:space:]]*>=[[:space:]]*v_hoy$$,
      v_publico_nuevo_reserva,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$and[[:space:]]*reserva\.fecha[[:space:]]*>[[:space:]]*v_hoy$$,
      v_publico_nuevo_reserva,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$and[[:space:]]*r\.fecha[[:space:]]*>[[:space:]]*v_hoy$$,
      v_publico_nuevo_r,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$and[[:space:]]+reserva\.estado[[:space:]]+not[[:space:]]+in[[:space:]]*\('cancelado',[[:space:]]*'finalizado'\)$$,
      $$and reserva.estado not in ('cancelado', 'finalizado')
        and reserva.fecha::timestamp + (reserva.inicio + reserva.horas) * interval '1 hour'
          > timezone('America/Lima', now())$$,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$and[[:space:]]+r\.estado[[:space:]]+not[[:space:]]+in[[:space:]]*\('cancelado',[[:space:]]*'finalizado'\)$$,
      $$and r.estado not in ('cancelado', 'finalizado')
        and r.fecha::timestamp + (r.inicio + r.horas) * interval '1 hour'
          > timezone('America/Lima', now())$$,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$and[[:space:]]+reserva\.celular[[:space:]]*=[[:space:]]*v_celular$$,
      $$and reserva.celular = v_celular
        and reserva.fecha::timestamp + (reserva.inicio + reserva.horas) * interval '1 hour'
          > timezone('America/Lima', now())$$,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$where[[:space:]]+reserva\.celular[[:space:]]*=[[:space:]]*v_celular$$,
      $$where reserva.celular = v_celular
        and reserva.fecha::timestamp + (reserva.inicio + reserva.horas) * interval '1 hour'
          > timezone('America/Lima', now())$$,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_crear_actualizado) = 0 then
    v_crear_actualizado := regexp_replace(
      v_crear,
      $$where[[:space:]]+r\.celular[[:space:]]*=[[:space:]]*v_celular$$,
      $$where r.celular = v_celular
        and r.fecha::timestamp + (r.inicio + r.horas) * interval '1 hour'
          > timezone('America/Lima', now())$$,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_crear_actualizado) = 0 then
    raise exception 'No se reconoció el límite de reservas activas en crear_reserva_publica';
  end if;

  v_admin_actualizado := regexp_replace(
    v_admin,
    $$and[[:space:]]*reserva\.fecha[[:space:]]*>=[[:space:]]*v_hoy$$,
    v_admin_nuevo,
    'n'
  );

  if position('fecha::timestamp' in v_admin_actualizado) = 0 then
    v_admin_actualizado := regexp_replace(
      v_admin,
      $$and[[:space:]]+reserva\.estado[[:space:]]+not[[:space:]]+in[[:space:]]*\('cancelado',[[:space:]]*'finalizado'\)$$,
      $$and reserva.estado not in ('cancelado', 'finalizado')
        and reserva.fecha::timestamp + (reserva.inicio + reserva.horas) * interval '1 hour'
          > timezone('America/Lima', now())$$,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_admin_actualizado) = 0 then
    v_admin_actualizado := regexp_replace(
      v_admin,
      $$where[[:space:]]+reserva\.celular[[:space:]]*=[[:space:]]*v_celular$$,
      $$where reserva.celular = v_celular
        and reserva.fecha::timestamp + (reserva.inicio + reserva.horas) * interval '1 hour'
          > timezone('America/Lima', now())$$,
      'n'
    );
  end if;

  if position('fecha::timestamp' in v_admin_actualizado) = 0 then
    raise exception 'No se reconoció el límite de reservas activas en crear_reserva_admin_fuera_horario';
  end if;

  execute v_crear_actualizado;
  execute v_admin_actualizado;
end;
$migration$;

commit;
