// Lógica pura de reservas: no sabe de dónde vienen los datos.
// Cuando conectemos Supabase, este archivo se queda igual.

export const ABRE = 8
export const CIERRA = 23

// 'en-CA' formatea como AAAA-MM-DD usando la hora local
export const fechaISO = (d) => d.toLocaleDateString('en-CA')

export function sumarDias(n, desde = new Date()) {
  const d = new Date(desde)
  d.setDate(d.getDate() + n)
  return d
}

// Dos reservas chocan si son de la misma cancha y día, y sus rangos de horas se cruzan.
// Ej: 8 a 10 choca con 9 a 10; 8 a 9 NO choca con 9 a 10.
export const chocan = (a, b) =>
  a.canchaId === b.canchaId &&
  a.fecha === b.fecha &&
  a.inicio < b.inicio + b.horas &&
  b.inicio < a.inicio + a.horas

// Todas las horas de inicio posibles de un día, marcando cuáles están libres
export function horarios(reservas, canchaId, fecha, horas, ahora = new Date()) {
  const esHoy = fecha === fechaISO(ahora)
  const lista = []
  for (let inicio = ABRE; inicio + horas <= CIERRA; inicio++) {
    if (esHoy && inicio <= ahora.getHours()) continue
    const libre = !reservas.some((r) => chocan(r, { canchaId, fecha, inicio, horas }))
    lista.push({ inicio, libre })
  }
  return lista
}

// La hora libre más cercana a la que el usuario quería
export function masCercana(lista, inicio) {
  return lista
    .filter((h) => h.libre)
    .sort((a, b) => Math.abs(a.inicio - inicio) - Math.abs(b.inicio - inicio))[0]
}

// Una reserva está activa si todavía no terminó
export const activa = (r, ahora = new Date()) =>
  r.fecha > fechaISO(ahora) ||
  (r.fecha === fechaISO(ahora) && r.inicio + r.horas > ahora.getHours())

export const MAX_ACTIVAS = 2

// Reservas de un cliente que aún no se jugaron, la más próxima primero
export const deCliente = (reservas, celular, ahora = new Date()) =>
  reservas
    .filter((r) => r.celular === celular && activa(r, ahora))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio)

// Por ahora las reservas se pueden cancelar en cualquier momento.
export const sePuedeCancelar = () => true

// 8 → "8", 13 → "1", 24 → "12"
const hora12 = (h) => ((h + 11) % 12) + 1

export function momento(h) {
  if (h < 12) return 'de la mañana'
  if (h === 12) return 'del mediodía'
  if (h < 19) return 'de la tarde'
  return 'de la noche'
}

// "8 a 10" (sin el momento del día)
export const rango = (inicio, horas) => `${hora12(inicio)} a ${hora12(inicio + horas)}`

// "de 8 a 10 de la noche"
export const rangoHablado = (inicio, horas) => `de ${rango(inicio, horas)} ${momento(inicio + horas)}`
