# Reservas de media hora aislada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir reservas públicas de `0.5` horas únicamente cuando el bloque libre no tenga vecinos libres inmediatos, manteniendo mínimo 1 hora para secuencias de bloques consecutivos.

**Architecture:** Primero se actualizan las restricciones y RPC de Supabase para que la base acepte reservas de media hora. Después se ajusta la lógica pura para identificar bloques aislados y finalmente `SelectorHorario` usa esa decisión para determinar la duración inicial y el mínimo de cada selección.

**Tech Stack:** PostgreSQL/Supabase RPC, React, TypeScript, Vite y comprobaciones ejecutadas con `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-24-media-hora-aislada-design.md`

## Global Constraints

- Un bloque aislado es libre y no tiene un bloque libre contiguo inmediatamente antes ni después.
- Una selección aislada comienza en `0.5` horas.
- Una secuencia libre comienza en `1` hora y puede ampliarse hasta `3` horas en pasos de `0.5`.
- El importe se calcula como `precio_por_hora * horas`.
- Los intervalos continúan siendo semiabiertos `[inicio, fin)`.
- No se cambia el rate limiting, tokens, privacidad ni estados de reserva.

## Review Focus

- Un bloque aislado al inicio o al cierre del polideportivo puede reservarse por `0.5` horas; se prueba en dominio y SQL.
- Dos bloques consecutivos libres no deben iniciar una reserva de `0.5`; se prueba la detección de vecinos.
- Una selección de 1 hora no debe reducirse a `0.5` si pertenece a una secuencia; se prueba en el selector.
- Entrenamientos, eventos y reservas contiguas siguen respetando `[inicio, fin)`; se conservan y amplían los escenarios existentes.
- La reserva remota guarda el monto correcto para `0.5` y sigue limitando el máximo a 3 horas; se prueba en los contratos SQL y balance.

---

### Task 1: Actualizar la base de datos para aceptar media hora

**Files:**
- Create: `supabase/fix-media-hora-aislada.sql`
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `supabase/fix-horarios-media-hora.sql`
- Modify: `supabase/fix-horarios-academia.sql`
- Modify: `supabase/fix-monto-reservas.sql`
- Modify: `supabase/fix-rate-limit-server.sql`
- Modify: `supabase/fix-pgcrypto.sql`
- Test: `src/horariosMediaHora.check.ts`, `src/supabase.check.ts`

**Interfaces:**
- Consumes: existing `reservas` schema and the current `crear_reserva_publica(integer, date, numeric, numeric, text, text)` RPC.
- Produces: a repeatable migration that accepts `horas = 0.5`, keeps the exclusion constraint, calculates the amount from the server price, and leaves `obtener_horarios_publicos` accepting 0.5.

- [ ] Add a failing contract assertion that `reservas_horas_validas_check` and `crear_reserva_publica` include `0.5`.
- [ ] Run `npm run check:horarios-media` and `npm run check:supabase` to verify the assertions fail before the SQL changes.
- [ ] Update all SQL snapshots and add the focused migration without deleting existing reservations or granting direct table access to `anon`.
- [ ] Run the SQL contract checks and confirm the expected RPC signature and anon grants.
- [ ] Tell the user to execute `supabase/fix-media-hora-aislada.sql` in Supabase before frontend testing; this is the production migration.

### Task 2: Add pure isolated-block rules

**Files:**
- Modify: `src/reservas.ts`
- Modify: `src/reservas.check.ts`
- Modify: `src/reservas.scenarios.check.ts`

**Interfaces:**
- Consumes: `HorarioDisponible[]` with 30-minute `inicio` values.
- Produces: `esDuracionValida(0.5) === true` and an exported `esBloqueAislado(lista, inicio): boolean`.

- [ ] Add tests for isolated blocks at opening, closing, between occupied blocks, and blocks with a free neighbor.
- [ ] Run the domain checks to observe failures.
- [ ] Include `0.5` in valid reservation durations and implement `esBloqueAislado` using immediate half-hour neighbors.
- [ ] Verify that range overlap, training, events, maximum 3 hours, and contiguous availability retain their existing behavior.

### Task 3: Integrate the rule into the client selector

**Files:**
- Modify: `src/components/cliente/SelectorHorario.tsx`
- Modify: `src/ui.check.ts`
- Modify: `src/components/cliente/selector-horario.typecheck.ts`

**Interfaces:**
- Consumes: `esBloqueAislado`, `rangoLibre`, `DURACION_BLOQUE`, and the existing `onHorasChange`/`onClearHour` callbacks.
- Produces: an isolated block selects `0.5`; a contiguous free sequence starts at `1`; extension remains in `0.5` steps up to `3`.

- [ ] Add UI contract assertions for isolated-block messaging and the dynamic minimum.
- [ ] Run `npm run check:ui` to verify the assertions fail before the component change.
- [ ] Replace the fixed minimum logic with an isolated minimum of `0.5` and a sequence minimum of `1`; prevent a contiguous 1-hour selection from reducing to an invalid isolated half-hour.
- [ ] Update the helper text and fixed selection summary for `0.5` without reintroducing the old duration step.
- [ ] Run UI and component type checks.

### Task 4: Verify the end-to-end booking contracts

**Files:**
- Modify: `src/balanceMensual.check.ts` if a half-hour assertion is needed.
- Modify: `src/admin.check.ts` if an admin display assertion is needed.

- [ ] Add tests for a half-hour reservation amount and the admin/balance display.
- [ ] Run all project checks, typecheck, lint, production build, and `git diff --check`.
- [ ] Review the final diff and report clearly that the SQL migration must be executed before deploying the frontend.

## Execution Notes

- Execute Task 1 completely and wait for the user's Supabase result before treating the production database as ready.
- Do not change frontend behavior until the database contract is updated and the local SQL assertions pass.
- Do not commit or push unless the user explicitly requests it.
