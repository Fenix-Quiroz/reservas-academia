# Plan: horario hasta las 3:00 a. m.

1. Actualizar las pruebas de dominio, SQL y UI para expresar el cierre en `27` y la ausencia del checkpoint.
2. Cambiar constantes y selector para mostrar el turno nocturno hasta las 3:00 a. m.; mantener el modal y el flujo de cliente confiable.
3. Actualizar el esquema SQL canónico y crear una migración transaccional para la base ya desplegada sin tocar filas.
4. Ejecutar pruebas de reservas, admin, Supabase, typecheck, lint y build; revisar el diff para confirmar que no cambian pagos, tickets ni reservas existentes.
