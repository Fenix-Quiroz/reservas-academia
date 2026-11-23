# Editor local de horarios de academia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una sección de administración para bloquear y liberar horarios semanales mediante switches, simulando el guardado en Supabase con JSON y `localStorage`, sin tocar producción.

**Architecture:** La interfaz trabajará contra un repositorio de horarios con una interfaz estable. En esta primera fase el repositorio simulado leerá `src/data/horarios-entrenamientos.json`, persistirá un borrador completo en `localStorage` y simulará un guardado exitoso o fallido. La UI no llamará a Supabase; una futura implementación podrá reemplazar el repositorio sin cambiar el editor.

**Tech Stack:** React 19, TypeScript, Vite, `localStorage`, JSON, `lucide-react`, comprobaciones `tsx` existentes.

**Spec:** `docs/superpowers/specs/2026-11-21-horarios-admin-design.md`

## Global Constraints

- No modificar `supabase/schema.sql`, `supabase/permissions.sql`, funciones RPC ni datos de Supabase en esta fase.
- No llamar a métodos `.from()` o `.rpc()` desde el editor simulado.
- La producción continúa usando `main`; esta rama solo valida la experiencia local.
- Los horarios de entrenamiento se editan en bloques de 30 minutos entre las 7:00 a. m. y las 10:00 p. m.; el último bloque es 9:30–10:00 p. m.
- La grilla se presenta en acordeones de `Mañana` (7:00–12:00), `Tarde` (12:00–19:00) y `Noche` (19:00–22:00), con un solo turno desplegado a la vez.
- El rango editable debe vivir en constantes configurables, no quedar repartido en JSX ni SQL.
- Cada switch actualiza el borrador local inmediatamente.
- El borrador solo se elimina después de una confirmación exitosa del repositorio simulado.
- Las reservas y eventos locales existentes solo generan advertencias; no se cancelan ni se modifican.

## Review Focus

- Rangos actuales de 80/85 minutos: deben ocupar las celdas de 30 minutos que se crucen y compactarse correctamente al guardar dentro del rango 7:00 a. m.–10:00 p. m.
- Switch activado y recarga de página: el estado debe recuperarse desde el borrador local.
- Error o resultado incierto de guardado: el borrador debe conservarse y permitir reintentar.
- Copiar un día: solo debe cambiar el campo y los días seleccionados.
- Conflicto con una reserva local: debe informarse el nombre, fecha y rango sin eliminar la reserva.

### Task 1: Modelo de bloques y repositorio simulado

**Files:**
- Create: `src/horariosAdmin.ts`
- Create: `src/horariosAdminDemo.ts`
- Create: `src/horariosAdmin.check.ts`
- Modify: `package.json`
- Reuse: `src/data/horarios-entrenamientos.json`

**Interfaces:**
- `ConfiguracionHorariosAdmin` representa la configuración completa de horarios bloqueados.
- `CeldaHorarioAdmin` representa una celda de 30 minutos con estado `bloqueado`.
- `RANGO_ENTRENAMIENTOS = { inicioMinuto: 420, finMinuto: 1320 }` define el rango editable y queda preparado para ampliarse.
- `convertirHorariosACeldas(horarios, canchaId)` convierte rangos existentes a celdas visibles dentro del rango configurable.
- `convertirCeldasARangos(celdas)` une celdas contiguas en rangos de entrenamiento.
- `leerConfiguracionHorariosDemo()` carga el estado guardado o usa el JSON inicial.
- `guardarBorradorHorariosDemo(configuracion)` y `leerBorradorHorariosDemo()` manejan el borrador completo.
- `guardarHorariosDemo(configuracion, opciones?)` simula el envío, persiste la configuración de servidor local y puede devolver error en pruebas.

