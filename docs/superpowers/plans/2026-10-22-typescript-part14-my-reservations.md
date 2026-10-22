# TypeScript Parte 14: mis reservas

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `MisReservas.jsx` a TypeScript, tipando reservas, edición de datos, cancelación y estados de la vista.

## Alcance

- Tipar props, callbacks, estados y resultados locales de edición/cancelación.
- Mantener el listado, imágenes, filtros visuales, confirmación de cancelación y formulario de datos.
- Evitar que el componente acceda directamente a Supabase o al almacenamiento.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `MisReservas.tsx` con contratos locales tipados.
- [x] Actualizar imports, comprobaciones y eliminar el módulo `.jsx` reemplazado.
- [x] Ejecutar checks, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
