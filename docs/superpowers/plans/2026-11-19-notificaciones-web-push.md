# Notificaciones Web Push de nuevas reservas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que el administrador active notificaciones Web Push en su Android y reciba un aviso genérico cuando se cree una nueva reserva, sin modificar la confirmación existente de comprobantes.

**Architecture:** El panel registra la suscripción del navegador en Supabase después de una acción explícita del administrador. Un Service Worker muestra la notificación y abre `/admin`; un trigger `pg_net` encola un evento de `public.reservas`, una Edge Function envía el push con VAPID y `pg_cron` reintenta el outbox con backoff. La creación de reservas no espera ni depende del envío.

**Tech Stack:** React 19, TypeScript, Vite, Supabase Auth/Postgres/Edge Functions, Deno npm imports, Web Push API y Service Worker.

**Spec:** `docs/superpowers/specs/2026-11-19-notificaciones-web-push-design.md`

## Global Constraints

- La notificación debe decir que llegó una nueva reserva y dirigir al administrador al panel; no debe aprobar ni rechazar el comprobante.
- No se deben modificar `crear_reserva_publica`, la carga de comprobantes ni `confirmar_pago_admin`.
- No se deben incluir datos personales del cliente en el payload push.
- Las credenciales privadas VAPID y el secreto de notificación solo pueden vivir en secretos de Supabase; el navegador recibe únicamente la clave pública.
- Un fallo del push no puede hacer fallar ni retrasar la creación de una reserva.
- El registro debe ser explícito mediante el botón del administrador y debe tolerar permisos denegados y suscripciones repetidas.

## Review Focus

- Permiso de notificaciones denegado: el panel debe seguir funcionando y explicar cómo reintentarlo desde Chrome.
- Dos clics o dos dispositivos del mismo administrador: la suscripción debe actualizarse sin duplicar el endpoint.
- Suscripción expirada o inválida: el envío debe eliminarla y continuar con las demás suscripciones.
- Evento repetido o payload que no sea un `INSERT` de `reservas`: la función no debe enviar avisos duplicados ni procesar eventos ajenos.
- Error de VAPID, Supabase o red durante el envío: la reserva ya creada debe conservarse y el outbox debe reprogramar el evento de forma controlada.

### Task 1: Contrato de notificaciones y conversión de claves

**Files:**
- Create: `src/notificacionesPush.ts`
- Test: `src/notificacionesPush.check.ts`
- Modify: `package.json` (add `check:notificaciones`)

**Interfaces:**
- Produces `EstadoNotificacionesPush`, `ResultadoActivarNotificaciones`, `convertirClavePublicaVapid(valor: string): Uint8Array`, `estadoNotificacionesPush(permiso, suscripcionActiva, configurado): EstadoNotificacionesPush` and copy constants for the button and notification.
- The browser integration in Task 2 consumes the pure helpers and result states.

- [ ] **Step 1: Write the failing checks** for valid/invalid base64url VAPID keys, permission states (`default`, `granted`, `denied`), missing configuration and the exact generic notification copy.
- [ ] **Step 2: Run `npm run check:notificaciones`** and verify it fails because the module and script do not exist.
- [ ] **Step 3: Implement the pure helpers in `src/notificacionesPush.ts`** with strict validation and no mutation of reservation/payment state.
- [ ] **Step 4: Run `npm run check:notificaciones`** and verify all assertions pass.
- [ ] **Step 5: Commit** with `git add src/notificacionesPush.ts src/notificacionesPush.check.ts package.json package-lock.json && git commit -m "feat: add web push notification contract"`.

### Task 2: Service Worker, browser registration and admin button

**Files:**
- Create: `public/service-worker.js`
- Create: `src/components/admin/AdminNotificaciones.tsx`
- Modify: `src/AdminApp.tsx`
- Modify: `src/components/admin/AdminCabecera.tsx`
- Modify: `src/index.css`
- Test: `src/notificacionesPush.check.ts`

**Interfaces:**
- `AdminNotificaciones` receives `supabaseConfigurado: boolean` and renders the explicit activation button only for the authenticated admin panel.
- `activarNotificacionesPush()` registers `/service-worker.js`, requests permission from the button action, subscribes with `VITE_VAPID_PUBLIC_KEY`, and upserts `{ user_id, endpoint, p256dh, auth, user_agent }` into `admin_push_subscriptions`.
- The Service Worker handles `push` and `notificationclick`, displays the generic message and focuses or opens `/admin`.

