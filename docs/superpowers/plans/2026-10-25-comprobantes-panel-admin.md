# Comprobantes de pago en el panel administrativo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar el comprobante en la tarjeta de reserva con Ver, Descargar y Confirmar comprobante, usando Storage privado y una confirmación administrativa atómica.

**Architecture:** El panel consulta los comprobantes con la sesión autenticada y genera URLs firmadas bajo las políticas RLS existentes. Una RPC `confirmar_pago_admin` será la única operación de confirmación y actualizará `pagos_reserva` y `reservas` dentro de la misma transacción.

**Tech Stack:** React 19, TypeScript, Supabase JS, PostgreSQL/RLS, Supabase Storage.

**Spec:** `docs/superpowers/specs/2026-10-25-comprobantes-panel-admin-design.md`

## Global Constraints

- `service_role` solo puede existir en funciones servidor; nunca en `src/` ni `.env.example`.
- El bucket `comprobantes-pago` permanece privado.
- Solo `app_metadata.role = 'admin'` puede leer y confirmar comprobantes.
- Confirmar comprobante no cambia `reservas.estado` de `activo`.
- Las acciones de ver, descargar y confirmar deben bloquear pulsaciones repetidas.

## Review Focus

- Reserva sin comprobante: no mostrar botones que fallarían.
- URL firmada que falla: mostrar error y mantener la tarjeta utilizable.
- Confirmación repetida: no duplicar ni degradar el estado.
- Pago rechazado/anulado o reserva cancelada: rechazar la confirmación en servidor.
- Admin sin sesión o sin rol: RLS/RPC deben impedir acceso.

### Task 1: Contratos, tipos y comprobaciones

**Files:**
- Modify: `src/types.ts`
- Modify: `src/supabaseData.ts`
- Modify: `src/admin.check.ts`
- Create: `src/pagosAdmin.check.ts`

- [x] **Step 1: Escribir las comprobaciones que exigen la relación del comprobante, las URLs firmadas, la RPC y la ausencia de `service_role` en frontend.**
- [x] **Step 2: Ejecutar los checks nuevos y existentes para observar el fallo esperado.**

### Task 2: Confirmación administrativa en PostgreSQL

**Files:**
- Create: `supabase/fix-pagos-admin.sql`
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `src/supabase.check.ts`

- [x] **Step 1: Agregar la aserción SQL de la RPC protegida.**
- [x] **Step 2: Ejecutar el check SQL y verificar que falla antes de la implementación.**
- [x] **Step 3: Implementar `confirmar_pago_admin(uuid)` con validación de rol, comprobante, estados y actualización atómica.**
- [x] **Step 4: Ejecutar el check SQL y confirmar que pasa.**

### Task 3: Cargar comprobantes y conectar acciones

**Files:**
- Modify: `src/supabaseData.ts`
- Modify: `src/AdminApp.tsx`
- Modify: `src/components/admin/AdminListado.tsx`
- Modify: `src/components/admin/AdminReservaCard.tsx`
- Modify: `src/index.css`
- Modify: `src/admin.check.ts`

- [x] **Step 1: Implementar consulta administrativa, URLs firmadas y llamada a la RPC.**
- [x] **Step 2: Pasar el comprobante de la agenda a la tarjeta y agregar botones verticales con estado de carga.**
- [x] **Step 3: Conectar confirmación, refresco y mensajes de error/éxito.**
- [x] **Step 4: Ejecutar checks específicos.**

### Task 4: Aplicar y verificar

- [x] **Step 1: Ejecutar la migración SQL enlazada en Supabase.**
- [x] **Step 2: Ejecutar typecheck, lint, todos los checks, build y `git diff --check`.**
- [x] **Step 3: Revisar que la función RPC figure desplegada y que no haya `service_role` en el frontend.**
