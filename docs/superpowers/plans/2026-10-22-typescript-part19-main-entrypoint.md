# TypeScript Parte 19: entrypoint principal

> Ejecución incremental en `version-real`; se integrará en `main` sin commit.

## Objetivo

Migrar `main.jsx` a `main.tsx` para dejar todo el código ejecutable de la aplicación en TypeScript.

## Alcance

- Tipar el elemento raíz que recibe React.
- Mantener la selección de ruta cliente/admin y `StrictMode`.
- Actualizar las comprobaciones sin modificar el arranque de la aplicación.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `main.tsx`.
- [x] Actualizar comprobaciones y eliminar `main.jsx`.
- [x] Ejecutar checks, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
