# Estados persistidos de reservas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir el ciclo de vida de cada reserva con `estado`, conservar las canceladas y preparar las reservas `finalizado` para el balance mensual.

**Architecture:** El tipo `Reserva` tendrá un `EstadoReserva` explícito. La capa de almacenamiento local y Supabase normalizará filas antiguas sin estado como `activo`, y cancelar actualizará la fila en lugar de eliminarla. La disponibilidad y las listas activas ignorarán únicamente reservas `cancelado`; las transiciones de inicio y finalización quedarán disponibles desde el panel administrativo.

**Tech Stack:** TypeScript, React, Supabase Postgres, comprobaciones Node.js existentes, ESLint y Vite.

**Spec:** `docs/superpowers/specs/2026-10-22-estado-reserva-design.md`

## Global Constraints

- El dominio seguirá usando nombres en español: `estado`, `EstadoReserva`, `cancelado`, `finalizado`.
- Los valores válidos serán exactamente `activo`, `iniciado`, `finalizado` y `cancelado`.
- Cancelar conservará la fila y no contará como horario ocupado ni como reserva activa.
- `finalizado` será una confirmación administrativa posterior al turno y al pago; la alarma no lo asignará automáticamente.
- El adelanto y `estadoPago` quedan fuera de esta parte.
- No hacer commit hasta que el usuario lo solicite.

## Review Focus

- Filas antiguas de Supabase sin `estado` deben seguir funcionando como `activo`.
- Cancelar no debe borrar la fila y debe liberar el horario.
- Una reserva `finalizado` debe conservarse como histórico y no poder cancelarse.
- Las reservas nuevas deben crearse como `activo`.
- Demo local y Supabase deben exponer la misma forma de `Reserva`.

---

### Task 1: Tipos y normalización del dominio

**Files:**
- Modify: `src/types.ts`
- Modify: `src/types.check.ts`
- Modify: `src/almacen.ts`
- Modify: `src/almacen.typecheck.ts`
- Modify: `src/supabaseData.ts`
- Modify: `src/supabaseData.typecheck.ts`
- Test: `src/estadoReserva.check.ts`

**Interfaces:**
- Produce `EstadoReserva = 'activo' | 'iniciado' | 'finalizado' | 'cancelado'`.
- Produce `Reserva.estado: EstadoReserva`.
- Produce una normalización que convierta una fila antigua sin estado en `activo`.
- `ReservaNueva` no permitirá que el cliente elija el estado; las reservas nuevas iniciarán en `activo`.

- [ ] **Step 1: Escribir la prueba fallida** para normalizar una reserva sin estado a `activo`, preservar estados válidos y rechazar estados desconocidos.
- [ ] **Step 2: Ejecutar `npx tsx src/estadoReserva.check.ts`** y confirmar que falla por la API ausente.
- [ ] **Step 3: Implementar los tipos y la normalización** en `types.ts`, `almacen.ts` y `supabaseData.ts`; actualizar fixtures y typechecks.
- [ ] **Step 4: Ejecutar la prueba** y confirmar que pasa.

### Task 2: Migración SQL y cancelación persistente

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `src/supabaseData.ts`
- Modify: `src/almacen.ts`
- Test: `src/reservas.scenarios.check.ts`

**Interfaces:**
- La tabla `reservas` tendrá `estado text not null default 'activo'` con `check` de los cuatro valores.
- `cancelarReservaRemota` y `cancelarReserva` actualizarán `estado = 'cancelado'` y devolverán la misma reserva fuera de las capas internas existentes.
- La política de actualización permitirá la cancelación lógica; no se usará `delete` para reservas.

- [ ] **Step 1: Escribir pruebas fallidas** que comprueben que cancelar conserva la reserva y la marca como `cancelado`.
- [ ] **Step 2: Ejecutar los escenarios** y confirmar que fallan porque actualmente se elimina la reserva.
- [ ] **Step 3: Implementar la migración y la cancelación lógica** en local y Supabase.
- [ ] **Step 4: Ejecutar escenarios y typechecks** y confirmar que pasan.

### Task 3: Disponibilidad y listas sin reservas canceladas

**Files:**
- Modify: `src/reservas.ts`
- Modify: `src/admin.ts`
- Modify: `src/components/cliente/MisReservas.tsx`
- Modify: `src/components/admin/AdminListado.tsx`
- Test: `src/reservas.check.ts`
- Test: `src/admin.check.ts`

**Interfaces:**
- Las funciones que calculan horarios ocupados ignorarán `estado === 'cancelado'`.
- Las listas de reservas activas y “Mis reservas” no mostrarán canceladas por defecto.
- Las reservas `finalizado` permanecerán disponibles para el histórico administrativo.

- [ ] **Step 1: Agregar pruebas fallidas** para que una reserva cancelada no bloquee un horario y no aparezca en listas activas.
- [ ] **Step 2: Ejecutar `npm run check` y `npm run check:admin`** y confirmar el fallo esperado.
- [ ] **Step 3: Implementar los filtros de estado** sin cambiar la regla de solapamiento de reservas.
- [ ] **Step 4: Ejecutar los checks y confirmar que pasan.**

### Task 4: Transiciones administrativas

**Files:**
- Modify: `src/AdminApp.tsx`
- Modify: `src/components/admin/AdminReservaCard.tsx`
- Modify: `src/components/admin/AdminListado.tsx`
- Modify: `src/almacen.ts`
- Modify: `src/supabaseData.ts`
- Modify: `src/index.css`
- Test: `src/admin.check.ts`
- Test: `src/ui.check.ts`

**Interfaces:**
- El panel podrá cambiar `activo -> iniciado` y `iniciado -> finalizado`.
- El panel no podrá cambiar una reserva `cancelado` o `finalizado` a otro estado desde la interfaz normal.
- La acción `finalizado` quedará asociada a la confirmación administrativa del pago.

- [ ] **Step 1: Escribir pruebas fallidas** para las transiciones válidas y para impedir transiciones desde estados terminales.
- [ ] **Step 2: Ejecutar los checks y confirmar el fallo esperado.**
- [ ] **Step 3: Implementar la acción remota/local y los controles del panel.
- [ ] **Step 4: Ejecutar checks de administración y UI y confirmar que pasan.

### Task 5: Verificación completa

**Files:**
- No additional files.

- [ ] **Step 1: Ejecutar `npm run check`, `npm run check:ui`, `npm run check:components`, `npm run check:scenarios`, `npm run check:admin`, `npm run check:supabase`, `npm run typecheck`, `npm run lint` y `npm run build`.
- [ ] **Step 2: Ejecutar `git diff --check` y revisar que no haya cambios accidentales.
- [ ] **Step 3: Informar resultados sin hacer commit.
