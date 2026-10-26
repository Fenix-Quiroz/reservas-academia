# Sincronización automática de pagos y reservas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mantener sincronizados automáticamente el panel administrativo y “Mis reservas” después de subir o confirmar un comprobante.

**Architecture:** El panel administrativo recibirá eventos Realtime de `reservas`, `pagos_reserva` y `pago_comprobantes`, agrupando eventos cercanos en una sola recarga. La vista pública seguirá consultando la RPC protegida por token mediante un intervalo activo solo mientras “Mis reservas” esté visible.

**Tech Stack:** React, TypeScript, Supabase JS Realtime, PostgreSQL, comprobaciones estáticas con `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-25-realtime-pagos-reservas-design.md`

## Global Constraints

- No usar `service_role` en el frontend.
- No abrir una suscripción pública que exponga filas de `reservas`.
- Mantener los botones del comprobante derivados del comprobante persistido.
- No cambiar la semántica de estados de reserva y pago.

## Review Focus

- Eventos consecutivos de reserva, pago y comprobante: una sola recarga agrupada.
- Desmontaje del panel o cambio de cliente: no dejar temporizadores activos.
- Vista “Mis reservas” cerrada: no realizar polling.
- Error de una consulta de actualización: conservar el mensaje de error existente y permitir el siguiente ciclo.
- Cambio de estado confirmado: volver a cargar la reserva para mostrar “Reserva confirmada”.

### Task 1: Suscripción Realtime administrativa

**Files:**
- Modify: `src/supabaseData.ts:457-469`
- Test: `src/pagosAdmin.check.ts`
- Create: `supabase/fix-admin-realtime-pagos.sql`
- Test: `src/supabase.check.ts`

**Interfaces:**
- Consumes: `supabase` y el callback existente `suscribirseAReservas(alCambiar: () => void)`.
- Produces: una función de desuscripción que escucha las tres tablas y notifica como máximo una vez por ventana de 150 ms.

- [ ] Escribir primero comprobaciones que exijan las tres tablas, el agrupamiento y la migración idempotente.
- [ ] Ejecutar `npm run check:pago-admin` y `npm run check:supabase` para observar el fallo esperado.
- [ ] Añadir los tres listeners Realtime y el temporizador de agrupamiento en `suscribirseAReservas`.
- [ ] Añadir la migración que incorpora `reservas`, `pagos_reserva` y `pago_comprobantes` a `supabase_realtime` solo si aún no pertenecen a la publicación.
- [ ] Ejecutar ambas comprobaciones nuevamente.

### Task 2: Actualización automática de “Mis reservas”

**Files:**
- Modify: `src/App.tsx:77-101`
- Test: `src/ui.check.ts`

**Interfaces:**
- Consumes: `leerMisReservasRemotas(tokens)` y el estado existente `verMias`.
- Produces: una actualización periódica de la misma RPC, con limpieza al desmontar o cerrar la vista.

- [ ] Escribir una comprobación que exija un intervalo solo condicionado por `verMias`, su limpieza y una marca para no solapar cargas.
- [ ] Ejecutar `npm run check:ui` y verificar el fallo esperado.
- [ ] Extraer la carga de “Mis reservas” a una función reutilizable y programar un intervalo corto mientras la vista esté abierta.
- [ ] Evitar ejecutar una nueva carga si la anterior sigue pendiente y limpiar el intervalo en el retorno del efecto.
- [ ] Ejecutar `npm run check:ui` y revisar el flujo de estados confirmado y pendiente.

### Task 3: Verificación completa

**Files:**
- No additional files.

- [ ] Ejecutar los checks del proyecto, `npm run typecheck`, `npm run lint`, `npm run build` y `git diff --check`.
- [ ] Revisar el diff para confirmar que no se añadió `service_role` al frontend ni se relajaron políticas RLS.
- [ ] Verificar que la migración es idempotente y reportar que debe ejecutarse en producción antes de probar Realtime.
