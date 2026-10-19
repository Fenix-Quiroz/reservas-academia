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
3. En Database > Publications, confirma que `reservas` esté en `supabase_realtime`.
4. En Authentication, crea el usuario del encargado y asígnale `app_metadata.role = admin`.
5. Reinicia Vite con `npm run dev`.

El panel se abre en `/admin` y requiere iniciar sesión. La vista pública de clientes no requiere cuenta.

## Comprobaciones

    npm run check
    npm run check:scenarios
    npm run check:admin
    npm run check:ui
    npm run check:supabase
    npm run lint
    npm run build

## Antes de producción

El inicio de sesión del panel ya está implementado. Sin embargo, las políticas SQL del flujo público siguen siendo permisivas para mantener sencilla esta demo. Antes de una publicación abierta conviene endurecer RLS, limitar operaciones anónimas y configurar las variables de Supabase también en Vercel.
