# Pagos y comprobantes escalables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una estructura de pagos y comprobantes que soporte adelantos, reintentos y métodos futuros sin perder la tabla ya ejecutada.

**Architecture:** Mantener en `reservas` un resumen rápido y crear `pagos_reserva` como fuente de verdad de los movimientos, con `pago_comprobantes` como relación de archivos. El bucket seguirá privado y el acceso público quedará reservado para una futura Edge Function.

**Tech Stack:** PostgreSQL/Supabase, RLS, TypeScript checks del proyecto.

**Spec:** `docs/superpowers/specs/2026-10-24-pagos-escalables-design.md`

## Global Constraints

- No borrar ni renombrar `comprobantes_pago` en esta migración.
- No conceder `insert` a `anon` ni hacer público el bucket.
- El adelanto mínimo es `10.00` PEN.
- Los estados operativos de `reservas` no se mezclan con el estado del adelanto.
- La migración debe poder ejecutarse más de una vez.

## Review Focus

- Reejecutar la migración no debe fallar ni duplicar restricciones.
- Un adelanto inferior a S/10 debe rechazarse por la base de datos.
- Un mismo comprobante no debe poder pertenecer a dos pagos.
- Un pago rechazado debe permitir otro intento para la misma reserva.
- El acceso a pagos y comprobantes debe seguir limitado a administradores autenticados.

### Task 1: SQL de pagos y comprobantes

**Files:**
- Create: `supabase/fix-pagos-escalables.sql`
- Test: `src/supabase.check.ts`

**Interfaces:**
- Consumes: `reservas.pago_estado` y `comprobantes_pago` creados por `fix-comprobantes-pago.sql`.
- Produces: `reservas.pago_requerido`, `reservas.pago_expira_at`, `pagos_reserva` y `pago_comprobantes` con RLS administrativa.

- [x] **Step 1: Write assertions that require the new migration and constraints.**
- [x] **Step 2: Run `npm run check:supabase` and verify it fails because the migration does not exist.**
- [x] **Step 3: Implement the repeatable additive migration.**
- [x] **Step 4: Run `npm run check:supabase` and verify it passes.**
- [x] **Step 5: Run `git diff --check`.**

### Task 2: Synchronize SQL snapshots and documentation

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `src/supabase.check.ts`

**Interfaces:**
- Consumes: the table and policy definitions from Task 1.
- Produces: fresh-install and permissions snapshots containing the same scalable structure.

- [x] **Step 1: Add the new columns, tables, indexes, grants, and policies to both snapshots.**
- [x] **Step 2: Run `npm run check:supabase`.**
- [x] **Step 3: Run `git diff --check`.**

## Execution choice

Native inline execution is used because the changes are limited to SQL snapshots and static checks, while the current worktree already contains the user's ongoing changes that must be preserved.
