# TypeScript Parte 18: archivos principales de la aplicación

> Ejecución incremental en `version-real`; se integrará en `main` sin commit.

## Objetivo

Migrar `App.jsx` y `AdminApp.jsx` a TypeScript.

## Alcance

- Tipar estados, datos y callbacks que conectan los componentes cliente y admin.
- Mantener el flujo de reserva, autenticación, sincronización y navegación.
- Actualizar el punto de entrada y comprobaciones sin modificar la experiencia.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes de los módulos.
- [x] Implementar `App.tsx` y `AdminApp.tsx`.
- [x] Actualizar imports, comprobaciones y eliminar los módulos `.jsx` reemplazados.
- [x] Ejecutar checks, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
