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
6. La misma migración crea `bloqueos_eventos`: desde el panel, el encargado puede bloquear eventos de 5 o más horas. Esos rangos aparecen como no disponibles para clientes y no exponen los detalles del evento.
7. En Database > Publications, confirma que `reservas` esté en `supabase_realtime`.
8. En Authentication, crea el usuario del encargado y asígnale `app_metadata.role = admin`.
9. Reinicia Vite con `npm run dev`.

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

Las reservas comienzan en horas enteras y pueden durar una hora, una hora y media, dos o tres horas. El precio se calcula proporcionalmente al precio por hora de cada campo. El orden recomendado para una base existente es ejecutar `fix-monto-reservas.sql`, `fix-control-clientes.sql` y finalmente `fix-horarios-academia.sql`; este último reemplaza las funciones públicas con sus firmas decimales.

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
