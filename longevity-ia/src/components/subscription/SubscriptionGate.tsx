'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

export function SubscriptionGate({ children, fallback }: Props) {
  const [status, setStatus] = useState<'loading' | 'active' | 'inactive'>('loading')

  useEffect(() => {
    fetch('/api/subscription')
      .then(res => res.json())
      .then(data => setStatus(data.isActive ? 'active' : 'inactive'))
      .catch(() => setStatus('inactive'))
  }, [])

  if (status === 'loading') return null
  if (status === 'active') return <>{children}</>

  return fallback ?? (
    <div className="card-medical p-8 text-center space-y-4 animate-fade-in">
      <AlertTriangle size={40} className="mx-auto text-warning" />
      <h3 className="text-lg font-bold text-foreground">Suscripcion requerida</h3>
      <p className="text-sm text-muted-foreground">
        Necesitas una suscripcion activa para acceder a esta funcion.
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-background rounded-xl font-medium hover:bg-accent/85 transition-colors"
      >
        Ver planes <ArrowRight size={16} />
      </Link>
    </div>
  )
}
