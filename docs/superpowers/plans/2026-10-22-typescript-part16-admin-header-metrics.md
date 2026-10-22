# TypeScript Parte 16: cabecera y métricas del admin

> Ejecución incremental en `version-real`; se integrará en `main` sin commit.

## Objetivo

Migrar `AdminCabecera.jsx` y `AdminMetricas.jsx` a TypeScript.

## Alcance

- Tipar las acciones y estados usados por la cabecera.
- Tipar el resumen mostrado por las métricas.
- Mantener textos, accesibilidad, navegación, estilos y comportamiento actual.
- Actualizar imports y comprobaciones sin cambiar lógica del panel.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes de los módulos.
- [x] Implementar los dos componentes `.tsx`.
- [x] Actualizar imports, comprobaciones y eliminar los módulos `.jsx` reemplazados.
- [x] Ejecutar checks, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
