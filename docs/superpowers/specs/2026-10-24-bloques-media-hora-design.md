# Selección por bloques de media hora — Diseño

## Intención

Después de elegir el turno, el cliente verá todos los bloques de 30 minutos de ese turno. Cada bloque mostrará su precio de media hora. Al seleccionar un bloque se marcará automáticamente un mínimo de una hora y el cliente podrá ampliar la selección de 30 en 30 minutos hasta tres horas.

## Comportamiento

- La disponibilidad pública se consulta por bloques de `0.5` horas.
- `0.5` solo se usa para consultar disponibilidad; una reserva real seguirá aceptando únicamente `1`, `1.5`, `2`, `2.5` o `3` horas.
- La reserva final continúa siendo un único registro con `inicio` y `horas`; no se crea una fila por cada media hora.
- La selección debe ser contigua, comenzar con mínimo 1 hora y no superar 3 horas.
- Los entrenamientos, eventos, reservas existentes, horas pasadas y reglas de Supabase siguen bloqueando los bloques correspondientes.

## Enfoques considerados

1. **Extender la RPC existente para consultar `0.5` horas (elegido).** Mantiene la tabla, la firma de la RPC y los permisos actuales; cambia solo la validación de lectura y el selector del cliente.
2. Crear una nueva RPC específica para bloques de media hora. Sería semánticamente más explícita, pero duplicaría lógica, permisos y pruebas sin aportar seguridad adicional.

## No objetivos

- No permitir reservas reales de 30 minutos.
- No modificar la estructura de `reservas`, los precios guardados ni los reportes.
- No cambiar las reglas de duración máxima, conflictos o seguridad del RPC de creación.

## Decisiones de implementación

- La función de consulta pública recibirá `p_horas = 0.5` y devolverá cada inicio de media hora como libre u ocupado.
- El frontend calculará la selección contigua, actualizará `horas` y enviará la reserva existente con el rango completo.
- La validación del servidor seguirá siendo la autoridad final frente a carreras o solicitudes manipuladas.
