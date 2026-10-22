# TypeScript Parte 5: autorización del administrador

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `src/adminAuth.js` a `src/adminAuth.ts`, tipando la comprobación del rol administrativo sin cambiar las reglas actuales.

## Alcance

- Migrar únicamente `esAdmin`.
- Mantener el flujo de Supabase y la interfaz JSX sin cambios.
- Actualizar imports y comprobaciones que leen este módulo.

## Contratos

- Solo `app_metadata.role === 'admin'` autoriza el panel.
- `null`, `undefined` y `user_metadata.role` no autorizan.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `src/adminAuth.ts` con tipos estrictos.
- [x] Actualizar imports, comprobaciones y eliminar el módulo JavaScript reemplazado.
- [x] Ejecutar pruebas de comportamiento, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
