# Limpieza de datos de desarrollo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Añadir un reinicio de datos de prueba desde el panel de desarrollo, incluyendo comprobantes almacenados.

**Architecture:** Una Edge Function usa el secreto `SUPABASE_SERVICE_ROLE_KEY` únicamente en backend para consultar rutas y eliminar archivos del bucket, luego borra las tablas operativas en orden. El panel invoca la función con la sesión existente y solo muestra el control cuando Vite está en desarrollo.

**Tech Stack:** React, TypeScript, Supabase Edge Functions, Supabase Storage, Deno.

**Spec:** `docs/superpowers/specs/2026-10-25-limpieza-datos-dev-design.md`

## Global Constraints

- Conservar las cuentas de Auth del administrador.
- Conservar `public.horarios_bloqueados`.
- No usar `service_role` en el frontend.
- Borrar primero los objetos del bucket y después las filas dependientes.

## Review Focus

- Bucket vacío o sin comprobantes: la función debe terminar correctamente.
- Más de cien archivos: eliminar en lotes y no depender de una sola llamada.
- Error de Storage: no continuar fingiendo que la limpieza terminó.
- Panel sin Supabase: conservar el botón local existente.
- Build de producción: no renderizar el botón de limpieza remota.

### Task 1: Función remota de limpieza

**Files:**
- Create: `supabase/functions/limpiar-datos-prueba/index.ts`
- Modify: `supabase/config.toml`
- Test: `src/limpiezaDatosPrueba.check.ts`

**Interfaces:**
- Consumes: sesión autenticada del administrador y `SUPABASE_SERVICE_ROLE_KEY` del entorno de Supabase.
- Produces: `{ ok: true, eliminados: {...} }` o `{ error: string }`.

- [ ] Escribir comprobaciones que exijan el endpoint, el borrado del bucket, el orden de tablas y el secreto solo en backend.
- [ ] Ejecutar `npm run check:limpieza` para observar el fallo esperado.
- [ ] Implementar la Edge Function con borrado por lotes y respuesta resumida.
- [ ] Configurar la función con verificación JWT.
- [ ] Ejecutar `npm run check:limpieza` y el typecheck local.

### Task 2: Invocación desde el panel

**Files:**
- Modify: `src/supabaseData.ts`
- Modify: `src/AdminApp.tsx`
- Modify: `src/components/admin/AdminCabecera.tsx`
- Modify: `src/ui.check.ts`
- Modify: `src/pagosAdmin.check.ts`

**Interfaces:**
- Consumes: `limpiarDatosPruebaRemoto()` y `import.meta.env.DEV`.
- Produces: confirmación, estado de procesamiento, mensaje de resultado y recarga del panel.

- [ ] Escribir comprobaciones de UI para el botón, confirmación y ocultamiento fuera de desarrollo.
- [ ] Ejecutar `npm run check:ui` para observar el fallo esperado.
- [ ] Añadir el invocador remoto sin exponer secretos.
- [ ] Añadir el estado de limpieza y el botón de desarrollo en el encabezado.
- [ ] Recargar reservas, comprobantes y controles después de una limpieza exitosa.
- [ ] Ejecutar los checks específicos.

### Task 3: Despliegue y verificación

- [ ] Ejecutar `npx supabase functions deploy limpiar-datos-prueba`.
- [ ] Confirmar que la función está desplegada y que el secreto existe únicamente en Supabase.
- [ ] Ejecutar todos los checks, typecheck, lint y build.
