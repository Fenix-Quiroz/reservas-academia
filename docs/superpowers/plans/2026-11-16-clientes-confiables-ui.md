# Clientes confiables UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rediseñar la sección de clientes confiables del panel administrador con buscador, tarjetas de clientes y botones de reserva alineados al diseño de la web.

**Architecture:** Mantener `AdminControlClientes` como dueño de la interacción y de las acciones existentes. Separar visualmente el bloque de confiables del bloque de bloqueados, añadir filtrado local por nombre/celular y reservar el callback de reserva para el siguiente bloque funcional.

**Tech Stack:** React 19, TypeScript, lucide-react, CSS existente en `src/index.css`, checks ejecutables con `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-16-clientes-confiables-ui-design.md`

## Global Constraints

- Mantener la paleta oscura/dorada existente.
- No cambiar el modelo de datos ni las funciones de Supabase.
- No implementar todavía el flujo de reserva, horario ni pago.
- La búsqueda debe filtrar por nombre o celular.

## Review Focus

- Búsqueda sin coincidencias: mostrar estado vacío sin romper el formulario.
- Cliente con nombre largo o celular largo: evitar desbordes en la tarjeta.
- Vista móvil: apilar controles y conservar acciones utilizables.
- Acción “Quitar”: mantener confirmación visual mediante menú y estado de procesamiento.
- Estado de carga: no mostrar tarjetas incompletas mientras cargan los datos.

### Task 1: Rediseño de clientes confiables

**Files:**
- Modify: `src/components/admin/AdminControlClientes.tsx`
- Modify: `src/index.css`
- Test: `src/components/admin/admin-control-clientes-ui.check.ts`

**Interfaces:**
- Consumes: `NumeroConfiable`, `onQuitarConfiable`, `onAgregarConfiable` existentes.
- Produces: clases `admin-control-confiables`, `admin-confiable-card`, `admin-confiable-reservar` y copy de buscador/botones para la UI.

- [x] **Step 1: Write the failing UI contract test**
- [x] **Step 2: Run the contract test and verify it fails because the new UI is absent**
- [x] **Step 3: Implement the trusted-customer header, search state, filtered cards, and accessible action menu**
- [x] **Step 4: Add responsive dark/gold styles matching the reference image**
- [x] **Step 5: Run the UI contract, typecheck, and relevant regression checks**
- [x] **Step 6: Review the diff; leave the focused change uncommitted for handoff**

## Verification notes

- `npx tsx src/components/admin/admin-control-clientes-ui.check.ts` passes.
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build` passes; Vite reports only the repository's existing large-chunk warning.
- `npm run check:control-clientes`, `npm run check:confiables`, and `npm run check:admin` pass.
- `npm run check:components` passes.
- `npm run check:ui` remains red on the pre-existing `className="oferta"` assertion in `src/ui.check.ts`; the failure is outside this change.

### Follow-up Task: Separate trusted and blocked customers

- [x] Render `admin-clientes-confiables` before `admin-clientes-bloqueados`.
- [x] Add independent navigation entries for “Clientes confiables” and “Clientes bloqueados”.
- [x] Preserve the existing block/unblock forms and trusted-customer actions.
- [x] Verify with the UI contract, typecheck, lint, build, admin, componentization, and trusted-customer checks.
