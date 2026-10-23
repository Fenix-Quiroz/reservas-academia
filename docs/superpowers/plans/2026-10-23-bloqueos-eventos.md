# Bloqueos especiales para eventos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al administrador crear y cancelar eventos de 5 o más horas que bloqueen el horario correspondiente para los clientes públicos.

**Architecture:** Se añadirá `BloqueoEvento` como entidad independiente, con almacenamiento local para demo y tabla/RPC protegidas en Supabase. La disponibilidad pública consultará eventos activos junto con reservas; la creación de eventos y reservas compartirá una validación transaccional contra cruces.

**Tech Stack:** React, TypeScript, Vite, Supabase PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-10-23-bloqueos-eventos-design.md`

## Global Constraints

- Los eventos tienen una duración mínima de 5 horas.
- El horario permitido es de 7:00 a. m. a 1:00 a. m.; los inicios y finales de eventos son horas enteras.
- La vista pública no recibe detalles del evento, solo disponibilidad.
- Solo administradores autenticados pueden crear, consultar o cancelar eventos en Supabase.
- Las reservas públicas siguen limitadas a `1`, `1.5`, `2` y `3` horas.

## Review Focus

- Un evento de 5 horas bloquea todos los inicios públicos que se crucen, incluidos rangos de 1.5 horas.
- Un evento que termina a la 1:00 a. m. permite exactamente `fin = 25`, pero no excede el cierre.
- Un evento no puede cruzar una reserva existente y una reserva pública no puede entrar en un evento creado al mismo tiempo.
- Cancelar un evento conserva el registro, pero libera sus horas en la disponibilidad pública.
- Un cliente público no puede leer el nombre, contacto ni notas de los eventos mediante RLS o RPC.

---

### Task 1: Modelo local y reglas de bloqueo

**Files:**
- Modify: `src/types.ts`
- Create: `src/eventos.ts`
- Test: `src/eventos.check.ts`
- Modify: `src/reservas.ts`
- Modify: `src/almacen.ts`
- Modify: `src/App.tsx`
- Modify: `src/reservas.check.ts`

**Interfaces:**
- `BloqueoEvento` contiene `id`, `canchaId`, `fecha`, `inicio`, `fin`, `nombre`, `celular`, `notas` y `estado`.
- `esRangoEventoValido(inicio, fin)` acepta solo rangos dentro de 7–25 y de mínimo 5 horas.
- `eventoBloquea(evento, canchaId, fecha, inicio, horas)` devuelve si un turno se cruza con un evento activo.
- `horarios(..., bloqueosEventos?)` y `crearReserva` consideran eventos locales sin cambiar la firma existente obligatoria.

- [x] **Step 1: Write failing tests** para rangos válidos, mínimo de 5 horas, cierre a 25, cruces, cancelación que libera y reserva local rechazada por evento.
- [x] **Step 2: Run `npm run check:eventos`** y la prueba de reservas para verificar el fallo esperado.
- [x] **Step 3: Implementar el modelo, almacenamiento demo y bloqueo local**; la app cargará eventos locales y los pasará a la disponibilidad.
- [x] **Step 4: Ejecutar las pruebas focalizadas** y verificar que pasen.

### Task 2: Tabla Supabase y RPC seguras

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Modify: `supabase/fix-horarios-academia.sql`
- Modify: `src/supabaseData.ts`
- Modify: `src/supabase.check.ts`

**Interfaces:**
- Tabla `public.bloqueos_eventos` con estado `activo/cancelado`, RLS administrativa y exclusión de eventos activos.
- RPC `public.crear_bloqueo_evento_admin(integer, date, smallint, smallint, text, text, text)` para crear eventos.
- RPC `public.obtener_bloqueos_eventos_admin()` para listar eventos del panel.
- RPC `public.cancelar_bloqueo_evento_admin(uuid)` para cancelar sin borrar.
- RPC pública de disponibilidad y creación de reserva consultan eventos activos.

- [x] **Step 1: Write failing SQL-source checks** para la tabla, RLS, RPC admin y las consultas de bloqueo público.
- [x] **Step 2: Run `npm run check:supabase`** y verificar que fallen por no existir aún los eventos.
- [x] **Step 3: Implementar tabla, índices, RPC admin y validación cruzada** en el esquema canónico y la migración ejecutable sobre la base actual.
- [x] **Step 4: Implementar adaptadores Supabase** y mapear errores de evento ocupado, datos inválidos y permisos.
- [x] **Step 5: Ejecutar `npm run check:supabase`** y revisar que no se expongan columnas de eventos a anon.

### Task 3: Sección de eventos en administración

**Files:**
- Create: `src/components/admin/AdminEventos.tsx`
- Modify: `src/AdminApp.tsx`
- Modify: `src/index.css`
- Create or modify: `src/components/admin/admin-eventos.typecheck.ts`

**Interfaces:**
- Formulario accesible para campo, fecha, inicio, fin, nombre, contacto y notas.
- Lista de eventos activos con botón “Cancelar evento”.
- Modo demo y Supabase usan el mismo componente y muestran errores claros de solapamiento.

- [x] **Step 1: Write failing component/type checks** para renderizar el formulario y exigir sus callbacks.
- [x] **Step 2: Implementar el componente y conectarlo al estado del panel.**
- [x] **Step 3: Añadir estilos responsive para móvil y escritorio.**
- [x] **Step 4: Ejecutar typecheck, lint y comprobaciones de componentes.**

### Task 4: Verificación completa y documentación

**Files:**
- Modify: `README.md`

- [x] **Step 1: Documentar la migración de eventos y el comportamiento público.**
- [x] **Step 2: Ejecutar la suite completa, typecheck, lint y build.**
- [ ] **Step 3: Ejecutar `git diff --check` y revisar el diff final.**
