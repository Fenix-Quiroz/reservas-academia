# Selección por bloques de media hora Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir que el cliente seleccione un horario continuo en bloques de 30 minutos, con mínimo de 1 hora y máximo de 3 horas.

**Architecture:** Supabase seguirá devolviendo la disponibilidad por RPC, pero la consulta pública aceptará `0.5` horas únicamente para representar cada bloque. El frontend seleccionará bloques contiguos y seguirá enviando una sola reserva con `inicio` y `horas`.

**Tech Stack:** React, TypeScript, Supabase PostgreSQL, comprobaciones estáticas con `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-24-bloques-media-hora-design.md`

## Global Constraints

- Las reservas reales siguen aceptando solo `1`, `1.5`, `2`, `2.5` y `3` horas.
- La selección comienza con un mínimo de 1 hora y no supera 3 horas.
- Los bloques seleccionados deben ser contiguos y estar libres.
- No se modifican tablas ni el formato de los reportes.
- La seguridad del servidor permanece como autoridad final.

## Review Focus

- Una disponibilidad libre de 30 minutos no debe permitir crear una reserva real de 30 minutos; se prueba en SQL y lógica local.
- Una reserva de 1.5 horas debe bloquear sus tres bloques de media hora; se prueba en la lógica de disponibilidad.
- Un bloque ocupado en medio no debe poder incluirse en una selección; se prueba en el selector.
- El primer clic debe seleccionar automáticamente dos bloques; se prueba en el selector.
- La selección debe poder ampliarse hasta 3 horas y no más; se prueba en la lógica del componente.

### Task 1: Contrato de bloques y lógica de disponibilidad

**Files:**
- Modify: `src/reservas.ts`
- Test: `src/reservas.check.ts`

**Interfaces:**
- Produce `DURACION_BLOQUE = 0.5`.
- Produce `rangoLibre(lista, inicio, horas)` para comprobar bloques contiguos.
- Conserva `esDuracionValida` para reservas reales y permite `0.5` solo a `horarios` mediante una validación separada.

- [ ] Escribir pruebas RED para aceptar consultas de 0.5, comprobar rangos contiguos y rechazar una selección que cruza un bloque ocupado.
- [ ] Ejecutar `npm run check` y confirmar que falla por las nuevas expectativas.
- [ ] Implementar la constante y los helpers mínimos en `src/reservas.ts`.
- [ ] Ejecutar `npm run check` y confirmar que pasa.

### Task 2: RPC pública de disponibilidad por media hora

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `supabase/fix-horarios-academia.sql`
- Modify: `supabase/fix-horarios-media-hora.sql`
- Modify: `src/supabase.check.ts`

**Interfaces:**
- Consumes `p_horas = 0.5` for `obtener_horarios_publicos`.
- Produces the same RPC signature and grants; `crear_reserva_publica` remains restricted to real durations.

- [ ] Añadir pruebas RED que distingan la validación de lectura `0.5` de la validación de creación.
- [ ] Ejecutar `npm run check:supabase` y confirmar que falla.
- [ ] Cambiar la validación de la RPC de lectura a `(0.5, 1, 1.5, 2, 2.5, 3)` en los cuatro scripts aplicables.
- [ ] Ejecutar `npm run check:supabase` y confirmar que pasa.

### Task 3: Selector visual y flujo de reserva

**Files:**
- Modify: `src/components/cliente/SelectorHorario.tsx`
- Modify: `src/App.tsx`
- Modify: `src/supabaseData.ts`
- Modify: `src/index.css`
- Modify: `src/ui.check.ts`
- Modify: `src/reservas.check.ts`

**Interfaces:**
- Consumes the 0.5-hour availability list from Task 1 and Task 2.
- Produces a single final reservation with the selected start and total duration.

- [ ] Añadir pruebas RED para eliminar la etapa separada de duración, mostrar precio de media hora y seleccionar por bloques.
- [ ] Ejecutar `npm run check:ui` y confirmar que falla.
- [ ] Implementar el flujo día → turno → bloques, manteniendo la confirmación existente.
- [ ] Ejecutar `npm run check:ui` y el conjunto de pruebas de reservas.

### Task 4: Verificación final

- [ ] Ejecutar typecheck, lint, todas las comprobaciones, build y `git diff --check`.
- [ ] Revisar que el SQL que el usuario ejecutará sea el `fix-horarios-media-hora.sql` actualizado.
