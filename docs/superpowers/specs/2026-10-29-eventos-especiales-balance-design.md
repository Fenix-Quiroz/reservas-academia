# Eventos especiales en el balance mensual

## Intención

Registrar el precio total cobrado por cada evento especial y exportarlo al Excel sin duplicar ingresos cuando un evento ocupa varios campos.

## Comportamiento acordado

- Un evento que ocupa Campo 1, Campo 2 y Campo 3 pertenece a la sección `Todos los campos`.
- Ese evento no aparece nuevamente en las secciones individuales de Campo 1, Campo 2 o Campo 3.
- Una reserva especial creada para un solo campo aparece únicamente en la sección de ese campo.
- El precio ingresado es el total del evento, no un precio por campo.
- El balance suma el precio de cada evento especial una sola vez.
- El formulario incluye un campo obligatorio `Precio cobrado (S/)`.

## Diseño elegido

Crear un registro padre de evento especial con su nombre, fecha, horario, contacto, notas, tipo (`individual` o `todos_los_campos`) y `precio_cobrado`. Los bloqueos por cancha se mantienen como registros hijos vinculados al evento padre. La interfaz seguirá mostrando una sola tarjeta agrupada para los campos que pertenecen al mismo evento.

El Excel tendrá una hoja `Eventos especiales` con una vista `Todos los campos` para los eventos agrupados y vistas por campo únicamente para eventos individuales. El precio total aparecerá en la fila del evento padre, nunca repetido en cada campo hijo. Los ingresos totales del balance incluirán cada evento especial una sola vez.

## Enfoques considerados

1. Agregar tipo, grupo y precio a cada fila de `bloqueos_eventos`: cambio menor, pero repetiría datos y dependería de deduplicación para no contar el precio varias veces.
2. Crear un registro padre y vincular los bloqueos por campo: elegido porque guarda el importe una sola vez y distingue de forma confiable eventos agrupados e individuales después de recargar.
3. Agrupar en el frontend por nombre, fecha y horario: descartado porque no distingue dos eventos independientes con los mismos datos.

## Fuera de alcance

- Asignar o repartir el precio total entre campos individuales.
- Cambiar las reservas públicas normales.
- Convertir automáticamente el evento en una reserva pública.

