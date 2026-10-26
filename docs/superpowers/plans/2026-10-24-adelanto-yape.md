# Adelanto Yape y comprobante seguro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la confirmación directa de reserva por un flujo que solicite el adelanto Yape de S/10, permita copiar el número, valide y suba el comprobante de forma segura, y lo vincule con `reserva_id`.

**Architecture:** La UI conserva la selección de campo, horario y cliente, pero cambia la acción final por la carga del comprobante. La reserva se crea primero mediante el RPC público existente; después una Edge Function valida `reserva_id` + token, actualiza el resumen de pago, almacena el archivo en el bucket privado e inserta `pagos_reserva` y `pago_comprobantes` usando `service_role` solo en el servidor. El frontend usa únicamente la clave publicable y no accede directamente a las tablas ni al Storage privado.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS, Supabase Edge Functions (Deno), PostgreSQL/RLS.

**Spec:** `docs/superpowers/specs/2026-10-24-adelanto-yape-design.md`

## Global Constraints

- El número mostrado y copiado es `995933438` y el titular visible es `Jesús Leg*`.
- El mensaje visible debe decir: `Para reservar y asegurar debes yapear mínimo 10 soles, al NRO (995933438 Jesús Leg*) Tómale captura y súbela aquí 👇🏼`.
- El adelanto registrado es `10.00` PEN.
- Se aceptan `image/jpeg`, `image/png` y `image/webp`, con máximo `5242880` bytes.
- Las rutas de Storage usan UUID y no contienen celular, alias ni nombre de archivo del cliente.
- `service_role` solo puede aparecer en la Edge Function; nunca en `src/`, `.env.example` ni el bundle del navegador.
- El pago queda `pendiente` hasta la revisión administrativa; subir una imagen no confirma automáticamente el pago.
- Una clave de idempotencia repetida no puede duplicar `pagos_reserva` ni `pago_comprobantes`.

## Review Focus

- El usuario intenta enviar sin elegir archivo: la UI debe detenerse con un mensaje y no crear una reserva.
- El archivo tiene tipo no permitido o supera 5 MiB: el cliente debe dar feedback y la función debe rechazarlo aunque se llame fuera de la UI.
- La reserva/token no coinciden, la reserva está cancelada o el pago expiró: la función debe responder sin revelar datos internos ni crear objetos.
- La respuesta de red se pierde después de una carga exitosa: repetir la misma idempotencia debe recuperar el resultado existente sin duplicar filas.
- El titular usa un dispositivo sin Clipboard API: copiar número debe fallar de forma visible y no bloquear la selección ni el envío manual.

### Task 1: Validación de comprobantes y contrato de UI

**Files:**
- Create: `src/pagos.ts`
- Create: `src/pagos.check.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `ADELANTO_YAPE`, `NUMERO_YAPE`, `MAX_COMPROBANTE_BYTES`, `validarComprobante(file)` and `extensionComprobante(file)` for the browser flow.

- [ ] **Step 1: Write the failing checks**

  Add assertions for: S/10, number `995933438`, allowed MIME types, 5 MiB inclusive limit, rejection of missing/oversized/unsupported files, and extension mapping (`image/jpeg` → `jpg`, `image/png` → `png`, `image/webp` → `webp`).

- [ ] **Step 2: Run the check to verify it fails**

  Run: `npm run check:pago`

  Expected: FAIL because the payment validation module and script do not yet exist.

- [ ] **Step 3: Implement the minimal validation module**

  Implement the constants and pure validation functions in `src/pagos.ts`; do not access Supabase, Storage, or browser globals from this module.

- [ ] **Step 4: Run the check to verify it passes**

  Run: `npm run check:pago`

  Expected: PASS with all payment validation assertions green.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pagos.ts src/pagos.check.ts package.json
  git commit -m "test: add payment proof validation contract"
  ```

### Task 2: Secure Edge Function for Yape proof registration

**Files:**
- Create: `supabase/functions/registrar-adelanto-yape/index.ts`
- Create: `supabase/config.toml`
- Modify: `src/pagos.check.ts`

**Interfaces:**
- Consumes multipart fields `reserva_id`, `token`, `idempotencia` and `comprobante`.
- Produces HTTP 200 JSON `{ ok: true, reserva_id: string, pago_id: string }`.
- Produces stable error codes for `archivo_invalido`, `reserva_no_autorizada`, `pago_expirado`, `pago_ya_confirmado`, and `idempotencia_repetida`.

- [ ] **Step 1: Extend the failing checks**

  Assert that the function validates all three accepted MIME types, the 5 MiB limit, token/hash authorization, UUID-only storage paths, `pago_reserva` + `pago_comprobantes` insertion, cleanup on failed persistence, and reads `SUPABASE_SERVICE_ROLE_KEY` only from the server function. Assert the function config disables JWT verification only because the function performs its own reservation-token authorization.

- [ ] **Step 2: Run the check to verify it fails**

  Run: `npm run check:pago`

  Expected: FAIL because the Edge Function and function config do not yet exist.

- [ ] **Step 3: Implement the Edge Function**

  Parse multipart form data, validate file bytes/type/size, hash the reservation token with SHA-256, and load the reservation through a service-role Supabase client. Reject invalid or expired attempts before Storage access. Set `pago_estado = 'pendiente'`, `pago_requerido = 10`, and a 30-minute `pago_expira_at` for the upload and administrative review; upload to `comprobantes-pago/<reserva_uuid>/<file_uuid>.<ext>`; insert one `pagos_reserva` row with `tipo = 'adelanto'`, `metodo = 'yape'`, `monto = 10`, and one `pago_comprobantes` row with MIME, byte size, and SHA-256. On a repeated idempotency key, return the existing result; on downstream failure, remove any uploaded object and inserted payment row before returning an error. Keep CORS responses explicit and avoid logging tokens or image contents.

