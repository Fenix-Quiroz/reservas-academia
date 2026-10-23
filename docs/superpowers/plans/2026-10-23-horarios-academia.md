# Horarios reales de la academia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar los horarios semanales de entrenamiento, el horario operativo de 7:00 a. m. a 1:00 a. m. y los precios reales de los cuatro campos.

**Architecture:** La configuración local vivirá en JSON y una función pura calculará cruces entre reservas y entrenamientos para mostrar las tarjetas como ocupadas. Supabase tendrá una tabla recurrente protegida por RLS; sus RPC usarán esa tabla silenciosamente para que la UI y la base compartan la misma regla.

**Tech Stack:** TypeScript, React, JSON, PostgreSQL/Supabase, scripts de comprobación con `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-23-horarios-academia-design.md`

## Global Constraints

- Los días usan `0 = domingo` hasta `6 = sábado`.
- El horario operativo es `07:00` hasta `25:00`, donde `25:00` representa la 1:00 a. m. del día siguiente.
- Las reservas siguen aceptando únicamente 1 o 2 horas con inicios enteros.
- Un cruce parcial con un entrenamiento hace que la hora no esté disponible.
- Los precios deben calcularse también en PostgreSQL; el navegador no puede definir el monto.
- La tabla de horarios no queda expuesta para `anon` ni para usuarios autenticados que no sean administradores.

## Review Focus

- Un entrenamiento que termina a `20:25` debe bloquear el inicio `20:00`, no solo los inicios anteriores.
- Un turno de dos horas debe quedar bloqueado si cruza parcialmente el entrenamiento.
- El inicio `24:00` debe mostrarse como medianoche y permitir terminar a la `01:00`.
- Domingo sin entrenamientos debe conservar todos los horarios operativos libres, salvo reservas reales.
- Los precios visibles, el monto del RPC y el balance deben coincidir: 55, 50, 60 y 30.

### Task 1: Modelar horarios y disponibilidad local

**Files:**
- Create: `src/data/horarios-entrenamientos.json`
- Create: `src/horariosEntrenamiento.ts`
- Modify: `src/reservas.ts`
- Test: `src/reservas.check.ts`

**Interfaces:**
- `entrenamientoBloquea(canchaId: number, diaSemana: number, inicio: number, horas: number): boolean`
- `horarios()` genera inicios entre 7 y 24 y marca ocupados los cruces con entrenamientos.

- [ ] **Step 1: Escribir pruebas fallidas** para los horarios semanales, cruces parciales, domingo libre y cierre a la 1:00 a. m.
- [ ] **Step 2: Ejecutar `npm run check`** y confirmar que falla por la configuración o comportamiento faltante.
- [ ] **Step 3: Crear el JSON y la función pura** con los intervalos exactos de la imagen.
- [ ] **Step 4: Actualizar `ABRE`, `CIERRA` y `horarios()`** sin cambiar el contrato de `HorarioDisponible`.
- [ ] **Step 5: Ejecutar `npm run check`** y confirmar que pasa.

### Task 2: Actualizar precios y representación visual

**Files:**
- Modify: `src/data/canchas.json`
- Modify: `src/components/cliente/SelectorHorario.tsx`
- Modify: `src/ui.check.ts`
- Test: `src/reservas.check.ts`

**Interfaces:**
- Los precios públicos quedan en S/55, S/50, S/60 y S/30.
- La última hora visible es `12 a. m. a 1 a. m.`.

- [ ] **Step 1: Añadir comprobaciones fallidas** para precios y grupos que incluyan 7:00 a. m. y medianoche.
- [ ] **Step 2: Ejecutar `npm run check:ui`** y confirmar la falla esperada.
- [ ] **Step 3: Actualizar datos y grupos visuales**; las tarjetas bloqueadas deben conservar el texto `Ocupado`.
- [ ] **Step 4: Ejecutar `npm run check:ui` y `npm run check`**.

### Task 3: Aplicar horarios y precios en Supabase

**Files:**
- Create: `supabase/fix-horarios-academia.sql`
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `supabase/fix-monto-reservas.sql`
- Modify: `supabase/fix-rate-limit-server.sql`
- Modify: `src/supabase.check.ts`

**Interfaces:**
- Tabla `public.horarios_bloqueados` con día, campo, minuto inicial, minuto final, activo y auditoría.
- `obtener_horarios_publicos` consulta entrenamientos y devuelve esos inicios como `libre = false`.
- `crear_reserva_publica` valida apertura, cruces, duración y precio en la base.

- [ ] **Step 1: Añadir aserciones fallidas** para la tabla, horarios exactos, apertura 7–25, precios y revocación de permisos.
- [ ] **Step 2: Ejecutar `npm run check:supabase`** y confirmar la falla por SQL ausente o desactualizado.
- [ ] **Step 3: Implementar la migración idempotente** y actualizar los SQL canónicos/históricos con los mismos precios y reglas.
- [ ] **Step 4: Ejecutar `npm run check:supabase`** y revisar que ninguna tabla o función pública exponga los horarios.

### Task 4: Documentar y verificar el flujo completo

**Files:**
- Modify: `README.md`
- Test: suite existente

- [ ] **Step 1: Documentar que se debe ejecutar `supabase/fix-horarios-academia.sql`** en bases existentes.
- [ ] **Step 2: Ejecutar `npm run check`, `npm run check:ui`, `npm run check:supabase`, `npm run typecheck`, `npm run lint` y `npm run build`**.
- [ ] **Step 3: Ejecutar `git diff --check`** y revisar que no haya errores de formato.
