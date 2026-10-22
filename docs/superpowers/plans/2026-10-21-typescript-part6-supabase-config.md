# TypeScript Parte 6: configuración de Supabase

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `src/supabase.js` a `src/supabase.ts`, tipando las variables de entorno y el cliente sin cambiar la forma en que la aplicación detecta si Supabase está configurado.

## Alcance

- Migrar únicamente la configuración y creación del cliente.
- Mantener la capa de consultas (`supabaseData.js`) para el siguiente paso.
- No cambiar nombres de variables, limpieza de la URL ni comportamiento de fallback.

## Contratos

- `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` siguen siendo strings.
- `supabaseConfigurado` sigue siendo booleano.
- `supabase` es un `SupabaseClient` o `null`.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `src/supabase.ts` con tipos estrictos.
- [x] Actualizar imports y eliminar el módulo JavaScript reemplazado.
- [x] Ejecutar pruebas de comportamiento, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
