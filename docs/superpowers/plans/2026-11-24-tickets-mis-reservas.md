# Tickets reales en “Mis reservas” Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar en “Mis reservas” el total real de tickets de cada cliente usando el historial persistido de reservas válidas.

**Architecture:** Mantener el acceso público basado en tokens. Una nueva RPC segura validará los tokens, resolverá el celular asociado y contará las reservas del cliente con `estado = 'finalizado'` y `pago_estado in ('confirmado', 'no_requerido')`. El frontend cargará ese total por separado de la lista visible de reservas y lo pasará explícitamente a `MisReservas`.

**Tech Stack:** React 19, TypeScript, Supabase PostgreSQL/RPC, Vite, checks ejecutados con `tsx` y ESLint.

**Spec:** `docs/superpowers/specs/2026-11-24-tickets-mis-reservas-design.md`

## Global Constraints

- Un ticket equivale a una reserva válida, no a una hora ni a una duración.
- Solo cuentan `finalizado + confirmado` y `finalizado + no_requerido`.
- `activo`, `iniciado`, `cancelado`, `no_asistio`, `pendiente` y `rechazado` no cuentan.
- La consulta pública no aceptará nombre o celular como credencial; exigirá uno o más tokens válidos.
- Las tablas `clientes` y `reservas` seguirán cerradas para `anon`; solo las RPC tendrán permisos públicos.
- `supabase/schema.sql` y `supabase/permissions.sql` deben conservar definiciones y permisos equivalentes.
- No se añadirá una tabla independiente de tickets ni se resolverá todavía el acceso desde otro celular.
- No se expondrá `service_role` ni se modificarán reservas reales durante la implementación.

## Review Focus

- Una reserva finalizada con `no_requerido` suma y una finalizada con `pendiente` o `rechazado` no suma; queda cubierto por `src/tickets.check.ts`.
- Un cliente no puede ver el total de otro cliente usando sus propios tokens; queda cubierto por la prueba SQL/RPC y la verificación de aislamiento del Task 2.
- La pantalla no muestra un total viejo después de confirmar, cancelar o refrescar reservas; queda cubierto por el flujo de sincronización del Task 4.
- Una consulta sin tokens o con tokens mal formados falla de forma segura y no abre las tablas; queda cubierto por `src/supabase.check.ts` y el contrato de la RPC del Task 2.
- La lista visible puede no contener reservas finalizadas, pero el contador debe seguir siendo correcto; queda cubierto por el caso de integración del Task 4.

### Task 1: Extraer y probar la regla de tickets

**Files:**
- Create: `src/tickets.ts`
- Create: `src/tickets.check.ts`
- Modify: `package.json` para agregar `check:tickets`

**Interfaces:**
- Consumes: `Reserva` desde `src/types.ts`.
- Produces: `esTicket(reserva: Reserva): boolean` y `contarTickets(reservas: readonly Reserva[], celular: string): number`.

- [ ] **Step 1: Escribir el check fallido**

  En `src/tickets.check.ts`, crear fixtures para el mismo celular y comprobar que:

  - `finalizado + confirmado` devuelve `true`.
  - `finalizado + no_requerido` devuelve `true`.
  - `finalizado + pendiente`, `finalizado + rechazado`, `activo`, `iniciado`, `cancelado` y `no_asistio` devuelven `false`.
  - Un conjunto con tres reservas válidas y reservas inválidas devuelve exactamente `3`.
  - Las reservas de otro celular no se cuentan.

- [ ] **Step 2: Ejecutar el check para confirmar que falla**

  Run: `npm run check:tickets`

  Expected: FAIL porque `src/tickets.ts` todavía no existe.

- [ ] **Step 3: Implementar `esTicket` y `contarTickets`**

  En `src/tickets.ts`, hacer que `esTicket` aplique exactamente los dos estados de pago permitidos y que `contarTickets` filtre por celular antes de contar.

- [ ] **Step 4: Ejecutar el check para confirmar que pasa**

  Run: `npm run check:tickets`

  Expected: PASS con todos los casos de estados, pagos y aislamiento.

### Task 2: Crear la consulta segura de tickets en Supabase

**Files:**
- Modify: `supabase/permissions.sql` junto a `obtener_mis_reservas_publicas`
- Modify: `supabase/schema.sql` con la misma RPC y permisos
- Modify: `src/supabase.check.ts`

**Interfaces:**
- Consumes: `p_tokens text[]` con el mismo formato de 48 caracteres hexadecimales y límite de 20 tokens.
- Produces: `public.contar_tickets_publicos(p_tokens text[]) returns integer`, `security definer`, ejecutable solo por `anon` mediante RPC.

- [ ] **Step 1: Escribir checks estructurales de la RPC**

  Comprobar que ambas migraciones declaran la función, validan cantidad y formato de tokens, usan `security definer`, cuentan solo `finalizado` con `confirmado` o `no_requerido`, revocan acceso directo y conceden `execute` a `anon`.

- [ ] **Step 2: Ejecutar los checks para confirmar que faltan piezas**

  Run: `npm run check:supabase`

  Expected: FAIL en las aserciones nuevas de tickets.

