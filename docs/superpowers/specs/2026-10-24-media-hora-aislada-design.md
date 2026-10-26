# Diseño: reservas de media hora aislada

## Intención

Permitir que un bloque libre de 30 minutos se pueda reservar cuando está
aislado entre bloques no disponibles. Las franjas consecutivas libres
seguirán requiriendo una reserva mínima de 1 hora y podrán ampliarse o
reducirse en bloques de 30 minutos.

## Regla propuesta

- Un bloque es `aislado` si está libre y no tiene un bloque libre contiguo
  inmediatamente antes ni después.
- Al tocar un bloque aislado, la selección inicial será de `0.5` horas.
- Al tocar un bloque que forma parte de una secuencia libre, la selección
  inicial seguirá siendo de `1` hora.
- Una selección de 1 hora o más seguirá ampliándose y reduciéndose en
  bloques de 30 minutos hasta un máximo de 3 horas.
- Una selección aislada de 30 minutos se podrá limpiar, pero no ampliarse
  mientras sus vecinos sigan ocupados.
- Los límites de apertura, entrenamientos, eventos y reservas continuarán
  usando intervalos semiabiertos `[inicio, fin)`, por lo que una reserva que
  termina a las 8:00 no bloquea el bloque que comienza a las 8:00.

## Alcance

### Base de datos

- Permitir `0.5` en la restricción de `reservas.horas`.
- Actualizar la validación de `crear_reserva_publica` para aceptar `0.5`.
- Mantener el cálculo del importe como `precio_por_hora * horas`.
- Mantener la RPC de disponibilidad en bloques de 30 minutos.
- Conservar el límite máximo de 3 horas y la exclusión de rangos.

### Frontend

- Incorporar `0.5` a las duraciones válidas del dominio.
- Calcular si un bloque libre está aislado usando sus vecinos inmediatos.
- Mostrar el resumen y el precio de media hora sin crear un paso nuevo.
- Mantener `Eliminar selección`, conflictos, alternativa y validación final.

### Panel y balance

- Conservar las reservas de `0.5` horas en agenda, estados y cancelación.
- El balance diario y mensual sumará media hora y el monto guardado por la
  reserva. Se agregarán pruebas específicas para ese caso.

## No incluido

- No se cambia el precio por hora.
- No se permite reservar menos de 30 minutos.
- No se modifica la privacidad, los tokens ni el rate limiting.
- No se cambia la regla de que una reserva confirmada cuenta como una reserva
  activa, aunque dure media hora.

## Orden de implementación

1. Actualizar y probar las restricciones y RPC de Supabase.
2. Actualizar las reglas puras de duración y disponibilidad.
3. Actualizar `SelectorHorario` y los textos del resumen.
4. Añadir pruebas de bloques aislados, secuencias consecutivas, cierre,
   entrenamientos, eventos y conflictos simultáneos.
5. Ejecutar typecheck, lint, build y toda la batería de comprobaciones.

## Decisión pendiente

Este diseño asume que “aislado” significa que ninguno de sus dos vecinos
inmediatos está libre para una reserva de 30 minutos. Si un vecino está libre,
el bloque pertenece a una secuencia y se mantiene el mínimo de 1 hora.
