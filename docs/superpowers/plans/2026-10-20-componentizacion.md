# Componentización del flujo de reservas y administración — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. No se harán commits hasta que el usuario los solicite explícitamente.

**Goal:** Separar `App.jsx` y `AdminApp.jsx` en componentes enfocados sin cambiar comportamiento, estilos, accesibilidad, datos ni rutas.

**Architecture:** Los componentes de cliente y administrador recibirán datos y callbacks por props. `App.jsx` y `AdminApp.jsx` conservarán el estado de alto nivel, efectos de sincronización y llamadas a almacenamiento/Supabase. Las funciones de presentación de fechas y horas pasarán a un módulo utilitario.

**Tech Stack:** React 19, Vite, JavaScript ESM, CSS existente, comprobaciones Node.js del proyecto.

**Spec:** `docs/superpowers/specs/2026-10-20-componentizacion-design.md`

## Global Constraints

- No cambiar textos, clases CSS, atributos ARIA, rutas ni reglas de reservas.
- No agregar dependencias ni introducir una librería de estado.
- Los componentes hijos no harán llamadas directas a Supabase ni al almacenamiento.
- Mantener la sincronización en tiempo real, el flujo de reserva, “Mis reservas” y autenticación admin.
- No hacer commits hasta recibir una instrucción explícita del usuario.

## Review Focus

- Navegación entre pasos: volver atrás debe conservar o reiniciar el estado exactamente igual que antes.
- Reserva ocupada durante el proceso: la alternativa disponible y el mensaje deben seguir apareciendo.
- Edición y cancelación en “Mis reservas”: los callbacks deben actualizar la lista y los mensajes correctamente.
- Estados de autenticación admin: carga, login, no autorizado y sesión iniciada deben conservarse.
- Responsive y accesibilidad: foco del título, ARIA, imágenes, ausencia de scroll lateral y clases CSS sin cambios.

---

### Task 1: Crear la prueba estructural de componentización

**Files:**
- Create: `src/componentization.check.js`
- Modify: `package.json`
- Test: `src/componentization.check.js`

**Interfaces:**
- Produces el comando `npm run check:components`.
- Define los nombres de archivos y exportaciones que usarán las siguientes tareas.

- [ ] **Step 1: Escribir la prueba estructural fallida**

  Crear comprobaciones Node.js que verifiquen que existen los componentes de cliente y admin previstos, que `App.jsx` y `AdminApp.jsx` los importan, y que las definiciones monolíticas (`function PasoCancha`, `function PasoHorario`, `function PasoDatos`, `function MisReservas`, `function AdminLogin`, etc.) ya no permanezcan en los archivos raíz.

- [ ] **Step 2: Ejecutar la prueba para confirmar el fallo**

  Run: `node src/componentization.check.js`

  Expected: FAIL porque todavía no existen los archivos extraídos ni los imports nuevos.

- [ ] **Step 3: Registrar el script**

  Añadir `"check:components": "node src/componentization.check.js"` a `package.json`, sin cambiar los scripts existentes.

- [ ] **Step 4: Ejecutar nuevamente después de las fases de extracción**

  Run: `npm run check:components`

  Expected: FAIL todavía, hasta completar las tareas 2 a 5; después de cada tarea se repetirá para confirmar el avance.

---

### Task 2: Extraer componentes visuales y utilidades del cliente

**Files:**
- Create: `src/components/cliente/CabeceraCliente.jsx`
- Create: `src/components/cliente/ProgresoReserva.jsx`
- Create: `src/components/cliente/DibujoCampo.jsx`
- Create: `src/components/cliente/SelectorCampos.jsx`
- Create: `src/components/cliente/SelectorHorario.jsx`
- Create: `src/utils/fechasReserva.js`
- Modify: `src/App.jsx`
- Test: `src/componentization.check.js`

