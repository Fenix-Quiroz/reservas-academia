# Orden de participantes del sorteo Implementation Plan

**Goal:** Mostrar primero a los clientes con más tickets y ordenar alfabéticamente los empates.

**Architecture:** Cambiar únicamente el orden del arreglo `participantes` producido por `prepararSorteoReal`; la cantidad de tickets, probabilidades, tickets individuales y selección del ganador no cambian.

**Tech Stack:** TypeScript, checks ejecutados con `tsx`.

**Spec:** Requisito confirmado por el usuario: orden descendente por reservas/tickets y desempate alfabético.

## Task 1: Ordenar y verificar participantes

**Files:**
- Modify: `src/sorteoReal.ts`
- Modify: `src/sorteoReal.check.ts`

- [x] Escribir el check que exige nombres y cantidades en orden `tickets desc`, con nombre ascendente como desempate.
- [x] Ejecutar `npm run check:sorteo-real` y confirmar el fallo por el orden actual por celular.
- [x] Ordenar participantes sin alterar probabilidades ni la numeración de tickets.
- [x] Ejecutar el check y las verificaciones de tipos/lint.
