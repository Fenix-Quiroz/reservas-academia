# Ícono y nombre de PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar el sitio público de reservas para que use el logo del Jaguar y el nombre “Reservas” al agregarse a la pantalla de inicio en Android y iPhone.

**Architecture:** Se agregará un manifiesto web estático en `public/` y se enlazará desde `index.html`. El ícono existente `public/favicon-jaguar.png` se reutilizará para no introducir otra fuente de marca ni modificar la UI normal.

**Tech Stack:** Vite, HTML estático, JSON manifest, chequeo de UI con `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-20-pwa-icono-nombre-design.md`

## Global Constraints

- Sitio público: nombre completo “Reservas El Jaguar”; nombre corto “Reservas”.
- Modo instalado: `standalone`.
- Ícono: `/favicon-jaguar.png`.
- No modificar cambios locales previos en `src/components/admin/AdminSorteosVista.tsx` ni `src/index.css`.
- No cambiar la apariencia de la web cuando se abre en una pestaña normal.

## Review Focus

- El manifiesto debe ser válido y estar enlazado desde el HTML público.
- La ruta del ícono debe existir y ser accesible desde `public/`.
- iPhone debe recibir `apple-touch-icon` y un nombre de aplicación.
- El manifiesto debe usar `start_url` y `display` adecuados para abrir la reserva como app.
- La página de administración no debe instalar accidentalmente el sitio público mediante este manifiesto.

### Task 1: PWA metadata and regression checks

**Files:**
- Create: `public/manifest.webmanifest`
- Modify: `index.html`
- Modify: `src/ui.check.ts`
- Test: `src/ui.check.ts` via `npm run check:ui`

**Interfaces:**
- Consumes: existing `public/favicon-jaguar.png`.
- Produces: `/manifest.webmanifest` with the public app metadata and HTML links for Android/iPhone.

- [x] **Step 1: Add failing assertions** for the manifest link, Apple touch icon, app title metadata, manifest file, and exact `name`, `short_name`, `start_url`, `display`, and icon values.
- [x] **Step 2: Run `npm run check:ui`** and confirm it fails because the new PWA metadata is absent.
- [x] **Step 3: Create `public/manifest.webmanifest`** and add the manifest and iPhone metadata links to `index.html`.
- [x] **Step 4: Run `npm run check:ui`** and confirm the checks pass.
- [x] **Step 5: Run `npm run build`** and confirm the production build succeeds.
