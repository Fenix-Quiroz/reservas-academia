# Navegación del panel de administración — Diseño 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar una navegación horizontal de secciones debajo del aviso de sincronización para saltar a Agenda, Reservas especiales, Clientes y Balance sin ocultar el contenido existente.

**Architecture:** Crear un componente `AdminNavegacion` con cinco enlaces de ancla e iconos de `lucide-react`. Los destinos serán la cabecera del panel, Agenda, Eventos, Balance y Control de clientes; la página conservará su flujo vertical normal y el componente marcará la sección visible como activa.

**Tech Stack:** React, TypeScript, CSS existente en `src/index.css`, `lucide-react`.

**Spec:** Decisión del usuario en conversación: implementar el Diseño 2, ubicado debajo de “Datos sincronizados”, con todos los módulos aún visibles al hacer scroll.

## Global Constraints

- Mantener la paleta actual negro/carbono, dorado y texto claro.
- No convertir la navegación en sidebar, modal ni pantalla independiente.
- Mantener el contenido actual y sus acciones sin cambios de negocio.
- En móvil, los botones deben seguir siendo grandes y legibles.

## Review Focus

- La navegación debe aparecer inmediatamente debajo del aviso de sincronización.
- Cada enlace debe llevar a la sección correcta sin perder el estado de filtros o formularios.
- La sección activa debe reflejar la posición del scroll y el clic recién realizado.
- Las etiquetas largas deben mantenerse legibles en móvil sin desbordar.

### Task 1: Navegación y destinos del panel

**Files:**
- Create: `src/components/admin/AdminNavegacion.tsx`
- Modify: `src/AdminApp.tsx`
- Modify: `src/index.css`
- Test: `src/ui.check.ts`

**Interfaces:**
- `AdminNavegacion` no recibe props; usa los IDs públicos de sección `admin-inicio`, `admin-agenda`, `admin-reservas-especiales`, `admin-balance` y `admin-clientes`.

- [ ] Escribir comprobaciones estáticas para el componente, sus cinco etiquetas, los cinco IDs y los estilos de navegación.
- [ ] Ejecutar `npm run check:ui` y observar el fallo por la navegación aún inexistente.
- [ ] Implementar `AdminNavegacion` con enlaces grandes, iconos, `aria-label` y estado activo actualizado al desplazarse.
- [ ] Insertar la navegación justo después del aviso de sincronización y añadir IDs a los destinos existentes sin alterar su contenido.
- [ ] Añadir estilos de escritorio y móvil para la fila segmentada del Diseño 2, manteniendo el flujo vertical.
- [ ] Ejecutar `npm run typecheck` y la comprobación puntual de UI; reportar cualquier aserción preexistente que no pertenezca a este cambio.
