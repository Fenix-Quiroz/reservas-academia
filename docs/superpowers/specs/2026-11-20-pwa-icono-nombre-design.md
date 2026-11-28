# Ícono y nombre de la PWA de Reservas

## Intención

Permitir que el sitio público de reservas se agregue a la pantalla de inicio de Android y iPhone con el logo del Polideportivo El Jaguar y el nombre “Reservas”. La web abierta en el navegador debe conservar su apariencia actual.

## Alcance

- Agregar un manifiesto web para el sitio público con nombre completo “Reservas El Jaguar”, nombre corto “Reservas” y modo `standalone`.
- Declarar el manifiesto y el ícono compatible con iPhone en `index.html`.
- Reutilizar `public/favicon-jaguar.png`, que ya es un logo cuadrado de 256×256.
- Agregar un manifiesto independiente para el panel con nombre “Panel El Jaguar”, alcance `/admin/` y su propio logo.
- Publicar una copia PNG del logo administrativo para que iPhone pueda usarla como `apple-touch-icon`.
- Cubrir la configuración con el chequeo existente de UI.

## Fuera de alcance

- No se agrega una aplicación nativa ni publicación en App Store/Google Play.
- No se cambia el diseño general ni se agregan estilos específicos para modo instalado en esta iteración.
- El panel administrativo usa un manifiesto separado para que su ícono abra `/admin/` y no la pantalla pública.

## Decisión

Se usarán dos manifiestos estáticos y etiquetas HTML compatibles con ambos sistemas. El nombre visible puede ser editado por el usuario al crear el acceso directo; los valores predeterminados serán “Reservas” para el sitio público y “Panel El Jaguar” para administración.
