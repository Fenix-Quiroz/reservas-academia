# TypeScript Parte 3: utilidades de fechas

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `src/utils/fechasReserva.js` a `src/utils/fechasReserva.ts`, tipando sus entradas y salidas sin modificar el formato visible de fechas u horas.

## Alcance

- Migrar únicamente la utilidad pura de fechas y horas.
- Actualizar sus imports y comprobaciones de componentización.
- Mantener React, JSX, Supabase y almacenamiento en JavaScript.
- No modificar la interfaz, estilos ni comportamiento.

## Contratos

- `capital`, `nombreDiaCorto`, `nombreDia`, `horaVisible`, `rangoVisible`, `diaDe` y `tipoCampo` conservan sus resultados actuales.
- `tipoCampo` acepta los datos de campo usados por la aplicación.
- El typecheck comprueba entradas y salidas del módulo.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `src/utils/fechasReserva.ts` con tipos estrictos.
- [x] Actualizar imports, comprobaciones y eliminar el módulo JavaScript reemplazado.
- [x] Ejecutar pruebas de comportamiento, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
