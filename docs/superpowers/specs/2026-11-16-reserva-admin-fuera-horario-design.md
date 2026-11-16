# Reservas administrativas fuera de horario

## Intención

Permitir que el administrador cree una reserva de un cliente confiable después del cierre público, hasta las 2:30 a. m., usando el mismo flujo visual de reserva y conservando las validaciones de disponibilidad.

## Reglas

- La web pública conserva el horario de 7:00 a. m. a 1:00 a. m.
- El horario extendido solo se puede iniciar desde el botón `Reservar` de una tarjeta de cliente confiable.
- El administrador puede elegir bloques de 30 minutos hasta las 2:30 a. m.
- La reserva se guarda como una reserva normal, con su monto total y el cliente asociado.
- La base de datos valida que la operación provenga de un administrador y que el celular siga siendo confiable.
- Los cruces con otras reservas, eventos y entrenamientos siguen bloqueando la operación.
- La reserva se finaliza mediante el flujo actual de administración; al finalizar queda `finalizado` y puede cumplir las reglas existentes de pago/ticket.
- La conexión real del módulo de sorteos y balance se deja para una etapa posterior.

## Fuera de alcance

- Cambiar el horario público.
- Crear todavía una tabla o consulta real para el módulo de sorteos.
- Permitir reservas fuera de horario desde una acción global del panel.
