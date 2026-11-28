# Sistema de alquiler de campos

Aplicación de reservas con una vista para clientes y un panel privado para el encargado en `/admin`.

## Desarrollo local

    npm install
    npm run dev

La configuración local de Supabase va en `.env.local` y no debe subirse al repositorio. Usa `.env.example` como guía para las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.

Sin esas variables, la aplicación funciona con el modo demo local. Con Supabase configurado, las reservas y los clientes se leen y guardan en la base remota; los datos de prueba del navegador se limpian automáticamente.

## Activar Supabase

1. Abre el proyecto en Supabase.
2. En SQL Editor, pega y ejecuta `supabase/schema.sql`.
3. Si la base ya existía, ejecuta también `supabase/fix-monto-reservas.sql` para que las nuevas reservas guarden su precio real.
4. Para activar los estados de inasistencia, los números bloqueados y los clientes confiables, ejecuta `supabase/fix-control-clientes.sql`.
5. Ejecuta `supabase/fix-horarios-academia.sql` para convertir `horas` a `numeric(2,1)`, habilitar reservas de `1`, `1.5`, `2` o `3` horas, cargar los entrenamientos semanales, el horario de atención y los precios reales en la API pública.
   Para una base ya operativa que solo necesita reemplazar la programación de fútbol, ejecuta `supabase/fix-horarios-academia-programacion.sql`; esta migración no cambia tipos, triggers, reservas ni C4/vóley.
6. La misma migración crea `bloqueos_eventos`: desde el panel, el encargado puede bloquear eventos de 5 o más horas. Esos rangos aparecen como no disponibles para clientes y no exponen los detalles del evento.
7. En Database > Publications, confirma que `reservas` esté en `supabase_realtime`.
8. Ejecuta `supabase/horarios-entrenamiento-admin.sql` para crear la RPC que permite al administrador guardar la configuración semanal. Esta migración solo crea o reemplaza funciones y permisos; no cambia reservas ni horarios por sí sola.
9. Para actualizar automáticamente la disponibilidad pública cuando el administrador bloquee o libere horarios, ejecuta `supabase/fix-realtime-horarios-publicos.sql`.
10. En Authentication, crea el usuario del encargado y asígnale `app_metadata.role = admin`.
11. Para activar los sorteos reales, ejecuta `supabase/fix-sorteos-reales.sql` después de aplicar el esquema y las migraciones de pagos.
    La RPC `public.ejecutar_sorteo()` solo acepta administradores, guarda el snapshot de cada ticket y registra el ganador. Participan únicamente reservas `finalizado` con `pago_estado` `confirmado` o `no_requerido`; cada reserva cuenta como un ticket, sin importar si duró 1, 2 o 3 horas.
    El primer sorteo toma todas las reservas elegibles existentes. Los siguientes toman solo reservas creadas después del corte del sorteo anterior.
12. Reinicia Vite con `npm run dev`.

### Notificaciones del encargado en Android

El panel puede avisar al encargado en Chrome cuando se crea una nueva reserva. La alerta solo le indica que debe entrar a `/admin` para revisar y confirmar el comprobante; no cambia automáticamente el estado del pago.

Para habilitarlo en una base existente:

1. Ejecuta `supabase/fix-notificaciones-web-push.sql` en el SQL Editor.
2. Genera un par de claves VAPID y coloca la pública en `VITE_VAPID_PUBLIC_KEY` tanto en `.env.local` como en las variables de Vercel. Después vuelve a desplegar el frontend para que la clave llegue al navegador. La clave privada nunca debe ir en `VITE_*`, `.env.example` ni código del navegador.
3. Configura los secretos de Supabase para la Edge Function:

       supabase secrets set VAPID_SUBJECT=mailto:encargado@tu-dominio.com VAPID_PUBLIC_KEY=tu_clave_publica_vapid VAPID_PRIVATE_KEY=tu_clave_privada_vapid NOTIFICACIONES_WEBHOOK_SECRET=un_secreto_largo

4. Publica la función:

       supabase functions deploy notificar-nueva-reserva

5. Habilita las extensiones `pg_net` y `pg_cron` en Database > Extensions y guarda en Supabase Vault la URL y el secreto que usará el trigger:

       select vault.create_secret('https://tu-proyecto.supabase.co/functions/v1/notificar-nueva-reserva', 'notificaciones_push_url');
       select vault.create_secret('un_secreto_largo', 'notificaciones_push_secret');

   La migración crea un trigger asíncrono sobre `public.reservas` en `INSERT` y un job de `pg_cron` que reintenta eventos pendientes con backoff; no es necesario crear otro Database Webhook en el Dashboard.
