# Integración segura de horarios con Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar el guardado real de horarios semanales mediante una RPC segura, sin ejecutar cambios contra producción.

**Architecture:** La UI actual seguirá usando el repositorio demo hasta completar esta fase. La base de datos recibirá una migración con una única RPC para guardar la configuración semanal completa de forma atómica; una tarea posterior añadirá el adaptador de lectura y otra conectará el guardado después de probarlo en un entorno separado.

**Tech Stack:** PostgreSQL/Supabase RPC, SQL, comprobaciones `tsx`, TypeScript existente.

**Spec:** `docs/superpowers/specs/2026-11-21-horarios-supabase-design.md`

## Global Constraints

- No ejecutar SQL en el proyecto Supabase de producción durante este plan.
- No modificar reservas, eventos especiales ni funciones públicas existentes.
- Mantener el editor local funcionando con JSON y `localStorage`.
- Validar el rango editable de 420 a 1320 minutos y bloques de 30 minutos.
- Restringir la RPC al rol administrativo.

## Review Focus

- Payload vacío: debe dejar todos los bloques de entrenamiento inactivos sin tocar reservas.
- Rango 80/85 minutos ya normalizado a bloques de 30 minutos: debe aceptarse solo si llega alineado.
- Solapamiento dentro de un campo y día: debe rechazarse antes de actualizar.
- Campo, día o minutos fuera de rango: debe rechazarse.
- Función llamada por un usuario no administrador: debe rechazarse.

### Task 1: Migración SQL de guardado atómico

**Files:**
- Create: `supabase/horarios-entrenamiento-admin.sql`
- Create: `src/horariosAdminSupabase.check.ts`
- Modify: `package.json`
- Reuse: `public.horarios_bloqueados` de `supabase/schema.sql`

**Interfaces:**
- RPC: `public.guardar_horarios_entrenamiento_admin(p_configuracion jsonb)`.
- Payload: `{ version: 1, horarios: Array<{ cancha_id: number, dia_semana: number, inicio_minuto: number, fin_minuto: number }> }`.
- Retorno: filas activas de `public.horarios_bloqueados`, ordenadas por campo, día e inicio.

- [x] **Step 1: Escribir la comprobación estática fallida** para exigir la RPC, el control de administrador, las validaciones de rango/solapamiento, el bloqueo advisory, la actualización exclusiva de entrenamientos y los permisos `authenticated`.
- [x] **Step 2: Ejecutar `npm run check:horarios-supabase`** y confirmar que falla porque la migración aún no existe.
- [x] **Step 3: Implementar la migración SQL** con `security definer`, `search_path` fijado, validaciones antes de actualizar, operación transaccional y retorno normalizado.
- [x] **Step 4: Ejecutar `npm run check:horarios-supabase`** y confirmar que pasa sin conectarse a Supabase.
- [x] **Step 5: Ejecutar `npm run typecheck` y `npm run lint`**, revisar el SQL y avisar para revisión.

### Task 2: Adaptador de lectura administrativa

**Files:**
- Modify: `src/supabaseData.ts`
- Create or modify: `src/horariosAdminSupabase.ts`
- Create: comprobación específica del adaptador

**Interfaces:**
- `leerHorariosEntrenamientoAdminRemotos(): Promise<ConfiguracionHorariosAdmin>`.
- Solo lectura mediante `select` autenticado; no llamará todavía a la RPC de guardado.

- [x] **Step 1: Escribir comprobaciones para mapear columnas snake_case y filtrar filas activas.**
- [x] **Step 2: Implementar el adaptador sin conectarlo aún a la UI pública.**
- [x] **Step 3: Ejecutar comprobaciones y typecheck; avisar para revisión.**

### Task 3: Guardado real detrás del adaptador

**Files:**
- Modify: `src/supabaseData.ts` o `src/horariosAdminSupabase.ts`
- Modify: `src/components/admin/AdminHorarios.tsx` solo después de aprobar la lectura

- [x] **Step 1: Crear `guardarHorariosEntrenamientoAdminRemoto` que transforme el payload y llame a la RPC.**
- [x] **Step 2: Mantener fallback demo y una bandera explícita hasta probar el entorno separado.**
- [x] **Step 3: Probar error, reintento y retorno normalizado sin limpiar el borrador prematuramente.**

### Task 4: Prueba controlada y decisión de promoción

- [ ] **Step 1: Aplicar la migración únicamente en un proyecto/entorno de prueba.**
- [ ] **Step 2: Probar lectura, bloqueo, liberación, conflicto con reserva y rollback por error.**
- [ ] **Step 3: Revisar el diff y confirmar que producción no recibió escrituras.**
- [ ] **Step 4: Pedir confirmación expresa antes de conectar o promover a producción.**
