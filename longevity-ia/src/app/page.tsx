'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Dna, Brain, Shield, BarChart2, Zap, FlaskConical, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

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

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/patients')
    })
  }, [router])

  return (
    <div className="min-h-screen hero-gradient relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-info/[0.03] blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-accent">
            <Dna size={18} className="text-background" />
          </div>
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
            background: 'linear-gradient(120deg, #94a3b8 0%, #f1f5f9 42%, #C9A84C 78%, #E8C46A 100%)',
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
          <Link
            href="/login"
            className="group inline-flex items-center gap-2.5 bg-accent text-background font-semibold px-8 py-4 rounded-2xl hover:bg-accent/90 transition-all shadow-accent-lg text-lg hover-lift"
          >
            Comenzar ahora
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 border border-border text-foreground font-medium px-8 py-4 rounded-2xl hover:bg-white/5 hover:border-accent/30 transition-all text-lg"
          >
            Ver pacientes
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
                {/* Subtle gradient background */}
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

      {/* Footer accent */}
      <div className="divider-glow max-w-2xl mx-auto mb-12" />
      <p className="text-center text-xs text-muted-foreground/40 pb-8">
        Longevity IA — Ciencia de longevidad al alcance de tu salud
      </p>
    </div>
  )
}
