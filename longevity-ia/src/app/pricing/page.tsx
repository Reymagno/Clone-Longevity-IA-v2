'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PricingCards } from '@/components/subscription/PricingCards'
import { ManageSubscriptionButton } from '@/components/subscription/ManageButton'
import { LogoIcon } from '@/components/ui/logo-icon'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PricingContent />
    </Suspense>
  )
}

function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const canceled = searchParams.get('canceled')

  const [currentTier, setCurrentTier] = useState<string | undefined>()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        fetch('/api/subscription')
          .then(res => res.json())
          .then(data => {
            if (data.hasSubscription) setCurrentTier(data.planTier)
          })
          .catch(() => {})
      }
    })
  }, [])

  const handleSelectPlan = async (tier: string) => {
    if (!isLoggedIn) {
      // Store selected plan and redirect to login
      localStorage.setItem('_pending_plan', tier)
      router.push('/login')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: tier }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <LogoIcon size={28} />
            <span className="font-bold text-foreground">Longevity IA</span>
          </Link>
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              {currentTier && <ManageSubscriptionButton />}
              <Link href="/patients" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft size={14} /> Volver al panel
              </Link>
            </div>
          ) : (
            <Link href="/login" className="text-sm text-accent hover:underline">
              Iniciar sesion
            </Link>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="max-w-5xl mx-auto px-6 pt-8">
        {reason === 'subscription_required' && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5 mb-6 animate-fade-in">
            <AlertTriangle size={18} className="text-warning shrink-0" />
            <p className="text-sm text-foreground">
              Necesitas una suscripcion activa para acceder a la plataforma. Selecciona un plan para continuar.
            </p>
          </div>
        )}

        {canceled && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-muted-foreground/20 bg-muted/10 mb-6 animate-fade-in">
            <p className="text-sm text-muted-foreground">
              Checkout cancelado. Puedes seleccionar un plan cuando estes listo.
            </p>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="text-center px-6 pt-4 pb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Planes de Longevity IA
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Medicina de precision impulsada por inteligencia artificial.
          Todos los planes incluyen 7 dias de prueba gratis.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="px-6 pb-16">
        <PricingCards
          onSelectPlan={handleSelectPlan}
          currentTier={currentTier}
          loading={loading}
        />

        {/* Enterprise note */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            Para clinicas con mas de 100 medicos, contactanos para un plan Enterprise personalizado.
          </p>
        </div>
      </div>
    </div>
  )
}