- [x] **Step 1: Escribir comprobaciones fallidas** para convertir rangos de 80/85 minutos, unir celdas contiguas, separar celdas liberadas y conservar otros campos.
- [x] **Step 2: Ejecutar `npm run check:horarios-admin`** y confirmar que las comprobaciones fallan por las funciones ausentes.
- [x] **Step 3: Implementar las funciones puras y el repositorio simulado** usando el JSON existente como semilla y claves versionadas de `localStorage`.
- [x] **Step 4: Ejecutar `npm run check:horarios-admin`** y confirmar que los casos pasan, incluido el error simulado sin borrar el borrador.
- [x] **Step 5: Mantener este checkpoint en la rama** y avisar para revisión antes de construir la interfaz.

### Task 2: Editor visual con borrador automático

**Files:**
- Create: `src/components/admin/AdminHorarios.tsx`
- Modify: `src/index.css`
- Modify: `src/horariosAdmin.check.ts` si se necesitan casos compartidos de interacción de datos.

**Interfaces:**
- `AdminHorarios` recibe `canchas`, `reservas` y `eventos` para mostrar avisos de conflicto sin modificar sus datos.
- El componente mantiene `campoSeleccionado`, `diaSeleccionado`, `configuracionGuardada`, `borrador`, `guardando`, `mensaje` y `error`.
- Cada switch usa `aria-pressed` y un nombre accesible que incluya campo, día y rango.

- [x] **Step 1: Crear el esqueleto del componente** con selector de campo, grilla de días y filas de 30 minutos.
- [x] **Step 2: Conectar cada switch con el borrador local** y mostrar estados `Libre`, `Bloqueado` y cantidad de cambios pendientes.
- [x] **Step 3: Implementar `Guardar cambios`, `Deshacer cambios`, `Copiar día` y `Aplicar a otros días`** contra el repositorio simulado.
- [x] **Step 4: Implementar el flujo de error y reintento** sin eliminar el borrador cuando el guardado falla.
- [x] **Step 5: Añadir avisos de reservas o eventos que coincidan**, mostrando persona, fecha y horario, sin cancelar ni modificar datos.
- [x] **Step 6: Añadir estilos responsive** para convertir la grilla de escritorio en pestañas y lista vertical en móvil, agrupada por turnos desplegables.
- [x] **Step 7: Ejecutar `npm run typecheck` y `npm run build`** y avisar para revisión visual.

### Task 3: Integración con el panel administrativo

**Files:**
- Modify: `src/AdminApp.tsx`
- Modify: `src/components/admin/AdminNavegacion.tsx`
- Modify: `src/index.css`
- Modify: `src/ui.check.ts` o crear una comprobación específica de navegación si hace falta.

- [x] **Step 1: Añadir `admin-horarios` a la navegación** junto a Agenda.
- [x] **Step 2: Renderizar `AdminHorarios` en el panel** pasando campos, reservas y eventos actuales.
- [x] **Step 3: Verificar que la sección no altera Agenda, Reservas especiales ni Clientes.**
- [x] **Step 4: Ejecutar `npm run check:ui`, `npm run typecheck` y `npm run build`.**
- [ ] **Step 5: Levantar la demo local y revisar escritorio y móvil** con los casos de libre, bloqueado, borrador, error y reintento.

### Task 4: Verificación final y entrega de la rama

**Files:**
- Modify only if a verification issue requires a focused fix.
- Update: `docs/superpowers/specs/2026-11-21-horarios-admin-design.md` and this plan with the final decisions if needed.

- [x] **Step 1: Ejecutar `npm run lint`.**
- [x] **Step 2: Ejecutar `npm run typecheck`, `npm run build`, `npm run check:horarios-admin` y `npm run check:ui`.**
- [x] **Step 3: Confirmar que no hay cambios en `supabase/` ni llamadas de escritura a Supabase.**
- [x] **Step 4: Revisar `git diff` y el comportamiento local con el usuario.**
- [x] **Step 5: Commitear la implementación en `codex/horarios-admin` solo después de la revisión.** Commit realizado en la rama.
- [ ] **Step 6: No cambiar a `main` ni hacer push hasta recibir confirmación expresa del usuario.**

## Fase posterior, fuera de este plan

- Crear el adaptador real en `src/supabaseData.ts`.
- Añadir la función RPC y migraciones SQL.
- Probar en un proyecto Supabase separado.
- Revisar la promoción a producción antes de tocar `main`.