**Interfaces:**
- `CabeceraCliente({ verMias, paso, cantidadReservas, onBack, onViewBookings })`.
- `ProgresoReserva({ paso, nombresPasos })`.
- `DibujoCampo({ color, jugadores, deporte })`.
- `SelectorCampos({ campos, onSelect, tituloRef })`.
- `SelectorHorario({ cancha, reservas, dia, onDiaChange, horas, onHorasChange, fecha, onSelectHour, tituloRef })`.
- `fechasReserva.js` exporta `capital`, `nombreDiaCorto`, `nombreDia`, `horaVisible`, `rangoVisible`, `diaDe`.

- [ ] **Step 1: Añadir al test los contratos de los componentes visuales**

  Comprobar que cada archivo exporta su componente y que `App.jsx` importa los componentes en vez de declarar las funciones equivalentes.

- [ ] **Step 2: Ejecutar el test y confirmar el fallo**

  Run: `npm run check:components`

  Expected: FAIL porque los archivos aún no existen.

- [ ] **Step 3: Implementar las extracciones**

  Mover el JSX actual sin alterar clases, textos, atributos ARIA ni handlers. `SelectorCampos` recibirá los campos y el callback de selección; `SelectorHorario` recibirá el estado y callbacks del paso 2. Mover únicamente las funciones puras de fecha/hora a `fechasReserva.js` y actualizar los imports de `App.jsx`.

- [ ] **Step 4: Ejecutar la verificación de cliente visual**

  Run: `npm run check:ui; npm run lint`

  Expected: PASS sin cambios en los textos ni en las clases comprobadas. `check:components` seguirá fallando hasta completar la tarea 3, porque aún quedarán componentes con estado del cliente en `App.jsx`.

---

### Task 3: Extraer los componentes con estado local del flujo cliente

**Files:**
- Create: `src/components/cliente/DatosReserva.jsx`
- Create: `src/components/cliente/ReservaCompletada.jsx`
- Create: `src/components/cliente/MisReservas.jsx`
- Modify: `src/App.jsx`
- Modify: `src/componentization.check.js`

**Interfaces:**
- `DatosReserva({ cancha, dia, fecha, horas, inicio, onInicioChange, yo, onRememberClient, onForgetClient, onBack, onViewBookings, onReserved, tituloRef, actions })`.
- `ReservaCompletada({ reserva, cancha, dia, onFinish, onViewBookings, tituloRef })`.
- `MisReservas({ reservas, yo, canchas, onCancel, onUpdateData, onReserve, tituloRef })`.
- `actions` tiene las funciones `createClient(alias, celular)`, `findClient(celular)` y `reserve(client, hora)`, todas asíncronas y con resultados `{ error?, cliente?, reserva?, alternativa? }`; los componentes no importarán `almacen.js`, Supabase ni suscripciones.

- [ ] **Step 1: Añadir al test los límites de dependencia**

  Comprobar que los componentes cliente no importan `almacen.js`, `supabase.js` ni `supabaseData.js`, y que `App.jsx` mantiene esas dependencias.

- [ ] **Step 2: Ejecutar el test para confirmar el fallo**

  Run: `npm run check:components`

  Expected: FAIL porque los componentes todavía no existen o aún contienen la lógica en `App.jsx`.

- [ ] **Step 3: Extraer el JSX y mover las acciones al orquestador**

  Mantener en `App.jsx` las operaciones de crear reserva, registrar/buscar cliente, cancelar y actualizar datos. Pasarlas como callbacks a los componentes. Mantener dentro de los componentes únicamente estado de formulario, validación y estados visuales locales como `procesando`, `conflicto` y confirmaciones.

- [ ] **Step 4: Ejecutar las comprobaciones del flujo cliente**

  Run: `npm run check; npm run check:scenarios; npm run check:ui; npm run check:components; npm run lint`

  Expected: PASS y sin cambios en el comportamiento del flujo de reserva.

---

### Task 4: Extraer autenticación y cabecera del administrador

**Files:**
- Create: `src/components/admin/AdminMarca.jsx`
- Create: `src/components/admin/AdminLogin.jsx`
- Create: `src/components/admin/AdminNoAutorizado.jsx`
- Create: `src/components/admin/AdminCabecera.jsx`
- Modify: `src/AdminApp.jsx`
- Modify: `src/componentization.check.js`

