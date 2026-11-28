# UUID del cliente en reservas

## Objetivo

Vincular cada reserva histórica y nueva con `clientes.id`, para que el historial y el contador de tickets se consulten por el UUID estable del cliente.

## Regla

Todas las reservas existentes se enlazan por su celular actual. Los tickets siguen contando únicamente reservas `finalizado` con `pago_estado` `confirmado` o `no_requerido`.

## Enfoque elegido

Agregar `reservas.cliente_id` con una clave foránea a `clientes.id`, rellenar el histórico por celular y modificar las RPC de creación para guardar y devolver el UUID. El navegador conserva el UUID por celular y usa RPC nuevas para leer reservas y tickets por cliente. Se mantiene el flujo por tokens como compatibilidad para navegadores antiguos.

## Seguridad aceptada

El cliente UUID se usará sin verificación adicional, tal como se solicitó. Quien obtenga ese UUID podría consultar el historial asociado.

## Fuera de alcance

No se crea una cuenta de autenticación ni se añade verificación por SMS.
