# Duraciones de reserva de hasta 3 horas

## Intención

Permitir que el cliente reserve turnos de 1, 1.5, 2 o 3 horas. Los turnos seguirán comenzando en horas enteras; por ejemplo, 8:00–9:30. El límite máximo será de 3 horas y se validará en la interfaz, en la lógica local y en Supabase.

## Alcance

- Cambiar `horas` de entero a decimal con incrementos de 0.5.
- Actualizar la disponibilidad para detectar cruces con reservas de duración decimal.
- Mostrar correctamente finales como `9:30` y calcular precios proporcionalmente.
- Mantener los bloqueos semanales de la academia y el horario de atención 7:00–1:00.
- Actualizar reportes y alarmas para sumar y mostrar horas decimales.
- Reforzar las restricciones equivalentes en las funciones RPC y la tabla `reservas`.

## Decisión técnica

Se almacenará `horas` como `numeric(2,1)` y se usarán rangos numéricos para evitar solapamientos. `inicio` seguirá siendo un número entero. Las duraciones válidas serán exactamente `1`, `1.5`, `2` y `3`.

## Fuera de alcance

No se permitirán inicios a los 30 minutos (`8:30`, `9:30`, etc.) en esta iteración.