6. Entra al panel desde Chrome en el Android del encargado y pulsa **Activar notificaciones**. Debe permitir las notificaciones del sitio.

El trigger se ejecuta después de la inserción y el envío push es independiente: si una notificación falla, la reserva y su comprobante permanecen guardados. Las suscripciones vencidas se limpian automáticamente. Si el proveedor responde con un timeout ambiguo, el evento queda marcado como incierto para revisión manual y no se reenvía automáticamente para evitar duplicados. Después de revisar los logs del proveedor, un operador puede reabrir solo las entregas inciertas con `select public.reabrir_evento_push_incierto('id-de-la-reserva');`.

### Adelanto Yape y comprobantes

El paso final de reserva solicita un adelanto mínimo de S/ 10 por Yape al número `995933438` (Jesús Leg*), y permite cargar una captura JPG, PNG o WEBP de hasta 5 MB. El comprobante se guarda en el bucket privado `comprobantes-pago` y queda vinculado a `reserva_id`; la carga no aprueba automáticamente el pago.

Como la migración escalable ya está aplicada, ejecuta también `supabase/fix-pagos-expiracion.sql`. Esta migración libera las reservas cuyo plazo de revisión venció y otorga a la Edge Function los permisos administrativos explícitos que necesita; si ves un error `42501`, vuelve a ejecutar este archivo.

Para que “Mis reservas” muestre el estado del adelanto, ejecuta después `supabase/fix-mis-reservas-pago.sql`. Así una carga recibida aparece como “Esperando verificación” sin cambiar el estado operativo `activo` de la reserva.

Para que el panel pueda ver, descargar y confirmar comprobantes, ejecuta también `supabase/fix-pagos-admin.sql`. La confirmación valida el rol `admin` y actualiza el pago y la reserva en una sola operación; el navegador nunca recibe `service_role`.

Para que los celulares activos de “Números confiables” puedan reservar sin adelanto, ejecuta al final `supabase/fix-clientes-confiables-adelanto.sql`. La migración reemplaza la RPC pública de creación por una firma que valida el beneficio en el servidor: los demás celulares siguen iniciando un pago pendiente de S/ 10 con expiración de 30 minutos. Si se desactiva un número, solo afecta reservas nuevas.

Después de ejecutar `supabase/fix-pagos-escalables.sql` y verificar el bucket privado, publica la Edge Function:

    supabase functions deploy registrar-adelanto-yape

En Supabase hospedado, `SUPABASE_SERVICE_ROLE_KEY` es una variable reservada que la plataforma inyecta automáticamente en la Edge Function. No intentes crearla con `supabase secrets set`, ni la agregues a `.env.example`, a `VITE_*` o a ningún código del navegador. Cada intento iniciado desde la pantalla usa `pago_expira_at` a 30 minutos para la carga y revisión; mientras el adelanto esté pendiente, la reserva conserva el estado operativo `activo` para que el horario no se venda dos veces. Una carga aceptada muestra: “Reserva asegurada. Tu comprobante está pendiente de revisión.”

El panel se abre en `/admin` y requiere iniciar sesión. La vista pública de clientes no requiere cuenta.

Las reservas comienzan en horas enteras y pueden durar una hora, una hora y media, dos o tres horas. El precio se calcula proporcionalmente al precio por hora de cada campo. El orden recomendado para una base existente es ejecutar `fix-monto-reservas.sql`, `fix-control-clientes.sql` y finalmente `fix-horarios-academia.sql`; este último reemplaza las funciones públicas con sus firmas decimales. Para cambiar únicamente la programación de C1, C2 y C3 sin tocar una base ya operativa, usa `fix-horarios-academia-programacion.sql`.

Los eventos especiales no son reservas públicas ni se incluyen todavía en el balance mensual: son bloqueos administrativos para torneos y actividades largas. Al cancelarlos se conserva el histórico y se libera el rango para futuras reservas.

## Comprobaciones

    npm run check
    npm run check:scenarios
    npm run check:admin
    npm run check:ui
    npm run check:supabase
    npm run check:confiables
    npm run lint
    npm run build

## Antes de producción

El inicio de sesión del panel está implementado y el flujo público usa funciones RPC protegidas; las tablas no deben quedar abiertas al navegador. Configura las variables de Supabase también en Vercel antes de publicar.
