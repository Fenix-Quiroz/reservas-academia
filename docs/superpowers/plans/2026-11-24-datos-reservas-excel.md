# Excel de datos de reservas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un segundo Excel histórico que muestre una fila por reserva, agrupado visualmente por campo y con el comprobante de cada reserva incrustado como imagen.

**Architecture:** Mantener `exportarBalance.ts` y el flujo del balance mensual sin cambios. Crear un exportador independiente basado en ExcelJS para poder incrustar imágenes; recibir las reservas, los campos y los comprobantes ya cargados, descargar cada comprobante directamente del bucket privado durante la generación y disparar la descarga del libro desde el componente administrativo.

**Tech Stack:** React 19, TypeScript, Vite, ExcelJS para el libro con imágenes, `xlsx-js-style` únicamente para el Excel existente, checks ejecutables con `tsx` y Node `assert`.

**Spec:** `docs/superpowers/specs/2026-11-24-datos-reservas-excel-design.md`

## Global Constraints

- El Excel de balance mensual existente conserva su comportamiento y estructura.
- El nuevo reporte es histórico y usa todas las reservas disponibles en el panel.
- El libro nuevo tiene una sola hoja con bloques consecutivos por campo.
- Cada reserva aparece exactamente una vez en el bloque de su campo.
- Una persona con tres reservas aparece en tres filas, repitiendo nombre, número y comprobante correspondiente.
- La imagen del comprobante se incrusta en el libro; no se guarda una URL firmada que pueda vencer.
- Las reservas sin comprobante y los comprobantes que no puedan descargarse producen una fila legible y no abortan todo el archivo.

## Review Focus

- Tres reservas del mismo número: deben producir tres filas ordenadas y conservar el comprobante correcto por reserva; se cubre en la prueba del ordenamiento y armado de filas.
- Dos reservas con nombres distintos para el mismo número: deben contarse como la misma persona; se cubre en la prueba de agrupación por celular.
- Reserva sin comprobante: debe mostrar `Cliente confiable — no tiene comprobante` y mantener la fila; se cubre en la prueba del libro.
- Error al resolver una imagen privada: debe mostrar `No se pudo cargar` y permitir completar la descarga; se cubre en la prueba del exportador asíncrono.
- Campo sin reservas: debe conservar título y encabezados y mostrar el estado vacío; se cubre en la prueba de bloques.

---

### Task 1: Modelo de filas y ordenamiento histórico

**Files:**
- Create: `src/exportarDatosReservas.ts`
- Create: `src/exportarDatosReservas.check.ts`
- Modify: `package.json` (only if the chosen workbook library is added in this task)

**Interfaces:**
- Consumes: `Reserva`, `Campo` y `ComprobanteAdmin` de `src/types.ts`.
- Produces: `export interface FilaDatosReserva`, `export function prepararFilasDatosReservas(reservas, canchas, comprobantes): FilaDatosReserva[]` y una función interna/exportada de agrupación por campo que el armado del libro reutilizará.

- [ ] **Step 1: Write the failing test**

  En `src/exportarDatosReservas.check.ts`, crear reservas de Campo 1 y Campo 2 donde el celular `912345678` tenga tres reservas, otro celular tenga una y el mismo primer celular use nombres distintos en una reserva. Afirmar que:

  - el resultado contiene una fila por reserva;
  - las tres filas del celular `912345678` conservan sus tres `reservaId` y sus tres comprobantes;
  - el grupo de tres filas aparece antes del grupo de una fila dentro de Campo 1;
  - todos los campos se conservan en su bloque correspondiente.

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx tsx src/exportarDatosReservas.check.ts`

  Expected: FAIL because `prepararFilasDatosReservas` does not exist yet.

- [ ] **Step 3: Implement the minimal model and sorting**

  En `src/exportarDatosReservas.ts`, definir una fila con `reservaId`, `campo`, `nombre`, `celular`, `fecha`, `horario`, `horas` y `comprobante`. Construirla desde cada reserva sin filtrar por estado ni mes; asociar el comprobante por `reservaId`; agrupar y ordenar por campo configurado, cantidad de reservas del celular descendente, fecha ascendente, inicio ascendente e id como desempate. Usar `rangoHablado` para el horario visible.

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx tsx src/exportarDatosReservas.check.ts`

  Expected: PASS, confirmando que tres reservas se representan como tres filas y que se conserva la asociación individual del comprobante.

- [ ] **Step 5: Commit**

  ```bash
  git add src/exportarDatosReservas.ts src/exportarDatosReservas.check.ts
  git commit -m "feat: preparar filas del reporte de reservas"
  ```

### Task 2: Libro Excel con bloques por campo e imágenes

**Files:**
- Modify: `package.json` and `package-lock.json` to add `exceljs`.
- Modify: `src/exportarDatosReservas.ts`.
- Modify: `src/exportarDatosReservas.check.ts`.

