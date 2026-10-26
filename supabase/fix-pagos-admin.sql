-- Permite al encargado revisar y confirmar un comprobante sin exponer
-- service_role al navegador. Ejecutar después de fix-pagos-escalables.sql.

create or replace function public.confirmar_pago_admin(p_pago_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_pago public.pagos_reserva%rowtype;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception using errcode = '42501', message = 'admin_no_autorizado';
  end if;

  select * into v_pago
  from public.pagos_reserva
  where id = p_pago_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'pago_no_existe';
  end if;

  if v_pago.estado = 'confirmado' then
    return true;
  end if;

  if v_pago.estado <> 'pendiente' then
    raise exception using errcode = 'P0001', message = 'pago_no_confirmable';
  end if;

  if not exists (
    select 1
    from public.pago_comprobantes
    where pago_id = v_pago.id
  ) then
    raise exception using errcode = 'P0001', message = 'comprobante_no_existe';
  end if;

  perform 1
  from public.reservas
  where id = v_pago.reserva_id
    and estado = 'activo'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'reserva_no_activa';
  end if;

  update public.pagos_reserva
  set estado = 'confirmado',
      revisado_por = auth.uid(),
      revisado_at = now()
  where id = v_pago.id;

  update public.reservas
  set pago_estado = 'confirmado',
      pago_expira_at = null
  where id = v_pago.reserva_id;

  return true;
end;
$function$;

revoke all on function public.confirmar_pago_admin(uuid) from public, anon;
grant execute on function public.confirmar_pago_admin(uuid) to authenticated;
