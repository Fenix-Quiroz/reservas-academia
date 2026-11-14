-- Migración: Evitar cancelación automática de reservas que ya tienen comprobante subido.
-- Si el cliente ya adjuntó su comprobante de pago, la reserva NO debe expirar ni cancelarse a los 30 minutos.
-- Debe permanecer activa en el panel admin para que el administrador la confirme cuando pueda.

-- 1. Actualizar liberar_reservas_pago_expiradas() para que NUNCA cancele reservas con comprobante subido
create or replace function public.liberar_reservas_pago_expiradas()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_liberadas integer;
begin
  update public.reservas as reserva
  set estado = 'cancelado'
  where reserva.estado = 'activo'
    and reserva.pago_estado in ('pendiente', 'rechazado')
    and reserva.pago_expira_at is not null
    and reserva.pago_expira_at <= now()
    and not exists (
      select 1
      from public.pagos_reserva as pago
      where pago.reserva_id = reserva.id
        and (
          pago.estado = 'confirmado'
          or exists (
            select 1
            from public.pago_comprobantes as comp
            where comp.pago_id = pago.id
          )
        )
    );

  get diagnostics v_liberadas = row_count;
  return v_liberadas;
end;
$function$;

revoke all on function public.liberar_reservas_pago_expiradas() from public, anon, authenticated;

-- 2. Actualizar liberar_reserva_pago_expirada() con la misma protección
create or replace function public.liberar_reserva_pago_expirada(p_reserva_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_liberada boolean;
begin
  update public.reservas as reserva
  set estado = 'cancelado'
  where reserva.id = p_reserva_id
    and reserva.estado = 'activo'
    and reserva.pago_estado in ('pendiente', 'rechazado')
    and reserva.pago_expira_at is not null
    and reserva.pago_expira_at <= now()
    and not exists (
      select 1
      from public.pagos_reserva as pago
      where pago.reserva_id = reserva.id
        and (
          pago.estado = 'confirmado'
          or exists (
            select 1
            from public.pago_comprobantes as comp
            where comp.pago_id = pago.id
          )
        )
    )
  returning true into v_liberada;

  return coalesce(v_liberada, false);
end;
$function$;

revoke all on function public.liberar_reserva_pago_expirada(uuid) from public, anon, authenticated;
grant execute on function public.liberar_reserva_pago_expirada(uuid) to service_role;

-- 3. Trigger: al subir un comprobante, anula el temporizador de expiración (pago_expira_at = null)
create or replace function public.desactivar_expiracion_al_subir_comprobante()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  update public.reservas r
  set pago_expira_at = null
  from public.pagos_reserva p
  where p.id = new.pago_id
    and r.id = p.reserva_id
    and r.pago_expira_at is not null;
  return new;
end;
$function$;

drop trigger if exists tr_desactivar_expiracion_comprobante on public.pago_comprobantes;
create trigger tr_desactivar_expiracion_comprobante
  after insert on public.pago_comprobantes
  for each row execute function public.desactivar_expiracion_al_subir_comprobante();

-- 4. Protección retroactiva: para cualquier reserva activa o iniciada que ya tenga comprobante subido,
-- limpiar pago_expira_at para que nunca expire.
update public.reservas r
set pago_expira_at = null
where r.estado in ('activo', 'iniciado')
  and r.pago_expira_at is not null
  and exists (
    select 1
    from public.pagos_reserva p
    join public.pago_comprobantes c on c.pago_id = p.id
    where p.reserva_id = r.id
  );
