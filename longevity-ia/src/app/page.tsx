'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, Dna, Brain, Shield, BarChart2, Zap, FlaskConical, Sparkles,
  User, Stethoscope, Building2, Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { RegisterModal, type RoleType } from '@/components/auth/RegisterModal'
import { LogoIcon } from '@/components/ui/logo-icon'

// ─────────────────────────────────────────────────────────────────
// Features
// ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: FlaskConical,
    title: 'Extraccion Automatica',
    desc: 'Claude lee tu PDF o imagen y extrae todos los biomarcadores con sus valores y unidades.',
    gradient: 'from-emerald-500/10 to-teal-500/5',
  },
  {
    icon: Brain,
    title: 'IA con Web Search',
    desc: 'Busca en tiempo real los estudios mas recientes antes de generar recomendaciones.',
    gradient: 'from-blue-500/10 to-indigo-500/5',
  },
  {
    icon: BarChart2,
    title: 'Dashboard Interactivo',
    desc: '11 pestanas dinamicas: radar de sistemas, FODA medica, lipidos, metabolico y mas.',
    gradient: 'from-violet-500/10 to-purple-500/5',
  },
  {
    icon: Shield,
    title: 'Analisis FODA Medico',
    desc: 'Fortalezas, debilidades, oportunidades y amenazas cruzadas con evidencia cientifica.',
    gradient: 'from-amber-500/10 to-orange-500/5',
  },
  {
    icon: Dna,
    title: 'Edad Biologica',
    desc: 'Estimacion de edad biologica basada en todos los biomarcadores del estudio.',
    gradient: 'from-rose-500/10 to-pink-500/5',
  },
  {
    icon: Zap,
    title: 'Protocolo Personalizado',
    desc: 'Recomendaciones con dosis, mecanismo, ensayo clinico y resultado esperado.',
    gradient: 'from-cyan-500/10 to-sky-500/5',
  },
]

// ─────────────────────────────────────────────────────────────────
// Subscription plans
// ─────────────────────────────────────────────────────────────────

