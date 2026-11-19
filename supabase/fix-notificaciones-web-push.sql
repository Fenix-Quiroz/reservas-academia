-- Suscripciones Web Push del panel administrativo.
create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 32 and 2048 and endpoint ~ '^https://'),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]+$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]+$'),
  user_agent text not null default '' check (char_length(user_agent) <= 512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
