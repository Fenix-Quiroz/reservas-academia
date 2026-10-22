# TypeScript Parte 11: selector de horarios

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `SelectorHorario.jsx` a TypeScript, tipando la agenda, los días, las duraciones y la hora elegida.

## Alcance

- Tipar las props y callbacks que recibe desde `App.jsx`.
- Mantener el comportamiento de disponibilidad, confirmación, accesibilidad y estilos.
- Actualizar el import y las comprobaciones del cliente.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `SelectorHorario.tsx`.
- [x] Actualizar imports, comprobaciones y eliminar el módulo `.jsx` reemplazado.
- [x] Ejecutar checks, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