**Interfaces:**
- `AdminMarca()`.
- `AdminLogin({ errorInicial, onLogin })`.
- `AdminNoAutorizado({ onLogout })`.
- `AdminCabecera({ supabaseConfigurado, porLimpiar, cargando, onClearRequest, onClearCancel, onClearConfirm, onRefresh, onLogout })`.

- [ ] **Step 1: Añadir al test los contratos admin**

  Comprobar exportaciones e imports, y que `AdminLogin.jsx` y los componentes admin no importan directamente `supabase.js` ni `almacen.js`.

- [ ] **Step 2: Ejecutar el test y confirmar el fallo**

  Run: `npm run check:components`

  Expected: FAIL antes de crear los componentes.

- [ ] **Step 3: Extraer los componentes y pasar callbacks**

  Mantener autenticación, `signInWithPassword`, `signOut`, limpieza local y refresco en `AdminApp.jsx`; `AdminLogin` solo gestionará los campos y llamará a `onLogin(email, password)`.

- [ ] **Step 4: Ejecutar la verificación admin**

  Run: `npm run check:admin; npm run check:components; npm run lint`

  Expected: PASS, conservando los estados de carga y los mensajes de acceso.

---

### Task 5: Extraer agenda, filtros y tarjetas del administrador

**Files:**
- Create: `src/components/admin/AdminMetricas.jsx`
- Create: `src/components/admin/AdminFiltros.jsx`
- Create: `src/components/admin/AdminReservaCard.jsx`
- Create: `src/components/admin/AdminListado.jsx`
- Modify: `src/AdminApp.jsx`
- Modify: `src/componentization.check.js`

**Interfaces:**
- `AdminMetricas({ resumen })`.
- `AdminFiltros({ filtros, onChange, canchas })`.
- `AdminReservaCard({ reserva, cancha, puedeCancelar, porCancelar, cancelando, onRequestCancel, onCancel, onCancelRequest })`.
- `AdminListado({ visibles, cargando, canchas, porCancelar, cancelando, onRequestCancel, onCancel, onCancelRequest })`.

- [ ] **Step 1: Añadir al test los contratos de agenda**

  Comprobar que `AdminApp.jsx` conserva las funciones de datos y que la presentación de métricas, filtros, estados vacío/carga y tarjetas vive en los componentes nuevos.

- [ ] **Step 2: Ejecutar el test para confirmar el fallo**

  Run: `npm run check:components`

  Expected: FAIL hasta completar la extracción.

- [ ] **Step 3: Extraer y conectar la agenda**

  Pasar valores derivados y callbacks por props. Conservar las clases CSS, el filtrado de `filtrarReservas`, los textos, los mensajes de cancelación y los estados de Supabase.

- [ ] **Step 4: Ejecutar la suite completa**

  Run: `npm run check; npm run check:ui; npm run check:scenarios; npm run check:admin; npm run check:supabase; npm run check:components; npm run lint; npm run build; git diff --check`

  Expected: todos los comandos terminan con código 0.

---

### Task 6: Verificación visual responsive y limpieza final

**Files:**
- Modify: `src/componentization.check.js` only if a structural assertion needs adjustment after review.

- [ ] **Step 1: Revisar el diff**

  Confirmar que no se modificaron `src/index.css`, `src/design-tokens.css`, `src/data/canchas.json`, reglas de reserva ni configuración de Supabase.

- [ ] **Step 2: Ejecutar la verificación completa nuevamente**

  Run: `npm run check; npm run check:ui; npm run check:scenarios; npm run check:admin; npm run check:supabase; npm run check:components; npm run lint; npm run build; git diff --check`

  Expected: todos los comandos terminan con código 0 y `git diff --check` no reporta errores de espacios en blanco.

- [ ] **Step 3: Revisar manualmente móvil y escritorio**

  Comprobar el flujo cliente completo y `/admin` en anchos aproximados de 320 px, 390 px y escritorio. Verificar foco, navegación, imágenes, tarjetas, oferta, filtros, login y ausencia de scroll horizontal.