- [ ] **Step 4: Run the check to verify it passes**

  Run: `npm run check:pago`

  Expected: PASS with the static security and contract assertions green.

- [ ] **Step 5: Commit**

  ```bash
  git add supabase/functions/registrar-adelanto-yape/index.ts supabase/config.toml src/pagos.check.ts
  git commit -m "feat: add secure Yape proof function"
  ```

### Task 3: Browser adapter and reservation payment action

**Files:**
- Modify: `src/supabaseData.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/cliente/DatosReserva.tsx`
- Modify: `src/supabase.check.ts`

**Interfaces:**
- Produces `ErrorPago`, `ResultadoPago`, and `registrarAdelantoYapeRemoto(reservaId, token, file, idempotencia)`.
- Extends the reservation result passed to `DatosReserva` with the public token already returned by `crear_reserva_publica`.

- [ ] **Step 1: Write the failing adapter and type checks**

  Add assertions for the multipart function invocation, propagation of the reservation token, reuse of a stable idempotency key during retry, mapping of server error codes to user-facing payment errors, and the absence of `service_role` in browser source files.

- [ ] **Step 2: Run checks to verify they fail**

  Run: `npm run check:supabase` and `npm run check:pago`

  Expected: FAIL because the adapter, result types, and action wiring do not exist.

- [ ] **Step 3: Implement the minimal adapter and action wiring**

  Add the public Supabase function call using `supabasePublic.functions.invoke` and `FormData`; never set a service-role header. Extend `App` with an action that validates the file locally, uses the configured Edge Function in production, and accepts the file locally in demo mode after validation. Update `DatosReserva` to create the reservation once, retain its `{ reserva, token }` while an upload is retrying, and call the payment action before invoking `onReserved`.

- [ ] **Step 4: Run checks to verify they pass**

  Run: `npm run check:supabase`, `npm run check:pago`, `npm run typecheck`

  Expected: PASS with no TypeScript errors and no frontend service-role references.

- [ ] **Step 5: Commit**

  ```bash
  git add src/supabaseData.ts src/App.tsx src/components/cliente/DatosReserva.tsx src/supabase.check.ts
  git commit -m "feat: connect public booking to Yape proof upload"
  ```

### Task 4: Payment instruction UI, copy button, and completion state

**Files:**
- Create: `src/components/cliente/PagoAdelanto.tsx`
- Modify: `src/components/cliente/DatosReserva.tsx`
- Modify: `src/components/cliente/ReservaCompletada.tsx`
- Modify: `src/index.css`
- Modify: `src/componentization.check.ts`
- Modify: `src/ui.check.ts`

**Interfaces:**
- `PagoAdelanto` receives the selected `File`, loading/error state, copy callback, file callback, and submit callback.
- Produces accessible copy control, file input limited to JPG/PNG/WEBP, exact Spanish instruction, and success copy distinguishing “reserva asegurada” from “pago pendiente de revisión”.

- [ ] **Step 1: Write the failing UI checks**

  Assert the new component is referenced, the exact message and Yape number exist, the copy button has an accessible name, the file input advertises the three MIME types and 5 MiB limit, the old direct-confirm copy is gone from the client flow, and completion text mentions the pending review.

- [ ] **Step 2: Run checks to verify they fail**

  Run: `npm run check:components` and `npm run check:ui`

  Expected: FAIL because the new component and copy are not present.

- [ ] **Step 3: Implement the UI**

  Render the payment block in both the remembered-client and new-client paths of `DatosReserva`, keep the existing booking summary, add a separate number card with `Copiar número`, implement Clipboard API feedback without blocking manual use, show selected filename and validation errors, and replace the completion message/WhatsApp text so the S/10 advance and remaining field payment are clear.

- [ ] **Step 4: Run checks to verify they pass**

  Run: `npm run check:components`, `npm run check:ui`, `npm run typecheck`, `npm run build`

  Expected: PASS with the payment UI included in the production bundle.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/cliente/PagoAdelanto.tsx src/components/cliente/DatosReserva.tsx src/components/cliente/ReservaCompletada.tsx src/index.css src/componentization.check.ts src/ui.check.ts
  git commit -m "feat: add Yape advance payment screen"
  ```

### Task 5: Setup documentation and full verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example` only if a non-secret frontend setting is needed
- Modify: `src/supabase.check.ts`

**Interfaces:**
- Documents deployment of `registrar-adelanto-yape` and confirms the service-role secret belongs only to the Supabase Edge Function environment.

- [ ] **Step 1: Write the failing documentation/security checks**

  Require README instructions for deploying the function, the private bucket name, the 5 MiB/types limit, and a warning not to add `SUPABASE_SERVICE_ROLE_KEY` to Vite variables. Require no `VITE_*SERVICE_ROLE*` setting in `.env.example`.

- [ ] **Step 2: Run the check to verify it fails**

  Run: `npm run check:supabase`

  Expected: FAIL because the deployment instructions are not documented.

- [ ] **Step 3: Add the deployment notes and final static assertions**

  Document the function deployment command, the required server secret, the public client variables, and the manual admin review state. Keep the existing migration instructions intact.

- [ ] **Step 4: Run the full verification suite**

  Run: `npm run check`, `npm run check:scenarios`, `npm run check:admin`, `npm run check:ui`, `npm run check:components`, `npm run check:supabase`, `npm run check:pago`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check`.

  Expected: all commands exit 0; the output contains no lint/type/build errors.

- [ ] **Step 5: Commit**

  ```bash
  git add README.md src/supabase.check.ts
  git commit -m "docs: document Yape proof deployment"
  ```
