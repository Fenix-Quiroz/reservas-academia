# Navegación móvil del panel administrador

## Objetivo

Mejorar la navegación horizontal del panel administrador en pantallas móviles sin cambiar la navegación de escritorio ni agregar pasos extra para llegar a una sección.

## Alcance

- Mantener las secciones como una fila deslizable.
- Ocultar la barra de desplazamiento visual.
- Mostrar una señal dorada sutil cuando existan opciones fuera del área visible.
- Llevar automáticamente la sección activa a una posición visible cuando cambia por clic o por desplazamiento de la página.
- No modificar el contenido, las rutas ni las acciones de las secciones.

## Enfoques considerados

1. Menú hamburguesa: ahorra ancho, pero agrega un toque adicional y oculta las secciones.
2. Barra horizontal deslizable con indicador y auto-visibilidad: conserva el acceso directo actual y comunica que hay más opciones. Es la opción elegida.
3. Barra inferior fija: facilita el acceso a pocas secciones, pero este panel tiene seis y no escala bien.

## Decisión

Implementar la opción 2 en `AdminNavegacion.tsx` y en el bloque móvil de `src/index.css`. El indicador será decorativo y no bloqueará interacción; el enlace activo se desplazará con `scrollIntoView` dentro de la fila de navegación.

## Criterios de aceptación

- En móvil, la fila no genera overflow horizontal de la página.
- La barra de scroll no es visible.
- Existe una pista visual de más contenido solo cuando la fila puede desplazarse.
- La sección activa queda visible al cambiar de sección.
- En escritorio, la navegación conserva su diseño vertical actual.
