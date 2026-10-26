# Limpieza de datos de desarrollo

## Intención

Permitir que el administrador reinicie los datos de prueba desde el panel sin abrir Supabase SQL Editor, dejando lista la aplicación para repetir pruebas de reservas.

## Alcance

La limpieza eliminará reservas, clientes, pagos, comprobantes, archivos del bucket `comprobantes-pago`, bloqueos de eventos, números bloqueados/confiables y límites de intentos. Conservará las cuentas de Auth del panel y la tabla `horarios_bloqueados`, porque esta última contiene la configuración fija de entrenamientos.

## Enfoque

Se añadirá una Edge Function `limpiar-datos-prueba` para borrar primero los archivos de comprobantes y después las filas relacionadas con el cliente administrativo de Supabase. La clave `service_role` solo existirá en el entorno de la función. El botón se mostrará únicamente durante `npm run dev` y tendrá una confirmación visible.

## Restricciones

- La función no se incluirá en el build de producción como botón visible.
- No se eliminarán usuarios de Supabase Auth.
- No se eliminarán horarios fijos de academia.
- La operación será total sobre los datos operativos de prueba y no tendrá recuperación automática.

## Criterios de aceptación

- El administrador puede solicitar la limpieza desde el panel de desarrollo.
- La función elimina también las capturas del bucket, no solo las filas de la base de datos.
- El panel queda vacío y puede volver a usarse para crear reservas.
- El frontend no contiene ni recibe `SUPABASE_SERVICE_ROLE_KEY`.
