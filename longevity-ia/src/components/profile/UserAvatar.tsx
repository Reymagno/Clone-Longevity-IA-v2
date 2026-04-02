'use client'

import { cn } from '@/lib/utils'

interface UserAvatarProps {
  avatarUrl?: string | null
  name: string
  size?: number
  onClick?: () => void
  className?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const GRADIENT_PAIRS: [string, string][] = [
  ['#d97706', '#f59e0b'], // amber
  ['#0891b2', '#06b6d4'], // cyan
  ['#7c3aed', '#8b5cf6'], // violet
  ['#059669', '#10b981'], // emerald
  ['#dc2626', '#ef4444'], // red
  ['#2563eb', '#3b82f6'], // blue
]

function getGradient(name: string): [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENT_PAIRS[Math.abs(hash) % GRADIENT_PAIRS.length]
}

export function UserAvatar({ avatarUrl, name, size = 32, onClick, className }: UserAvatarProps) {
  const initials = getInitials(name || 'U')
  const [from, to] = getGradient(name || 'User')
  const fontSize = Math.max(10, Math.round(size * 0.38))

  if (avatarUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn('rounded-full overflow-hidden shrink-0 focus:outline-none', className)}
        style={{ width: size, height: size }}
        aria-label="Abrir perfil"
      >
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full shrink-0 flex items-center justify-center font-bold text-white select-none focus:outline-none',
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-label="Abrir perfil"
    >
      {initials}
    </button>
  )
}
