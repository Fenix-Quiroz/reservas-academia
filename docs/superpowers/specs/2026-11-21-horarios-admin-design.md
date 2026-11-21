# Editor de horarios de academia — Diseño

## Intención

Permitir que el dueño del polideportivo modifique por sí mismo los horarios semanales bloqueados por entrenamientos, sin editar Supabase manualmente ni depender del desarrollador.

La edición debe ser visual, reversible y suficientemente clara para que una persona pueda bloquear o liberar un horario con un toque.

## Situación actual

- `public.horarios_bloqueados` es la fuente de verdad de los entrenamientos recurrentes.
- Cada registro contiene `cancha_id`, `dia_semana`, `inicio_minuto`, `fin_minuto`, `motivo` y `activo`.
- La tabla ya tiene RLS para permitir administración únicamente al rol `admin`.
- Las funciones públicas de disponibilidad y creación de reservas ya consultan estos bloqueos en PostgreSQL.
- El respaldo local está en `src/data/horarios-entrenamientos.json`.
- Las reservas públicas solo empiezan en intervalos de 30 minutos, aunque algunos entrenamientos existentes terminan en rangos de 80 o 85 minutos.

## Objetivos

- Agregar una sección `Horarios de academia` al panel de administración.
- Permitir elegir un campo y editar sus horarios semanales con switches de 30 minutos.
- Mostrar claramente `Libre` y `Bloqueado por entrenamiento` sin depender solo del color.
- Permitir copiar un día a otros días para acelerar la configuración.
- Mantener los cambios pendientes hasta que el usuario pulse `Guardar cambios`.
- Guardar cada actualización de campo y día de forma atómica.
- No modificar reservas reales, eventos especiales ni horarios de otros campos.
- Mantener un modo local de respaldo para la demo.

## Alcance de la primera entrega

La primera entrega será un simulador local para validar la experiencia sin tocar producción:

- El horario inicial se cargará desde un JSON de demo.
- Los switches actualizarán un borrador completo en `localStorage`.
- `Guardar cambios` llamará a un repositorio simulado que imita el envío a Supabase.
- Se simularán estados de guardado, error y reintento.
- Esta fase no modificará SQL, tablas, funciones RPC ni datos de Supabase.

La conexión real con Supabase quedará como una fase posterior, usando el mismo contrato del repositorio simulado y solo después de revisar el comportamiento local.

## No objetivos

- Editar reservas de clientes desde esta sección.
- Liberar reservas reales o eventos especiales desde la grilla.
- Crear excepciones para una fecha concreta o feriado.
- Usar minutos arbitrarios distintos de la resolución de 30 minutos.
- Agregar todavía un historial detallado de quién cambió cada bloque.

## Criterios de rechazo

- No guardar automáticamente cada toque sin permitir revisar los cambios.
- No mostrar una matriz con todos los campos y todos los días a la vez en móvil.
- No hacer que el dueño escriba rangos de hora para una operación simple.
- No borrar físicamente información de configuración que pueda necesitarse para recuperar el estado anterior.

## Enfoques considerados

### 1. Grilla semanal por campo — elegido

El usuario selecciona `Campo 1`, `Campo 2`, `Campo 3` o `Vóley`. Los días aparecen como columnas en escritorio y como pestañas en móvil; las filas son bloques de 30 minutos.

Es la opción elegida porque reduce errores de campo, funciona con switches grandes en móvil y permite entender el horario de una semana de un vistazo.

### 2. Matriz completa de día y campo

Cada fila sería una combinación como `Lunes — Campo 1` y las horas irían en columnas. Facilita comparar campos, pero se vuelve ancha, difícil de leer y propensa a tocar el campo equivocado.

### 3. Editor de reglas por formulario

El usuario escribiría reglas como `lunes, vóley, 6:00 p. m. a 8:00 p. m.`. Es flexible, pero agrega campos, validaciones y escritura manual para una tarea que debería resolverse tocando bloques.

## Diseño de la interfaz

### Escritorio

- Navegación: nueva sección `Horarios de academia`, ubicada junto a `Agenda`.
- Encabezado: `Horarios de entrenamiento` y la ayuda `Se repite todas las semanas`.
- Selector de campo: `Campo 1`, `Campo 2`, `Campo 3`, `Campo de vóley`.
- Grilla: días de lunes a domingo en columnas; los bloques editables se agrupan en tres acordeones para no presentar una lista demasiado larga: `Mañana` (7:00 a. m.–12:00 p. m.), `Tarde` (12:00 p. m.–7:00 p. m.) y `Noche` (7:00 p. m.–10:00 p. m.). Solo un turno se despliega a la vez. El último switch representa 9:30–10:00 p. m.
- Cada celda será un control accesible tipo switch:
  - apagado: `Libre`;
  - encendido: `Bloqueado por entrenamiento`.
