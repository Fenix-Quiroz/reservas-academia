export interface ProgresoReservaProps {
  paso: number
  nombresPasos: readonly string[]
}

export default function ProgresoReserva({ paso, nombresPasos }: ProgresoReservaProps) {
  return (
    <div
      className="progreso"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={paso}
      aria-valuetext={`Paso ${paso} de 3: ${nombresPasos[paso - 1]}`}
    >
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= paso ? 'punto activo' : 'punto'} aria-hidden="true" />
      ))}
      <span className="progreso-texto">Paso {paso} de 3 · {nombresPasos[paso - 1]}</span>
    </div>
  )
}
