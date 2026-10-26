# Auditoría del flujo público de reservas

Fecha de auditoría inicial: 25 de octubre de 2026  
Última auditoría de seguimiento: 25 de octubre de 2026  
Alcance: recorrido público para seleccionar un campo, elegir horario, ingresar datos, subir comprobante Yape y consultar “Mis reservas”.  
Fuera de alcance: panel administrativo.

## Resultado general

La auditoría de seguimiento volvió a probar el recorrido público en local, las rutas `/` y `/admin`, los caminos de datos y comprobante, el cambio de identidad con “No soy [nombre]” y todas las verificaciones automáticas disponibles. La reserva nueva puede avanzar hasta la pantalla de comprobante sin errores bloqueantes.

Se corrigió un caso de una ruta secundaria: el estado vacío podía aparecer junto al error cuando fallaba la consulta remota de “Mis reservas” (H-08). También se corrigió durante esta revisión la opción “Ya reservé antes” (H-07), que no funcionaba correctamente sin comprobante.

La prueba final de creación y subida contra producción no se ejecutó porque habría creado una reserva real y subido un comprobante. Sí se verificó la carga pública de horarios desde Supabase en modo lectura.

## Lista de hallazgos

| ID | Prioridad | Estado | Hallazgo |
| --- | --- | --- | --- |
| H-01 | Media | Pendiente — decisión del dueño | Un horario puede mostrarse como “Libre” aunque el botón esté deshabilitado porque no permite completar la duración mínima. |
| H-02 | Media | Corregido — verificado | El navegador mostraba una advertencia por dos clientes de Supabase usando el mismo almacenamiento de sesión. |
| H-03 | Baja | Corregido — verificado | En el modo local, un intento sin comprobante podía dejar registrado el cliente aunque no se crease la reserva. |
| H-04 | Baja | Verificado — correcto en remoto | El modo local no muestra la etiqueta de comprobante pendiente en “Mis reservas” porque la reserva simulada no tiene `pagoEstado`; el flujo remoto sí la muestra. |
| H-05 | Baja | Corregido para flujo público — XLSX administrativo pendiente | El build funciona, pero Vite advierte que algunos archivos JavaScript son grandes. |
| H-06 | Media | Corregido — verificado | “Mis reservas” mostraba “Aún no tienes reservas” mientras todavía esperaba la respuesta remota. |
| H-07 | Media | Corregido — verificado | “Ya reservé antes” dejaba el botón de búsqueda deshabilitado sin comprobante y en remoto no existía una búsqueda pública de cliente. |
| H-08 | Baja | Corregido — verificado | Si falla la consulta remota de “Mis reservas”, puede mostrarse también “Aún no tienes reservas” junto al mensaje de error. |
| H-09 | Baja | Verificado — sin hallazgo | El cambio mediante “No soy [nombre]” podría mezclar reservas o tokens entre el cliente anterior y el nuevo. |

## H-01 — Horario que dice “Libre” pero no se puede seleccionar

### Resumen

Este es un problema de claridad en la interfaz, no de cálculo de disponibilidad.

El sistema correctamente evita que el usuario reserve solo 30 minutos cuando ese bloque no puede conectarse con otro bloque libre para cumplir la duración mínima de una hora. Sin embargo, la fila sigue mostrando el texto “Libre”, aunque el botón está deshabilitado.

El usuario puede interpretar que la aplicación está fallando porque ve un horario libre, lo pulsa y no ocurre nada.

### Ejemplo observado

Supongamos estos bloques consecutivos:

| Horario | Disponibilidad real |
| --- | --- |
| 3:00–3:30 p. m. | Ocupado |
| 3:30–4:00 p. m. | Libre |
| 4:00–4:30 p. m. | Ocupado |

El bloque de 3:30–4:00 está libre físicamente, pero no puede iniciar una reserva normal de una hora porque el bloque siguiente está ocupado. Por eso el sistema lo deshabilita.

El problema es que visualmente aparece así:

```text
3:30 p. m. a 4:00 p. m.   S/ ...   Libre
``` 

