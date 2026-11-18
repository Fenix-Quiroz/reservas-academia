# Rediseño de Sorteos con Slot Vertical

## Objetivo

Convertir `/admin/sorteos` en una página independiente del panel general, con un slot vertical como foco visual, una presentación premium basada en negro carbón, dorado y marfil, y datos demo aislados para facilitar la futura conexión con Supabase.

## Alcance

- Eliminar la sensación de pantalla con navegación lateral.
- Mantener una cabecera compacta con marca, estado demo y regreso al panel.
- Reemplazar el tambor horizontal por un slot vertical legible y centrado.
- Mostrar campaña, reglas, métricas, transparencia y ganador en tarjetas independientes.
- Conservar el historial y la tabla de probabilidades como contenido secundario.
- Mantener el sorteo como demo local; no se conecta todavía a Supabase.

## Decisiones visuales

- Fondo principal: negro carbón `#0B0B0A` / `#151412`.
- Marca: dorado `#D29A14` con resaltado `#F1C75B`.
- Superficies: marfil `#FAF8F3` y blanco.
- El slot vertical muestra tres tickets grandes: anterior, seleccionado y siguiente.
- El resultado demo se elige en el navegador y se presenta como una animación visual; la persistencia segura queda fuera de este cambio.

## Estructura

- `src/sorteoDemo.ts`: tipos, participantes demo, generación de tickets y ventana visible del slot.
- `src/components/admin/AdminSorteosVista.tsx`: composición de la pantalla e interacción del slot.
- `src/components/admin/AdminHistorialClientes.tsx`: recibe el dataset demo desde la capa de datos, sin importar JSON directamente.
- `src/index.css`: estilos nuevos y responsive para la página independiente y el slot vertical.

## Fuera de alcance

- Tablas, RPC o persistencia real del sorteo.
- Conexión de reservas reales.
- Cambios en autenticación o permisos.
