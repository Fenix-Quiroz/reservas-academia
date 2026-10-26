# Plazo de revisión del comprobante Yape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar el plazo del intento de adelanto Yape a 30 minutos para que cubra la revisión administrativa sin una ventana independiente de 15 minutos.

**Architecture:** Se reutiliza `reservas.pago_expira_at`, que ya alimenta la limpieza de reservas pendientes. La Edge Function mantiene la reserva operativa `activo`, deja el pago `pendiente` y calcula el plazo al iniciar el envío final; no se agregan columnas ni acceso de `service_role` al frontend.

**Tech Stack:** React 19, TypeScript, Vite, Supabase Edge Functions (Deno), PostgreSQL/RLS.

**Spec:** `docs/superpowers/specs/2026-10-25-revision-pago-30-minutos-design.md`

## Global Constraints

- El plazo es de exactamente 30 minutos.
- El comprobante sigue pendiente hasta una futura revisión administrativa.
- La reserva conserva el estado operativo `activo` mientras el pago está pendiente.
- `SUPABASE_SERVICE_ROLE_KEY` solo puede aparecer en la Edge Function.
- El bucket `comprobantes-pago` sigue privado y acepta JPG, PNG y WEBP hasta 5 MB.

## Review Focus

- Un reintento idempotente no debe crear otro pago ni otro comprobante.
- Un pago ya confirmado debe seguir rechazando nuevos envíos.
- Una reserva vencida debe seguir liberándose por la función SQL existente.
- El frontend no debe mencionar 15 minutos ni contener `service_role`.

### Task 1: Actualizar el contrato comprobable

**Files:**
- Modify: `src/pagos.check.ts`
- Modify: `src/supabase.check.ts`

- [x] **Step 1: Escribir las aserciones que exigen 30 minutos y el mensaje actualizado.**
- [x] **Step 2: Ejecutar `npm run check:pago` y `npm run check:supabase`; fallaron inicialmente por la constante/documentación actuales.**

### Task 2: Aplicar el plazo único de 30 minutos

**Files:**
- Modify: `supabase/functions/registrar-adelanto-yape/index.ts`
- Modify: `src/components/cliente/DatosReserva.tsx`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-10-24-adelanto-yape-design.md`

- [x] **Step 1: Cambiar la constante de expiración a 30 minutos y conservar el cálculo en el intento final.**
- [x] **Step 2: Cambiar el mensaje visible de expiración a 30 minutos.**
- [x] **Step 3: Actualizar documentación y nomenclatura para hablar del plazo de revisión.**
- [x] **Step 4: Ejecutar las comprobaciones específicas y confirmar que pasan.**

### Task 3: Verificación completa

- [x] **Step 1: Ejecutar `npm run typecheck`, `npm run lint`, todos los scripts `check:*`, `npm run build` y `git diff --check`.**
- [x] **Step 2: Revisar el diff para confirmar que no hubo cambios fuera del alcance.**
