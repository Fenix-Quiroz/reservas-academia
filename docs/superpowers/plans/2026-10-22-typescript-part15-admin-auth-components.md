# TypeScript Parte 15: componentes base de autenticación admin

> Ejecución incremental en `version-real`; no se hará commit.

## Objetivo

Migrar `AdminMarca.jsx`, `AdminLogin.jsx` y `AdminNoAutorizado.jsx` a TypeScript.

## Alcance

- Tipar el formulario de acceso, el resultado de autenticación y el cierre de sesión.
- Mantener textos, accesibilidad, navegación y estilos del panel.
- Actualizar imports y checks sin modificar la lógica de autenticación.

## Pasos

- [x] Crear la comprobación TypeScript y verla fallar antes de los módulos.
- [x] Implementar los tres componentes `.tsx`.
- [x] Actualizar imports, comprobaciones y eliminar los módulos `.jsx` reemplazados.
- [x] Ejecutar checks, typecheck, lint y build.
- [x] Integrar luego en `main` sin commit.
