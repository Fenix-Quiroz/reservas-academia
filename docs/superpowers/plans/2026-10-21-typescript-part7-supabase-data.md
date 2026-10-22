# TypeScript Parte 7: datos remotos de Supabase

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `src/supabaseData.js` a `src/supabaseData.ts`, tipando filas remotas, conversiones, errores y resultados sin cambiar las consultas ni las reglas de reservas.

## Alcance

- Migrar únicamente la capa de datos remotos.
- Mantener `almacen.js` para el siguiente paso.
- No modificar el esquema SQL, políticas RLS ni el comportamiento de Supabase.

## Contratos

- Las filas `snake_case` se convierten a `Reserva` y viceversa.
- Se conservan los errores `ocupado`, `limite`, `celular`, `conexion`, `no-existe`, `tarde`, `alias-invalido` y `celular-invalido`.
- Las funciones remotas mantienen sus resultados Promise actuales.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes del módulo.
- [x] Implementar `src/supabaseData.ts` con tipos estrictos.
- [x] Actualizar imports y eliminar el módulo JavaScript reemplazado.
- [x] Ejecutar pruebas de comportamiento, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
