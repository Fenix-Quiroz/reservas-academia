# Flujo de adelanto Yape y comprobante seguro

## Intención

Permitir que el cliente asegure una reserva desde la pantalla actual enviando un comprobante de adelanto Yape de S/10, sin abrir las tablas de pagos ni el bucket privado al navegador. El flujo debe vincular cada comprobante con el `reserva_id` correcto y dejar al administrador la revisión final del pago.

## Experiencia aprobada

En la pantalla de datos de la reserva se reemplaza el botón `✅ Confirmar reserva` por el bloque:

> Para reservar y asegurar debes yapear mínimo 10 soles, al NRO
> (995933438 Jesús Leg*)
> Tómale captura y súbela aquí 👇🏼

El número se muestra separado del texto en un control propio con un botón `Copiar número`. Se muestra un selector de archivo y el botón `Subir comprobante y asegurar reserva`. Al completar la carga, la interfaz informa que la reserva quedó asegurada y que el comprobante está pendiente de revisión.

La pantalla conserva el resumen de campo, fecha, horario y precio total. El adelanto de S/10 no reemplaza el saldo que se paga en el campo.

## Decisión técnica

- El navegador llama a una Edge Function pública de pagos; no contiene ni recibe `service_role`.
- La función recibe una reserva ya creada y su token secreto; valida la reserva, el archivo y el monto mínimo antes de operar.
- Para conservar el `reserva_id`, la función crea o recupera una reserva pendiente de pago, genera el pago `adelanto` y usa el UUID de la reserva/pago para la ruta privada del archivo.
- La función sube el archivo a `comprobantes-pago`, inserta la fila en `pago_comprobantes` y actualiza el resumen de `reservas` de forma controlada.
- En esta primera versión se registra el adelanto requerido de `10.00` PEN; el cliente no declara un importe distinto ni se pretende verificar automáticamente un monto mayor a partir de una imagen.
- El estado del pago se mantiene en `pendiente` después de la carga. El administrador lo cambia a `confirmado` o `rechazado` desde el panel.
- Si la carga no termina, la reserva pendiente expira mediante `pago_expira_at`; el cliente puede reintentar mientras siga vigente.

## Validaciones y seguridad

- Archivos permitidos: `image/jpeg`, `image/png` y `image/webp`.
- Tamaño máximo: 5 MiB, validado en cliente para feedback y nuevamente en servidor.
- El nombre del archivo no se usa para construir la ruta; la ruta se compone de UUID y extensión validada.
- El cliente no inserta directamente en `pagos_reserva`, `pago_comprobantes` ni `storage.objects`.
- La vinculación se hace con `reserva_id` y el token secreto de la reserva; celular y nombre no se incluyen en la ruta.
- El comprobante no se declara automáticamente como pago confirmado solo por ser subido.
- Si el administrador rechaza un comprobante, se permite otro intento para la misma reserva mientras no haya expirado ni sido cancelada.
- La reserva se crea antes de la carga y conserva el horario hasta que expire o sea cancelada; la carga no vuelve a competir por el horario.
- Cada envío usa una clave de idempotencia generada en el navegador; si se repite la misma clave, la función devuelve el intento ya registrado o termina su recuperación sin duplicar el pago.

## Alcance

Incluye la interfaz pública, validaciones de archivo, cliente de la Edge Function, contrato de datos y SQL/función necesarios para registrar el adelanto y el comprobante. Incluye pruebas de validación, vinculación y rechazo de archivos inválidos.

No incluye OCR, confirmación automática del importe, notificaciones por WhatsApp, ni una nueva pantalla administrativa de revisión; la revisión inicial usa las tablas y el Storage privado desde el entorno administrativo de Supabase.

## Alternativas consideradas

1. **Edge Function con `service_role` solo en servidor (elegida):** mantiene las tablas y el bucket cerrados al navegador y permite coordinar reserva, Storage y metadatos en un único flujo controlado.
2. **RPC pública más URL firmada:** reduciría la función, pero necesitaría coordinar una URL temporal y una operación de finalización; es más fácil dejar pagos o archivos huérfanos.
3. **Subida directa con políticas `anon`:** se descarta porque permitiría subir objetos fuera de un pago válido y ampliaría la superficie del bucket privado.

## Pendientes que puede decidir el implementador

- Usar `pago_expira_at` de 30 minutos para el intento iniciado desde esta pantalla, cubriendo la carga y la revisión administrativa.
- Mantener la reserva con estado operativo `activo` mientras el adelanto esté `pendiente`, de modo que el horario no se venda dos veces.
- Usar el mensaje de éxito `Reserva asegurada. Tu comprobante está pendiente de revisión.` para no confundir una carga recibida con una aprobación administrativa.
