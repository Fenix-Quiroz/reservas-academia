# Actualización en tiempo real de horarios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Actualizar automáticamente la disponibilidad pública cuando cambien los horarios de academia.

**Architecture:** PostgreSQL emitirá un Broadcast público mínimo mediante un trigger `FOR EACH STATEMENT` sobre `horarios_bloqueados`. La aplicación reutilizará el canal Realtime existente; la vista pública escuchará el evento con `supabasePublic` y volverá a consultar el RPC público.

**Tech Stack:** React, TypeScript, `@supabase/supabase-js`, PostgreSQL/Supabase Realtime, checks ejecutados con `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-22-horarios-realtime-design.md`

## Global Constraints

- No cambiar la validación server-side de reservas.
- No conceder acceso público a `public.horarios_bloqueados`.
- El payload Realtime solo debe indicar que hubo un cambio.
- El guardado de muchos bloques debe emitir como máximo una señal por sentencia SQL.

## Review Focus

- Cliente público sin sesión: debe recibir la señal sin leer la tabla administrativa.
- Cliente administrador autenticado: debe conservar sus suscripciones actuales.
- Guardado con varios bloques: debe usar trigger a nivel de sentencia y no uno por fila.
- Canal Realtime desconectado: la reserva debe seguir validándose server-side.
- Limpieza al desmontar: debe cancelar el temporizador y desuscribirse del canal.

### Task 1: Suscripción pública y señal de horarios

**Files:**
- Create: `src/realtimeHorarios.check.ts`
- Modify: `src/supabaseData.ts`
- Modify: `src/App.tsx`
- Modify: `src/supabase.ts` (solo si la firma o cliente lo requiere)

**Interfaces:**
- `suscribirseAReservas(alCambiar: () => void, cliente?: SupabaseClient): () => void`
- El canal existente escucha el evento Broadcast `horarios_actualizados`.
- `App.tsx` pasa `supabasePublic` a la suscripción pública.

- [ ] **Step 1: Write the failing test**

  Crear checks que exijan el evento Broadcast, el uso de `supabasePublic` en `App.tsx` y la ausencia de una suscripción pública directa a `horarios_bloqueados`.

- [ ] **Step 2: Run test to verify it fails**

  Run: `npm run check:realtime-horarios`

  Expected: FAIL porque todavía no existe la escucha Broadcast ni se pasa el cliente público.

- [ ] **Step 3: Implement the minimal client change**

  Permitir inyectar el cliente Supabase en `suscribirseAReservas`, añadir el listener Broadcast con el mismo debounce de 150 ms y conectar `App.tsx` usando `supabasePublic`.

- [ ] **Step 4: Run test to verify it passes**

  Run: `npm run check:realtime-horarios`

  Expected: PASS.

### Task 2: Trigger seguro en Supabase

**Files:**
- Create: `supabase/fix-realtime-horarios-publicos.sql`
- Modify: `src/realtimeHorarios.check.ts`

**Interfaces:**
- Función `public.notificar_horarios_publicos()` sin datos de filas.
- Trigger `notificar_horarios_publicos_trigger` sobre `public.horarios_bloqueados`, `AFTER INSERT OR UPDATE OR DELETE FOR EACH STATEMENT`.
- Broadcast público en el canal `reservas-en-tiempo-real`, evento `horarios_actualizados`.

- [ ] **Step 1: Extend the failing test**

  Exigir `realtime.send`, payload mínimo, canal/evento correctos, `false` para canal público y trigger `FOR EACH STATEMENT`.

- [ ] **Step 2: Run test to verify it fails**

  Run: `npm run check:realtime-horarios`

  Expected: FAIL porque la migración aún no existe.

- [ ] **Step 3: Implement the migration**

  Crear la función `SECURITY DEFINER`, emitir solo `{ tipo: 'horarios_actualizados' }` y crear el trigger idempotente. No tocar permisos de lectura de `horarios_bloqueados`.

- [ ] **Step 4: Run test to verify it passes**

  Run: `npm run check:realtime-horarios`

  Expected: PASS.

### Task 3: Verificación completa

**Files:**
- No additional files.

- [ ] **Step 1: Run focused checks**

  Run: `npm run check:realtime-horarios` and `npm run typecheck`

- [ ] **Step 2: Run project checks**

  Run: `npm run lint` and `npm run build`

- [ ] **Step 3: Inspect the diff**

  Confirmar que no se conceden permisos públicos sobre `horarios_bloqueados` y que no se modificó la lógica de confirmación de reservas.

