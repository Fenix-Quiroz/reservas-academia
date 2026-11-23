# Integración segura de horarios de academia con Supabase

## Intención

Reemplazar progresivamente el repositorio demo de horarios por una integración real con `public.horarios_bloqueados`, sin modificar reservas existentes ni probar escrituras directamente en producción.

## Decisión principal

La lectura administrativa puede usar `select` directo sobre `horarios_bloqueados`, porque la tabla ya tiene RLS para administradores. El guardado usará una única función RPC de Postgres para recibir la configuración semanal completa y actualizarla de forma atómica.

La función propuesta es:

`public.guardar_horarios_entrenamiento_admin(p_configuracion jsonb)`

Recibirá un objeto versionado con un arreglo completo de bloques en formato `cancha_id`, `dia_semana`, `inicio_minuto` y `fin_minuto`. Devolverá los bloques activos normalizados después del guardado.

## Validaciones de la función

- Solo puede ejecutarla un usuario cuyo `app_metadata.role` sea `admin`.
- Los campos deben estar entre 1 y 4.
- Los días deben usar `Date.getDay()`: domingo 0, lunes 1, hasta sábado 6.
- Los bloques deben estar entre 420 y 1320 minutos, alineados a 30 minutos y con fin mayor que inicio.
- No se permiten solapamientos dentro del mismo campo y día.
- La función solo modifica filas cuyo motivo sea `Entrenamiento de academia`.
- Las reservas, eventos especiales y sus datos no se modifican.
- Un bloqueo advisory de transacción evita dos actualizaciones simultáneas del horario recurrente.

## Alcance de la primera tarea

Crear la migración SQL y una comprobación estática local. La migración no se ejecutará contra el proyecto Supabase actual. Primero se revisará el SQL y después se probará en un proyecto separado o entorno controlado.

## Fuera de alcance por ahora

- Ejecutar la migración en producción.
- Conectar todavía el botón `Guardar cambios` del panel a la RPC real.
- Cambiar la disponibilidad pública.
- Crear una Edge Function; esta operación es de base de datos y se resolverá con una función Postgres.
