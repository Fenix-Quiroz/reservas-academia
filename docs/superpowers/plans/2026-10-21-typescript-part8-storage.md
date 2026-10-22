# TypeScript Parte 8: almacenamiento y fachada de reservas

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `src/almacen.js` a `src/almacen.ts`, tipando el almacenamiento local, los datos demo y la fachada que decide entre localStorage y Supabase.

## Alcance

- Migrar únicamente la capa de almacenamiento/fachada.
- Mantener el comportamiento demo, limpieza de datos y límites actuales.
- No modificar componentes, estilos ni el esquema de Supabase.

## Contratos

- Las reservas y clientes locales usan `Reserva` y `Cliente`.
- `cargarReservas`, `crearReserva`, `cancelarReserva` y las operaciones de cliente conservan sus resultados actuales.
- Los datos demo nunca se mezclan cuando Supabase está configurado.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `src/almacen.ts` con tipos estrictos.
- [x] Actualizar imports, comprobaciones y eliminar el módulo JavaScript reemplazado.
- [x] Ejecutar pruebas de comportamiento, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
