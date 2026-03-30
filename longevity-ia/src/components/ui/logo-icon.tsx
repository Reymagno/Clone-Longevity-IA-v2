'use client'

interface LogoIconProps {
  size?: number
  animate?: boolean
  className?: string
}

export function LogoIcon({ size = 32, animate = true, className = '' }: LogoIconProps) {
  return (
    <span
      className={`logo-mark-icon ${animate ? 'spinning' : ''} ${className}`}
      style={{ display: 'inline-block', width: size, height: size }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 40"
        width={size}
        height={size}
        role="img"
        aria-label="Longevity IA"
      >
        {/* Outer faint ring */}
        <circle cx="20" cy="20" r="18" fill="none" stroke="#C9A84C" strokeWidth="0.4" opacity="0.14" />

        {/* 6 petals — variable opacity simulating bioluminescence */}
        <g transform="rotate(0,20,20)">
          <path d="M 20,20 C 23.5,17 25,11 20,5.5 C 15,11 16.5,17 20,20 Z" fill="#C9A84C" opacity="1.0" />
          <path d="M 19.4,17 Q 20,12 20.6,17" fill="none" stroke="rgba(8,6,2,0.45)" strokeWidth="0.9" strokeLinecap="round" />
        </g>
        <g transform="rotate(60,20,20)">
          <path d="M 20,20 C 23.5,17 25,11 20,5.5 C 15,11 16.5,17 20,20 Z" fill="#C9A84C" opacity="0.8" />
          <path d="M 19.4,17 Q 20,12 20.6,17" fill="none" stroke="rgba(8,6,2,0.35)" strokeWidth="0.9" strokeLinecap="round" />
        </g>
        <g transform="rotate(120,20,20)">
          <path d="M 20,20 C 23.5,17 25,11 20,5.5 C 15,11 16.5,17 20,20 Z" fill="#C9A84C" opacity="0.58" />
          <path d="M 19.4,17 Q 20,12 20.6,17" fill="none" stroke="rgba(8,6,2,0.25)" strokeWidth="0.9" strokeLinecap="round" />
        </g>
        <g transform="rotate(180,20,20)">
          <path d="M 20,20 C 23.5,17 25,11 20,5.5 C 15,11 16.5,17 20,20 Z" fill="#C9A84C" opacity="0.4" />
          <path d="M 19.4,17 Q 20,12 20.6,17" fill="none" stroke="rgba(8,6,2,0.18)" strokeWidth="0.9" strokeLinecap="round" />
        </g>
        <g transform="rotate(240,20,20)">
          <path d="M 20,20 C 23.5,17 25,11 20,5.5 C 15,11 16.5,17 20,20 Z" fill="#C9A84C" opacity="0.58" />
          <path d="M 19.4,17 Q 20,12 20.6,17" fill="none" stroke="rgba(8,6,2,0.25)" strokeWidth="0.9" strokeLinecap="round" />
        </g>
        <g transform="rotate(300,20,20)">
          <path d="M 20,20 C 23.5,17 25,11 20,5.5 C 15,11 16.5,17 20,20 Z" fill="#C9A84C" opacity="0.8" />
          <path d="M 19.4,17 Q 20,12 20.6,17" fill="none" stroke="rgba(8,6,2,0.35)" strokeWidth="0.9" strokeLinecap="round" />
        </g>

        {/* Center */}
        <circle cx="20" cy="20" r="3" fill="#090910" stroke="#C9A84C" strokeWidth="1.1" />
        <circle cx="20" cy="20" r="1.3" fill="#C9A84C" />
      </svg>
    </span>
  )
}
