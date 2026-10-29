# Eventos especiales y balance mensual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar el precio total de los eventos especiales y exportarlos al Excel sin mezclar eventos de todos los campos con reservas especiales individuales.

**Architecture:** Cada creación de evento especial tendrá un `grupoId` persistente, un tipo (`individual` o `todos_los_campos`) y un precio total. Los bloqueos por cancha seguirán siendo filas independientes para mantener la disponibilidad, pero se crearán y cancelarán como un grupo. El balance agrupará por `grupoId` y el Excel tendrá una hoja `Eventos especiales` con una sección para todos los campos y secciones individuales por campo.

**Tech Stack:** React 19, TypeScript, Supabase/PostgreSQL, almacenamiento local de demo y `xlsx-js-style`.

**Spec:** `docs/superpowers/specs/2026-10-29-eventos-especiales-balance-design.md`

## Global Constraints

- El precio ingresado es el total del evento, nunca un precio por cada campo.
- Un evento `todos_los_campos` aparece únicamente en la sección `Todos los campos` del Excel.
- Un evento `individual` aparece únicamente bajo el campo que ocupa.
- El ingreso de un evento agrupado se suma una sola vez al balance.
- Los bloqueos públicos por cancha deben seguir funcionando igual.
- Las reservas públicas normales no cambian de comportamiento.

## Review Focus

- Evento agrupado de Campo 1, Campo 2 y Campo 3: una sola fila con el precio total y ninguna fila repetida en las secciones individuales. Test en `balanceMensual.check.ts` y `supabase.check.ts`.
- Evento individual de un solo campo: aparece únicamente en ese campo. Test en `balanceMensual.check.ts`.
- Registros antiguos sin grupo ni precio: se leen como eventos individuales con precio cero. Test en `eventos.check.ts` y `supabase.check.ts`.
- Cancelación de un evento agrupado: cancela todos sus bloqueos y no entra al balance. Test en `eventos.check.ts`.
- Precio inválido, cero y decimal: se valida antes de crear y se conserva con dos decimales. Test en `eventos.check.ts` y `balanceMensual.check.ts`.

### Task 1: Domain types and grouped local event behavior

**Files:**
- Modify: `src/types.ts`
- Modify: `src/eventos.ts`
- Modify: `src/almacen.ts`
- Test: `src/eventos.check.ts`
- Test: `src/typescript.check.ts`

**Interfaces:**
- Add `TipoEventoEspecial = 'individual' | 'todos_los_campos'`.
- Add `EventoEspecialNuevo` with `canchaIds`, `fecha`, `inicio`, `fin`, `nombre`, `celular`, `notas`, `tipo` and `precioCobrado`.
- Add grouped result type `{ eventos: BloqueoEvento[] } | ErrorEventoResultado`.
- Extend `BloqueoEvento` with `grupoId`, `tipo` and `precioCobrado`, while normalizing legacy records to `grupoId = id`, `tipo = 'individual'`, `precioCobrado = 0`.
- Add `crearEventoEspecialLocal(nuevo, reservas)` and `cancelarEventoEspecialLocal(grupoId)`.

- [ ] **Step 1: Write failing tests** for grouped local creation, legacy normalization, grouped cancellation and price validation.
- [ ] **Step 2: Run `npm run check:eventos`** and confirm failure because grouped event types/functions are missing.
- [ ] **Step 3: Implement the types and local behavior**. Validate every selected field before writing, assign one `grupoId` to all child blocks, and persist the total price on the group metadata.
- [ ] **Step 4: Run `npm run check:eventos` and `npm run typecheck`** and confirm they pass.

### Task 2: Supabase schema and grouped event RPCs

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `src/supabaseData.ts`
- Modify: `src/supabase.check.ts`
- Test: `src/supabase.check.ts`

**Interfaces:**
- Add nullable `evento_especial_id` to `public.bloqueos_eventos` for legacy compatibility.
- Add `public.eventos_especiales` with `id`, `tipo`, `precio_cobrado`, `estado` and timestamps.
- Add `crear_evento_especial_admin(integer[], date, smallint, smallint, text, text, text, text, numeric)` returning the child bloqueo rows with their group metadata.
- Add `cancelar_evento_especial_admin(uuid)` that cancels all child rows for the group and the parent record.
- Extend `obtener_bloqueos_eventos_admin()` to return `grupo_id`, `tipo` and `precio_cobrado`, defaulting legacy rows safely.
- Add remote functions `crearEventoEspecialRemoto` and `cancelarEventoEspecialRemoto` with the grouped result types.