- [ ] **Step 1: Extend the checks** to require the button label, `/service-worker.js` registration, permission handling, `push` listener and notification-click navigation; run `npm run check:notificaciones` to observe the expected failure.
- [ ] **Step 2: Implement the browser subscription helper** using the existing Supabase client and the pure states from Task 1; return controlled errors for unsupported browsers, denied permission, missing VAPID key, missing session, missing push keys and failed upsert.
- [ ] **Step 3: Implement `public/service-worker.js`** with a generic payload fallback, `/admin` click target, no customer data and safe handling of malformed push data.
- [ ] **Step 4: Implement `AdminNotificaciones`** and mount it in `AdminCabecera` without changing any reservation or payment callback; show active, pending, unavailable and error states accessibly.
- [ ] **Step 5: Add responsive styles** that fit the existing admin action area on Android widths.
- [ ] **Step 6: Run `npm run check:notificaciones`, `npm run typecheck` and `npm run build`** and verify they pass.
- [ ] **Step 7: Commit** with `git add public/service-worker.js src/notificacionesPush.ts src/notificacionesPush.check.ts src/components/admin/AdminNotificaciones.tsx src/AdminApp.tsx src/components/admin/AdminCabecera.tsx src/index.css && git commit -m "feat: let admin activate browser notifications"`.

### Task 3: Subscription table, webhook function and push delivery

**Files:**
- Create: `supabase/fix-notificaciones-web-push.sql`
- Create: `supabase/functions/notificar-nueva-reserva/index.ts`
- Modify: `supabase/config.toml`
- Modify: `src/notificacionesPush.check.ts`

**Interfaces:**
- SQL creates `public.admin_push_subscriptions` with unique `endpoint`, `user_id`, Web Push keys, timestamps, RLS and admin-only policies; authenticated admins may upsert their own device subscription.
- The Edge Function accepts an asynchronous `pg_net` trigger payload, validates `NOTIFICACIONES_WEBHOOK_SECRET`, ignores non-`INSERT`/non-`reservas` events, sends `{ title: 'Nueva reserva', body: 'Ingresa al panel para revisar el comprobante.', url: '/admin' }`, deduplicates by reservation/device, and removes invalid endpoints.
- Required server secrets: `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NOTIFICACIONES_WEBHOOK_SECRET`.

- [ ] **Step 1: Add failing static/invariant checks** for table/RLS/unique endpoint, delivery deduplication, no public access, function secret validation, generic payload, stale endpoint cleanup and `verify_jwt = false`; run `npm run check:notificaciones` to observe the expected failure.
- [ ] **Step 2: Implement the SQL migration** without touching reservation/payment functions and with an idempotent `updated_at` trigger.
- [ ] **Step 3: Implement the Edge Function** with `npm:web-push`, service-role Supabase access, controlled response codes and per-subscription error isolation.
- [ ] **Step 4: Add the function configuration and async `pg_net`/Vault trigger; run the checks**; use `deno check` or `supabase functions serve` if the installed CLI/runtime supports it, otherwise record the unavailable external check and rely on TypeScript/static invariants.
- [ ] **Step 5: Commit** with `git add supabase/fix-notificaciones-web-push.sql supabase/functions/notificar-nueva-reserva/index.ts supabase/config.toml src/notificacionesPush.check.ts && git commit -m "feat: send push alerts for new reservations"`.

### Task 4: Deployment instructions and regression verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `src/supabase.check.ts`
- Test: existing reservation, payment and admin checks

- [ ] **Step 1: Add deployment instructions** for `VITE_VAPID_PUBLIC_KEY`, Supabase secrets, Edge Function deployment and Vault/`pg_net`/`pg_cron` on `public.reservas` `INSERT`; document that push failure does not affect reservations.
- [ ] **Step 2: Add regression assertions** that the public reservation RPC, payment-upload flow and admin confirmation RPC remain present and unchanged in their integration points.
- [ ] **Step 3: Run the focused checks**: `npm run check:notificaciones`, `npm run check`, `npm run check:pago`, `npm run check:pago-admin`, `npm run check:supabase`, `npm run typecheck`, `npm run lint` and `npm run build`.
- [ ] **Step 4: Run the complete available check suite** from `package.json`; expected result is exit code 0, with any pre-existing failure reported explicitly.
- [ ] **Step 5: Commit** with `git add README.md .env.example src/supabase.check.ts && git commit -m "docs: configure web push deployment"`.
- [ ] **Step 6: Manually verify on Android** after deployment: login, activate notifications, create a test reservation, receive the push, open `/admin`, view the comprobante and confirm it through the existing action.

## Self-review

- Coverage: the design goals map to Tasks 1–4; deployment configuration and the required real-device check are explicit.
- Step scan: each task has a failing check before implementation, a focused verification and a commit boundary.
- Type consistency: Task 1 owns the notification states/helpers; Task 2 consumes them; Task 3 owns the database contract used by Task 2.
- Review focus: all five failure modes are assigned to Task 1, 2 or 3 checks and remain on the final manual verification list.
- Proportion: the plan defines interfaces, files and commands without prescribing implementation bodies beyond the security and delivery invariants.