- Acciones: `Copiar día`, `Aplicar a otros días`, `Deshacer cambios` y `Guardar cambios`.
- Resumen: cantidad de bloques libres, bloques bloqueados y cambios pendientes.
- Confirmación: antes de guardar se indicará que el horario se repetirá semanalmente.

### Móvil

- Selector de campo y acordeón de turnos arriba.
- Días como pestañas: `Lun`, `Mar`, `Mié`, `Jue`, `Vie`, `Sáb`, `Dom`.
- Lista vertical de bloques de 30 minutos del turno desplegado, con switches grandes.
- Barra fija inferior con cambios pendientes y `Guardar`.
- Cada switch tendrá nombre accesible, por ejemplo `Lunes, Campo de vóley, 6:00 p. m., bloqueado`.

### Reglas visuales

- Verde, icono de check y texto `Libre`.
- Ámbar, icono de candado y texto `Bloqueado`.
- Texto de ayuda visible: `Toca un bloque para ocuparlo o liberarlo`.
- Los estados nunca dependerán únicamente del color.
- Las reservas y eventos no se representarán como editables en esta pantalla; se administran desde sus secciones actuales.

## Modelo de persistencia de la primera entrega

La primera entrega es deliberadamente local: no escribirá en Supabase, no ejecutará SQL y no llamará a `.from()` ni `.rpc()` desde el editor. El JSON existente será la semilla inicial del horario y el navegador mantendrá dos estados separados:

- `servidor-demo`: última configuración completa simulada como guardada.
- `borrador`: configuración completa que se actualiza en cada toque de un switch.

El borrador se conservará al recargar la página y también cuando una simulación de guardado falle o quede incierta. Solo se eliminará después de que `guardarHorariosDemo` confirme el guardado simulado. El repositorio devolverá la configuración normalizada para que la interfaz pueda mostrar el estado confirmado.

Los rangos actuales de 80/85 minutos se visualizarán en las celdas de 30 minutos que crucen. Al guardar se unirán las celdas contiguas dentro del rango editable de 7:00 a. m.–10:00 p. m. El límite de 10:00 p. m. será una constante de configuración para poder ampliarlo más adelante.

Las reservas y eventos existentes solo producirán un aviso informativo. No se cancelarán, editarán ni reemplazarán. El bloqueo recurrente quedará guardado para que aplique a futuras disponibilidades cuando la reserva actual ya haya terminado.

## Fase posterior: Supabase real

Cuando la experiencia local sea revisada, el mismo contrato podrá conectarse a una función administrativa transaccional, preferentemente:

`guardar_horarios_entrenamiento_admin(p_cancha_id integer, p_dia_semana smallint, p_bloques jsonb)`

Esa función deberá validar campo, día, rango y resolución; modificar únicamente el horario recurrente del campo y día seleccionados; desactivar los rangos que ya no formen parte de la configuración; insertar o reactivar los rangos nuevos; actualizar `updated_at`; y devolver el horario normalizado. La integración real, las migraciones SQL y las políticas de producción quedan fuera de esta entrega.

## Límites de seguridad

- Un futuro adaptador SQL verificará el rol `admin` además de las políticas RLS.
- No se dará acceso público a la tabla.
- La vista pública seguirá consultando disponibilidad mediante las funciones existentes.
- Un error de red no debe mostrar un falso mensaje de guardado.
- Esta primera entrega no implementa edición simultánea; se mantiene un flujo simple para un administrador.

## Archivos previstos

- Crear `src/components/admin/AdminHorarios.tsx`.
- Crear `src/horariosAdmin.ts` para normalización, switches y rangos.
- Modificar `src/AdminApp.tsx` y `src/components/admin/AdminNavegacion.tsx`.
- Modificar `src/almacen.ts` para el respaldo local.
- Crear un JSON de configuración inicial para la demo y un repositorio simulado de guardado.
- Añadir pruebas puras para conversión de rangos, unión de bloques, separación de bloques y aislamiento por campo/día.

La integración real con `src/supabaseData.ts`, las migraciones SQL y las políticas de producción no forma parte de esta primera entrega.

## Criterios de aceptación

- El dueño puede seleccionar un campo y bloquear o liberar un bloque con un switch.
- Puede cambiar varios bloques y revisar los cambios antes de guardar.
- Puede copiar un día a otros días sin modificar campos no seleccionados.
- Al recargar, el horario guardado se mantiene y afecta la disponibilidad pública.
- Las reservas existentes y los eventos especiales permanecen intactos.
- El acceso administrativo funciona en producción y en demo local.
- `typecheck`, `lint`, `build` y las pruebas específicas pasan.
