# Duraciones de hasta 3 horas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir reservas de 1, 1.5, 2 y 3 horas, con precios proporcionales y un máximo de 3 horas validado en frontend, lógica local y Supabase.

**Architecture:** Se conservarán los inicios en horas enteras y `horas` pasará a `number`/`numeric(2,1)`. La disponibilidad local y RPC usarán rangos numéricos; la presentación convertirá finales decimales a minutos (`9:30`).

**Tech Stack:** React, TypeScript, Vite, Supabase PostgreSQL, `xlsx-js-style`.

**Spec:** `docs/superpowers/specs/2026-10-23-duraciones-media-hora-design.md`

## Global Constraints

- Las únicas duraciones válidas son `1`, `1.5`, `2` y `3`.
- Los inicios continúan siendo enteros; no se agregan turnos que comiencen a `:30`.
- El horario permitido sigue siendo 7:00 a. m. a 1:00 a. m.; el inicio máximo depende de la duración.
- Los bloqueos semanales de academia deben seguir marcándose como no disponibles.
- Los precios se calculan como `precioHora * horas`.

## Review Focus

- Una reserva de 1.5 horas termina en `:30` en todas las vistas: `fechasReserva.check.ts` y componentes cliente.
- Una reserva de 3 horas puede terminar a la 1:00 a. m., pero una de 3.5 horas se rechaza: `reservas.check.ts` y RPC checks.
- Una reserva de 1.5 horas cruza correctamente otra reserva y un entrenamiento: `reservas.check.ts`.
- El precio de 1.5 horas conserva los decimales y el balance suma 1.5 horas: `balanceMensual.check.ts`.
- La alarma y el estado activo respetan los 30 minutos: `alarmaTurno.check.ts` y `admin.check.ts`.

---

### Task 1: Duraciones y formato de tiempo en el cliente

**Files:**
- Modify: `src/components/cliente/SelectorHorario.tsx`
- Modify: `src/utils/fechasReserva.ts`
- Modify: `src/reservas.ts`
- Test: `src/reservas.check.ts`
- Test: `src/ui.check.ts`

**Interfaces:**
- Produce `DURACIONES_RESERVA: readonly number[] = [1, 1.5, 2, 3]` for the selector.
- `horaVisible(hora: number)` and `rangoVisible(inicio: number, horas: number)` accept fractional end times and render `:30`.

- [x] **Step 1: Write failing tests** for the duration list, `horaVisible(9.5) === '9:30 a. m.'`, `horaVisible(24.5) === '12:30 a. m.'`, and a 3-hour range ending at 1:00 a. m.
- [x] **Step 2: Run `npm run check` and `npm run check:ui`** and verify the new expectations fail because only 1/2 hours and integer formatting exist.
- [x] **Step 3: Implement the shared duration list and fractional time formatting**, use the four choices in `SelectorHorario`, and keep the night group through hour 25.
- [x] **Step 4: Run the focused checks again** and verify they pass.

### Task 2: Disponibilidad, precios, estados, alarmas y reportes

**Files:**
- Modify: `src/horariosEntrenamiento.ts`
- Modify: `src/admin.ts`
- Modify: `src/utils/alarmaTurno.ts`
- Modify: `src/balanceMensual.ts`
- Modify: `src/components/cliente/DatosReserva.tsx`
- Modify: `src/components/cliente/MisReservas.tsx`
- Modify: `src/components/cliente/ReservaCompletada.tsx`
- Modify: `src/components/admin/AdminReservaCard.tsx`
- Test: `src/reservas.check.ts`
- Test: `src/admin.check.ts`
- Test: `src/utils/alarmaTurno.check.ts`
- Test: `src/balanceMensual.check.ts`

**Interfaces:**
- `horarios`, `entrenamientoBloquea`, `activa`, `enCursoPorHora`, `finDeReserva` and report aggregation continue to consume `horas: number`.

- [x] **Step 1: Add failing tests** for 1.5-hour overlap, 3-hour final start, 3.5-hour rejection/local guard, 30-minute alarm end, active state at the exact half-hour, and a 1.5-hour balance row.
- [x] **Step 2: Run the focused checks** and verify they fail for the expected integer-hour assumptions.
- [x] **Step 3: Update overlap and time comparisons to use fractional hours**, preserve academy block checks, and format all customer/admin prices consistently without rounding away `.5`.
- [x] **Step 4: Update alarm and balance calculations** so `1.5` is summed and scheduled as 90 minutes.
- [x] **Step 5: Run all focused checks and `npm run typecheck`**.

### Task 3: Supabase numeric duration migration and secure RPCs

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `supabase/fix-horarios-academia.sql`
- Modify: `supabase/fix-monto-reservas.sql`
- Modify: `supabase/fix-rate-limit-server.sql`
- Modify: `supabase/fix-pgcrypto.sql`
- Modify: `src/supabase.check.ts`

**Interfaces:**
- `public.reservas.horas` becomes `numeric(2,1)`.
- Public RPC signatures use `p_horas numeric(2,1)` and accept only `1`, `1.5`, `2`, `3`.
- Availability uses `numrange` and `generate_series(7, floor(25 - p_horas)::integer)`.

- [x] **Step 1: Add failing SQL-source checks** for `numeric(2,1)`, `numrange`, valid durations, the 3-hour opening boundary, and decimal RPC parameters.
- [x] **Step 2: Run `npm run check:supabase`** and verify the new checks fail against the current integer schema/functions.
- [x] **Step 3: Update the canonical schema and permissions**, including an idempotent conversion of existing `horas`, replacement of the exclusion constraint, and the updated availability/creation RPCs.
- [x] **Step 4: Update the standalone migrations** so applying the documented migration after the existing database results in the same schema and function signatures.
- [x] **Step 5: Run `npm run check:supabase`** and inspect all remaining SQL references to integer-only durations.

### Task 4: Documentation and complete verification

**Files:**
- Modify: `README.md`

- [x] **Step 1: Document** the valid durations, proportional prices, and the migration order.
- [x] **Step 2: Run the complete suite:** `npm run check`, `npm run check:scenarios`, `npm run check:admin`, `npm run check:ui`, `npm run check:supabase`, `npm run check:balance`, `npm run check:alarm`, `npm run check:typescript`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] **Step 3: Review `git diff --check`** and report the build warning separately if the existing bundle-size warning remains.