pero el botón no permite hacer clic.

### Qué está pasando en el código

La decisión de permitir el clic usa dos condiciones:

```tsx
disabled={!h.libre || !puedeSeleccionarse}
```

Esto significa:

- `h.libre`: el bloque de 30 minutos no está ocupado.
- `puedeSeleccionarse`: además debe cumplir las reglas de duración mínima, conexión con el siguiente bloque y ampliación o reducción de la selección.

En cambio, la etiqueta solo revisa `h.libre`:

```tsx
h.libre ? (seleccionado ? 'Seleccionado' : 'Libre') : 'Ocupado'
```

Por eso un bloque puede tener simultáneamente estas dos condiciones:

```text
h.libre = true
puedeSeleccionarse = false
```

El comportamiento está implementado en [SelectorHorario.tsx](../src/components/cliente/SelectorHorario.tsx#L206-L238).

### Comportamiento esperado

La interfaz debería diferenciar claramente estos casos:

- Bloque libre y seleccionable: `Libre`.
- Bloque ocupado: `Ocupado`.
- Bloque libre, pero sin duración mínima disponible: `No disponible para 1 hora`.
- Bloque que forma parte de la selección: `Seleccionado`.

También sería conveniente que el texto accesible del botón explique por qué está deshabilitado, especialmente para usuarios que navegan con lector de pantalla.

### Corrección recomendada

Mantener las reglas actuales de disponibilidad y cambiar únicamente el estado visual:

```tsx
const estadoHorario = !h.libre
  ? 'Ocupado'
  : seleccionado
    ? 'Seleccionado'
    : puedeSeleccionarse
      ? 'Libre'
      : 'No disponible para 1 hora'
```

La corrección no debe hacer reservable el bloque. Solo debe explicar mejor por qué está deshabilitado.

### Pasos para reproducir

1. Abrir la reserva pública.
2. Elegir un campo.
3. Seleccionar un día y turno con un bloque libre aislado entre bloques ocupados.
4. Ubicar el bloque de 30 minutos aislado.
5. Observar que muestra `Libre`, pero el botón está deshabilitado.

### Prueba práctica haciendo una reserva local

Esta es la forma segura de probarlo sin crear datos reales en Supabase.

#### 1. Iniciar la aplicación sin conexión a Supabase

En PowerShell, dentro de la carpeta del proyecto, ejecutar:

```powershell
$env:VITE_SUPABASE_URL = ''
$env:VITE_SUPABASE_PUBLISHABLE_KEY = ''
npm run dev -- --host 0.0.0.0 --port 4174
```

Después abrir `http://localhost:4174`.

#### 2. Crear la primera reserva de prueba

1. Elegir Campo 1.
2. Elegir una fecha futura sin reservas de prueba previas.
3. Elegir el turno `Tarde`.
4. Seleccionar `4:00 p. m. a 5:00 p. m.`.
5. Continuar con los datos.
6. Ingresar un alias y celular de prueba, por ejemplo `Prueba Uno` y `987654321`.
7. Seleccionar una imagen local válida como comprobante.
8. Pulsar `Subir comprobante y asegurar reserva`.

En este modo local no se sube nada a Supabase. La reserva se guarda solamente en el almacenamiento local del navegador y sirve para ocupar el horario de 4:00 a 5:00.

#### 3. Comprobar el horario anterior

Volver al inicio y repetir la selección del mismo campo, fecha y turno. Luego revisar el bloque `3:30 p. m. a 4:00 p. m.`.

El resultado esperado actualmente es:

```text
3:30–4:00 p. m.  Libre       botón deshabilitado
4:00–5:00 p. m.  Ocupado     botón deshabilitado
```

Para confirmar el hallazgo, intenta pulsar `3:30 p. m. a 4:00 p. m.`. No debería seleccionarse, aunque el texto diga `Libre`.

La razón es que el sistema exige al menos una hora para bloques conectados. Como 4:00–4:30 ya está ocupado, no existe una hora completa empezando a las 3:30.

#### 4. Limpiar la prueba local

Al terminar, abrir una ventana privada nueva o borrar los datos del sitio `localhost:4174`. No es necesario borrar nada en Supabase porque esta prueba se ejecuta sin conexión al proyecto remoto.

#### Prueba equivalente en producción

No se recomienda hacerla directamente en producción solo para reproducir este hallazgo. Requeriría crear una reserva real con comprobante, ocuparía un horario y dejaría registros de pago. Si se dispone de un entorno de pruebas, los mismos pasos sirven allí.

### Criterios para darlo por corregido

- Ningún botón deshabilitado por duración mínima muestra `Libre`.
- Un bloque ocupado sigue mostrando `Ocupado`.
- Un bloque libre y seleccionable sigue mostrando `Libre`.
- Un bloque aislado que sí puede reservarse por 30 minutos sigue siendo seleccionable.
- Las reglas actuales de duración y disponibilidad no cambian.
- Las verificaciones de horarios y el recorrido manual de reserva siguen pasando.

## H-02 — Advertencia por dos clientes de Supabase

Estado actual: corregido y verificado en la aplicación conectada.

### Resumen sencillo

La aplicación crea dos clientes internos para comunicarse con Supabase:

- `supabase`: cliente general, preparado para operaciones que pueden usar sesión.
- `supabasePublic`: cliente de la vista pública, usado para consultar horarios y otras operaciones públicas sin reutilizar una sesión del panel administrativo.

La separación tiene una intención correcta: la vista pública no debería reutilizar una sesión administrativa guardada en el navegador. La advertencia aparece porque ambos clientes se crean dentro del mismo navegador y Supabase detecta que utilizan la misma identificación predeterminada para su almacenamiento de autenticación.

Esto no significa que se estén creando dos reservas, que se esté exponiendo la `service_role` ni que el usuario esté siendo cobrado dos veces.

El navegador mostró esta advertencia durante la carga pública de horarios:

```text
Multiple GoTrueClient instances detected in the same browser context.
```

No impidió cargar horarios en la prueba conectada y no produjo un error visible para el usuario. Es una advertencia de mantenimiento, pero conviene corregirla porque dos clientes de autenticación compartiendo el mismo almacenamiento pueden provocar comportamientos inesperados si ambos intentan leer, renovar o borrar una sesión al mismo tiempo.

### Cómo comprobarlo

1. Iniciar la aplicación con las variables de Supabase configuradas.
2. Abrir la reserva pública.
3. Abrir las herramientas del navegador con `F12`.
4. Entrar a la pestaña `Console`.
5. Elegir un campo y cargar los horarios.
6. Buscar una advertencia que empiece por `Multiple GoTrueClient instances detected`.

La carga de horarios debe seguir funcionando. El objetivo de esta prueba es confirmar la advertencia, no una falla de la reserva.

### Impacto real

En el flujo público actual, el impacto observado es bajo:

- Los horarios cargan correctamente.
- No se duplican solicitudes de reserva por esta advertencia.
- No se usa `service_role` en el frontend.
- La advertencia no bloquea la subida del comprobante.

El riesgo sería mayor si el panel administrativo y la vista pública compartieran sesión en la misma pestaña o si ambos clientes intentaran actualizar el token de acceso simultáneamente.

### Corrección recomendada

Dar a `supabasePublic` una clave de almacenamiento de autenticación distinta, o evitar crear el cliente general cuando solo se está ejecutando la vista pública. La corrección debe conservar estas condiciones:

- La vista pública no debe reutilizar una sesión del panel administrativo.
- El frontend nunca debe recibir `SUPABASE_SERVICE_ROLE_KEY`.
- Las consultas públicas de horarios deben seguir usando el cliente público.
- La advertencia debe desaparecer de la consola.

No se recomienda eliminar el cliente público ni usar el cliente administrativo para todo, porque eso mezclaría responsabilidades de sesión.

### Corrección aplicada

Se asignó al cliente público una clave de almacenamiento propia:

```ts
storageKey: 'supabase-public-auth'
```

El cliente público mantiene `persistSession: false`, `autoRefreshToken: false` y `detectSessionInUrl: false`, por lo que no reutiliza la sesión del panel administrativo.

Verificación realizada:

- `npm run check:supabase` pasó.
- La aplicación conectada cargó horarios desde Supabase.
- La consola del navegador quedó sin la advertencia `Multiple GoTrueClient instances detected`.

Archivo relacionado: [supabase.ts](../src/supabase.ts#L39-L50).

## H-03 — Cliente persistido en modo local tras un intento incompleto

Estado actual: corregido y verificado.

Antes de la corrección, en el modo local, al ingresar un alias y celular válidos pero intentar continuar sin comprobante, el cliente podía quedar registrado antes de que la validación del comprobante detuviera la reserva.

Esto no creó una reserva, pero puede afectar pruebas posteriores porque el sistema reconoce ese celular como cliente existente. Debe revisarse si el modo local debe imitar exactamente el orden del flujo remoto.

Archivo relacionado: [DatosReserva.tsx](../src/components/cliente/DatosReserva.tsx#L200-L234).

### Corrección aplicada

- El botón final permanece deshabilitado mientras no exista un comprobante seleccionado.
- El texto del botón indica `Selecciona tu comprobante` cuando falta la imagen.
- `crearYReservar` valida el comprobante antes de llamar a `createClient`.
- La validación dentro de `reservar` se mantiene como segunda barrera para cualquier llamada programática.

Así, un intento sin imagen no registra el cliente ni crea la reserva, incluso si se intenta evadir la interfaz.

## H-04 — Etiqueta de comprobante pendiente en “Mis reservas”

Estado actual: verificado correctamente con una reserva remota pendiente.

La ruta remota contempla el estado `pagoEstado` para mostrar que el comprobante está pendiente de verificación. La reserva simulada del modo local no incluye ese campo, por lo que la etiqueta no apareció durante esa prueba.

La captura de la prueba remota confirma que la tarjeta muestra correctamente `Esperando verificación` cuando el comprobante está pendiente. No se requiere cambio de código para este hallazgo.

Archivo relacionado: [MisReservas.tsx](../src/components/cliente/MisReservas.tsx).

## H-05 — Tamaño de los archivos generados

Estado actual: corregido para la carga pública; queda una advertencia asociada al módulo XLSX del panel administrativo.

### Causa

`main.tsx` importaba de forma estática tanto la aplicación pública como la aplicación administrativa. Por eso el código administrativo se incluía en el primer archivo JavaScript descargado por cualquier visitante, aunque estuviera entrando al flujo público de reservas.

### Corrección aplicada

- `App` y `AdminApp` ahora se cargan con `React.lazy` y `Suspense`.
- La aplicación pública y la administrativa se generan como chunks separados.
- El chunk inicial público pasó aproximadamente de 544 KB a 226 KB sin comprimir, y de 155 KB a 70 KB comprimido con gzip.
- La ruta pública ya no descarga el bundle administrativo completo.
- Se dejó una pantalla breve de `Cargando…` mientras se descarga el código de la ruta elegida.

### Verificación

`npm run build`, `npm run typecheck`, `npm run lint`, `npm run check`, `npm run check:ui` y las comprobaciones de componentes y flujo terminaron correctamente.

### Pendiente administrativo

El build todavía advierte por el chunk de `xlsx`, de aproximadamente 871 KB. Ese módulo solo se usa para exportar el balance desde el panel administrativo y no se descarga durante la carga pública. Optimizar o reemplazar esa librería puede hacerse después, cuando se trabaje el panel administrativo; ocultar la advertencia sin reducir el archivo no sería una optimización real.

Archivo relacionado: [main.tsx](../src/main.tsx).

## H-06 — Mensaje de “sin reservas” mostrado durante la carga

Estado actual: corregido y verificado.

### Causa

La aplicación sí tenía el estado `cargandoMias`, pero ese estado no se enviaba al componente `MisReservas`. Mientras `obtener_mis_reservas_publicas` esperaba la respuesta de Supabase, la lista todavía estaba vacía y el componente interpretaba esa lista como una respuesta final sin reservas.

Por eso el usuario podía ver durante unos instantes:

```text
Aún no tienes reservas
```

aunque todavía no había terminado la consulta.

### Corrección aplicada

- `App` pasa `cargandoMias` a `MisReservas`.
- Mientras la consulta está activa se muestra `Cargando tus reservas…`.
- El mensaje `Aún no tienes reservas` solo aparece después de que la consulta termina y devuelve una lista vacía.
- La consulta y el indicador usan `aria-busy` y `role="status"` para comunicar el estado de carga.

### Sobre la lentitud percibida

Este mensaje prematuro no era causado directamente por el build. La pantalla espera la llamada remota `obtener_mis_reservas_publicas`, por lo que la duración depende de la red y de la respuesta de Supabase.

El build mantiene una advertencia únicamente para el chunk administrativo de XLSX, de aproximadamente 871 KB sin comprimir y 323 KB comprimido. El chunk inicial público ronda 226 KB sin comprimir y 70 KB comprimido; el XLSX pertenece al balance administrativo y no se descarga al consultar las reservas públicas.

Archivo relacionado: [App.tsx](../src/App.tsx) y [MisReservas.tsx](../src/components/cliente/MisReservas.tsx).

## H-07 — “Ya reservé antes” no permite buscar correctamente

Estado actual: corregido y verificado.

### Qué se observaba

En el paso “Tus datos”, al pulsar “Ya reservé antes”, la pantalla cambia a “¡Hola de nuevo!”, pero el botón `Buscar mi nombre` aparece deshabilitado mientras no haya un comprobante seleccionado. Buscar un cliente existente no debería exigir subir una captura de Yape.

Además, en producción `App.buscarCliente` devolvía siempre `null` cuando Supabase estaba configurado. Por tanto, el flujo remoto no podía encontrar al cliente por celular.

### Corrección aplicada

- Se eliminó el botón “Ya reservé antes” y toda la pantalla de búsqueda asociada.
- Se eliminaron los estados, callbacks y funciones `findClient` y `buscarPorCelular`.
- El paso “Tus datos” ahora conserva un único recorrido: nombre, celular, comprobante y reserva.
- Después de una reserva exitosa, el navegador sigue recordando automáticamente al cliente mediante `guardarYo`; no se eliminó esa comodidad.
- Se mantuvo “Mis reservas” como la forma segura de consultar reservas anteriores mediante tokens.

### Verificación

Las aserciones de interfaz confirman que no existen “Ya reservé antes”, “Es mi primera vez”, “Buscar mi nombre”, `findClient` ni `setEncontrado`. También pasaron `npm run check:ui` y `npm run typecheck`.

Archivos relacionados: [DatosReserva.tsx](../src/components/cliente/DatosReserva.tsx), [App.tsx](../src/App.tsx) y [almacen.ts](../src/almacen.ts).

## H-08 — Error remoto acompañado por estado vacío

Estado actual: corregido y verificado.

### Qué puede ocurrir

Antes de la corrección, cuando `leerMisReservasRemotas` fallaba, `App` guardaba el mensaje global `No pudimos cargar tus reservas…` y terminaba `cargandoMias`. Como `mias` seguía vacío, `MisReservas` entraba en su rama normal y podía mostrar además `Aún no tienes reservas`.

Esto mezcla dos estados distintos: “la consulta falló” y “la consulta terminó correctamente sin resultados”. El usuario puede interpretar que no tiene reservas aunque el problema sea de red o de Supabase.

### Cómo reproducirlo de forma segura

1. Tener una reserva remota guardada en el navegador para que exista al menos un token.
2. Abrir “Mis reservas”.
3. Interrumpir la red o usar temporalmente una URL de Supabase inválida en un entorno de prueba.
4. Observar el mensaje de conexión y comprobar si también aparece `Aún no tienes reservas`.

### Corrección aplicada

- `App` ahora mantiene `errorMias` separado del error de carga de horarios.
- `MisReservas` recibe `errorCarga` y `onRetry`.
- Mientras existe un error remoto, la pantalla muestra únicamente el mensaje de conexión y `Reintentar`.
- `Aún no tienes reservas` solo se muestra después de una respuesta exitosa con una lista vacía.

Así se evita que una falla de red o de Supabase se interprete como que el usuario no tiene reservas.

### Verificación

Las aserciones de UI confirman la separación entre `cargando`, `errorCarga` y el estado vacío. También pasaron el tipado y el lint del proyecto.

Archivos relacionados: [App.tsx](../src/App.tsx) y [MisReservas.tsx](../src/components/cliente/MisReservas.tsx).

## H-09 — Cambio de identidad mediante “No soy [nombre]”

Estado actual: verificado, sin hallazgo.

### Qué se verificó

El flujo debe quitar la identidad recordada antes de permitir ingresar el nuevo nombre y celular. Después, “Mis reservas” debe filtrar por el celular nuevo y los tokens públicos deben seguir asociados al celular de cada cliente.

### Prueba local realizada

- Se prepararon dos reservas ficticias futuras: una para `Ana Prueba` (`955555551`) y otra para `Bruno Prueba` (`955555552`).
- “Mis reservas” mostró a Ana únicamente su reserva de Campo 1; la reserva de Bruno no apareció.
- En el paso de datos apareció `¿Todo bien, Ana Prueba?` y el botón `No soy Ana Prueba`.
- Al pulsarlo, desapareció la identidad recordada, apareció el formulario vacío y se pudieron ingresar `Bruno Prueba` y `955555552`.
- La prueba directa de almacenamiento confirmó que `deCliente` devuelve solo las reservas del celular consultado y que `leerTokensReservas` devuelve solo los tokens asociados a ese celular.

No se creó una segunda reserva persistente desde la interfaz porque la prueba no necesitaba subir un comprobante. La separación de reservas y tokens se verificó con las funciones reales de almacenamiento y con datos locales aislados.

### Resultado

No se mezclan las reservas de Ana con las de Bruno al cambiar de identidad. Tampoco se reutilizan los tokens del cliente anterior.

Archivos relacionados: [DatosReserva.tsx](../src/components/cliente/DatosReserva.tsx), [App.tsx](../src/App.tsx), [almacen.ts](../src/almacen.ts) y [reservas.ts](../src/reservas.ts).

## Evidencia de la auditoría

Pasaron las verificaciones de tipos, lint, build, reservas, escenarios, horarios de media hora, validación de clientes, tokens, estados, pagos, Supabase, bloqueo de acciones, interfaz y componentes.

En la auditoría de seguimiento pasaron `npm run typecheck`, `npm run lint`, `npm run build` y todos los scripts `check:*` disponibles: reservas, interfaz, componentes, escenarios, horarios, administración, validación, tokens, control de clientes, Supabase, balance, estado, pagos, alarmas, eventos, balance demo, TypeScript y bloqueo de acciones.

También se probó manualmente la carga diferida de `/` y `/admin`, la selección de Campo 1, fecha, turno y horario, la ampliación automática de 30 minutos a una hora, el bloque aislado de 3:30–4:00 que permanece deshabilitado aunque dice `Libre` (H-01), el avance a datos, el número Yape vertical, el botón de copia, el comprobante obligatorio y la ausencia del camino eliminado “Ya reservé antes” (H-07).

## Orden de trabajo sugerido

1. Decidir si se corrige H-01, porque es el hallazgo visible para el usuario durante la elección del horario.
2. Mantener H-02 corregido y verificarlo después de cada despliegue del frontend.
3. Mantener H-03 y H-04 corregidos y verificados.
4. Mantener H-07 corregido y verificado.
5. Mantener H-08 corregido y verificado.
6. Mantener H-09 verificado y sin mezcla de identidades.
7. Mantener H-06 corregido y verificado.
8. Mantener H-05 optimizado para el flujo público; dejar la reducción del chunk XLSX administrativo como mejora posterior.
