# Selector de horario por pasos

## Intención

Hacer que el cliente avance por ventanas consecutivas al reservar: elegir día, elegir duración, elegir turno y finalmente elegir una hora. Esto evita mostrar demasiadas opciones juntas en móvil y hace más claro qué decisión debe tomar en cada momento.

## Alcance

- Mantener la lógica actual de disponibilidad, solapamientos y reserva.
- Mostrar una sola etapa visible a la vez.
- Mostrar solo la etapa activa y permitir volver a la etapa anterior con un botón contextual.
- Usar los turnos existentes: mañana, tarde y noche.
- No cambiar Supabase, precios ni duraciones. El componente conserva sus callbacks actuales y añade solo `onClearHour` para limpiar una hora incompatible.

## Enfoques considerados

1. **Estado local dentro de `SelectorHorario` (elegido):** controla la etapa visible sin cambiar rutas ni el estado del flujo padre. Es el cambio más pequeño y preserva el comportamiento actual.
2. Rutas separadas por etapa: permitiría enlaces directos a cada paso, pero añade navegación, sincronización de estado y más casos de recuperación sin beneficio para este formulario.
3. Acordeón con todas las etapas: reduce el scroll, pero mantiene varias decisiones abiertas y no cumple la experiencia secuencial solicitada.

## Comportamiento elegido

- La pantalla inicia en “Elige el día”.
- Al seleccionar un día, pasa a “¿Cuánto tiempo quieres jugar?”.
- Al seleccionar duración, pasa a “Elige el turno”.
- Al seleccionar mañana, tarde o noche, muestra solo las horas de ese turno.
- Cada etapa posterior muestra arriba un botón “Volver a elegir…” para regresar a la etapa anterior.
- Cambiar día, duración o turno reinicia la selección de hora para evitar conservar un horario incompatible.
- Si la consulta está cargando o no hay horarios libres, el mensaje se muestra en la etapa de horarios.
