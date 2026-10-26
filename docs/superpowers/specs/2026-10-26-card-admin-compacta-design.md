# Diseño: tarjeta administrativa compacta

## Intención

Reducir la sensación de saturación en las tarjetas de reservas del panel administrativo, haciendo que las acciones sean más pequeñas y fáciles de escanear sin perder información.

## Alternativas consideradas

1. Mantener una sola fila con todas las acciones: es compacta, pero puede quedar apretada en pantallas medianas.
2. Separar la tarjeta en dos filas: mejora la lectura, pero aumenta la altura de cada reserva.
3. Tarjeta de una fila con un rail de acciones compacto: mantiene la densidad actual, destaca solo la acción principal y deja las acciones secundarias discretas.

Se elige la alternativa 3 porque conserva la estructura actual del panel y reduce el peso visual sin añadir una segunda fila.

## Diseño elegido

- Mantener fondo oscuro, borde dorado, tipografía y datos actuales.
- Conservar tres zonas: datos de fecha, datos del campo/cliente y acciones.
- Mostrar “Comprobante de pago” junto a su estado como una etiqueta compacta.
- Convertir “Ver” y “Descargar” en acciones secundarias pequeñas, con iconos de ojo y descarga.
- Mostrar “Confirmar pago” como única acción destacada, con icono de check.
- Mostrar “No asistió” y “Cancelar” como botones de menor peso visual, con iconos de prohibido y cancelar.
- Usar iconos SVG de `lucide-react`, no emojis ni imágenes rasterizadas.
- Mantener etiquetas de texto visibles; los iconos no serán el único significado.

## Fuera de alcance

- No cambiar la lógica de pagos, confirmación, cancelación ni estados.
- No modificar el diseño de la vista del cliente.
- No cambiar colores globales ni el contenido de la información de la reserva.
