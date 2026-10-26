# Selector de horario por pasos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the client schedule selector into a sequential day → duration → shift → time flow with one visible window at a time.

**Architecture:** Keep the existing `SelectorHorario` component and add local step state plus small navigation helpers. The parent props and Supabase calls remain unchanged except for an internal `onClearHour` callback used to clear an incompatible selected time.

**Tech Stack:** React, TypeScript, existing CSS classes, Node assertion checks.

**Spec:** `docs/superpowers/specs/2026-10-24-selector-horario-por-pasos-design.md`

## Global Constraints

- Do not change the existing callback semantics; `onClearHour` is the only new callback.
- Do not change Supabase RPCs or reservation availability logic.
- Show only one selection stage at a time; use a contextual “Volver a elegir…” button instead of stacked summaries.
- Preserve the existing morning, afternoon, and night ranges.

## Review Focus

- Changing the day or duration must clear an incompatible selected hour.
- A selected shift must filter hours without hiding the current availability state.
- Loading and empty schedules must remain understandable in the final step.
- Returning to an earlier step must show the previous choice as selected without leaving later-stage cards visible.
- The final “Continuar con mis datos” action must still appear only after selecting a free hour.

---

### Task 1: Add failing coverage for the sequential selector

**Files:**
- Modify: `src/components/cliente/selector-horario.typecheck.ts` or add a focused static check next to it.
- Test: `src/ui.check.ts` if existing UI assertions are the established location.

**Interfaces:**
- Consumes: current `SelectorHorario` markup and `SelectorHorarioProps`.
- Produces: assertions that the selector exposes sequential stage labels, shift choices, and change controls.

- [ ] **Step 1: Write the failing assertions** for the four stage labels and the three shift labels, plus the fact that the old all-at-once structure is not required.
- [ ] **Step 2: Run `npm run check:ui` and confirm the new assertions fail against the current component.**

### Task 2: Implement the sequential flow

**Files:**
- Modify: `src/components/cliente/SelectorHorario.tsx`
- Modify: `src/ui.check.ts` if needed by the tests.

**Interfaces:**
- Consumes: existing props, `GRUPOS`, `DURACIONES_RESERVA`, and availability list.
- Produces: same callback behavior plus `onClearHour: () => void`, with a local stage and selected shift.

- [ ] **Step 1: Add the local stage state and shift selection.** Start at day selection, keep the current day and duration values, and use the existing group identifiers for shifts.
- [ ] **Step 2: Render only the active stage.** Add compact summaries and “Cambiar” controls for completed selections; preserve current hour buttons and loading/empty states in the final stage.
- [ ] **Step 3: Reset the selected hour when day or duration changes.** Keep the existing callback calls so the parent refetches availability as it does today.
- [ ] **Step 4: Run `npm run check:ui` and confirm the new assertions pass.**

### Task 3: Verify the full change

**Files:**
- Test: existing project checks.

- [ ] **Step 1: Run `npm run typecheck`.**
- [ ] **Step 2: Run `npm run lint`.**
- [ ] **Step 3: Run `npm run build`.**
- [ ] **Step 4: Run the reservation, scenario, and UI checks.**
