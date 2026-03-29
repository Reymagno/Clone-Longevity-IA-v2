'use client'

interface LogoIconProps {
  size?: number
  animate?: boolean
  className?: string
}

export function LogoIcon({ size = 32, animate = true, className = '' }: LogoIconProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${animate ? 'group' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Glow pulse behind logo */}
      {animate && (
        <div
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background: 'radial-gradient(circle, rgba(201,168,76,0.25) 0%, transparent 70%)',
            animation: 'logoPulse 3s ease-in-out infinite',
          }}
        />
      )}

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="7.5 1.5 25 25"
        width={size}
        height={size}
        role="img"
        aria-label="Longevity IA"
        className={animate ? 'logo-bloom' : ''}
      >
        <defs>
          <radialGradient id="centerGlow" gradientUnits="userSpaceOnUse" cx="20" cy="14" r="10">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="20" cy="14" r="10" fill="url(#centerGlow)" />

        <g transform="translate(20,14) scale(0.65) translate(-20,-20)">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#C9A84C" strokeWidth="0.4" opacity="0.14" />

          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const opacities = [1.0, 0.8, 0.58, 0.4, 0.58, 0.8]
            const strokeOpacities = [0.45, 0.35, 0.25, 0.18, 0.25, 0.35]
            return (
              <g key={deg} transform={`rotate(${deg},20,20)`}>
                <path
                  d="M 20,20 C 23.5,17 25,11 20,5.5 C 15,11 16.5,17 20,20 Z"
                  fill="#C9A84C"
                  opacity={opacities[i]}
                  className={animate ? 'logo-petal' : ''}
                  style={animate ? { animationDelay: `${i * 0.12}s` } : undefined}
                />
                <path
                  d="M 19.4,17 Q 20,12 20.6,17"
                  fill="none"
                  stroke={`rgba(8,6,2,${strokeOpacities[i]})`}
                  strokeWidth="0.9"
                  strokeLinecap="round"
                />
              </g>
            )
          })}

          <circle cx="20" cy="20" r="3" fill="#090910" stroke="#C9A84C" strokeWidth="1.1" />
          <circle
            cx="20"
            cy="20"
            r="1.3"
            fill="#C9A84C"
            className={animate ? 'logo-core' : ''}
          />
        </g>
      </svg>
    </div>
  )
}
