# Clientes confiables sin adelanto

## Objetivo

Permitir que los celulares activos de `public.numeros_confiables` creen nuevas reservas sin pagar el adelanto Yape de S/10. Todos los demás celulares deben continuar usando el flujo actual de comprobante.

## Decisión de flujo

Se conserva el paso “Tus datos” y se muestra una variante según el resultado de una comprobación pública del celular:

- Número confiable activo: se ocultan el número Yape, la carga de comprobante y el texto de adelanto. Se muestra “Reserva sin adelanto” y el botón “Confirmar reserva”.
- Número no confiable, consulta fallida o Supabase no disponible: se mantiene el bloque Yape actual y el adelanto de S/10 sigue siendo obligatorio.
- Mientras se consulta el celular se muestra un estado breve de verificación y el botón queda bloqueado.

La pantalla no consulta directamente la tabla de números confiables. Usa una RPC pública que solo devuelve `boolean`. La RPC de creación recibe una bandera explícita `p_sin_adelanto`; la base de datos vuelve a comprobar el número y rechaza la reserva sin adelanto si el número ya no está confiable. Así, la interfaz no puede conceder el beneficio por sí sola ni una carrera administrativa puede convertir un número normal en confiable.

## Persistencia y estados

La reserva confiable se guarda con `pago_estado = 'no_requerido'`, `pago_requerido = 0` y sin expiración de pago. Una reserva normal se crea con `pago_estado = 'pendiente'`, `pago_requerido = 10` y `pago_expira_at = now() + interval '30 minutes'`; la subida del comprobante conserva esa expiración.

El beneficio solo aplica a reservas nuevas. Desactivar un número confiable no modifica reservas anteriores. La regla de números bloqueados continúa teniendo prioridad sobre el beneficio.

## Confirmación y administración

Una reserva sin adelanto no llama a `registrar-adelanto-yape`. En la confirmación del cliente se muestra “Reserva confirmada. No requiere adelanto.” Para que el panel no espere un comprobante inexistente, su tarjeta muestra la etiqueta “Sin adelanto” y no renderiza botones de ver, descargar o confirmar comprobante.

La función de Edge rechazará intentos directos de subir un comprobante para una reserva `no_requerido`. El frontend no usa `service_role`.

## No objetivos

- No cambiar el CRUD administrativo de números confiables.
- No permitir que un número bloqueado reserve por ser confiable.
- No dar acceso público a la lista de celulares confiables ni a sus alias.
- No migrar reservas antiguas: solo las reservas creadas con el nuevo RPC reciben la semántica nueva.

## Criterios verificables

1. Una consulta pública de un celular válido retorna solo `true` o `false`.
2. La RPC de creación rechaza `p_sin_adelanto = true` cuando no existe un registro activo.
3. La RPC crea estados `no_requerido`/`pendiente` con los valores de pago y expiración correctos.
4. La pantalla confiable permite confirmar sin archivo y la pantalla normal exige un comprobante válido.
5. El resultado exitoso y la tarjeta administrativa distinguen ambas rutas.
