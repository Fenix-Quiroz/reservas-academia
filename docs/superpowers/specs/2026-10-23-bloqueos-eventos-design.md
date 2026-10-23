# Bloqueos especiales para eventos

## Intención

El encargado necesita reservar bloques largos para eventos, por ejemplo cinco o más horas, sin abrir esa duración a los clientes públicos. El cliente debe ver esos horarios como no disponibles y nunca ver el nombre, contacto u observaciones del evento.

## Objetivos

- Crear eventos desde el panel privado con campo, fecha, hora de inicio, hora de fin, nombre y datos opcionales.
- Permitir eventos de mínimo 5 horas dentro del horario del polideportivo: 7:00 a. m. a 1:00 a. m.
- Bloquear esos rangos en la disponibilidad pública y rechazar reservas públicas que intenten cruzarlos.
- Permitir cancelar un evento conservando el histórico; al cancelarlo, el horario vuelve a estar disponible.
- Aplicar la validación de solapamientos en Supabase, no solo en la interfaz.

## Fuera de alcance

- Reservas de eventos iniciadas por clientes públicos.
- Pagos, adelantos o cálculo de balance para eventos en esta primera versión.
- Edición parcial del evento; la primera versión permite crear y cancelar.
- Mostrar información del evento en la vista pública.

## Restricciones y decisiones

- Se usará una tabla independiente `public.bloqueos_eventos`; las reservas públicas conservan sus duraciones exactas `1`, `1.5`, `2` y `3`.
- Los eventos usarán inicios y finales en horas enteras. `inicio` debe estar entre 7 y 24, `fin` entre 8 y 25, y `fin - inicio >= 5`.
- Los eventos activos se excluyen por rango en su propia tabla. Las RPC de disponibilidad y creación de reservas consultarán también los eventos activos.
- La creación de eventos será una RPC protegida que solo acepta usuarios con `app_metadata.role = 'admin'`. La lectura y cancelación del panel quedarán protegidas por RLS para administradores.
- La creación de eventos y reservas públicas compartirán un bloqueo transaccional por campo y fecha para evitar carreras entre ambas operaciones.
- En modo demo, los eventos se guardarán en `localStorage` para que el panel y la vista pública del mismo navegador mantengan el mismo comportamiento.

## Flujo esperado

1. El administrador abre “Eventos y bloqueos especiales”.
2. Elige el campo, la fecha, el inicio, el fin y escribe el nombre del evento; contacto y notas son opcionales.
3. Si el rango se cruza con otra reserva o evento activo, se muestra un error y no se guarda.
4. Si se guarda, el evento aparece en la lista del panel como activo.
5. La web pública consulta disponibilidad y muestra las horas afectadas como `No disponible`, sin detalles del evento.
6. El administrador cancela el evento desde el panel y el rango deja de bloquearse.