const PLANS: {
  role: RoleType
  title: string
  subtitle: string
  icon: typeof User
  color: string
  benefits: string[]
}[] = [
  {
    role: 'paciente',
    title: 'Persona / Paciente',
    subtitle: 'Monitorea tu salud personal con IA',
    icon: User,
    color: '#2EAE7B',
    benefits: [
      'Dashboard de salud personalizado',
      'Analisis de biomarcadores con IA',
      'Protocolo de longevidad individual',
      'Historial de estudios y comparativas',
      'Chat con Longevity IA',
    ],
  },
  {
    role: 'medico',
    title: 'Medico',
    subtitle: 'Herramientas avanzadas para profesionales',
    icon: Stethoscope,
    color: '#5BA4C9',
    benefits: [
      'Gestion de multiples pacientes',
      'Reportes medicos PDF profesionales',
      'Protocolo con evidencia cientifica',
      'Algoritmo de celulas madre y exosomas',
      'Re-analisis con historia clinica',
      'Exportacion de datos clinicos',
    ],
  },
  {
    role: 'clinica',
    title: 'Clinica',
    subtitle: 'Plataforma institucional de medicina',
    icon: Building2,
    color: '#a78bfa',
    benefits: [
      'Todo lo de Medico incluido',
      'Panel de administracion de medicos',
      'Estadisticas de la clinica',
      'Marca personalizada en reportes',
      'Soporte prioritario',
      'Integracion con sistemas hospitalarios',
    ],
  },
]

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [modalRole, setModalRole] = useState<RoleType | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/patients')
    })
  }, [router])

  // Si viene de /login con ?registro=true, hacer scroll a los planes
  useEffect(() => {
    if (searchParams.get('registro') === 'true') {
      setTimeout(() => {
        document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen hero-gradient relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-info/[0.03] blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoIcon size={36} />
          <span className="font-semibold text-foreground text-lg tracking-tight">Longevity IA</span>
        </div>
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
        >
          Iniciar sesion
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-28 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/8 border border-accent/15 text-accent text-xs font-medium mb-8 animate-fade-in">
          <Sparkles size={12} />
          Medicina de Longevidad con IA
        </div>

        <h1
          className="text-5xl sm:text-6xl lg:text-7xl mb-8 leading-[1.1] tracking-tight animate-slide-up"
          style={{
            fontFamily: "'Georgia', 'Cambria', 'Times New Roman', serif",
            fontStyle: 'italic',
            fontWeight: 400,
            background: 'linear-gradient(120deg, #A8A399 0%, #E2DFD6 42%, #D4AF37 78%, #F5E6B8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Entendemos el envejecimiento como una direccion que tu controlas.
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          Analiza tu salud con precision. Cada biomarcador cuenta una historia sobre tu futuro.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap animate-fade-in" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
          <a
            href="#planes"
            className="group inline-flex items-center gap-2.5 bg-accent text-background font-semibold px-8 py-4 rounded-2xl hover:bg-accent/90 transition-all shadow-accent-lg text-lg hover-lift"
          >
            Comenzar ahora
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </a>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 border border-border text-foreground font-medium px-8 py-4 rounded-2xl hover:bg-white/5 hover:border-accent/30 transition-all text-lg"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="divider-glow max-w-4xl mx-auto" />

      {/* Features */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <div
                key={i}
                className={`card-medical p-6 hover-lift hover-glow stagger-${i + 1} animate-slide-up relative overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feat.gradient} opacity-50 pointer-events-none`} />
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                    <Icon size={20} className="text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-[15px]">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="divider-glow max-w-4xl mx-auto" />

      {/* ═══════════════════════════════════════════════════════════
          SUBSCRIPTION CARDS
          ═══════════════════════════════════════════════════════════ */}
      <div id="planes" className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16 animate-fade-in">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{
              background: 'linear-gradient(120deg, #E2DFD6 0%, #D4AF37 60%, #F5E6B8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Elige tu perfil
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Selecciona el plan que mejor se adapte a tus necesidades y comienza a transformar tu salud con inteligencia artificial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon
            const isFeatured = plan.role === 'medico'
            return (
              <div
                key={plan.role}
                className={`relative flex flex-col rounded-2xl border transition-all duration-300 hover:-translate-y-2 animate-slide-up ${
                  isFeatured
                    ? 'border-accent/40 bg-card/80 shadow-[0_0_40px_-8px] shadow-accent/20'
                    : 'border-border/60 bg-card/60 hover:border-accent/30 hover:shadow-xl hover:shadow-black/20'
                }`}
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}
              >
                {/* Featured badge */}
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-background text-[11px] font-bold uppercase tracking-wider">
                    Recomendado
                  </div>
                )}

                <div className="p-7 flex-1 flex flex-col">
                  {/* Icon + Title */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${plan.color}15`, border: `1.5px solid ${plan.color}30` }}
                    >
                      <Icon size={22} style={{ color: plan.color }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{plan.title}</h3>
                      <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
                    </div>
                  </div>

                  {/* Benefits */}
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.benefits.map((b, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <Check size={14} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => setModalRole(plan.role)}
                    className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      isFeatured
                        ? 'bg-accent text-background hover:bg-accent/90 shadow-lg shadow-accent/20'
                        : 'border border-border text-foreground hover:bg-accent/10 hover:border-accent/40 hover:text-accent'
                    }`}
                  >
                    Ingresar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="divider-glow max-w-2xl mx-auto mb-12" />
      <p className="text-center text-xs text-muted-foreground/40 pb-8">
        Longevity IA — Ciencia de longevidad al alcance de tu salud
      </p>

      {/* Footer */}
      <footer className="relative text-center py-6 border-t border-border/20">
        <div className="flex items-center justify-center gap-2 mb-1">
          <LogoIcon size={16} />
          <span className="text-xs text-muted-foreground/60 font-medium">Longevity IA</span>
        </div>
        <p className="text-[10px] text-muted-foreground/40">
          Derechos reservados - Longevity Clinic SA de CV
        </p>
      </footer>

      {/* Registration Modal */}
      <RegisterModal
        role={modalRole ?? 'paciente'}
        isOpen={modalRole !== null}
        onClose={() => setModalRole(null)}
      />
    </div>
  )
}
