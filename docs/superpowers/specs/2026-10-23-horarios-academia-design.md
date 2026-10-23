# Horarios reales de la academia — Diseño

## Intención

Incorporar los horarios semanales de entrenamiento de la academia, el horario real de atención del polideportivo y los precios reales de cada campo. Una hora que se cruce con un entrenamiento debe aparecer como ocupada y tampoco debe poder reservarse llamando directamente al RPC.

## Datos confirmados

- El polideportivo atiende todos los días de 7:00 a. m. a 1:00 a. m. del día siguiente.
- Los entrenamientos de la imagen se repiten semanalmente.
- Precios por hora:
  - Campo 1: S/ 55
  - Campo 2: S/ 50
  - Campo 3: S/ 60
  - Vóley: S/ 30
- Un intervalo de entrenamiento bloquea cualquier reserva que se cruce con él. Por ejemplo, un entrenamiento hasta las 8:25 p. m. también bloquea la reserva de 8:00 a 9:00 p. m.
- La aplicación sigue trabajando con reservas de una o dos horas y horas de inicio enteras.

## Enfoques considerados

1. **Reglas duplicadas en TypeScript y SQL.** Es la opción más rápida, pero obliga a mantener dos listas de horarios y puede generar diferencias entre lo que muestra el cliente y lo que acepta la base.
2. **Tabla recurrente en Supabase y configuración local de respaldo.** La base es la fuente de verdad para producción, el modo demo conserva el mismo comportamiento y el RPC valida los cruces antes de crear una reserva. Es la opción elegida porque evita saltos desde el navegador y permite administrar los horarios más adelante. En la UI esos cruces solo se muestran como horas no disponibles; la comprobación del RPC es interna.
3. **Solo una tabla consultada directamente desde el navegador.** No se usará porque expondría una tabla de configuración y complicaría el control de permisos públicos.

## Diseño elegido

### Configuración local

Crear `src/data/horarios-entrenamientos.json` con intervalos por `canchaId`, día de semana (`0` domingo a `6` sábado), minuto de inicio y minuto de fin. Crear una función pura para comprobar cruces y usarla desde `horarios()`.

La grilla local generará inicios desde las 7:00 hasta las 24:00, permitiendo que una reserva termine a la 1:00 a. m. Los horarios pasados seguirán ocultándose como ahora.

### Supabase

Crear `public.horarios_bloqueados` con:

- `cancha_id`.
- `dia_semana` entre 0 y 6.
- `inicio_minuto` y `fin_minuto` dentro del día operativo.
- `activo` y fechas de auditoría.
- restricción para impedir intervalos inválidos o duplicados.

La tabla será solo para administración mediante RLS. `obtener_horarios_publicos` la consultará desde una función `SECURITY DEFINER`, sin entregar acceso directo a la tabla. `crear_reserva_publica` repetirá la validación de horario, apertura, entrenamiento y precio en PostgreSQL.

Crear `supabase/fix-horarios-academia.sql` para aplicar los cambios a una base existente. También actualizar `schema.sql`, `permissions.sql`, la configuración de campos y las pruebas para que una instalación nueva y una existente queden alineadas.

## No incluye

- Un editor de horarios en el panel de administración.
- Horarios diferentes por fecha concreta o feriados.
- Reservas con minutos distintos de cero.
- Cambios en el límite de reservas, estados o flujo de pago.

## Criterios de aceptación

- La vista pública muestra horas desde las 7:00 a. m. hasta las 12:00 a. m. como inicios válidos, respetando una duración de una o dos horas hasta la 1:00 a. m.
- Cada intervalo de entrenamiento de la imagen aparece ocupado para su campo y día semanal.
- Una reserva que cruce un entrenamiento aparece como no disponible y falla también si se llama al RPC directamente.
- Los precios visibles, el monto guardado y el balance usan 55, 50, 60 y 30 soles según el campo.
- Las pruebas locales, SQL, TypeScript, lint y build pasan.
