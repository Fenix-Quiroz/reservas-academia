# TypeScript Parte 4: lógica del panel de administración

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `src/admin.js` a `src/admin.ts`, tipando filtros, ordenamiento, precios y resumen sin modificar el comportamiento del panel.

## Alcance

- Migrar únicamente la lógica pura del panel.
- Mantener `AdminApp.jsx`, autenticación, almacenamiento y Supabase en JavaScript.
- Actualizar imports y comprobaciones necesarias.
- No cambiar textos, interfaz ni reglas de filtrado.

## Contratos

- `precioDeReserva`, `ordenarReservas`, `filtrarReservas` y `resumenAdmin` conservan sus resultados actuales.
- `filtrarReservas` acepta filtros parciales para mantener el valor por defecto `{}`.
- El resumen solo expone `proximas` y `hoy`; no se agregan ingresos todavía.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `src/admin.ts` con tipos estrictos.
- [x] Actualizar imports, comprobaciones y eliminar el módulo JavaScript reemplazado.
- [x] Ejecutar pruebas de comportamiento, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
