# Sorteos reales con reservas de Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar la vista de sorteos con reservas reales, ejecutar sorteos auditables en Supabase y conservar un ticket por reserva elegible.

**Architecture:** Reutilizar las reservas ya cargadas por `AdminApp` para previsualizar tickets y añadir una migración SQL con tres tablas y una RPC transaccional. La RPC será la autoridad para el snapshot y el ganador; el modo demo permanecerá disponible cuando Supabase no esté configurado.

**Tech Stack:** React 19, TypeScript, Supabase Postgres/RPC, `tsx` checks, ESLint y Vite.

**Spec:** `docs/superpowers/specs/2026-11-27-sorteos-reales-design.md`

## Global Constraints

- Solo reservas elegibles por `esTicket`: `estado = 'finalizado'` y pago `confirmado` o `no_requerido`.
- Cada reserva genera exactamente un ticket.
- El corte temporal usa `created_at`, no `fecha`.
- No exponer `service_role` al navegador.
- Preservar cambios locales no relacionados con sorteos.

## Review Focus

- Primer sorteo sin corte anterior: incluye todas las reservas elegibles hasta el corte.
- Sorteo posterior: excluye tickets ya usados mediante `created_at > ultimo_hasta`.
- Estado y pago: no entran reservas no finalizadas, pendientes, rechazadas, canceladas ni `no_asistio`.
- Concurrencia: dos clics o dos administradores no crean dos sorteos para el mismo periodo.
- UI desactualizada: el resultado de la RPC es la fuente final aunque cambie la lista durante la animación.

---

### Task 1: Modelar tickets reales y cortes

**Files:**
- Modify: `src/types.ts`
- Modify: `src/supabaseData.ts`
- Create: `src/sorteoReal.ts`
- Create: `src/sorteoReal.check.ts`
- Modify: `package.json`

**Interfaces:**
- Produce `crearTicketsSorteo(reservas, desde, hasta): TicketSorteo[]`.
- Produce `filtrarReservasSorteo(reservas, desde, hasta): Reserva[]`.
- Extiende `Reserva` con `createdAt?: string` y el loader remoto selecciona/mapea `created_at`.

- [ ] Escribir checks fallidos para primer sorteo, corte posterior, filtros de estado/pago y un ticket por reserva.
- [ ] Ejecutar `npm run check:sorteo-real` y confirmar que falla por las funciones ausentes.
- [ ] Implementar el adaptador puro reutilizando `esTicket` y numeración estable por `createdAt`/id.
- [ ] Registrar el script `check:sorteo-real` y ejecutar el check hasta PASS.

### Task 2: Crear esquema y RPC de Supabase

**Files:**
- Create: `supabase/fix-sorteos-reales.sql`
- Create: `src/sorteosSql.check.ts`
- Modify: `package.json`

**Interfaces:**
- SQL crea `sorteos`, `sorteo_tickets`, `sorteo_resultados`.
- SQL expone `public.ejecutar_sorteo()` para administradores.
- La RPC devuelve un JSON con sorteo, tickets y ganador.

- [ ] Escribir el check estructural que exige tablas, constraints, RLS, bloqueo y RPC.
- [ ] Ejecutar `npm run check:sorteos-sql` y confirmar el fallo inicial.
- [ ] Implementar la migración idempotente, permisos de lectura admin y RPC transaccional con `pg_advisory_xact_lock` y `pgcrypto`.
- [ ] Ejecutar el check hasta PASS.

### Task 3: Añadir adaptadores Supabase

**Files:**
- Modify: `src/supabaseData.ts`
- Create: `src/sorteoSupabase.ts`
- Create: `src/sorteoSupabase.check.ts`
- Modify: `package.json`

**Interfaces:**
- `leerUltimoSorteoRemoto(): Promise<ResumenSorteo | null>`.
- `ejecutarSorteoRemoto(): Promise<ResultadoSorteoRemoto>`.

- [ ] Escribir check fallido para nombres de RPC, normalización del JSON y errores de Supabase.
- [ ] Ejecutar `npm run check:sorteo-supabase` y confirmar el fallo inicial.
- [ ] Implementar adaptadores sin `service_role` y hasta PASS.

### Task 4: Conectar AdminApp y reemplazar demo en la vista

**Files:**
- Modify: `src/AdminApp.tsx`
- Modify: `src/components/admin/AdminSorteosVista.tsx`
- Modify: `src/ui.check.ts`

**Interfaces:**
- `AdminSorteosVista` recibe reservas, último sorteo, estado de carga/conexión y callback de ejecución.
- El slot usa tickets reales cuando Supabase está configurado y conserva demo local cuando no lo está.

- [ ] Añadir checks fallidos para props reales, eliminación del uso de `DATOS_SORTEO_DEMO` en producción y estados vacíos/error.
- [ ] Ejecutar `npm run check:ui` y confirmar el fallo inicial.
- [ ] Pasar las reservas y el último corte desde `AdminApp`.
- [ ] Generar la lista real con `crearTicketsSorteo`, llamar RPC al girar y terminar la animación en el ganador devuelto.
- [ ] Deshabilitar repetir el sorteo remoto ya ejecutado; conservar reinicio solo como estado visual.
- [ ] Ejecutar `npm run check:ui` hasta PASS.

### Task 5: Verificación integral

**Files:**
- No additional files.

- [ ] Ejecutar `npm run typecheck`.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar todos los checks relacionados con sorteos, tickets, Supabase y UI.
- [ ] Ejecutar `npm run build`.
- [ ] Revisar el diff para confirmar que no se tocaron cambios locales ajenos.