- [ ] **Step 1: Add failing schema assertions** for the parent table, group columns, create RPC, cancel RPC and grants.
- [ ] **Step 2: Run `npm run check:supabase`** and confirm the new assertions fail.
- [ ] **Step 3: Implement the schema and permissions** in both canonical SQL files, preserving the existing single-field functions for legacy data.
- [ ] **Step 4: Implement row mapping and remote RPC wrappers** with numeric price normalization and Supabase error mapping.
- [ ] **Step 5: Run `npm run check:supabase` and `npm run typecheck`** and confirm they pass.

### Task 3: Admin event form and grouped cards

**Files:**
- Modify: `src/components/admin/AdminEventos.tsx`
- Modify: `src/components/admin/AdminEventoCard.tsx`
- Modify: `src/AdminApp.tsx`
- Modify: `src/components/admin/admin-eventos.typecheck.ts`
- Test: `src/components/admin/admin-eventos.check.ts`

**Interfaces:**
- Change `AdminEventosProps.onCrear` to accept `EventoEspecialNuevo` and return the grouped result.
- Change `AdminEventosProps.onCancelar` to accept a `grupoId`.
- Add required input `Precio cobrado (S/)` with decimal step and non-negative validation.
- Submit one grouped create operation: one field for individual selection or the football field IDs for `todos_los_campos`.
- Render one card per `grupoId`, showing `Campo 1, Campo 2 y Campo 3` for grouped football events and one cancel action for the group.

- [ ] **Step 1: Add failing UI/source checks** for the price input, grouped callbacks, group-based card rendering and group cancellation.
- [ ] **Step 2: Run `npx tsx src/components/admin/admin-eventos.check.ts`** and confirm failure.
- [ ] **Step 3: Replace the per-field submit loop** with the grouped local/remote create operation while retaining the immediate double-submit guard.
- [ ] **Step 4: Update cards and cancellation** to group by `grupoId`, leaving individual event cards unchanged.
- [ ] **Step 5: Run `npx tsx src/components/admin/admin-eventos.check.ts`, `npm run check:components`, `npm run check:admin` and `npm run typecheck`**.

### Task 4: Balance model and Excel event sheet

**Files:**
- Modify: `src/balanceMensual.ts`
- Modify: `src/exportarBalance.ts`
- Modify: `src/components/admin/AdminBalanceMensual.tsx`
- Modify: `src/AdminApp.tsx`
- Test: `src/balanceMensual.check.ts`
- Test: `src/balanceDemo.check.ts`

**Interfaces:**
- Extend `construirBalanceMensual` to accept `eventos` and a clock value for deterministic completion checks.
- Add grouped `eventosEspeciales` and `ingresosEventosEspeciales` to `BalanceMensual`.
- Count only non-cancelled events whose scheduled end has passed in the selected month.
- Add a workbook sheet named `Eventos especiales` with one `Todos los campos` section and individual field sections that exclude grouped events.
- Include special-event income once in `ingresosTotales` while keeping public reservation field summaries separate.

- [ ] **Step 1: Add failing balance and workbook assertions** for grouped totals, individual-only field sections and the new sheet.
- [ ] **Step 2: Run `npm run check:balance`** and confirm failure.
- [ ] **Step 3: Implement grouped balance calculations** using `grupoId` and `tipo`; never duplicate the total amount across child fields.
- [ ] **Step 4: Implement the `Eventos especiales` worksheet** and wire live events into `AdminBalanceMensual`.
- [ ] **Step 5: Run `npm run check:balance`, `npm run check:balance-demo`, `npm run typecheck` and `npm run lint`**.

### Task 5: Full verification

**Files:**
- Modify: any affected checks only if required by the completed interfaces.

- [ ] **Step 1: Run all project checks except known pre-existing `check:ui` assertions unrelated to this feature.**
- [ ] **Step 2: Run `npm run build`.**
- [ ] **Step 3: Run `git diff --check`.**
- [ ] **Step 4: Review the final diff for accidental changes and report any pre-existing check failures separately.**

