# Reservas administrativas fuera de horario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir reservas administrativas de clientes confiables hasta las 2:30 a. m. sin ampliar el horario público ni saltarse los controles de disponibilidad.

**Architecture:** El flujo normal seguirá usando la reserva pública. El modo especial tendrá una función RPC protegida por el rol `admin`, con validación independiente del límite horario y del número confiable. La interfaz mostrará el modo especial únicamente cuando el modal se abra desde una tarjeta confiable.

**Tech Stack:** React, TypeScript, Supabase RPC/PostgreSQL, checks ejecutables con `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-16-reserva-admin-fuera-horario-design.md`

## Global Constraints

- El horario público permanece limitado hasta la 1:00 a. m.
- El horario administrativo especial termina a las 2:30 a. m.
- Los horarios se eligen en incrementos de 30 minutos.
- Solo un cliente confiable puede activar el modo especial.
- La disponibilidad, eventos y entrenamientos siguen siendo obligatorios.
- No se implementa todavía la conexión real del sorteo/balance.

## Review Focus

- Intentar activar el horario especial sin cliente confiable debe ser imposible.
- Una reserva que termine después de las 2:30 a. m. debe rechazarse.
- Un cruce con reserva o evento debe seguir rechazándose.
- El RPC no debe ser invocable por un usuario no administrador.
- El flujo normal y el cierre público no deben cambiar.

### Task 1: Contrato de horario extendido

**Files:**
- Create: `src/reservaAdminFueraHorario.check.ts`
- Modify: `src/reservas.ts`
- Modify: `package.json`

**Interfaces:**
- Produce `esHorarioAdminFueraHorarioValido(inicio: number, horas: number): boolean`.
- Produce `horariosAdminFueraHorario(): HorarioDisponible[]` para los inicios de 1:00 a 2:00 a. m. que puedan terminar como máximo a las 2:30 a. m.

- [ ] Write the failing test for the allowed range, invalid end times, half-hour increments, and public-limit preservation.
- [ ] Run `npx tsx src/reservaAdminFueraHorario.check.ts` and verify it fails because the new contract is missing.
- [ ] Implement the minimal constants and helpers in `src/reservas.ts`.
- [ ] Add `check:admin-fuera-horario` and verify the test passes.

### Task 2: RPC administrativa segura

**Files:**
- Create: `supabase/fix-reserva-admin-fuera-horario.sql`
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `src/supabaseData.ts`
- Modify: `src/almacen.ts`
- Modify: `src/types.ts` if the result contract requires it
- Test: `src/reservaAdminFueraHorario.check.ts`

**Interfaces:**
- Produce `crearReservaAdminRemota(reserva, sinAdelanto): Promise<ResultadoReserva>` calling `crear_reserva_admin`.
- Produce `crearReservaAdminFueraHorario(...)` as the storage wrapper used only by the admin modal.

- [ ] Extend the failing check to require the admin RPC, role check, trusted-number check, max end at 26.5, conflict checks, and return fields.
- [ ] Run the check and verify the SQL/source assertions fail.
- [ ] Implement the RPC and migration, preserving the existing public RPC limit and exclusion constraint.
- [ ] Implement the client wrapper and map Supabase errors consistently.
- [ ] Run the check and verify it passes.

### Task 3: Admin UI from trusted-client cards

**Files:**
- Create: `src/components/admin/SelectorHorarioFueraHorario.tsx`
- Modify: `src/components/admin/AdminModalNuevaReserva.tsx`
- Modify: `src/components/admin/admin-control-clientes-ui.check.ts`
- Test: `src/reservaAdminFueraHorario.check.ts`

**Interfaces:**
- The special selector receives the current date offset, selected start/duration, and callbacks, and exposes only 30-minute choices through 2:30 a. m.
- `AdminModalNuevaReserva` only renders the special-mode control when `clienteInicial` exists.

- [ ] Add failing source assertions for the trusted-only control and special selector.
- [ ] Run the check and verify it fails.
- [ ] Implement the selector and connect it to the admin RPC path; leave normal reservations unchanged.
- [ ] Run UI and component checks and verify they pass.

### Task 4: Full verification

**Files:**
- No production changes expected.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npm run check`, `npm run check:ui`, `npm run check:admin`, `npm run check:control-clientes`, `npm run check:confiables`, `npm run check:simulacion`, and `npm run check:components`.
- [ ] Run `git diff --check`.
