-- Habilita los cambios necesarios para que el panel administrativo se
-- actualice cuando se crea una reserva, pago o comprobante.
-- Ejecutable varias veces sin duplicar tablas en la publicación.

do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.reservas'::regclass
  ) then
    alter publication supabase_realtime add table public.reservas;
  end if;

  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.pagos_reserva'::regclass
  ) then
    alter publication supabase_realtime add table public.pagos_reserva;
  end if;

  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.pago_comprobantes'::regclass
  ) then
    alter publication supabase_realtime add table public.pago_comprobantes;
  end if;
end
$$;
