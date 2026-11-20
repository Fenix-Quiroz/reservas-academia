# Refresco del panel al abrir una notificación Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh the already-open admin panel when an incoming Web Push notification is opened.

**Architecture:** The Service Worker posts a typed message to an existing admin window after focusing it. `AdminApp` listens for that message and calls its existing data refresh function. A static check pins both sides of the message contract.

**Tech Stack:** React, TypeScript, Web Service Worker, Node/tsx static checks.

**Spec:** `docs/superpowers/specs/2026-11-20-refresco-admin-notificacion-design.md`

## Global Constraints

- Preserve the reservation and payment-confirmation flows.
- Keep `/admin` as the notification destination.
- Do not add dependencies or change database/Web Push contracts.
- Preserve the user's unrelated dirty files on `main`.

## Review Focus

- Existing admin window: it receives the message and refreshes data without a full navigation.
- No existing admin window: notification click keeps opening `/admin` as before.
- Malformed or unrelated service-worker messages: `AdminApp` ignores them.
- Existing refresh errors: the current error handling remains in force.

### Task 1: Add the notification refresh message contract

**Files:**
- Modify: `public/service-worker.js`
- Modify: `src/AdminApp.tsx`
- Modify: `src/notificacionesPush.check.ts`

- [ ] Add a failing static assertion for the message type and listener.
- [ ] Run `npm run check:notificaciones --silent` and confirm it fails for the missing contract.
- [ ] Post `{ type: 'nueva-reserva' }` to the focused admin client in `public/service-worker.js`.
- [ ] Extract the existing `refrescar` function so the `AdminApp` effect can call it from a `message` listener.
- [ ] Ignore messages whose `data.type` is not `nueva-reserva`.
- [ ] Run the focused check, typecheck, full checks, lint, and build.
- [ ] Commit the implementation and plan with `fix: refresh admin after push notification`.

### Task 2: Integrate the verified branch

**Files:**
- No additional source files.

- [ ] Merge the feature branch fast-forward into `main`.
- [ ] Re-run verification on merged `main`.
- [ ] Push `main` and remove only the temporary worktree and branch.
