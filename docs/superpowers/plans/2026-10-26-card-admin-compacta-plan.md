 # Tarjeta administrativa compacta Implementation Plan
 
 > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
 **Goal:** Aplicar la variante 3 de la tarjeta administrativa de reservas con botones compactos e iconos SVG de `lucide-react`.
 
 **Architecture:** Se mantiene `AdminReservaCard` como componente de presentación y se ajustan sus clases CSS existentes. Los iconos se importan directamente desde `lucide-react` y se acompañan siempre de texto visible; la lógica y las props de acciones no cambian.
 
 **Tech Stack:** React + TypeScript, CSS existente, `lucide-react`, comprobaciones estáticas del proyecto.
 
 **Spec:** `docs/superpowers/specs/2026-10-26-card-admin-compacta-design.md`
 
 ## Global Constraints
 
 - Mantener fondo oscuro, borde dorado, tipografía y datos actuales.
 - Usar iconos SVG de `lucide-react`, no emojis ni imágenes rasterizadas.
 - Mantener etiquetas de texto visibles; los iconos no serán el único significado.
 - No cambiar la lógica de pagos, confirmación, cancelación ni estados.
 - No modificar el diseño de la vista del cliente.
 
 ## Review Focus
 
 - Comprobante pendiente: debe conservar Ver, Descargar y Confirmar comprobante sin cambiar sus callbacks.
 - Comprobante confirmado: no debe mostrar confirmación administrativa adicional.
 - Reserva activa sin comprobante: debe conservar Cancelar y no mostrar acciones de pago.
 - Reserva no activa: debe conservar Finalizar, No asistió y Cancelar.
 - Pantalla estrecha: los botones deben reordenarse sin desbordar el contenedor.
 
 ### Task 1: Compactar tarjeta administrativa
 
 **Files:**
 - Modify: `package.json`, `package-lock.json` — añadir `lucide-react`.
 - Modify: `src/components/admin/AdminReservaCard.tsx` — añadir iconos y clases semánticas manteniendo callbacks.
 - Modify: `src/index.css` — reorganizar el rail de acciones y reducir tamaños.
 - Test: `src/pagosAdmin.check.ts` — fijar iconos, agrupación y etiquetas visibles.
 
 **Interfaces:**
 - Consumes: Props y callbacks actuales de `AdminReservaCard`.
 - Produces: La misma interfaz pública del componente; solo cambia la presentación.
 
 - [ ] **Step 1: Write the failing test**
   - Extender `src/pagosAdmin.check.ts` para exigir los iconos `Eye`, `Download`, `Check`, `Ban` y `X`, la clase de rail de acciones y la presencia de las etiquetas de texto.
 - [ ] **Step 2: Run test to verify it fails**
   - Run: `npm run check:pago-admin`
   - Expected: FAIL porque el componente aún no importa ni renderiza esos iconos.
 - [ ] **Step 3: Install `lucide-react` and implement the compact presentation**
   - Importar los cinco iconos directamente desde `lucide-react`.
   - Añadirlos con `aria-hidden="true"` junto a Ver, Descargar, Confirmar pago, No asistió y Cancelar.
   - Agrupar comprobante y estado en un rail compacto; mantener callbacks y condiciones existentes.
   - Ajustar CSS para que Ver/Descargar sean controles pequeños y las acciones principales compartan una fila cuando haya espacio.
 - [ ] **Step 4: Run focused verification**
   - Run: `npm run check:pago-admin`
   - Expected: PASS.
 - [ ] **Step 5: Run project verification**
   - Run: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:pago`
   - Expected: PASS; el build puede conservar el aviso existente del chunk grande de `xlsx`.
 