- [ ] **Step 3: Implementar la RPC en los dos SQL canónicos**

  La función debe derivar los celulares desde los `token_hash` que coincidan con los tokens recibidos y luego contar las reservas de esos celulares con la regla de negocio. No debe aceptar un celular recibido como parámetro.

- [ ] **Step 4: Añadir permisos y ejecutar los checks**

  Run: `npm run check:supabase`

  Expected: PASS, con el contrato y los permisos alineados en `schema.sql` y `permissions.sql`.

### Task 3: Conectar la RPC al adaptador y al estado de la aplicación

**Files:**
- Modify: `src/supabaseData.ts`
- Modify: `src/App.tsx`
- Modify: `src/ui.check.ts`
- Modify: `src/almacen.ts` únicamente si hace falta reutilizar el filtrado local

**Interfaces:**
- Consumes: `contar_tickets_publicos(text[])` desde Supabase.
- Produces: `leerTicketsAcumuladosRemotos(tokens: string[]): Promise<number>` y una prop `ticketsAcumulados: number` para `MisReservas`.

- [ ] **Step 1: Escribir el check del adaptador y del flujo**

  Verificar que el adaptador llama la RPC con `p_tokens`, rechaza respuestas que no sean enteros no negativos y que `App` limpia el total cuando no hay tokens.

- [ ] **Step 2: Ejecutar los checks para confirmar que faltan interfaces**

  Run: `npm run check:ui && npm run typecheck`

  Expected: FAIL en las aserciones nuevas o por la prop aún no conectada.

- [ ] **Step 3: Implementar la carga sincronizada**

  En la carga inicial, reintento, refresco por foco, polling de “Mis reservas” y refresco posterior a cancelar, cargar reservas y tickets con la misma lista de tokens. En modo local, usar `contarTickets` sobre el almacenamiento local; en Supabase, usar la RPC.

- [ ] **Step 4: Verificar el flujo de estados**

  Run: `npm run check:ui && npm run typecheck`

  Expected: PASS y ningún camino que deje visible un total anterior cuando la identidad cambia o no tiene tokens.

### Task 4: Mostrar el total real en `MisReservas`

**Files:**
- Modify: `src/components/cliente/MisReservas.tsx`
- Modify: `src/ui.check.ts`

**Interfaces:**
- Consumes: `ticketsAcumulados: number` desde `App`.
- Produces: contador visible y pluralización coherente sin importar cuántas reservas finalizadas estén en la lista visible.

- [ ] **Step 1: Escribir los checks de estructura de UI**

  Comprobar que `MisReservasProps` recibe `ticketsAcumulados`, que el contador ya no importa el JSON demo de clientes y que el texto secundario no afirme que todas las reservas fueron pagadas si también se cuentan `no_requerido`.

- [ ] **Step 2: Implementar la presentación**

  El número principal debe usar `ticketsAcumulados`; mantener singular/plural para 0, 1 y varios, y usar una etiqueta neutral como “reservas finalizadas válidas”. Eliminar únicamente la lógica demo del contador, sin retirar el dataset demo usado por el panel de sorteos.

- [ ] **Step 3: Ejecutar checks de UI**

  Run: `npm run check:ui && npm run typecheck`

  Expected: PASS; la pantalla conserva estados de carga, error y reservas visibles.

### Task 5: Verificar con las reservas de prueba y cerrar el cambio

**Files:**
- Modify: `docs/auditoria-flujo-publico-reservas.md` o crear una nota breve de verificación si se necesita registrar el resultado
- No modificar los IDs de prueba dentro del repositorio

**Interfaces:**
- Consumes: las tres reservas de prueba de Fenix ya creadas y el token de la reserva que el navegador ya tiene guardado.
- Produces: evidencia de que el contador muestra `3`, aislamiento entre usuarios y limpieza controlada.

- [ ] **Step 1: Ejecutar la verificación SQL previa**

  Confirmar que las tres filas de prueba siguen teniendo `estado = 'finalizado'` y `pago_estado = 'confirmado'`, y que la RPC devuelve `3` cuando se invoca con un token del cliente.

- [ ] **Step 2: Probar el flujo público**

  Abrir “Mis reservas” con el mismo navegador que creó la reserva de Fenix y comprobar que el contador muestra `3`, aunque la lista visible no contenga las tres reservas históricas. Crear o usar fixtures de otro celular para confirmar que no recibe ese total.

- [ ] **Step 3: Ejecutar la batería completa**

  Run: `npm run check:tickets; npm run check:supabase; npm run check:ui; npm run typecheck; npm run lint; npm run build`

  Expected: todos los comandos terminan correctamente.

- [ ] **Step 4: Confirmar y limpiar únicamente los datos de prueba**

  Pedir confirmación explícita justo antes de borrar. Después, borrar solo los tres IDs `42a38838-5052-407f-8a0a-72666f31aeae`, `f7d281f3-40ce-4978-b761-fa4426f728be` y `76b2f4af-0ad4-4191-a5b9-b0233ff8ac13`, verificar que la cuenta queda en `0` y comprobar que la reserva original de Fenix permanece intacta.

- [ ] **Step 5: Revisar el diff final**

  Confirmar que no se modificaron datos ajenos, que los SQL canónicos siguen alineados y que la documentación identifica el acceso entre dispositivos como trabajo posterior.
