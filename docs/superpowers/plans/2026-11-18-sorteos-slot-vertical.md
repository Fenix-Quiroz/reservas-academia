# Rediseño de Sorteos con Slot Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `/admin/sorteos` como una página independiente con slot vertical, datos demo aislados y estilos premium coherentes con la marca.

**Architecture:** Extraer la generación de participantes y tickets a `src/sorteoDemo.ts`; mantener el componente como orquestador de estado y presentación; reemplazar la capa visual horizontal mediante clases nuevas y responsive en `src/index.css`.

**Tech Stack:** React 19, TypeScript, Vite, CSS existente, `lucide-react`, checks ejecutados con `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-18-sorteos-slot-vertical-design.md`

## Global Constraints

- La ruta continúa siendo `/admin/sorteos`.
- Esta iteración utiliza datos demo y no modifica el esquema ni las consultas de Supabase.
- La página no debe mostrar navegación lateral del panel general.
- La lógica de tickets no debe quedar duplicada dentro del JSX.

## Review Focus

- El dataset vacío debe dejar el slot deshabilitado y las métricas en cero.
- Un giro repetido debe limpiar el ganador anterior y terminar en un ticket válido.
- El nombre largo del cliente debe truncarse visualmente sin romper el ticket.
- La página debe conservar legibilidad en viewport móvil.
- Las pestañas de probabilidades e historial deben seguir mostrando el dataset demo.

### Task 1: Extraer y probar la lógica demo

**Files:**
- Create: `src/sorteoDemo.ts`
- Create: `src/sorteoDemo.check.ts`
- Modify: `src/components/admin/AdminHistorialClientes.tsx`

**Interfaces:**
- Produce `crearParticipantesDemo(): ParticipanteSorteo[]`.
- Produce `crearTicketsDemo(participantes): TicketSorteo[]`.
- Produce `ventanaSlot(tickets, indice): TicketSorteo[]`.

- [ ] Escribir checks para total de tickets, probabilidades, numeración estable y ventana de tres tickets.
- [ ] Ejecutar el check y verificar que falla antes de implementar.
- [ ] Implementar las funciones y mover el import del JSON fuera de los componentes.
- [ ] Ejecutar el check y verificar que pasa.

### Task 2: Rediseñar `AdminSorteosVista`

**Files:**
- Modify: `src/components/admin/AdminSorteosVista.tsx`

**Interfaces:**
- Consume las funciones de `src/sorteoDemo.ts`.
- Conserva `AdminSorteosVistaProps` y la navegación `onVolver`.

- [ ] Escribir un check de estructura que exija slot vertical, ausencia de navegación lateral y estado demo.
- [ ] Ejecutar el check y verificar que falla.
- [ ] Reemplazar la tira horizontal por la composición de slot vertical, campaña, transparencia, controles y ganador.
- [ ] Mantener copiar tickets, sonido, historial y tabla de probabilidades.
- [ ] Ejecutar checks UI y typecheck.

### Task 3: Aplicar el sistema visual responsive

**Files:**
- Modify: `src/index.css`

- [ ] Añadir estilos para página independiente, slot vertical, ticket ganador, métricas y paneles.
- [ ] Añadir responsive para `900px`, `680px` y preferencia de movimiento reducido.
- [ ] Ejecutar build y lint.

### Task 4: Verificación final

- [ ] Ejecutar `npm run typecheck`.
- [ ] Ejecutar `npm run build`.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm run check:ui` y `npx tsx src/sorteoDemo.check.ts`.
