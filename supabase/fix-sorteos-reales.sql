-- Sorteos reales sobre reservas finalizadas.
-- Ejecutar después de schema.sql y las migraciones de reservas/pagos.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sorteos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  estado text not null default 'preparando'
    check (estado in ('preparando', 'ejecutado', 'cancelado')),
  desde timestamptz,
  hasta timestamptz not null,
  total_reservas integer not null default 0 check (total_reservas >= 0),
  total_tickets integer not null default 0 check (total_tickets >= 0),
  created_at timestamptz not null default now(),
  ejecutado_at timestamptz,
  ejecutado_por uuid references auth.users(id) on delete set null
);

create index if not exists sorteos_estado_hasta_idx
  on public.sorteos (estado, hasta desc);

create table if not exists public.sorteo_tickets (
  id uuid primary key default gen_random_uuid(),
  sorteo_id uuid not null references public.sorteos(id) on delete cascade,
  reserva_id uuid references public.reservas(id) on delete set null,
  numero integer not null check (numero > 0),
  cliente_key text not null,
  ticket_index integer not null check (ticket_index > 0),
  total_tickets_cliente integer not null check (total_tickets_cliente > 0),
  alias text not null,
  celular text not null,
  reserva_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (sorteo_id, reserva_id),
  unique (sorteo_id, numero)
);

create index if not exists sorteo_tickets_sorteo_numero_idx
  on public.sorteo_tickets (sorteo_id, numero);

create table if not exists public.sorteo_resultados (
  id uuid primary key default gen_random_uuid(),
  sorteo_id uuid not null unique references public.sorteos(id) on delete cascade,
  ticket_id uuid not null unique references public.sorteo_tickets(id),
  reserva_id uuid references public.reservas(id) on delete set null,
  numero integer not null,
  alias text not null,
  celular text not null,
  seleccionado_at timestamptz not null default now(),
  seleccionado_por uuid references auth.users(id) on delete set null,
  metodo text not null default 'pgcrypto'
);

alter table public.sorteos enable row level security;
alter table public.sorteo_tickets enable row level security;
alter table public.sorteo_resultados enable row level security;

revoke all on table public.sorteos, public.sorteo_tickets, public.sorteo_resultados from anon, authenticated;
grant select on table public.sorteos, public.sorteo_tickets, public.sorteo_resultados to authenticated;

drop policy if exists "admin lee sorteos" on public.sorteos;
drop policy if exists "admin lee sorteo tickets" on public.sorteo_tickets;
drop policy if exists "admin lee sorteo resultados" on public.sorteo_resultados;

create policy "admin lee sorteos" on public.sorteos
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin lee sorteo tickets" on public.sorteo_tickets
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin lee sorteo resultados" on public.sorteo_resultados
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.ejecutar_sorteo()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_usuario uuid := auth.uid();
  v_rol text := auth.jwt() -> 'app_metadata' ->> 'role';
  v_desde timestamptz;
  v_hasta timestamptz := clock_timestamp();
  v_sorteo_id uuid;
  v_total integer;
  v_bytes bytea;
  v_azar bigint;
  v_limite bigint;
  v_offset integer;
  v_ticket public.sorteo_tickets%rowtype;
  v_sorteo public.sorteos%rowtype;
  v_resultado public.sorteo_resultados%rowtype;
  v_tickets jsonb;
