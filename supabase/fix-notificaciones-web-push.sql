-- Suscripciones Web Push del panel administrativo.
create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (
    char_length(endpoint) between 32 and 2048
    and endpoint ~ '^https://(fcm\.googleapis\.com|web\.push\.apple\.com|([a-z0-9-]+\.)?push\.services\.mozilla\.com|([a-z0-9-]+\.)?notify\.windows\.com)(/|$)'
  ),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]+$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]+$'),
  vapid_public_key text,
  user_agent text not null default '' check (char_length(user_agent) <= 512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_push_subscriptions
  add column if not exists vapid_public_key text;

alter table public.admin_push_subscriptions
  drop constraint if exists admin_push_subscriptions_endpoint_check;

-- Las suscripciones antiguas que no pertenecen a un proveedor Web Push
-- permitido se descartan; el administrador puede registrarlas de nuevo.
delete from public.admin_push_subscriptions
where endpoint !~ '^https://(fcm\.googleapis\.com|web\.push\.apple\.com|([a-z0-9-]+\.)?push\.services\.mozilla\.com|([a-z0-9-]+\.)?notify\.windows\.com)(/|$)';

alter table public.admin_push_subscriptions
  add constraint admin_push_subscriptions_endpoint_check check (
    char_length(endpoint) between 32 and 2048
    and endpoint ~ '^https://(fcm\.googleapis\.com|web\.push\.apple\.com|([a-z0-9-]+\.)?push\.services\.mozilla\.com|([a-z0-9-]+\.)?notify\.windows\.com)(/|$)'
  );

create index if not exists admin_push_subscriptions_user_idx
  on public.admin_push_subscriptions (user_id, updated_at desc);

create or replace function public.actualizar_updated_at_admin_push_subscriptions()
returns trigger language plpgsql set search_path = public, pg_temp as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists actualizar_updated_at_admin_push_subscriptions on public.admin_push_subscriptions;
create trigger actualizar_updated_at_admin_push_subscriptions
before update on public.admin_push_subscriptions
for each row execute function public.actualizar_updated_at_admin_push_subscriptions();

revoke all on table public.admin_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_push_subscriptions to authenticated;
grant select, delete on table public.admin_push_subscriptions to service_role;

alter table public.admin_push_subscriptions enable row level security;

drop policy if exists "admin lee suscripciones push propias" on public.admin_push_subscriptions;
create policy "admin lee suscripciones push propias"
on public.admin_push_subscriptions for select to authenticated
using (
  user_id = (select auth.uid())
  and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "admin administra suscripciones push propias" on public.admin_push_subscriptions;
create policy "admin administra suscripciones push propias"
on public.admin_push_subscriptions for all to authenticated
using (
  user_id = (select auth.uid())
  and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  user_id = (select auth.uid())
  and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

revoke all on function public.actualizar_updated_at_admin_push_subscriptions() from public, anon, authenticated;

-- Entrega idempotente por reserva y dispositivo. Una repetición del webhook no
-- vuelve a enviar una entrega ya marcada como enviada.
create table if not exists public.admin_push_deliveries (
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  subscription_id uuid not null references public.admin_push_subscriptions(id) on delete cascade,
  estado text not null default 'enviando' check (estado in ('enviando', 'enviado')),
  intento_id uuid,
  updated_at timestamptz not null default now(),
  enviado_at timestamptz,
  primary key (reserva_id, subscription_id)
);

alter table public.admin_push_deliveries
  add column if not exists intento_id uuid;

create index if not exists admin_push_deliveries_updated_idx
  on public.admin_push_deliveries (updated_at desc);

alter table public.admin_push_deliveries enable row level security;
revoke all on table public.admin_push_deliveries from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_push_deliveries to service_role;

drop trigger if exists actualizar_updated_at_admin_push_deliveries on public.admin_push_deliveries;
create trigger actualizar_updated_at_admin_push_deliveries
before update on public.admin_push_deliveries
for each row execute function public.actualizar_updated_at_admin_push_subscriptions();

-- Outbox por reserva. Conserva el evento hasta que el notificador lo confirme,
-- incluso si la llamada inicial a pg_net falla o la Edge Function responde 5xx.
create table if not exists public.admin_push_events (
  reserva_id uuid primary key references public.reservas(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'programado', 'enviando', 'enviado')),
  intento_id uuid,
  intentos integer not null default 0 check (intentos >= 0),
  proximo_intento_at timestamptz not null default now(),
  ultimo_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_push_events
  drop constraint if exists admin_push_events_estado_check;

alter table public.admin_push_events
  add constraint admin_push_events_estado_check check (estado in ('pendiente', 'programado', 'enviando', 'enviado'));

alter table public.admin_push_events
  add column if not exists intento_id uuid;

create index if not exists admin_push_events_pending_idx
  on public.admin_push_events (proximo_intento_at, updated_at)
  where estado <> 'enviado';

alter table public.admin_push_events enable row level security;
revoke all on table public.admin_push_events from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_push_events to service_role;

drop function if exists public.reclamar_entrega_push(uuid, uuid);

create or replace function public.reclamar_entrega_push(
  p_reserva_id uuid,
  p_subscription_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_estado text;
  v_intento_id uuid;
  v_updated_at timestamptz;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_requerido';
  end if;

  insert into public.admin_push_deliveries (reserva_id, subscription_id, estado, intento_id, updated_at)
  values (p_reserva_id, p_subscription_id, 'enviando', gen_random_uuid(), now())
  on conflict (reserva_id, subscription_id) do nothing
  returning intento_id into v_intento_id;

  if found then return v_intento_id::text; end if;

  select entrega.estado, entrega.intento_id, entrega.updated_at
  into v_estado, v_intento_id, v_updated_at
  from public.admin_push_deliveries as entrega
  where entrega.reserva_id = p_reserva_id
    and entrega.subscription_id = p_subscription_id
  for update;

  if v_estado = 'enviado' then return 'enviada'; end if;
  if v_updated_at > now() - interval '15 minutes' then return 'incierta'; end if;

  update public.admin_push_deliveries
  set estado = 'enviando', intento_id = gen_random_uuid(), updated_at = now(), enviado_at = null
  where reserva_id = p_reserva_id and subscription_id = p_subscription_id
  returning intento_id into v_intento_id;
  return v_intento_id::text;
end;
$function$;

revoke all on function public.reclamar_entrega_push(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reclamar_entrega_push(uuid, uuid) to service_role;

create or replace function public.obtener_suscripciones_push_admin()
returns table (id uuid, user_id uuid, endpoint text, p256dh text, auth text, vapid_public_key text)
language sql
security definer
set search_path = public, auth, pg_temp
as $function$
  select suscripcion.id,
         suscripcion.user_id,
         suscripcion.endpoint,
         suscripcion.p256dh,
         suscripcion.auth,
         suscripcion.vapid_public_key
  from public.admin_push_subscriptions as suscripcion
  join auth.users as usuario on usuario.id = suscripcion.user_id
  where usuario.raw_app_meta_data ->> 'role' = 'admin';
$function$;

revoke all on function public.obtener_suscripciones_push_admin() from public, anon, authenticated;
grant execute on function public.obtener_suscripciones_push_admin() to service_role;

drop function if exists public.reclamar_evento_push(uuid);

create or replace function public.reclamar_evento_push(p_reserva_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_estado text;
  v_intento_id uuid;
  v_intentos integer;
  v_proximo_intento_at timestamptz;
  v_updated_at timestamptz;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_requerido';
  end if;

  insert into public.admin_push_events (reserva_id, intento_id)
  values (p_reserva_id, gen_random_uuid())
  on conflict (reserva_id) do nothing
  returning intento_id into v_intento_id;

  if found then return v_intento_id::text; end if;

  select evento.estado, evento.intento_id, evento.intentos, evento.proximo_intento_at, evento.updated_at
  into v_estado, v_intento_id, v_intentos, v_proximo_intento_at, v_updated_at
  from public.admin_push_events as evento
  where evento.reserva_id = p_reserva_id
  for update;

  if v_estado = 'enviado' then return 'enviado'; end if;
  if v_estado = 'programado' then
    update public.admin_push_events
    set estado = 'enviando', updated_at = now()
    where reserva_id = p_reserva_id and intento_id = v_intento_id;
    return v_intento_id::text;
  end if;
  if v_proximo_intento_at > now() then return 'ocupado'; end if;
  if v_estado = 'enviando' and v_updated_at > now() - interval '5 minutes' then return 'ocupado'; end if;

  update public.admin_push_events
  set estado = 'enviando',
      intento_id = gen_random_uuid(),
      intentos = v_intentos + 1,
      updated_at = now()
  where reserva_id = p_reserva_id
  returning intento_id into v_intento_id;
  return v_intento_id::text;
end;
$function$;

revoke all on function public.reclamar_evento_push(uuid) from public, anon, authenticated;
grant execute on function public.reclamar_evento_push(uuid) to service_role;

drop function if exists public.marcar_evento_push_enviado(uuid);

create or replace function public.marcar_evento_push_enviado(p_reserva_id uuid, p_intento_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_requerido';
  end if;

  update public.admin_push_events
  set estado = 'enviado', ultimo_error = null, updated_at = now()
  where reserva_id = p_reserva_id and intento_id = p_intento_id and estado = 'enviando';
end;
$function$;

revoke all on function public.marcar_evento_push_enviado(uuid, uuid) from public, anon, authenticated;
grant execute on function public.marcar_evento_push_enviado(uuid, uuid) to service_role;

drop function if exists public.reprogramar_evento_push(uuid, text);

create or replace function public.reprogramar_evento_push(p_reserva_id uuid, p_intento_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_requerido';
  end if;

  update public.admin_push_events
  set estado = 'pendiente',
      proximo_intento_at = now() + case least(intentos, 5)
        when 1 then interval '30 seconds'
        when 2 then interval '1 minute'
        when 3 then interval '2 minutes'
        when 4 then interval '4 minutes'
        else interval '15 minutes'
      end,
      ultimo_error = left(coalesce(p_error, 'envio_fallido'), 128),
      updated_at = now()
  where reserva_id = p_reserva_id and intento_id = p_intento_id and estado = 'enviando';
end;
$function$;

revoke all on function public.reprogramar_evento_push(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reprogramar_evento_push(uuid, uuid, text) to service_role;

-- pg_net ejecuta la llamada en segundo plano y Vault evita dejar el secreto
-- escrito en la definición del trigger.
create extension if not exists pg_net with schema extensions;

create or replace function public.invocar_notificador_nueva_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_url text;
  v_secret text;
begin
  begin
    insert into public.admin_push_events (reserva_id)
    values (new.id)
    on conflict (reserva_id) do nothing;
  exception when others then
    raise warning 'No se pudo guardar el evento de notificación push: %', SQLERRM;
    return new;
  end;

  begin
    select decrypted_secret into v_url
    from vault.decrypted_secrets
    where name = 'notificaciones_push_url';
    select decrypted_secret into v_secret
    from vault.decrypted_secrets
    where name = 'notificaciones_push_secret';

    if v_url is null or v_secret is null then
      raise warning 'Notificaciones push no configuradas: faltan secretos de Vault.';
      return new;
    end if;

    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notificaciones-secret', v_secret
      ),
      body := jsonb_build_object(
        'type', tg_op,
        'table', tg_table_name,
        'schema', tg_table_schema,
        'record', jsonb_build_object('id', new.id),
        'old_record', null
      ),
      timeout_milliseconds := 10000
    );
  exception when others then
    raise warning 'No se pudo programar el notificador push: %', SQLERRM;
  end;
  return new;
end;
$function$;

drop trigger if exists invocar_notificador_nueva_reserva on public.reservas;
create trigger invocar_notificador_nueva_reserva
after insert on public.reservas
for each row execute function public.invocar_notificador_nueva_reserva();

revoke all on function public.invocar_notificador_nueva_reserva() from public, anon, authenticated;

-- Reintenta los eventos pendientes con backoff. pg_net no reintenta por sí
-- solo un POST fallido; este job vuelve a encolar el evento sin tocar reservas.
create or replace function public.invocar_notificador_nuevas_reservas_pendientes()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault, pg_catalog, pg_temp
as $function$
declare
  v_url text;
  v_secret text;
  v_reserva_id uuid;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'notificaciones_push_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'notificaciones_push_secret';

  if v_url is null or v_secret is null then return; end if;

  for v_reserva_id in
    select evento.reserva_id
    from public.admin_push_events as evento
    where (evento.estado = 'pendiente' and evento.proximo_intento_at <= now())
       or (evento.estado in ('programado', 'enviando') and evento.updated_at <= now() - interval '5 minutes')
    order by evento.proximo_intento_at, evento.created_at
    limit 50
    for update skip locked
  loop
    update public.admin_push_events
    set estado = 'programado',
        intento_id = gen_random_uuid(),
        intentos = intentos + 1,
        proximo_intento_at = now() + interval '5 minutes',
        updated_at = now()
    where reserva_id = v_reserva_id;

    begin
      perform net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-notificaciones-secret', v_secret
        ),
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'reservas',
          'schema', 'public',
          'record', jsonb_build_object('id', v_reserva_id),
          'old_record', null
        ),
        timeout_milliseconds := 10000
      );
    exception when others then
      update public.admin_push_events
      set estado = 'pendiente',
          proximo_intento_at = now() + interval '30 seconds',
          ultimo_error = 'pg_net_enqueue_failed',
          updated_at = now()
      where reserva_id = v_reserva_id;
      raise warning 'No se pudo programar el reintento push para %: %', v_reserva_id, SQLERRM;
    end;
  end loop;
exception when others then
  raise warning 'No se pudo consultar la cola de reintentos push: %', SQLERRM;
end;
$function$;

revoke all on function public.invocar_notificador_nuevas_reservas_pendientes() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $schedule$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where jobname = 'notificar-push-pendientes';

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;

  perform cron.schedule(
    'notificar-push-pendientes',
    '* * * * *',
    'select public.invocar_notificador_nuevas_reservas_pendientes();'
  );
end;
$schedule$;
