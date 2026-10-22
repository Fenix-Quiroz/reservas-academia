# Base de TypeScript para el sistema de reservas

## Objetivo

Preparar el proyecto para una migración gradual de JavaScript/JSX a TypeScript sin cambiar la interfaz, el comportamiento, las rutas, Supabase ni la versión publicada en `main`.

## Alcance de la Parte 1

Esta parte solo incorpora la infraestructura y los tipos de dominio compartidos:

- Configuración de TypeScript para el código fuente del proyecto.
- Comando `typecheck` para validar tipos sin generar archivos compilados.
- Ejecutor `tsx` para que las comprobaciones existentes puedan migrarse gradualmente a archivos TypeScript en las siguientes partes.
- Tipos base para campos, clientes, reservas y filtros del panel.
- Una comprobación compilable que fije los contratos iniciales.

No se convertirán todavía archivos `.js` ni `.jsx`. La aplicación seguirá ejecutándose exactamente igual que antes.

## Decisiones

- Se usará `strict: true` para que los nuevos módulos no acumulen ambigüedad.
- Se usará `moduleResolution: "Bundler"`, compatible con Vite y los imports actuales.
- Se mantendrá `noEmit: true`; Vite seguirá siendo responsable del build.
- El alcance inicial del compilador será `src/**/*.ts`, `src/**/*.tsx` y declaraciones `.d.ts`. Los archivos JavaScript existentes se migrarán por partes.
- Los tipos de dominio estarán en `src/types.ts` y no dependerán de React, Supabase ni del navegador.

## Criterios de aceptación

- `npm run typecheck` termina correctamente.
- `npm run lint` sigue pasando.
- `npm run build` sigue pasando.
- Las comprobaciones actuales de reservas, UI, componentes, administración y Supabase siguen pasando.
- No se modifican los estilos ni el comportamiento visible.
- `main` permanece intacta; los cambios se realizan únicamente en `version-real`.
