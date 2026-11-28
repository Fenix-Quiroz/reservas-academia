# UUID del cliente en reservas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlazar reservas históricas y nuevas con el UUID estable del cliente y usarlo para mostrar reservas y tickets.

**Architecture:** `reservas.cliente_id` será una clave foránea a `clientes.id`. Las RPC de creación devolverán `cliente_id`; el navegador lo guardará asociado al celular y usará RPC públicas por UUID, manteniendo las RPC por token para compatibilidad.

**Tech Stack:** React, TypeScript, Supabase PostgreSQL/RPC, checks con `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-24-uuid-cliente-reservas-design.md`

## Global Constraints

- Todas las reservas existentes deben enlazarse por celular antes de exigir `cliente_id`.
- Solo `finalizado + confirmado` y `finalizado + no_requerido` suman tickets.
- `supabase/schema.sql` y `supabase/permissions.sql` deben conservar contratos equivalentes.
- Las RPC antiguas por token deben seguir disponibles para compatibilidad.
- No se suben estos archivos de planificación al commit.

## Review Focus

- Histórico sin reservas huérfanas después del backfill.
- Nueva reserva pública y reserva administrativa guardan el UUID correcto.
- Cliente sin UUID guardado sigue funcionando con tokens.
- Cliente con UUID guardado recibe historial completo y contador correcto.
- UUID inexistente no devuelve datos ni rompe la pantalla.

### Task 1: Contratos y almacenamiento local

**Files:** `src/clienteIdentidad.check.ts`, `src/almacen.ts`, `src/supabaseData.ts`

- [ ] Escribir checks fallidos para guardar/leer UUID por celular y devolver `clienteId` en el resultado de reserva.
- [ ] Ejecutar `npm run check:cliente-identidad` y confirmar que falla.
- [ ] Implementar almacenamiento y tipos/adaptadores mínimos.
- [ ] Ejecutar el check y confirmar que pasa.

### Task 2: Migración SQL y RPC por UUID

**Files:** `supabase/schema.sql`, `supabase/permissions.sql`, `src/supabase.check.ts`

- [ ] Añadir checks fallidos para columna, backfill, clave foránea, RPC y permisos.
- [ ] Ejecutar `npm run check:supabase` y confirmar el fallo esperado.
- [ ] Implementar la migración y las RPC equivalentes en ambos SQL.
- [ ] Ejecutar `npm run check:supabase` y confirmar que pasa.

### Task 3: Integración de `App`

**Files:** `src/App.tsx`, `src/supabaseData.ts`, `src/ui.check.ts`

- [ ] Añadir checks del flujo por UUID.
- [ ] Ejecutar checks para confirmar el contrato faltante.
- [ ] Guardar el UUID al crear reserva y cargar reservas/tickets por UUID cuando esté disponible, con fallback por token.
- [ ] Ejecutar `npm run check:ui && npm run typecheck`.

### Task 4: Verificación, migración remota y publicación

**Files:** solo los anteriores; no subir `.md`.

- [ ] Aplicar una migración temporal equivalente en Supabase enlazado.
- [ ] Verificar columnas, 75 reservas enlazadas y conteo de Fenix.
- [ ] Ejecutar checks, lint y build.
- [ ] Revisar diff, commit y push sin archivos Markdown.
