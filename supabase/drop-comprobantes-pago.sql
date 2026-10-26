-- Limpieza de la tabla anterior de comprobantes.
-- El flujo vigente usa public.pagos_reserva y public.pago_comprobantes.
drop table if exists public.comprobantes_pago;