begin
  if v_usuario is null or v_rol <> 'admin' then
    raise exception using errcode = '42501', message = 'sorteo-no-autorizado';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sorteo:ejecutar', 0));

  select s.hasta
    into v_desde
    from public.sorteos as s
   where s.estado = 'ejecutado'
   order by s.ejecutado_at desc nulls last, s.hasta desc
   limit 1;

  insert into public.sorteos (estado, desde, hasta, ejecutado_por)
  values ('preparando', v_desde, v_hasta, v_usuario)
  returning id into v_sorteo_id;

  with elegibles as (
    select
      reserva.id as reserva_id,
      reserva.cliente_id,
      reserva.alias,
      reserva.celular,
      reserva.created_at as reserva_created_at,
      row_number() over (order by reserva.created_at, reserva.id)::integer as numero,
      row_number() over (partition by coalesce(reserva.cliente_id::text, reserva.celular) order by reserva.created_at, reserva.id)::integer as ticket_index,
      count(*) over (partition by coalesce(reserva.cliente_id::text, reserva.celular))::integer as total_tickets_cliente
    from public.reservas as reserva
    where reserva.estado = 'finalizado'
      and reserva.pago_estado in ('confirmado', 'no_requerido')
      and (v_desde is null or reserva.created_at > v_desde)
      and reserva.created_at <= v_hasta
  )
  insert into public.sorteo_tickets (
    sorteo_id,
    reserva_id,
    numero,
    cliente_key,
    ticket_index,
    total_tickets_cliente,
    alias,
    celular,
    reserva_created_at
  )
  select
    v_sorteo_id,
    elegible.reserva_id,
    elegible.numero,
    'cliente-' || coalesce(elegible.cliente_id::text, elegible.celular),
    elegible.ticket_index,
    elegible.total_tickets_cliente,
    elegible.alias,
    elegible.celular,
    elegible.reserva_created_at
  from elegibles as elegible;

  select count(*)::integer
    into v_total
    from public.sorteo_tickets
   where sorteo_id = v_sorteo_id;

  if v_total = 0 then
    raise exception using errcode = 'P0001', message = 'sorteo-sin-tickets';
  end if;

  v_limite := (4294967296 / v_total) * v_total;
  loop
    v_bytes := gen_random_bytes(4);
    v_azar := (
      get_byte(v_bytes, 0)::bigint * 16777216
      + get_byte(v_bytes, 1)::bigint * 65536
      + get_byte(v_bytes, 2)::bigint * 256
      + get_byte(v_bytes, 3)::bigint
    );
    exit when v_azar < v_limite;
  end loop;
  v_offset := (v_azar % v_total)::integer;

  select ticket.*
    into v_ticket
    from public.sorteo_tickets as ticket
   where ticket.sorteo_id = v_sorteo_id
   order by ticket.numero
   offset v_offset
   limit 1;

  insert into public.sorteo_resultados (
    sorteo_id,
    ticket_id,
    reserva_id,
    numero,
    alias,
    celular,
    seleccionado_por
  )
  values (
    v_sorteo_id,
    v_ticket.id,
    v_ticket.reserva_id,
    v_ticket.numero,
    v_ticket.alias,
    v_ticket.celular,
    v_usuario
  )
  returning * into v_resultado;

  update public.sorteos
     set estado = 'ejecutado',
         total_reservas = v_total,
         total_tickets = v_total,
         ejecutado_at = clock_timestamp()
   where id = v_sorteo_id
  returning * into v_sorteo;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ticket.id,
    'reservaId', ticket.reserva_id,
    'numeroGlobal', ticket.numero,
    'clienteId', ticket.cliente_key,
    'ticketIndex', ticket.ticket_index,
    'totalTickets', ticket.total_tickets_cliente,
    'nombre', ticket.alias,
    'celular', ticket.celular
  ) order by ticket.numero), '[]'::jsonb)
    into v_tickets
    from public.sorteo_tickets as ticket
   where ticket.sorteo_id = v_sorteo_id;

  return jsonb_build_object(
    'sorteo', jsonb_build_object(
      'id', v_sorteo.id,
      'numero', v_sorteo.numero,
      'estado', v_sorteo.estado,
      'desde', v_sorteo.desde,
      'hasta', v_sorteo.hasta,
      'totalReservas', v_sorteo.total_reservas,
      'totalTickets', v_sorteo.total_tickets,
      'ejecutadoAt', v_sorteo.ejecutado_at
    ),
    'tickets', v_tickets,
    'ganador', jsonb_build_object(
      'id', v_ticket.id,
      'reservaId', v_resultado.reserva_id,
      'numeroGlobal', v_resultado.numero,
      'clienteId', v_ticket.cliente_key,
      'ticketIndex', v_ticket.ticket_index,
      'totalTickets', v_ticket.total_tickets_cliente,
      'nombre', v_resultado.alias,
      'celular', v_resultado.celular
    )
  );
end;
$function$;

revoke all on function public.ejecutar_sorteo() from public, anon, authenticated;
grant execute on function public.ejecutar_sorteo() to authenticated;
