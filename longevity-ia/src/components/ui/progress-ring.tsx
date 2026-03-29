'use client'

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  sublabel?: string
}

export function ProgressRing({
  progress,
  size = 220,
  strokeWidth = 14,
  color = '#2EAE7B',
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 12px ${color}40)` }}>
        {/* Pista de fondo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1A2E4C"
          strokeWidth={strokeWidth}
        />
        {/* Arco de progreso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease' }}
        />
      </svg>

      {/* Contenido central */}
      <div className="absolute flex flex-col items-center justify-center text-center px-6">
        <span
          className="text-5xl font-mono font-bold leading-none"
          style={{ color, transition: 'color 0.5s ease' }}
        >
          {Math.round(progress)}%
        </span>
        {label && (
          <span className="text-sm font-semibold text-foreground mt-2 leading-tight">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-xs text-muted-foreground mt-1 leading-tight">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}
