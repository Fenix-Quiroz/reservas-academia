# TypeScript Parte 10: selector visual de campos

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `SelectorCampos.jsx` y `DibujoCampo.jsx` a TypeScript, tipando la selección de campos y el SVG auxiliar.

## Alcance

- Tipar `Campo`, las props de selección y la referencia del título.
- Mantener el marcado, imágenes, oferta, accesibilidad y comportamiento visual.
- Actualizar el uso desde `App.jsx` y las comprobaciones de componentes.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes de los módulos.
- [x] Implementar `SelectorCampos.tsx` y `DibujoCampo.tsx`.
- [x] Actualizar imports, comprobaciones y eliminar los módulos `.jsx` reemplazados.
- [x] Ejecutar checks, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
