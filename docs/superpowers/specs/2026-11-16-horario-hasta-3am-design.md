# Horario operativo hasta las 3:00 a. m.

## Intento

Permitir reservas públicas y reservas iniciadas desde la tarjeta de clientes confiables hasta las 3:00 a. m., sin modificar reservas existentes ni cambiar la lógica de tickets, pagos o balance.

## Alcance

- El cierre operativo pasa de `25` (1:00 a. m.) a `27` (3:00 a. m.).
- El botón de cliente confiable conserva el modal y los pasos de la web, con nombre y celular preseleccionados.
- Se elimina el checkpoint de extensión; la disponibilidad hasta las 3:00 a. m. es parte del horario normal.
- Las reservas siguen guardando la fecha operativa y la hora numérica; las reservas que cruzan medianoche se interpretan con su instante real de finalización.
- Los datos históricos no se actualizan.

## Enfoques considerados

1. Mantener la extensión administrativa separada y cambiar solo su límite. Se descarta porque dejaría dos horarios y conservaría un checkpoint innecesario.
2. Aumentar el horario público y reutilizar ese mismo flujo para clientes confiables. Es la opción elegida: reduce rutas distintas y conserva la validación de cliente confiable, pago sin adelanto, ticket y balance.
3. Reescribir las funciones SQL completas en producción. Se descarta porque podría sobrescribir cambios ya desplegados.

## Implementación

Se actualizarán constantes, selector de turnos, validaciones SQL, funciones de disponibilidad y una migración transaccional que solo reemplaza límites y restricciones. Se agregarán pruebas para 2:30–3:00, reservas existentes, cruce de medianoche y ausencia del checkpoint.
