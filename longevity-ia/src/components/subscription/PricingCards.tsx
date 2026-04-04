'use client'

import { useState } from 'react'
import { User, Stethoscope, Building2, Check, ArrowRight, Loader2 } from 'lucide-react'

// ── Plan data (matches server PLAN_CONFIGS) ─────────────────────────

interface PlanDisplay {
  tier: string
  role: string
  label: string
  priceMXN: number
  seatLimit: number
  description: string
}

const PACIENTE_PLAN: PlanDisplay = {
  tier: 'paciente_basico', role: 'paciente', label: 'Paciente',
  priceMXN: 299, seatLimit: 1, description: 'Monitorea tu salud personal',
}

const MEDICO_TIERS: PlanDisplay[] = [
  { tier: 'medico_25',  role: 'medico', label: '25 pacientes',  priceMXN: 999,  seatLimit: 25,  description: 'Ideal para consultorios' },
  { tier: 'medico_50',  role: 'medico', label: '50 pacientes',  priceMXN: 1799, seatLimit: 50,  description: 'Practica en crecimiento' },
  { tier: 'medico_100', role: 'medico', label: '100 pacientes', priceMXN: 2999, seatLimit: 100, description: 'Practica consolidada' },
  { tier: 'medico_250', role: 'medico', label: '250 pacientes', priceMXN: 4999, seatLimit: 250, description: 'Alto volumen' },
]

const CLINICA_TIERS: PlanDisplay[] = [
  { tier: 'clinica_10',  role: 'clinica', label: '10 medicos',  priceMXN: 4999,  seatLimit: 10,  description: 'Clinica pequena' },
  { tier: 'clinica_25',  role: 'clinica', label: '25 medicos',  priceMXN: 9999,  seatLimit: 25,  description: 'Clinica mediana' },
  { tier: 'clinica_50',  role: 'clinica', label: '50 medicos',  priceMXN: 17999, seatLimit: 50,  description: 'Clinica grande' },
  { tier: 'clinica_100', role: 'clinica', label: '100 medicos', priceMXN: 29999, seatLimit: 100, description: 'Hospital / Red' },
]

const BENEFITS: Record<string, string[]> = {
  paciente: [
    'Dashboard de salud personalizado',
    'Analisis de biomarcadores con IA',
    'Protocolo de longevidad individual',
    'Historial de estudios y comparativas',
    'Chat con Longevity IA',
  ],
  medico: [
    'Gestion de multiples pacientes',
    'Reportes medicos PDF profesionales',
    'Protocolo con evidencia cientifica',
    'Algoritmo de celulas madre y exosomas',
    'Re-analisis con historia clinica',
    'Asistente IA con tool_use',
  ],
  clinica: [
    'Todo lo de Medico incluido',
    'Panel de administracion de medicos',
    'Estadisticas y KPIs de la clinica',
    'Asistente IA institucional',
    'Gestion de invitaciones por codigo',
    'Reportes operativos automaticos',
  ],
}

// ── Props ───────────────────────────────────────────────────────────

interface Props {
  onSelectPlan?: (tier: string) => void
  currentTier?: string
  loading?: boolean
}

function formatPrice(n: number): string {
  return `$${n.toLocaleString('es-MX')}`
}

// ── Component ───────────────────────────────────────────────────────

export function PricingCards({ onSelectPlan, currentTier, loading }: Props) {
  const [medicoIdx, setMedicoIdx] = useState(0)
  const [clinicaIdx, setClinicaIdx] = useState(0)
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const selectedMedico = MEDICO_TIERS[medicoIdx]
  const selectedClinica = CLINICA_TIERS[clinicaIdx]

  const handleSelect = (tier: string) => {
    if (loading || loadingTier) return
    setLoadingTier(tier)
    onSelectPlan?.(tier)
  }

  const cards = [
    { plan: PACIENTE_PLAN, icon: User, color: '#2EAE7B', tiers: null, tierIdx: 0, setTierIdx: () => {} },
    { plan: selectedMedico, icon: Stethoscope, color: '#5BA4C9', tiers: MEDICO_TIERS, tierIdx: medicoIdx, setTierIdx: setMedicoIdx },
    { plan: selectedClinica, icon: Building2, color: '#a78bfa', tiers: CLINICA_TIERS, tierIdx: clinicaIdx, setTierIdx: setClinicaIdx },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {cards.map(({ plan, icon: Icon, color, tiers, tierIdx, setTierIdx }) => {
        const isCurrent = currentTier === plan.tier
        const benefits = BENEFITS[plan.role] ?? []
        const isLoading = loadingTier === plan.tier

        return (
          <div
            key={plan.role}
            className={`relative rounded-2xl border p-6 flex flex-col transition-all hover:scale-[1.02] ${
              isCurrent ? 'border-accent/50 bg-accent/5' : 'border-border/40 bg-card/80'
            }`}
            style={{ borderTopColor: color, borderTopWidth: 3 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg capitalize">{plan.role}</h3>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>
            </div>

            {/* Tier selector */}
            {tiers && (
              <div className="flex gap-1 mb-4 bg-muted/30 rounded-lg p-1">
                {tiers.map((t, i) => (
                  <button
                    key={t.tier}
                    onClick={() => setTierIdx(i)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                      tierIdx === i
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Price */}
            <div className="mb-4">
              <span className="text-3xl font-bold text-foreground">{formatPrice(plan.priceMXN)}</span>
              <span className="text-sm text-muted-foreground"> MXN/mes</span>
            </div>

            {/* Benefits */}
            <ul className="space-y-2 mb-6 flex-1">
              {benefits.map(b => (
                <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check size={14} className="shrink-0 mt-0.5" style={{ color }} />
                  {b}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handleSelect(plan.tier)}
              disabled={isCurrent || isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
              style={{
                backgroundColor: isCurrent ? 'transparent' : color,
                color: isCurrent ? color : '#050E1B',
                border: isCurrent ? `1px solid ${color}40` : 'none',
              }}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isCurrent ? (
                'Plan actual'
              ) : (
                <>Suscribirse <ArrowRight size={14} /></>
              )}
            </button>

            {isCurrent && (
              <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: color, color: '#050E1B' }}>
                ACTUAL
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
