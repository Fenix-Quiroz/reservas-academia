# Public Booking Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow anonymous visitors to check availability and create a valid reservation without granting direct table access.

**Architecture:** Keep `clientes` and `reservas` closed to `anon` through RLS. Expose only narrowly scoped PostgreSQL functions with `EXECUTE` permission for public booking; these functions validate inputs, return minimal data, and rely on the database exclusion constraint for concurrency. The admin panel continues using authenticated RLS policies.

**Tech Stack:** Supabase PostgreSQL RPC, TypeScript, Supabase JS client, existing reservation domain helpers.

**Spec:** Security design agreed in the conversation: public availability/creation through controlled functions; admin data through Auth + RLS; no `service_role` in the browser.

## Global Constraints

- `anon` must not receive direct `SELECT`, `INSERT`, or `UPDATE` privileges on `clientes` or `reservas`.
- Public functions must return availability or the created reservation only; never return lists of clients or reservations.
- All public input must be validated again in PostgreSQL.
- The existing admin policies for `authenticated` users with `app_metadata.role = 'admin'` must remain unchanged.
- No commit or push until the user explicitly requests it.

## Review Focus

- Overlapping reservations submitted concurrently: the exclusion constraint must remain the final authority.
- Invalid field/date/hour values sent directly to the RPC: the function must reject them before insert.
- Existing client phone numbers: public booking must not expose the existing client row.
- RPC permissions: `anon` may execute only the intended public functions, not table operations.
- Function security: `SECURITY DEFINER` functions must set a controlled `search_path` and return minimal fields.

---

### Task 1: Public PostgreSQL functions

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/permissions.sql`
- Test: `src/supabase.check.ts`

**Interfaces:**
- Produces `public.obtener_horarios_publicos(p_cancha_id integer, p_fecha date, p_horas smallint)` returning `inicio smallint, libre boolean`.
- Produces `public.crear_reserva_publica(p_cancha_id integer, p_fecha date, p_inicio smallint, p_horas smallint, p_alias text, p_celular text)` returning the created reservation's public confirmation fields.

- [x] Write assertions that the SQL defines both functions, uses `security definer`, sets `search_path`, grants only `execute` to `anon`, and does not grant table access to `anon`.
- [x] Run `npm run check:supabase` and verify it fails before the SQL implementation.
- [x] Implement the functions with validation, minimal output, and the existing overlap/active-reservation rules.
- [x] Run `npm run check:supabase`, `npm run typecheck`, and `npm run lint`.

### Task 2: TypeScript RPC adapters

**Files:**
- Modify: `src/supabaseData.ts`
- Modify: `src/almacen.ts`
- Test: `src/supabase.check.ts` or a focused RPC check file.

**Interfaces:**
- Produces `leerHorariosRemotos(canchaId, fecha, horas): Promise<HorarioDisponible[]>`.
- Produces `crearReservaPublicaRemota(reserva): Promise<ResultadoReserva>`.

- [x] Add focused tests for RPC response mapping and error mapping.
- [x] Implement adapters without using `.from('reservas').select(...)` for public operations.
- [x] Run all current checks, typecheck, lint, and build.

### Task 3: Client flow integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/cliente/SelectorHorario.tsx`
- Modify: `src/components/cliente/DatosReserva.tsx`
- Test: `src/ui.check.ts` and scenario checks.

- [x] Replace the public availability load with the limited RPC.
- [x] Replace public creation with the RPC and preserve occupied/limit error messages.
- [x] Ensure the admin path continues using direct authenticated table reads.
- [x] Verify the client no longer downloads all reservation rows.

### Task 4: Private reservation access

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/supabaseData.ts`
- Modify: `src/components/cliente/MisReservas.tsx`
- Test: focused token/RPC checks.

- [x] Add a private management token and store only its hash in the database.
- [x] Add RPCs to list and cancel reservations using that token.
- [x] Remove phone-only access to another person's reservations.

### Post-review hardening

- [x] Prevent a production build without Supabase variables from silently falling back to demo data.
- [x] Enforce the reservation state machine with a PostgreSQL trigger and race-safe admin updates.
- [x] Use a separate authenticated admin cancellation path instead of requiring a public reservation token.
- [x] Re-run the complete check suite, typecheck, lint, and production build.

Deferred product decisions: identity verification for reservation creation, recovery when a private token is lost, and a shared Lima-time clock in the browser. These require a product choice or an external service and are not silently introduced by this plan.

