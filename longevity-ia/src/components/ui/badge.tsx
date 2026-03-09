import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'optimal' | 'normal' | 'warning' | 'danger' | 'default'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono',
        {
          'badge-optimal': variant === 'optimal',
          'badge-normal': variant === 'normal',
          'badge-warning': variant === 'warning',
          'badge-danger': variant === 'danger',
          'bg-border text-muted-foreground': variant === 'default',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
