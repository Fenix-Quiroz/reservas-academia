# Navegación móvil del panel administrador Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hacer más evidente y usable la navegación horizontal del administrador en mobile sin alterar escritorio.

**Architecture:** `AdminNavegacion` mantendrá un `ref` al contenedor horizontal, calculará si existe contenido fuera de vista y centrará el enlace activo cuando cambie. CSS mobile agregará el indicador visual y conservará el scroll táctil sin scrollbar visible.

**Tech Stack:** React 19, TypeScript, CSS existente, checks contractuales con `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-16-admin-mobile-navigation-design.md`

## Global Constraints

- No agregar dependencias.
- No cambiar la estructura ni el comportamiento de las secciones del administrador.
- No mostrar scrollbar en mobile.
- No generar overflow horizontal en el documento.

## Review Focus

- El contenido no desborda la ventana al cambiar de sección.
- El indicador se actualiza al deslizar la fila.
- El enlace activo se mantiene visible después de un scroll de página.
- El layout vertical de escritorio permanece sin cambios.

### Task 1: Navegación horizontal accesible y visible

**Files:**
- Modify: `src/components/admin/AdminNavegacion.tsx`
- Modify: `src/index.css`
- Test: `src/components/admin/admin-control-clientes-ui.check.ts`

- [ ] Escribir assertions contractuales para el ref, auto-visibilidad, estado de desbordamiento e indicador mobile.
- [ ] Ejecutar `npx tsx src/components/admin/admin-control-clientes-ui.check.ts` y observar el fallo por la implementación ausente.
- [ ] Implementar el ref, cálculo de overflow, auto-scroll del activo y clases/atributos del indicador.
- [ ] Añadir estilos mobile para la pista dorada sin afectar desktop.
- [ ] Ejecutar el check y la suite de verificación del proyecto.
