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
  updated_at timestamptz not null default now(),
  enviado_at timestamptz,
  primary key (reserva_id, subscription_id)
);

create index if not exists admin_push_deliveries_updated_idx
  on public.admin_push_deliveries (updated_at desc);

alter table public.admin_push_deliveries enable row level security;
revoke all on table public.admin_push_deliveries from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_push_deliveries to service_role;

drop trigger if exists actualizar_updated_at_admin_push_deliveries on public.admin_push_deliveries;
create trigger actualizar_updated_at_admin_push_deliveries
before update on public.admin_push_deliveries
for each row execute function public.actualizar_updated_at_admin_push_subscriptions();

create or replace function public.reclamar_entrega_push(
  p_reserva_id uuid,
  p_subscription_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_estado text;
  v_updated_at timestamptz;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_requerido';
  end if;

  insert into public.admin_push_deliveries (reserva_id, subscription_id, estado, updated_at)
  values (p_reserva_id, p_subscription_id, 'enviando', now())
  on conflict (reserva_id, subscription_id) do nothing;

  if found then return true; end if;

  select entrega.estado, entrega.updated_at
  into v_estado, v_updated_at
  from public.admin_push_deliveries as entrega
  where entrega.reserva_id = p_reserva_id
    and entrega.subscription_id = p_subscription_id
  for update;

  if v_estado = 'enviado' then return false; end if;
  if v_updated_at > now() - interval '5 minutes' then return false; end if;

  update public.admin_push_deliveries
  set estado = 'enviando', updated_at = now(), enviado_at = null
  where reserva_id = p_reserva_id and subscription_id = p_subscription_id;
  return true;
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
      'record', to_jsonb(new),
      'old_record', null
    )
  );
  return new;
end;
$function$;

drop trigger if exists invocar_notificador_nueva_reserva on public.reservas;
create trigger invocar_notificador_nueva_reserva
after insert on public.reservas
for each row execute function public.invocar_notificador_nueva_reserva();

revoke all on function public.invocar_notificador_nueva_reserva() from public, anon, authenticated;
