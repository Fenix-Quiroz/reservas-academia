# Selector de fechas para dos semanas

## Intención

Permitir que el cliente reserve cualquier día dentro de los próximos 14 días,
sin mostrar 14 tarjetas juntas en móvil. La vista inicial será la semana actual
y el usuario podrá cambiar a la siguiente semana con un toque.

## Alcance

- En el cliente, mostrar las pestañas `Esta semana` y `Próxima semana`.
- Mantener siete tarjetas de días visibles por semana.
- Iniciar siempre en `Esta semana`.
- Mantener el flujo actual por etapas: día → duración → turno → hora.
- Ampliar las funciones públicas de Supabase para aceptar fechas desde hoy
  hasta hoy + 13 días.
- Mantener la validación de horas pasadas, entrenamientos, eventos y reservas
  ocupadas.
- El panel administrativo se ajustará en una tarea posterior.

## Fuera de alcance

- No mostrar más de 14 días.
- No agregar calendario mensual.
- No cambiar todavía los filtros del panel administrativo.
- No modificar las reglas de disponibilidad ni los precios.

## Enfoques considerados

1. Mostrar 14 tarjetas juntas: implementación sencilla, pero genera demasiado
   desplazamiento y dificulta comparar fechas en móvil.
2. Usar dos pestañas de siete días: conserva la interfaz actual, reduce el
   contenido visible y permite cambiar de semana con un toque. Es el enfoque
   elegido.
3. Usar un desplegable de fechas: ocupa menos espacio, pero oculta las fechas
   y requiere abrir un control para descubrirlas.

## Diseño elegido

`SelectorHorario` recibirá la semana seleccionada y renderizará los días de la
semana 0 o 1. Al cambiar de semana se limpiará la hora seleccionada y se
conservarán el campo y la duración elegidos. La fecha real seguirá calculándose
con el índice absoluto del día, de modo que el RPC público reciba la fecha
correcta.

El cliente y la base de datos usarán el mismo rango de 14 días. Las funciones
RPC seguirán siendo la fuente de verdad para disponibilidad y reservas.

## Verificación

- Comprobar que aparecen siete días por pestaña.
- Comprobar que la segunda pestaña muestra los días 7 a 13.
- Comprobar que una fecha de la segunda semana carga sus horarios.
- Comprobar que no se acepta una fecha fuera de los 14 días.
- Ejecutar checks de reservas, UI, Supabase, typecheck, lint y build.
