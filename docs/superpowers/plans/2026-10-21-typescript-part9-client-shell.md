# TypeScript Parte 9: componentes base del cliente

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `CabeceraCliente.jsx` y `ProgresoReserva.jsx` a TypeScript, empezando por los componentes sin lógica de negocio compleja.

## Alcance

- Tipar las props y callbacks de ambos componentes.
- Mantener exactamente el marcado, clases, accesibilidad y comportamiento visual.
- Actualizar el uso desde `App.jsx` y retirar los módulos JavaScript reemplazados.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes de los módulos.
- [x] Implementar `CabeceraCliente.tsx` y `ProgresoReserva.tsx`.
- [x] Actualizar imports, comprobaciones y eliminar los módulos `.jsx` reemplazados.
- [x] Ejecutar checks, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
