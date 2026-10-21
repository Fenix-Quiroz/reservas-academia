# Componentización del flujo de reservas y administración

## Objetivo

Separar el código monolítico de `src/App.jsx` y `src/AdminApp.jsx` en componentes enfocados, manteniendo exactamente el comportamiento actual, la apariencia visible, la accesibilidad, Supabase y el almacenamiento local.

## Alcance

La refactorización se hará en dos fases independientes:

1. Extraer el flujo del cliente desde `App.jsx`.
2. Extraer el panel de administración desde `AdminApp.jsx`.

No se cambiarán reglas de reserva, mensajes, estilos, estructura de datos, rutas, dependencias ni configuración de Supabase.

## Arquitectura propuesta

`App.jsx` y `AdminApp.jsx` quedarán como componentes de composición y orquestación. Mantendrán el estado de alto nivel, los efectos de sincronización y las acciones que conectan la interfaz con `almacen.js` y Supabase. El JSX de cada pantalla pasará a componentes separados con props explícitas.

### Componentes del cliente

- `src/components/cliente/CabeceraCliente.jsx`: marca, navegación atrás y acceso a “Mis reservas”.
- `src/components/cliente/ProgresoReserva.jsx`: indicador accesible de los tres pasos.
- `src/components/cliente/SelectorCampos.jsx`: título, tarjetas de campos, imágenes, oferta y acción de selección.
- `src/components/cliente/SelectorHorario.jsx`: días, duración y horarios disponibles.
- `src/components/cliente/DatosReserva.jsx`: alta o búsqueda del cliente, resumen y confirmación.
- `src/components/cliente/ReservaCompletada.jsx`: confirmación de reserva y acciones posteriores.
- `src/components/cliente/MisReservas.jsx`: listado, edición de datos y cancelación.
- `src/components/cliente/DibujoCampo.jsx`: ilustración SVG compacta usada en resúmenes.
- `src/utils/fechasReserva.js`: constantes y funciones de presentación de fechas y horas que no dependen del renderizado.

Las props conservarán nombres descriptivos y funciones de callback (`onSelect`, `onBack`, `onSubmit`, `onCancel`, etc.) sin que los componentes hijos accedan directamente a Supabase o al almacenamiento.

### Componentes del administrador

- `src/components/admin/AdminMarca.jsx`: logo y nombre del panel.
- `src/components/admin/AdminLogin.jsx`: formulario de autenticación.
- `src/components/admin/AdminNoAutorizado.jsx`: estado de acceso no autorizado.
- `src/components/admin/AdminCabecera.jsx`: título, estado y acciones del panel.
- `src/components/admin/AdminMetricas.jsx`: métricas resumidas.
- `src/components/admin/AdminFiltros.jsx`: filtros de agenda.
- `src/components/admin/AdminReservaCard.jsx`: presentación y cancelación de una reserva.
- `src/components/admin/AdminListado.jsx`: estados de carga, vacío y listado filtrado.

`AdminApp.jsx` conservará la autenticación, sincronización, filtros derivados y acciones de datos; los componentes admin recibirán valores y callbacks.

## Reglas de la refactorización

- No crear componentes genéricos prematuros para botones, tarjetas o formularios; primero se separan unidades reales del dominio.
- No introducir una librería de estado ni dependencias nuevas.
- No duplicar lógica de reservas ni llamadas a Supabase.
- Mantener las clases CSS existentes para que no cambie el diseño.
- Mantener nombres, textos, atributos ARIA y orden de foco.
- Cada fase debe dejar la aplicación compilable y verificable.

## Verificación

Antes y después de cada fase se ejecutarán:

- `npm run check`
- `npm run check:ui`
- `npm run check:scenarios`
- `npm run check:admin`
- `npm run check:supabase`
- `npm run lint`
- `npm run build`
- `git diff --check`

También se comprobará manualmente el flujo cliente completo y la ruta `/admin` en móvil y escritorio, verificando que no aparezca scroll lateral ni cambios visuales involuntarios.

## Resultado esperado

La lógica de cada pantalla podrá entenderse y probarse sin leer un archivo de más de 800 líneas, mientras que `App.jsx` y `AdminApp.jsx` conservarán únicamente la coordinación de estado, efectos y navegación.
