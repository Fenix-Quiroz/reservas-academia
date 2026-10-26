# Horarios de media hora y duración de 2.5 horas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir reservas con inicio cada 30 minutos y agregar la duración de 2.5 horas en cliente, administración y Supabase.

**Architecture:** Se conservará el modelo de horas decimales: `9.5` representa 9:30. La lógica TypeScript generará pasos de 0.5 y las RPC validarán múltiplos de 0.5; una migración SQL cambiará `reservas.inicio` a `numeric(4,1)` y actualizará las firmas necesarias.

**Tech Stack:** React, TypeScript, Supabase PostgreSQL, scripts de verificación con `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-23-horarios-media-hora-design.md`

## Global Constraints

- El polideportivo abre a las 7:00 y cierra a la 1:00 del día siguiente.
- Los inicios permitidos son únicamente múltiplos de 0.5.
- Las duraciones permitidas son `1`, `1.5`, `2`, `2.5` y `3` horas.
- Las reservas existentes deben conservarse.
- Los solapamientos se siguen rechazando en PostgreSQL, no solo en el navegador.

## Review Focus

- Reserva de 9:30–10:30: 10:00 debe estar ocupada y 10:30 debe poder seleccionarse.
- Reserva de 8:00–9:30: 7:30 y 8:30 deben estar ocupadas por solapamiento.
- Duración de 2.5 horas terminando a la 1:00: 22:30–1:00 debe ser válida.
- La hora actual entre dos medias horas no debe mostrar horarios pasados.
- Un inicio como 9:10 o una duración como 2.25 debe rechazarse en cliente y RPC.

### Task 1: Lógica de horarios y pruebas

**Files:**
- Modify: `src/reservas.ts`
- Modify: `src/components/cliente/SelectorHorario.tsx`
- Modify: `src/reservas.check.ts`
- Modify: `src/reservas.scenarios.check.ts`

**Interfaces:**
- `DURACIONES_RESERVA` producirá `[1, 1.5, 2, 2.5, 3]`.
- `horarios()` devolverá inicios en incrementos de `0.5`.

- [ ] Escribir pruebas fallidas para inicios de media hora, 2.5 horas, solapamiento con 9:30 y límite 22:30–1:00.
- [ ] Ejecutar `npm run check` y `npm run check:scenarios` y confirmar que fallan por el comportamiento actual.
- [ ] Implementar el paso de `0.5` y la duración nueva.
- [ ] Mostrar la etiqueta `2 horas y media` en el selector.
- [ ] Ejecutar las pruebas y confirmar que pasan.

### Task 2: Migración y RPC de Supabase

**Files:**
- Create: `supabase/fix-horarios-media-hora.sql`
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `supabase/fix-horarios-academia.sql`
- Modify: `supabase/fix-monto-reservas.sql`
- Modify: `supabase/fix-rate-limit-server.sql`
- Modify: `supabase/fix-pgcrypto.sql`

**Interfaces:**
- `public.reservas.inicio` será `numeric(4,1)`.
- RPC públicas recibirán `p_inicio numeric(4,1)` y devolverán `inicio numeric(4,1)`.
- `obtener_horarios_publicos` generará inicios desde 7 hasta `25 - p_horas` en pasos de 0.5.

- [ ] Añadir una prueba estática que exija `2.5`, pasos de 0.5 y tipos numéricos en los SQL canónicos.
- [ ] Ejecutar la prueba estática y confirmar que falla antes de actualizar los SQL.
- [ ] Crear la migración idempotente que convierta `inicio`, reconstruya la exclusión y reemplace las RPC.
- [ ] Actualizar los SQL canónicos y los scripts de corrección para que no reintroduzcan el modelo entero.
- [ ] Ejecutar la prueba estática y confirmar que pasa.

### Task 3: Verificación completa

**Files:**
- Modify: `src/supabase.check.ts` si sus aserciones reflejan las reglas anteriores.

- [ ] Ejecutar `npm run typecheck`.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar todos los scripts `npm run check*` disponibles.
- [ ] Ejecutar `npm run build`.
- [ ] Revisar el diff y confirmar que no se modificaron datos ni archivos ajenos.
- [ ] Entregar la instrucción exacta para ejecutar `supabase/fix-horarios-media-hora.sql` en Supabase.
