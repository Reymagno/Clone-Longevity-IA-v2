import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY no configurada')
    _stripe = new Stripe(key, { typescript: true })
  }
  return _stripe
}

// ── Plan configuration ──────────────────────────────────────────────

export interface PlanConfig {
  tier: string
  role: 'paciente' | 'medico' | 'clinica'
  label: string
  description: string
  priceMXN: number
  seatLimit: number
  priceEnvKey: string
}

export const PLAN_CONFIGS: PlanConfig[] = [
  { tier: 'paciente_basico', role: 'paciente', label: 'Paciente', description: 'Acceso completo a tu perfil de salud', priceMXN: 299, seatLimit: 1, priceEnvKey: 'STRIPE_PRICE_PACIENTE' },

  { tier: 'medico_25',  role: 'medico', label: 'Médico Starter',     description: 'Hasta 25 pacientes',  priceMXN: 999,  seatLimit: 25,  priceEnvKey: 'STRIPE_PRICE_MEDICO_25' },
  { tier: 'medico_50',  role: 'medico', label: 'Médico Pro',         description: 'Hasta 50 pacientes',  priceMXN: 1799, seatLimit: 50,  priceEnvKey: 'STRIPE_PRICE_MEDICO_50' },
  { tier: 'medico_100', role: 'medico', label: 'Médico Advanced',    description: 'Hasta 100 pacientes', priceMXN: 2999, seatLimit: 100, priceEnvKey: 'STRIPE_PRICE_MEDICO_100' },
  { tier: 'medico_250', role: 'medico', label: 'Médico Enterprise',  description: 'Hasta 250 pacientes', priceMXN: 4999, seatLimit: 250, priceEnvKey: 'STRIPE_PRICE_MEDICO_250' },

  { tier: 'clinica_10',  role: 'clinica', label: 'Clínica Starter',    description: 'Hasta 10 médicos',  priceMXN: 4999,  seatLimit: 10,  priceEnvKey: 'STRIPE_PRICE_CLINICA_10' },
  { tier: 'clinica_25',  role: 'clinica', label: 'Clínica Pro',        description: 'Hasta 25 médicos',  priceMXN: 9999,  seatLimit: 25,  priceEnvKey: 'STRIPE_PRICE_CLINICA_25' },
  { tier: 'clinica_50',  role: 'clinica', label: 'Clínica Advanced',   description: 'Hasta 50 médicos',  priceMXN: 17999, seatLimit: 50,  priceEnvKey: 'STRIPE_PRICE_CLINICA_50' },
  { tier: 'clinica_100', role: 'clinica', label: 'Clínica Enterprise', description: 'Hasta 100 médicos', priceMXN: 29999, seatLimit: 100, priceEnvKey: 'STRIPE_PRICE_CLINICA_100' },
]

const VALID_TIERS = new Set(PLAN_CONFIGS.map(p => p.tier))

export function isValidTier(tier: string): boolean {
  return VALID_TIERS.has(tier)
}

export function getPlanConfig(tier: string): PlanConfig | undefined {
  return PLAN_CONFIGS.find(p => p.tier === tier)
}

export function getPlansForRole(role: string): PlanConfig[] {
  return PLAN_CONFIGS.filter(p => p.role === role)
}

export function getStripePriceId(tier: string): string {
  const plan = getPlanConfig(tier)
  if (!plan) throw new Error(`Plan no encontrado: ${tier}`)
  const priceId = process.env[plan.priceEnvKey]
  if (!priceId) throw new Error(`Variable ${plan.priceEnvKey} no configurada`)
  return priceId
}

export function findPlanByPriceId(priceId: string): PlanConfig | undefined {
  return PLAN_CONFIGS.find(p => {
    const envId = process.env[p.priceEnvKey]
    return envId === priceId
  })
}
