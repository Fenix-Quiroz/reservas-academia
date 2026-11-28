# Tickets reales en “Mis reservas”

## Intento

Mostrar a cada cliente la cantidad real de tickets acumulados en “Mis reservas”, usando el historial persistido de sus reservas y manteniendo la consulta protegida por tokens.

## Regla de negocio

Una reserva entrega un ticket cuando cumple ambas condiciones:

- `estado = 'finalizado'`.
- `pago_estado` es `confirmado` o `no_requerido`.

Cada reserva válida entrega exactamente un ticket, sin importar la duración del turno. Las reservas `activo`, `iniciado`, `cancelado`, `no_asistio`, `pendiente` o `rechazado` no entregan ticket.

## Estado actual

- `MisReservas` calcula el contador localmente a partir de datos demo y de reservas finalizadas que recibe.
- `App` filtra la lista pública principalmente a reservas activas o visibles, por lo que el historial finalizado no llega de forma fiable al contador.
- Supabase ya consulta “Mis reservas” mediante tokens, pero no devuelve un acumulado de tickets.
- No existe una tabla independiente de tickets; para este alcance no se añadirá una.

## Enfoque elegido

Extender el flujo seguro actual con una RPC separada para contar tickets. La RPC recibirá los tokens públicos existentes, validará que tengan el formato esperado, resolverá el celular asociado a esos tokens y contará únicamente las reservas del mismo cliente que cumplan la regla de negocio. Nunca se consultará el total usando solo nombre y celular enviados por el navegador.

El frontend cargará las reservas y el acumulado usando la misma identidad por tokens, pasará el total explícitamente a `MisReservas` y dejará de calcular tickets a partir de la lista visible de reservas.

## Objetivos

- Mostrar el acumulado real del cliente en “Mis reservas”.
- Aislar los tickets entre clientes distintos.
- Contar correctamente `confirmado` y `no_requerido`.
- No contar reservas activas, canceladas, no asistidas ni pagos pendientes o rechazados.
- Conservar el acceso público actual sin crear cuentas nuevas.

## Fuera de alcance

- Recuperar tickets al cambiar de celular o navegador.
- Buscar tickets solo por nombre y celular.
- Crear una tabla histórica independiente por ticket.
- Conectar todavía el sorteo administrativo con reservas reales.
- Cambiar la regla de un ticket por reserva.

## Estructura prevista

- `src/tickets.ts`: regla pura `esTicket` y contador por cliente para pruebas y modo local.
- `src/tickets.check.ts`: casos de estados y pagos que suman o no suman.
- `supabase/permissions.sql`: RPC pública segura para contar tickets a partir de tokens y permisos.
- `src/supabaseData.ts`: adaptador que llama la RPC y valida el entero recibido.
- `src/App.tsx`: carga y sincronización del total junto con “Mis reservas”.
- `src/components/cliente/MisReservas.tsx`: recibe y muestra `ticketsAcumulados` sin consultar datos demo.
- `src/ui.check.ts`: contrato estructural de la nueva prop y del flujo.

## Verificación

Se probará con las tres reservas de prueba ya creadas para Fenix: el contador esperado es 3. Después se comprobará que un segundo celular no recibe ese total, que una reserva pendiente o rechazada no aumenta el contador, y que una reserva `finalizado + no_requerido` sí lo aumenta. Al terminar la validación se eliminarán únicamente los tres IDs de prueba y se verificará que la reserva original permanezca intacta.

## Decisiones pendientes del implementador

- Mantener la RPC de tickets separada de la RPC de listado para no romper el contrato actual de reservas.
- Compartir la validación de tokens entre las dos RPC mediante la misma forma de normalización, sin abrir tablas al rol `anon`.
