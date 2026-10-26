# Horarios de media hora y duración de 2.5 horas

## Intención

Permitir que los clientes elijan inicios cada 30 minutos (`9:00`, `9:30`, `10:00`, etc.) y reservar duraciones de 1, 1.5, 2, 2.5 o 3 horas, manteniendo el horario de atención de 7:00 a. m. a 1:00 a. m. y la protección contra solapamientos.

## Alcance

- Actualizar la selección pública de horarios y la lógica local de disponibilidad.
- Actualizar la validación de la reserva pública en PostgreSQL.
- Conservar reservas históricas y eventos existentes almacenando `inicio` como hora decimal con un decimal (`9.5` equivale a 9:30).
- Actualizar textos, importes y reportes que dependen de las duraciones.
- Mantener los bloqueos de entrenamientos y eventos funcionando con rangos decimales.

## Fuera de alcance

- No cambiar el horario de apertura o cierre.
- No cambiar precios por hora.
- No permitir intervalos distintos de 30 minutos ni duraciones distintas de las cinco opciones definidas.

## Enfoque elegido

Se usarán horas decimales porque el modelo actual ya usa `number` en TypeScript y `numeric` para las duraciones. Es el cambio más pequeño y conserva los datos existentes. La columna `reservas.inicio` pasará a `numeric(4,1)` con una restricción que solo permite múltiplos de 0.5. Las RPC públicas y las funciones que calculan solapamientos recibirán y devolverán `numeric` para aceptar `9.5`.

La grilla pública generará inicios en pasos de 0.5 y la duración nueva será `2.5`. La migración SQL actualizará las restricciones, funciones y permisos sin eliminar reservas actuales.

## Criterios de aceptación

- Una reserva de 8:00 a 9:30 bloquea cualquier opción que se cruce con ese rango, pero deja libre 9:30 en adelante cuando corresponda.
- Una reserva de 9:30 a 10:30 hace que 10:00 aparezca ocupada y permite elegir 10:30 si el resto está libre.
- La opción 2 horas y media aparece con el precio correcto.
- Ninguna reserva puede comenzar fuera de 7:00–24:00, terminar después de 25:00 ni usar minutos distintos de `00` o `30`.
- La migración conserva las reservas existentes y la exclusión contra solapamientos.
