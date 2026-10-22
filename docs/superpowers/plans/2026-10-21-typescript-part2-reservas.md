# TypeScript Parte 2: lógica pura de reservas

> Ejecución inline con `superpowers:executing-plans`.

## Objetivo

Migrar la lógica pura de reservas desde `src/reservas.js` a `src/reservas.ts`, incorporando los tipos de dominio existentes sin cambiar la interfaz ni el comportamiento de la aplicación.

## Alcance

- Convertir únicamente la lógica pura de reservas.
- Mantener React, JSX, Supabase y almacenamiento en JavaScript para las siguientes partes.
- Actualizar los imports y scripts de comprobación necesarios para consumir el módulo TypeScript.
- No hacer commits, push ni cambios en `main`.

## Contratos

- `chocan`, `horarios`, `masCercana`, `activa`, `deCliente`, `sePuedeCancelar`, `fechaISO`, `sumarDias`, `rango` y `rangoHablado` conservan su comportamiento actual.
- El módulo exporta constantes `ABRE`, `CIERRA` y `MAX_ACTIVAS`.
- El typecheck debe incluir una comprobación de entradas y salidas del módulo.

## Pasos

- [x] Crear primero la comprobación TypeScript y confirmar que falla por faltar el módulo.
- [x] Implementar `src/reservas.ts` con tipos estrictos.
- [x] Actualizar imports y comprobaciones para usar el módulo TypeScript.
- [x] Ejecutar pruebas de comportamiento, typecheck, lint y build.
- [x] Dejar el worktree sin commits.
