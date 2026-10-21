export default function DibujoCampo({ color, jugadores, deporte }) {
  const esVoley = deporte === 'Vóley'

  return (
    <svg viewBox="0 0 120 70" className="dibujo" aria-hidden="true">
      <rect x="1" y="1" width="118" height="68" rx="6" fill={color} />
      <g fill="none" stroke="#fff" strokeWidth="2" opacity="0.85">
        <rect x="6" y="6" width="108" height="58" rx="2" />
        {esVoley ? (
          <>
            <line x1="60" y1="6" x2="60" y2="64" strokeWidth="3" />
            <line x1="36" y1="6" x2="36" y2="64" />
            <line x1="84" y1="6" x2="84" y2="64" />
          </>
        ) : (
          <>
            <line x1="60" y1="6" x2="60" y2="64" />
            <circle cx="60" cy="35" r="11" fill={color} />
            <rect x="6" y="22" width="12" height="26" />
            <rect x="102" y="22" width="12" height="26" />
          </>
        )}
      </g>
      <text x="60" y="40" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">
        {jugadores}
      </text>
    </svg>
  )
}
