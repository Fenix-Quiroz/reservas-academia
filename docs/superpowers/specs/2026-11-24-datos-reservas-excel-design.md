# Diseño: Excel de datos de reservas

## Intención

Agregar al panel administrativo un segundo botón de descarga para generar un Excel histórico de reservas. El Excel de balance mensual existente no se modifica.

El nuevo reporte debe ayudar al dueño a revisar rápidamente quién reserva con mayor frecuencia en cada campo y comprobar el pago asociado a cada reserva.

## Alcance

### Incluye

- Un botón separado, con un nombre claro como **Descargar datos de reservas**.
- Un archivo Excel independiente con todas las reservas disponibles en el panel.
- Una sola hoja organizada en bloques consecutivos: Campo 1, Campo 2, Campo 3, etc.
- Un título grande para cada campo.
- Una fila por cada reserva individual.
- Columnas por fila: nombre, número, comprobante, fecha, horario de inicio-fin y cantidad de horas.
- El comprobante correspondiente a esa reserva incrustado como imagen en su fila.
- Orden de personas dentro de cada campo por cantidad de reservas descendente; cada reserva de la persona se muestra en su propia fila, repitiendo su nombre, número y comprobante.
- Orden de las reservas de una misma persona por fecha y hora.

### No incluye

- Cambios al Excel de balance mensual actual.
- Cambios en la base de datos o en el flujo de carga de comprobantes.
- Una pestaña distinta por campo.
- Agrupar varias reservas en una sola fila.

## Decisiones de diseño

- El reporte será histórico: no dependerá del selector de mes del balance.
- La identidad para contar reservas será el número de celular normalizado; el nombre que se muestra será el guardado en cada reserva.
- Cada bloque seguirá el orden de los campos configurados en `canchas.json`.
- Las reservas sin comprobante mostrarán `Sin comprobante` en la celda correspondiente.
- El comprobante se descargará directamente del bucket privado con la sesión administrativa, se incrustará en el libro y no se guardará como enlace permanente que pueda expirar.
- Si la biblioteca actual de Excel no permite imágenes incrustadas, se añadirá únicamente la capacidad mínima necesaria o se cambiará la estrategia de exportación, manteniendo la interfaz y el formato solicitado.

## Estructura visual propuesta

Cada bloque tendrá esta forma:

```text
CAMPO 1
Nombre | Número | Comprobante | Fecha | Horario | Horas
Cliente con más reservas | ... | imagen | ... | ... | ...
Cliente con más reservas | ... | imagen | ... | ... | ...
Otro cliente             | ... | imagen | ... | ... | ...

CAMPO 2
Nombre | Número | Comprobante | Fecha | Horario | Horas
...
```

## Criterios de aceptación

1. El botón nuevo descarga un archivo distinto al balance mensual.
2. El balance mensual actual conserva su comportamiento y estructura.
3. Cada reserva aparece exactamente una vez en el bloque de su campo.
4. Un cliente con tres reservas aparece en tres filas y sus tres comprobantes quedan asociados a las filas correctas.
5. Dentro de cada campo, el cliente con más reservas aparece primero.
6. Cada fila contiene nombre, número, fecha, horario, horas y comprobante visual cuando existe.
7. El archivo sigue siendo legible cuando una reserva no tiene comprobante o la imagen no puede descargarse.

