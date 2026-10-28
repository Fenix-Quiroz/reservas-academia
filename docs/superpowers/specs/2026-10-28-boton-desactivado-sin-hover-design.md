# Botón desactivado sin hover

## Intención

Evitar que el botón principal de `DatosReserva` cambie su fondo al pasar el cursor cuando está desactivado, por ejemplo mientras muestra «Selecciona tu comprobante».

## Alcance

- Mantener el hover actual para el botón activo.
- Excluir explícitamente el estado `disabled` de la regla hover de `.main-datos .boton-principal`.
- Añadir una aserción al chequeo de UI para proteger este contrato visual.

No se cambiarán la lógica de habilitación, el texto, la accesibilidad ni los estilos de otros botones.

## Enfoque

Se consideró restaurar el fondo del botón desactivado mediante una regla posterior, pero se descarta porque deja el hover aplicándose y depende del orden del CSS. Se usará el selector `.main-datos .boton-principal:hover:not(:disabled)`, que expresa directamente que el hover solo corresponde a controles habilitados.

## Verificación

Ejecutar el chequeo de UI, el lint, el typecheck y el build del proyecto. Confirmar también que no se modifiquen los cambios no relacionados que ya existen en el árbol de trabajo.
