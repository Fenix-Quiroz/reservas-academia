# Ícono y nombre de PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar el sitio público de reservas para que use el logo del Jaguar y el nombre “Reservas” al agregarse a la pantalla de inicio en Android y iPhone.

**Architecture:** Se agregarán dos manifiestos web estáticos en `public/`, enlazados desde las dos entradas HTML del proyecto. El sitio público reutilizará `public/favicon-jaguar.png`; el panel usará una copia PNG de su logo administrativo para mantener separados el ícono y el `start_url`.

**Tech Stack:** Vite, HTML estático, JSON manifest, chequeo de UI con `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-20-pwa-icono-nombre-design.md`

## Global Constraints

- Sitio público: nombre completo “Reservas El Jaguar”; nombre corto “Reservas”.
- Panel: nombre “Panel El Jaguar”; inicio y alcance `/admin/`.
- Modo instalado: `standalone`.
- Ícono: `/favicon-jaguar.png`.
- Ícono del panel: `/logo-admin-polideportivo-el-jaguar.png`.
- No modificar cambios locales previos en `src/components/admin/AdminSorteosVista.tsx` ni `src/index.css`.
- No cambiar la apariencia de la web cuando se abre en una pestaña normal.

## Review Focus

- El manifiesto debe ser válido y estar enlazado desde el HTML público.
- La ruta del ícono debe existir y ser accesible desde `public/`.
- iPhone debe recibir `apple-touch-icon` y un nombre de aplicación.
- El manifiesto debe usar `start_url` y `display` adecuados para abrir la reserva como app.
- El manifiesto del panel debe usar `start_url` y `scope` en `/admin/` para no abrir la web pública.
- La página de administración no debe instalar accidentalmente el sitio público mediante este manifiesto.

### Task 1: PWA metadata and regression checks

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/manifest-admin.webmanifest`
- Create: `public/logo-admin-polideportivo-el-jaguar.png`
- Modify: `index.html`
- Modify: `admin/index.html`
- Modify: `src/ui.check.ts`
- Test: `src/ui.check.ts` via `npm run check:ui`

**Interfaces:**
- Consumes: existing `public/favicon-jaguar.png` and `public/logo-admin-polideportivo-el-jaguar.jpg`.
- Produces: `/manifest.webmanifest` for public reservations and `/manifest-admin.webmanifest` for `/admin/`, with HTML links for Android/iPhone.

- [x] **Step 1: Add failing assertions** for the manifest link, Apple touch icon, app title metadata, manifest file, and exact `name`, `short_name`, `start_url`, `display`, and icon values.
- [x] **Step 2: Run `npm run check:ui`** and confirm it fails because the new PWA metadata is absent.
- [x] **Step 3: Create `public/manifest.webmanifest`** and add the manifest and iPhone metadata links to `index.html`.
- [x] **Step 4: Run `npm run check:ui`** and confirm the checks pass.
- [x] **Step 5: Run `npm run build`** and confirm the production build succeeds.
- [x] **Step 6: Add the admin manifest, admin HTML metadata, and PNG copy of the administrative logo.**
- [x] **Step 7: Run `npm run check:ui`, `npm run typecheck`, `npm run lint`, and `npm run build`** and confirm they pass.
