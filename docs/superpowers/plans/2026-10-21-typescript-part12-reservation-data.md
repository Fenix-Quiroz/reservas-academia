# TypeScript Parte 12: datos de la reserva

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `DatosReserva.jsx` a TypeScript, tipando el formulario y las acciones de cliente/reserva.

## Alcance

- Tipar props, estados, resultados de acciones y la alternativa cuando una hora se ocupa.
- Mantener el flujo de primera reserva, cliente conocido, búsqueda, conflicto y confirmación.
- No cambiar textos, accesibilidad, estilos ni comportamiento visible.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `DatosReserva.tsx` con los estados y resultados tipados.
- [x] Actualizar imports, comprobaciones y eliminar el módulo `.jsx` reemplazado.
- [x] Ejecutar checks, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
