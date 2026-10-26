# Selector de dos semanas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow public customers to choose any date from today through the next 13 days while showing only one seven-day week at a time.

**Architecture:** Keep the existing staged selector and absolute day index used by `App`; add a local week toggle inside `SelectorHorario` that renders day indexes 0–6 or 7–13. Update every SQL source/migration that defines the public date range from `v_hoy + 6` to `v_hoy + 13`, keeping the public RPCs as the availability source of truth.

**Tech Stack:** React 19, TypeScript, Vite, Supabase PostgreSQL RPCs, existing `tsx` checks.

**Spec:** `docs/superpowers/specs/2026-10-24-selector-dos-semanas-design.md`

## Global Constraints

- Show exactly seven day cards per week and start on `Esta semana`.
- The accepted date range is today through today + 13 days, inclusive.
- Preserve the current flow: day → duration → shift → hour.
- Keep past-hour, training, event, overlap, price, and RLS rules unchanged.
- Do not change the administrator panel in this task.
- Do not add a calendar dependency or expose database tables to the public client.

## Review Focus

- Switching to the next week must send the absolute day index 7–13 to the existing date calculation and RPC.
- Returning to the first week must not leave a selected day or hour from the second week active.
- A date on day 13 must load availability, while day 14 must be rejected by the public RPC.
- The first week must preserve the current initial-day behavior and today’s past-hour hiding.
- All SQL copies used for deployments must use the same 14-day boundary, preventing a local/Vercel mismatch.

### Task 1: Client week navigation

**Files:**
- Modify: `src/components/cliente/SelectorHorario.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Test: `src/ui.check.ts`
- Test: `src/reservas.check.ts`

**Interfaces:**
- Consumes: existing `dia` absolute index and `onDiaChange(dia: number)` callback.
- Produces: two week controls labeled `Esta semana` and `Próxima semana`; each renders seven day buttons without changing the existing parent callback contract.

- [ ] **Step 1: Write failing UI assertions** for the two labels, seven-day window, week state, and reset behavior when changing weeks; add a date-range assertion for the absolute indexes 0–13.
- [ ] **Step 2: Run `npm run check:ui` and `npm run check`** and verify the new assertions fail because the current selector only renders seven fixed days and has no week controls.
- [ ] **Step 3: Implement the week toggle** with `semana` state, seven cards per week, absolute day indexes, and a safe reset of the selected hour when changing week; update `App`’s public date window constant to 14 days and add focused responsive styling for the week controls.
- [ ] **Step 4: Run the focused checks** and verify they pass.

### Task 2: Public RPC date range

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `supabase/fix-horarios-academia.sql`
- Modify: `supabase/fix-horarios-media-hora.sql`
- Modify: `supabase/fix-monto-reservas.sql`
- Modify: `supabase/fix-pgcrypto.sql`
- Modify: `supabase/fix-rate-limit-server.sql`
- Test: `src/supabase.check.ts`

**Interfaces:**
- Consumes: existing public RPC signatures `obtener_horarios_publicos(integer, date, numeric)` and `crear_reserva_publica(integer, date, numeric, numeric, text, text)`.
- Produces: the same RPC contracts with `p_fecha <= v_hoy + 13`.

- [ ] **Step 1: Write failing SQL assertions** that require every public availability/creation definition to use `v_hoy + 13` and reject dates beyond that boundary.
- [ ] **Step 2: Run `npm run check:supabase`** and verify it fails because the SQL copies still use `v_hoy + 6`.
- [ ] **Step 3: Update all SQL definitions consistently** from `v_hoy + 6` to `v_hoy + 13`; do not change signatures, overlap checks, or security grants.
- [ ] **Step 4: Run `npm run check:supabase`** and verify all SQL consistency assertions pass.

### Task 3: Full verification

**Files:**
- No additional files.

- [ ] **Step 1: Run `npm run typecheck`.**
- [ ] **Step 2: Run `npm run lint`.**
- [ ] **Step 3: Run `npm run check`, `npm run check:ui`, `npm run check:supabase`, `npm run check:admin`, and `npm run build`.**
- [ ] **Step 4: Run `git diff --check` and review that only the client selector, relevant styles/tests, and date-range SQL copies changed.**
