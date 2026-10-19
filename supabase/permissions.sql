-- Ejecuta este ajuste si ya habías ejecutado una versión anterior de schema.sql.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.clientes to anon, authenticated;
grant select, insert, update, delete on public.reservas to anon, authenticated;
