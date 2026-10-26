# Clientes confiables sin adelanto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir reservas nuevas sin adelanto únicamente para celulares confiables activos, manteniendo Yape obligatorio para los demás.

**Architecture:** La base de datos será la autoridad mediante una RPC booleana de preconsulta y una RPC de creación con `p_sin_adelanto`. La UI conservará un solo paso de datos y cambiará de variante después de consultar el celular; una consulta fallida siempre cae al flujo normal. Las reservas normales iniciarán su estado de pago pendiente con expiración de 30 minutos en el servidor.

**Tech Stack:** React 19, TypeScript, Supabase RPC/PostgreSQL, Supabase Edge Functions, comprobaciones TypeScript existentes.

**Spec:** `docs/superpowers/specs/2026-10-26-clientes-confiables-adelanto-design.md`

## Global Constraints

- Solo números confiables activos pueden usar `p_sin_adelanto = true`.
- Los números bloqueados mantienen prioridad sobre el beneficio.
- La UI no lee `numeros_confiables` y nunca usa `service_role`.
- Los estados válidos siguen siendo `no_requerido`, `pendiente`, `confirmado` y `rechazado`.
- La ruta normal requiere JPG, PNG o WEBP de máximo 5 MB.

## Review Focus

- Carrera de desactivación: el servidor debe rechazar la reserva sin adelanto si el número dejó de ser confiable.
- Falla de preconsulta: la UI debe volver al flujo Yape, no conceder el beneficio.
- Número bloqueado y confiable: debe rechazar la reserva antes de insertar.
- Reserva normal sin comprobante: no debe quedar como `no_requerido`; debe iniciar pendiente con expiración.
- Reserva confiable en panel y confirmación: no debe mostrar acciones de comprobante inexistentes.

### Task 1: Contrato SQL y comprobaciones de regresión

**Files:**
- Create: `supabase/fix-clientes-confiables-adelanto.sql`
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `README.md`
- Test: `src/clientesConfiablesAdelanto.check.ts`
- Modify: `package.json`

**Interfaces:**
- Produce `public.es_numero_confiable_publico(text) returns boolean`.
- Produce `public.crear_reserva_publica(integer,date,numeric,numeric,text,text,boolean)` returning the reservation row plus `pago_estado` and `token`.

- [ ] **Step 1: Write the failing static checks** for the new migration, grants, explicit payment values, blocked-number precedence, and the new RPC arguments.
- [ ] **Step 2: Run `npm run check:confiables`** and confirm it fails because the migration and interfaces do not exist.
- [ ] **Step 3: Implement the migration** with hardened `search_path`, normalized phone validation, no public table grants, server-side trusted recheck, explicit payment state/amount/expiry, and revocation of the old six-argument RPC.
- [ ] **Step 4: Update the canonical schema and permissions snapshots** so fresh setup and the documented migration path expose the same seven-argument contract.
- [ ] **Step 5: Document the migration order** after the current customer-control and payment migrations.
- [ ] **Step 6: Run `npm run check:confiables`** and verify the SQL contract checks pass.

### Task 2: Remote data contract and Edge Function guard

**Files:**
- Modify: `src/supabaseData.ts`
- Modify: `src/App.tsx`
- Modify: `src/almacen.ts`
- Modify: `supabase/functions/registrar-adelanto-yape/index.ts`
- Test: `src/clientesConfiablesAdelanto.check.ts`

**Interfaces:**
- `verificarNumeroConfiableRemoto(celular: string): Promise<boolean>` returns `false` on invalid input or query failure.
- `crearReservaPublicaRemota(reserva: ReservaNueva, sinAdelanto?: boolean): Promise<ResultadoReserva>` sends `p_sin_adelanto` and parses `pago_estado`.
- `DatosReservaActions.checkTrustedNumber(celular: string): Promise<boolean>` is the UI-facing preflight.

- [ ] **Step 1: Extend the checks** to require the boolean RPC call, `p_sin_adelanto`, and rejection of uploads for `no_requerido`.
- [ ] **Step 2: Run the checks** and confirm failure.
- [ ] **Step 3: Implement the remote preflight and seven-argument reservation call**, mapping `numero_no_confiable` to a dedicated client error and keeping failure fail-safe.
- [ ] **Step 4: Add the Edge Function guard** so trusted reservations cannot be changed into payment-pending reservations by a direct request.
- [ ] **Step 5: Add local-demo parity** by looking up active trusted numbers from local storage and passing the bypass flag through the local reservation path.
- [ ] **Step 6: Run the focused checks and `npm run typecheck`**.

### Task 3: Conditional client reservation screen

**Files:**
- Modify: `src/components/cliente/DatosReserva.tsx`
- Modify: `src/components/cliente/ReservaCompletada.tsx`
- Modify: `src/index.css`
- Test: `src/clientesConfiablesAdelanto.check.ts`

**Interfaces:**
- `reserve(cliente, hora, sinAdelanto)` is the action used by both screen variants.
- Trusted variant renders the copy “Reserva sin adelanto” and button “Confirmar reserva”.
- Normal variant keeps `PagoAdelanto` and “Asegurar reserva”.

- [ ] **Step 1: Add failing checks** for the conditional rendering, loading/disabled state while checking, the trusted success message, and normal upload requirements.
- [ ] **Step 2: Run the focused checks** and confirm failure.
- [ ] **Step 3: Add phone preflight state** that only queries once the phone is valid, clears trusted state on input changes, and treats errors as normal Yape flow.
- [ ] **Step 4: Branch reservation submission** so trusted reservations skip file validation and `submitPayment`, while normal reservations preserve the existing upload flow.
- [ ] **Step 5: Handle the server race error** with a clear message requiring the comprobante instead of falsely confirming.
- [ ] **Step 6: Update completion copy** to “Reserva confirmada. No requiere adelanto.” for `no_requerido` and preserve the existing pending-review message otherwise.
- [ ] **Step 7: Add compact responsive styles** for the trusted notice and verify the existing Yape layout remains unchanged.
- [ ] **Step 8: Run focused checks, `npm run typecheck`, and `npm run build`**.

### Task 4: Administrative visibility

**Files:**
- Modify: `src/components/admin/AdminReservaCard.tsx`
- Modify: `src/index.css`
- Modify: `src/pagosAdmin.check.ts`

**Interfaces:**
- A non-demo reservation with `pagoEstado === 'no_requerido'` shows “Sin adelanto”.
- It does not render `Ver`, `Descargar` or `Confirmar comprobante` when no comprobante exists.

- [ ] **Step 1: Add a failing admin check** for the “Sin adelanto” label and absence of payment actions.
- [ ] **Step 2: Run the check** and confirm failure.
- [ ] **Step 3: Implement the badge in the payment/status rail** without changing status transitions or cancellation behavior.
- [ ] **Step 4: Style the badge for desktop and mobile** using existing status tokens.
- [ ] **Step 5: Run the admin check, `npm run lint`, and `npm run build`**.

### Task 5: Full verification

**Files:**
- No new production files.

- [ ] **Step 1: Run all existing `npm run check:*` scripts** and record any pre-existing failures separately.
- [ ] **Step 2: Run `npm run lint`, `npm run typecheck`, and `npm run build`**.
- [ ] **Step 3: Review the final diff** for accidental `service_role` exposure, stale six-argument grants, and unintended changes to blocked numbers or event schedules.
- [ ] **Step 4: Report the exact SQL migration to execute and the local test cases for one trusted and one normal number.**
