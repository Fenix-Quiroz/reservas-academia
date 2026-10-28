# Botón desactivado sin hover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evitar que el botón principal desactivado de `DatosReserva` cambie su fondo al pasar el cursor.

**Architecture:** Mantener el comportamiento actual del formulario y limitar el cambio al selector hover específico de `.main-datos .boton-principal`. Añadir un contrato textual en el chequeo de UI para exigir que el hover excluya `:disabled`.

**Tech Stack:** React, TypeScript, CSS, Node.js, `tsx`, ESLint, Vite.

**Spec:** `docs/superpowers/specs/2026-10-28-boton-desactivado-sin-hover-design.md`

## Global Constraints

- Mantener el hover actual para el botón activo.
- Excluir explícitamente el estado `disabled` de la regla hover.
- No cambiar la lógica de habilitación, el texto, la accesibilidad ni otros botones.
- Preservar los cambios no relacionados ya presentes en el árbol de trabajo.

## Review Focus

- Botón activo: debe seguir cambiando a `--color-gold-300` al hacer hover; la aserción CSS de la regla existente lo cubre.
- Botón desactivado: no debe coincidir con el selector hover; la nueva aserción `:hover:not(:disabled)` lo cubre.
- Otros botones principales: no deben cambiar por este ajuste; el selector permanece limitado a `.main-datos`.
- Chequeos existentes de UI: deben seguir pasando después del cambio; la verificación final ejecuta `npm run check:ui`.

## Files and Responsibilities

- Modify `src/ui.check.ts`: agregar la aserción del selector hover que excluye botones desactivados.
- Modify `src/index.css`: cambiar únicamente el selector hover de `.main-datos .boton-principal`.
- Create `docs/superpowers/specs/2026-10-28-boton-desactivado-sin-hover-design.md`: documentar intención y alcance; ya creado y aprobado.

### Task 1: Add the regression contract

**Files:**
- Modify: `src/ui.check.ts` en el bloque de aserciones de estilos de botones.
- Test: `src/ui.check.ts` mediante `npm run check:ui`.

**Interfaces:**
- Consumes: el contenido de `src/index.css` leído por el chequeo existente.
- Produces: una aserción que exige `.main-datos .boton-principal:hover:not(:disabled)`.

- [ ] **Step 1: Write the failing assertion**

  Añadir una aserción que busque el selector exacto `.main-datos .boton-principal:hover:not(:disabled)` junto a las aserciones CSS relacionadas.

- [ ] **Step 2: Run the UI check to verify it fails**

  Run: `npm run check:ui`

  Expected: FAIL porque `src/index.css` todavía contiene `.main-datos .boton-principal:hover` sin la exclusión `:not(:disabled)`.

### Task 2: Restrict hover to enabled buttons

**Files:**
- Modify: `src/index.css` en la regla `.main-datos .boton-principal:hover`.

**Interfaces:**
- Consumes: la aserción de `src/ui.check.ts` creada en Task 1.
- Produces: el selector `.main-datos .boton-principal:hover:not(:disabled)` con el mismo fondo `var(--color-gold-300)` para botones habilitados.

- [ ] **Step 1: Implement the minimal CSS change**

  Cambiar únicamente el selector hover de `.main-datos .boton-principal` a `.main-datos .boton-principal:hover:not(:disabled)` y conservar intacta la declaración de `background`.

- [ ] **Step 2: Run the UI check to verify it passes**

  Run: `npm run check:ui`

  Expected: PASS.

### Task 3: Run project verification

**Files:**
- Read-only verification of the modified files and project checks.

- [ ] **Step 1: Run lint**

  Run: `npm run lint`

  Expected: exit code 0 with no lint errors.

- [ ] **Step 2: Run typecheck**

  Run: `npm run typecheck`

  Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Run the production build**

  Run: `npm run build`

  Expected: exit code 0 and a successful Vite build.

- [ ] **Step 4: Inspect the final diff**

  Run: `git diff -- src/index.css src/ui.check.ts`

  Expected: only the scoped selector and regression assertion are changed; unrelated existing worktree changes remain untouched.
