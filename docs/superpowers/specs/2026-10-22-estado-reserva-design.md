# Estados persistidos de las reservas

## Objetivo

Conservar cada reserva en la base de datos durante todo su ciclo de vida y usar un estado explícito para distinguir reservas activas, iniciadas, finalizadas y canceladas. El balance mensual contará únicamente reservas marcadas como `finalizado`.

## Decisión de nombres

El dominio de la aplicación está escrito en español, por lo que la propiedad será `estado`, no `status`.

```ts
export type EstadoReserva = 'activo' | 'iniciado' | 'finalizado' | 'cancelado'
```

La base de datos usará la columna `estado` con un `check` que limite sus valores a los cuatro estados definidos.

## Ciclo de vida

| Acción | Estado resultante | Responsable |
| --- | --- | --- |
| Crear una reserva | `activo` | Sistema |
| Comenzar el turno | `iniciado` | Encargado |
| Terminar y confirmar el pago | `finalizado` | Encargado |
| Cancelar antes del turno | `cancelado` | Cliente o encargado |

La alarma de fin de turno solo avisa al encargado. No cambia automáticamente el estado a `finalizado`, porque esa transición confirma que el pago se recibió.

## Estado del pago

El adelanto no será otro valor de `estado`, porque no representa el ciclo de vida de la reserva. Se añadirá un estado de pago separado:

```ts
export type EstadoPago = 'pendiente' | 'adelanto' | 'pagado'
```

La reserva tendrá `estadoPago` y un `montoAdelanto` opcional. En la base de datos, `estado_pago` tendrá como valor inicial `pendiente` y `monto_adelanto` iniciará en `0`.

- `pendiente`: todavía no se ha recibido dinero.
- `adelanto`: se recibió una parte del total y se conserva el monto.
- `pagado`: se recibió el total; una reserva `finalizado` debe estar en este estado.

Así podremos mostrar el adelanto y calcular el saldo restante sin confundir el pago con el ciclo de la reserva. La propiedad podrá tratarse como opcional durante la migración de filas antiguas, pero las nuevas filas deberán guardar siempre un estado de pago válido.

## Persistencia y reglas

- Cancelar actualiza `estado` a `cancelado`; nunca elimina la fila.
- Las reservas canceladas no bloquean horarios disponibles y no aparecen como reservas activas para el cliente.
- Las reservas `activo` e `iniciado` siguen representando horarios ocupados.
- Una reserva `finalizado` queda como histórico y no se puede cancelar.
- Se conservarán marcas de tiempo opcionales para las transiciones: `iniciado_at`, `finalizado_at` y `cancelado_at`.
- Las filas existentes recibirán `activo` al aplicar la migración; las reservas antiguas que ya fueron pagadas deberán ser confirmadas manualmente antes de entrar al balance.

## Alcance de la primera parte

1. Actualizar los tipos de TypeScript y las conversiones de Supabase.
2. Agregar la migración SQL de `estado` y las marcas de tiempo.
3. Crear reservas nuevas como `activo`.
4. Crear reservas nuevas con `estadoPago = 'pendiente'` y `montoAdelanto = 0`.
5. Cambiar la cancelación local y remota para actualizar el estado.
6. Excluir `cancelado` al calcular disponibilidad y al mostrar reservas activas.
7. Mantener el balance mensual como una parte posterior que filtre `finalizado` y considere el estado de pago.

## Verificación

- Las reservas nuevas tienen estado `activo`.
- Cancelar conserva la fila y la cambia a `cancelado`.
- Una reserva cancelada libera su horario.
- Las reservas `finalizado` pueden identificarse para el balance.
- Los checks existentes, TypeScript, lint y build continúan pasando.
