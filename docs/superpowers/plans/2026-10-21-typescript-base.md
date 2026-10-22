# Base de TypeScript Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar la infraestructura de TypeScript y los tipos de dominio iniciales sin alterar la aplicación.

**Architecture:** TypeScript se incorporará de forma incremental. La Parte 1 añadirá el compilador en modo de comprobación, un ejecutor para futuras pruebas TypeScript y tipos puros compartidos; los módulos JavaScript existentes continuarán funcionando hasta sus respectivas partes de migración.

**Tech Stack:** React 19, Vite, TypeScript, `tsx`, JavaScript/JSX existente.

**Spec:** `docs/superpowers/specs/2026-10-21-typescript-base-design.md`

## Global Constraints

- No cambiar la interfaz ni el comportamiento visible.
- No convertir todavía archivos `.js` o `.jsx`.
- No modificar `main`, estilos, rutas ni configuración de Supabase.
- No hacer commits hasta recibir una instrucción explícita del usuario.
- La aplicación debe seguir compilando con Vite.

## Review Focus

- Un `Campo` debe aceptar exactamente los datos actuales de `src/data/canchas.json`.
- Una `Reserva` debe representar tanto reservas locales como filas remotas con identificador string.
- Los filtros de administración deben permitir las opciones actuales `proximas`/`todas` y campos dinámicos por fecha o cancha.
- La configuración debe comprobar solo archivos TypeScript nuevos para no bloquear la migración gradual de JavaScript.
- El nuevo typecheck no debe introducir cambios en el bundle de producción.

---

### Task 1: Incorporar la infraestructura TypeScript

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tsconfig.json`
- Create: `src/env.d.ts`
- Test: `npm run typecheck`

**Interfaces:**
- Produces `npm run typecheck`.
- Produce una configuración estricta, sin emisión y compatible con Vite.

- [ ] **Step 1: Añadir la prueba de compilación**

  Configurar el script `typecheck` para ejecutar `tsc --noEmit` y preparar el `tsconfig.json` con el alcance de los archivos TypeScript nuevos.

- [ ] **Step 2: Ejecutar el typecheck**

  Run: `npm run typecheck`

  Expected: PASS con el proyecto actual, sin incorporar todavía módulos de aplicación TypeScript.

- [ ] **Step 3: Verificar el build existente**

  Run: `npm run lint; npm run build`

  Expected: PASS; el bundle y los archivos JavaScript existentes no cambian.

### Task 2: Añadir los tipos de dominio iniciales

**Files:**
- Create: `src/types.ts`
- Create: `src/types.check.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- `Campo`: `id`, `nombre`, `deporte`, `jugadores`, `precioHora`, `color`, `imagen` y `oferta`.
- `Cliente`: `alias` y `celular`.
- `Reserva`: `id`, `canchaId`, `fecha`, `inicio`, `horas`, `alias` y `celular`, con `nombre` opcional para compatibilidad con datos antiguos.
- `ReservaNueva`: datos necesarios para crear una reserva sin exigir `id`.
- `FiltrosAdmin`: vista, fecha, cancha y texto de búsqueda.

- [ ] **Step 1: Escribir la comprobación de contratos fallida**

  Crear `src/types.check.ts` con valores de ejemplo usando `satisfies` para `Campo`, `Cliente`, `Reserva`, `ReservaNueva` y `FiltrosAdmin`. El archivo debe importar `./types.js`, que todavía no existirá.

- [ ] **Step 2: Confirmar el fallo esperado**

  Run: `npm run typecheck`

  Expected: FAIL indicando que no se encuentra `src/types.js` o los tipos todavía no existen.

- [ ] **Step 3: Implementar los tipos**

  Crear `src/types.ts` con tipos puros, sin imports de React, Supabase ni APIs del navegador. Mantener los identificadores compatibles con los datos actuales.

- [ ] **Step 4: Confirmar que los contratos pasan**

  Run: `npm run typecheck`

  Expected: PASS sin emitir archivos.

- [ ] **Step 5: Ejecutar la suite completa de la Parte 1**

  Run: `npm run check; npm run check:ui; npm run check:scenarios; npm run check:admin; npm run check:supabase; npm run check:components; npm run lint; npm run typecheck; npm run build; git diff --check`

  Expected: todos los comandos terminan con código 0.
