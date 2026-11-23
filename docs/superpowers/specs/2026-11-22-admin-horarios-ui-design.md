# Ajuste visual de horarios de academia

## Intención

Mantener la sección de horarios limpia en producción: ocultar el aviso técnico de conexión a Supabase y hacer que el botón «Guardar cambios» comparta el estilo redondeado de los botones del panel.

## Alcance

- Quitar solo el aviso normal «Conectado a Supabase»; se conservan los estados de carga y error.
- Mantener intactos el guardado, el borrador local, los switches y la integración con Supabase.
- Reutilizar los estilos existentes del panel, sin crear una variante visual nueva.

## Enfoque elegido

Se eliminará el bloque de estado técnico del render normal de `AdminHorarios` y se añadirá el mismo `border-radius: 999px` usado por los controles primarios del panel al botón de guardado. El check de UI verificará que el aviso de conexión no vuelva a aparecer.

## Criterio de aceptación

El botón «Guardar cambios» debe verse redondeado como «Crear evento especial», la tarjeta «Conectado a Supabase» no debe renderizarse en la vista normal y las verificaciones existentes deben seguir pasando.
