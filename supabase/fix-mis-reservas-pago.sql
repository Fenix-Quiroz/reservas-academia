-- Expone el estado del adelanto en la consulta pública de "Mis reservas".
-- Ejecutar después de la migración escalable de pagos.
-- Solo devuelve el estado de las reservas cuyos tokens ya fueron validados.

drop function if exists public.obtener_mis_reservas_publicas(text[]);

create function public.obtener_mis_reservas_publicas(p_tokens text[])
returns table (
  id uuid,
  cancha_id integer,
  fecha date,
  inicio numeric,
  horas numeric(2,1),
  alias text,
  celular text,
  estado text,
  pago_estado text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_hashes text[];
begin
  if p_tokens is null or cardinality(p_tokens) not between 1 and 20 then
    raise exception using errcode = '22023', message = 'tokens_invalidos';
  end if;

  if exists (
    select 1
    from unnest(p_tokens) as token(valor)
    where token.valor is null or token.valor !~ '^[0-9a-f]{48}$'
  ) then
    raise exception using errcode = '22023', message = 'tokens_invalidos';
  end if;

  select array_agg(encode(digest(token.valor, 'sha256'), 'hex'))
  into v_hashes
  from unnest(p_tokens) as token(valor);

  return query
  select r.id, r.cancha_id, r.fecha, r.inicio, r.horas, r.alias, r.celular, r.estado, r.pago_estado
  from public.reservas r
  where r.token_hash = any(v_hashes)
  order by r.fecha, r.inicio;
end;
$function$;

revoke all on function public.obtener_mis_reservas_publicas(text[])
  from public, anon, authenticated;
grant execute on function public.obtener_mis_reservas_publicas(text[]) to anon;
