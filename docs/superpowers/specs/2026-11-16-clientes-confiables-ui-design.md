# Clientes confiables: rediseño visual

## Intención

Rediseñar la sección de clientes confiables del panel administrador para que siga el lenguaje visual de la web de El Jaguar y permita identificar rápidamente a cada cliente por nombre y celular.

## Alcance

- Mantener el registro actual de clientes confiables y la acción para quitarlos.
- Mostrar encabezado, buscador y clientes activos como tarjetas compactas.
- Agregar los botones visuales “Nueva reserva” y “Reservar” como punto de entrada para el siguiente bloque del flujo.
- Separar “Clientes confiables” y “Clientes bloqueados” en dos secciones independientes.
- Mostrar “Clientes confiables” primero y “Clientes bloqueados” como la última sección.
- Mantener el comportamiento actual de bloqueo, desbloqueo y registro de inasistencias.
- Exponer ambas secciones como destinos independientes en la navegación del panel.

## Fuera de alcance

- No implementar todavía el flujo de reserva, selección de campo, horario ni pago desde esos botones.
- No cambiar el modelo de datos ni las funciones de Supabase.

## Decisiones visuales

- Fondo y tarjetas en la paleta carbón/dorado existente.
- Buscador accesible con placeholder “Buscar por nombre o celular”.
- La búsqueda filtra por nombre o celular sin alterar los datos originales.
- Cada tarjeta conserva una acción secundaria para quitar al cliente, dentro de un menú accesible.
