# Ajuste visual de horarios de academia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Limpiar la vista de horarios de academia ocultando el estado técnico de Supabase y redondeando el botón «Guardar cambios».

**Architecture:** El componente conservará la lógica actual y solo dejará de renderizar el aviso técnico en su estado normal. El CSS reutilizará el radio tipo píldora ya usado por los controles primarios del panel.

**Tech Stack:** React, TypeScript, CSS existente y checks estáticos con `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-22-admin-horarios-ui-design.md`

## Global Constraints

- No modificar lógica de Supabase, reservas, horarios ni datos.
- Conservar mensajes de carga y error.
- Mantener el botón deshabilitado cuando no haya cambios pendientes.

## Review Focus

- La vista normal no debe mostrar «Conectado a Supabase».
- Un error de lectura todavía debe mostrar un aviso y permitir reintentar.
- El botón de guardado debe conservar su estado deshabilitado y su comportamiento.
- El estilo redondeado debe aplicarse también al estado deshabilitado.

---

### Task 1: Limpiar la presentación del panel de horarios

**Files:**
- Modify: `src/components/admin/AdminHorarios.tsx`
- Modify: `src/index.css`
- Modify: `src/ui.check.ts`

**Interfaces:**
- Consumes: el render y las clases existentes de `AdminHorarios`.
- Produces: la misma funcionalidad, con una presentación limpia en producción.

- [x] **Step 1: Escribir el check de regresión visual**

Añadir a `src/ui.check.ts` una aserción que confirme que `AdminHorarios.tsx` no contiene el texto «Conectado a Supabase».

- [x] **Step 2: Ejecutar el check para confirmar el fallo**

Run: `npm run check:ui`

Expected: falla porque el aviso todavía existe.

- [x] **Step 3: Aplicar el cambio mínimo**

Eliminar el bloque de estado normal del componente, conservar el bloque de carga/error y añadir `border-radius: 999px` a `.admin-horarios-guardar-boton` sin alterar su lógica ni sus colores.

- [x] **Step 4: Ejecutar las verificaciones**

Run: `npm run check:ui && npm run typecheck && npm run lint && npm run build && git diff --check`

Expected: todos pasan; el build puede conservar únicamente el aviso existente de chunks grandes.
