# Actualización en tiempo real de horarios — Diseño

## Intención

Cuando el administrador guarde un bloqueo o liberación de horarios, las páginas públicas de reservas que ya estén abiertas deben refrescar su disponibilidad automáticamente.

## Objetivos

- Avisar a los clientes públicos que la configuración de horarios cambió.
- Hacer que la página vuelva a consultar `obtener_horarios_publicos`.
- No exponer filas ni motivos de `public.horarios_bloqueados`.
- Mantener la validación final de disponibilidad en Supabase al confirmar una reserva.
- Mantener un consumo pequeño dentro del plan gratuito.

## No objetivos

- No enviar la tabla administrativa al navegador público.
- No cambiar la lógica de reservas, pagos ni validación de conflictos.
- No depender de Realtime para la seguridad de una reserva.

## Enfoque elegido

Se usará Broadcast desde una función trigger de PostgreSQL con un payload mínimo y un canal público. El trigger será a nivel de sentencia para emitir como máximo una señal por operación SQL, incluso cuando el guardado modifique muchos bloques. El cliente público escuchará el evento `horarios_actualizados` en el canal Realtime existente y disparará la recarga que ya usa la página.

El cliente administrador seguirá usando su cliente autenticado. El cliente público usará `supabasePublic`, sin reutilizar sesiones del panel.

## Alternativas consideradas

- Suscribirse directamente a `horarios_bloqueados`: se descarta porque la tabla solo tiene acceso RLS para administradores y no debe exponerse al público.
- Polling periódico: sería más sencillo, pero genera consultas aunque no haya cambios y no ofrece actualización inmediata.
- Broadcast con el payload completo de la fila: se descarta porque filtraría detalles internos innecesarios.

## Comportamiento ante fallos

Si Realtime se desconecta o la señal no llega, la página conserva sus mecanismos existentes: recarga manual, cambios de campo/fecha y validación server-side al intentar reservar.

