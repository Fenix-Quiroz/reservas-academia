# Confirmar comprobantes sin vencimiento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mantener disponible la confirmación de comprobantes pendientes después del final del turno, sin límite de dos horas.

**Architecture:** La tarjeta admin decidirá la visibilidad solo por el estado de la reserva y del comprobante. La RPC `confirmar_pago_admin` aplicará exactamente la misma regla en Supabase para que la interfaz y el servidor no diverjan.

**Tech Stack:** React + TypeScript, Supabase PostgreSQL/PLpgSQL, checks Node existentes.

**Spec:** `docs/superpowers/specs/2026-11-24-confirmar-comprobante-sin-vencimiento-design.md`

## Global Constraints

- El botón se muestra únicamente para comprobantes `pendiente` y reservas `activo`, `iniciado` o `finalizado`.
- Reservas `cancelado` o `no_asistio` no se pueden confirmar.
- No se cambia la expiración de reservas pendientes ni la visibilidad de “Mis reservas”.
- No se agrega ninguna dependencia.

## Review Focus

- Un comprobante pendiente de una reserva finalizada debe seguir mostrando el botón después de dos horas.
- Un comprobante confirmado no debe mostrar el botón.
- Una reserva cancelada o marcada como inasistencia no debe poder confirmarse aunque tenga comprobante pendiente.
- La RPC debe aceptar reservas finalizadas sin consultar una fecha límite.

---

### Task 1: Regla de confirmación en tarjeta admin

**Files:**
- Modify: `src/components/admin/AdminReservaCard.tsx`
- Test: `src/admin.check.ts`

**Interfaces:**
- Produce: `puedeConfirmarComprobante(reserva, ahora)` seguirá devolviendo `boolean`; el segundo parámetro se conserva por compatibilidad aunque la fecha ya no sea necesaria.

- [ ] **Step 1: Write the failing test**

Agregar una reserva `finalizado` cuyo turno terminó hace más de dos horas y comprobar que `puedeConfirmarComprobante` devuelva `true`; agregar también comprobaciones de `cancelado` y `no_asistio` que devuelvan `false`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run check:admin`
Expected: FAIL en la comprobación de la reserva finalizada fuera de plazo.

- [ ] **Step 3: Implement the minimal rule**

Cambiar `puedeConfirmarComprobante` para aceptar únicamente `activo`, `iniciado` y `finalizado`, eliminando el cálculo y comparación del límite temporal.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run check:admin`
Expected: PASS.

### Task 2: Regla de confirmación en Supabase

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `supabase/fix-confirmar-comprobante-2-horas.sql`
- Test: `src/pagosAdmin.check.ts`

**Interfaces:**
- Consumes: `public.confirmar_pago_admin(uuid)`.
- Produces: La RPC conserva su firma y actualiza `pagos_reserva.estado`, `reservas.pago_estado` y `pago_expira_at` como antes, sin validar una ventana temporal.

- [ ] **Step 1: Write the failing test**

Actualizar el check para exigir que la definición de la RPC no contenga `confirmacion_fuera_de_plazo` ni `interval '2 hours'`, y que mantenga los estados permitidos `activo`, `iniciado`, `finalizado`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run check:pagos-admin`
Expected: FAIL porque las definiciones actuales todavía contienen el límite de dos horas.

- [ ] **Step 3: Implement the minimal SQL change**

Eliminar de las tres definiciones de `confirmar_pago_admin` la variable y la validación de fecha límite; conservar autorización admin, comprobante existente, estados permitidos y actualizaciones transaccionales.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run check:pagos-admin`
Expected: PASS.

### Task 3: Verificación completa

- [ ] **Step 1: Run focused checks**

Run: `npm run check:admin; npm run check:pagos-admin`
Expected: ambos checks pasan.

- [ ] **Step 2: Run typecheck, lint and build**

Run: `npm run typecheck; npm run lint; npm run build`
Expected: salida exitosa; solo se acepta el warning de tamaño de chunks ya existente.

- [ ] **Step 3: Review diff and status**

Run: `git diff -- src/components/admin/AdminReservaCard.tsx src/admin.check.ts src/pagosAdmin.check.ts supabase/schema.sql supabase/permissions.sql supabase/fix-confirmar-comprobante-2-horas.sql; git status --short`
Expected: solo el cambio de confirmación y los documentos locales no se incluyen en el commit salvo que sean solicitados.