**Interfaces:**
- Consumes: `prepararFilasDatosReservas` de Task 1 and `resolverComprobante?: (storagePath: string) => Promise<Blob>` for authenticated private downloads.
- Produces: `export async function crearLibroDatosReservas(reservas, canchas, comprobantes, resolverComprobante?)` and `export async function descargarDatosReservas(...)`.

- [ ] **Step 1: Write the failing test**

  Extend `src/exportarDatosReservas.check.ts` to build a workbook from fixture reservations and fields. Assert that:

  - the first worksheet is the data sheet;
  - it contains a large `CAMPO 1` block, its headers, three reservation rows, then a `CAMPO 2` block;
  - every reservation row repeats name and cellular number;
  - the no-comprobante row contains `Cliente confiable — no tiene comprobante`;
  - a resolver returning a data URL adds one media item for the reservation with a receipt;
  - a resolver that rejects writes `No se pudo cargar` and still returns a workbook.

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx tsx src/exportarDatosReservas.check.ts`

  Expected: FAIL because the workbook creator and `exceljs` dependency are not present.

- [ ] **Step 3: Add the workbook dependency and implement the exporter**

  Add `exceljs` using the repository package manager. Build one worksheet named `Datos de reservas` with an overall title and repeated blocks. Merge and style each field title, keep the sheet scrollable without freezing Campo 1, set readable widths and taller row heights, write dates and text columns, and add a receipt image to the `Comprobante` column using the resolver's downloaded `Blob`. Prepare up to five comprobantes in parallel and report progress to the button. Keep a visible fallback string for missing or failed images. Download using `writeBuffer`, `Blob`, an object URL, and a temporary anchor in the browser.

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx tsx src/exportarDatosReservas.check.ts`

  Expected: PASS, including media and fallback assertions.

- [ ] **Step 5: Commit**

  ```bash
  git add package.json package-lock.json src/exportarDatosReservas.ts src/exportarDatosReservas.check.ts
  git commit -m "feat: generar excel de reservas con comprobantes"
  ```

### Task 3: Botón administrativo separado

**Files:**
- Modify: `src/components/admin/AdminBalanceMensual.tsx`.
- Modify: `src/AdminApp.tsx`.
- Modify: `src/index.css` only if the existing report button styles do not cover the new control.
- Modify: `src/componentization.check.ts` or create a focused admin check only if the existing component checks cover the new prop shape insufficiently.

**Interfaces:**
- Consumes: `descargarDatosReservas` from Task 2, `comprobantesAdmin` from `AdminApp`, and `descargarComprobanteAdminRemota` for the authenticated image `Blob` resolver when Supabase is configured.
- Produces: a second download button labeled `Descargar datos de reservas`, with its own loading/error state and no changes to the current `Descargar Excel` balance action.

- [ ] **Step 1: Write the failing test**

  Add a focused source/component assertion that `AdminBalanceMensual` receives `comprobantes`, renders the new button label, and calls the new exporter path while the existing `Descargar Excel` path remains present.

- [ ] **Step 2: Run test to verify it fails**

  Run: `npm run check:components` (or the focused check command selected for the existing component test style).

  Expected: FAIL because the new prop, button, and handler are absent.

- [ ] **Step 3: Implement the UI wiring**

  Pass `comprobantesAdmin` from `AdminApp` to `AdminBalanceMensual`. Add the new button beside the existing report actions, guard it with the existing action lock, show `Preparando datos…` or the comprobante progress while awaiting downloads and workbook creation, use the direct Supabase storage download helper only when remote data is configured, and show a dedicated download error without affecting the balance error state.

- [ ] **Step 4: Run test to verify it passes**

  Run: `npm run check:components` and manually verify the admin report section shows both buttons and the current balance button still downloads the original workbook.

  Expected: PASS and both controls remain independently usable.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/admin/AdminBalanceMensual.tsx src/AdminApp.tsx src/index.css src/componentization.check.ts
  git commit -m "feat: agregar descarga de datos de reservas"
  ```

### Task 4: Full verification

**Files:**
- No new files expected; modify only tests if a verification command exposes a real regression.

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: verified source, checks and production build.

- [ ] **Step 1: Run focused checks**

  Run: `npx tsx src/exportarDatosReservas.check.ts` and the relevant existing admin/component checks.

  Expected: PASS with no warnings.

- [ ] **Step 2: Run typecheck and lint**

  Run: `npm run typecheck` and `npm run lint`.

  Expected: PASS.

- [ ] **Step 3: Run the production build**

  Run: `npm run build`.

  Expected: PASS, with the new exporter bundled and the existing balance export still available.

- [ ] **Step 4: Commit verification-only fixes, if any**

  ```bash
  git add <only-files-fixed-by-verification>
  git commit -m "test: verify datos de reservas export"
  ```

