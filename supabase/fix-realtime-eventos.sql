-- ============================================================================
-- Migración: Habilitar Realtime para Eventos Especiales (bloqueos_eventos)
-- Ejecutar en el SQL Editor de Supabase
-- Permite que los eventos especiales se sincronicen en tiempo real sin recargar.
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.bloqueos_eventos'::regclass
  ) then
    alter publication supabase_realtime add table public.bloqueos_eventos;
  end if;
end
$$;
