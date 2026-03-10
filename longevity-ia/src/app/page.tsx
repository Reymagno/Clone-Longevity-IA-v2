import Link from 'next/link'
import { ArrowRight, Dna, Brain, Shield, BarChart2, Zap, FlaskConical } from 'lucide-react'

const FEATURES = [
  {
    icon: FlaskConical,
    title: 'Extracción Automática',
    desc: 'Claude lee tu PDF o imagen y extrae todos los biomarcadores con sus valores y unidades.',
  },
  {
    icon: Brain,
    title: 'IA con Web Search',
    desc: 'Busca en tiempo real los estudios más recientes antes de generar recomendaciones.',
  },
  {
    icon: BarChart2,
    title: 'Dashboard Interactivo',
    desc: '6 pestañas dinámicas: radar de sistemas, FODA médica, lípidos, metabólico y más.',
  },
  {
    icon: Shield,
    title: 'Análisis FODA Médico',
    desc: 'Fortalezas, debilidades, oportunidades y amenazas cruzadas con evidencia científica.',
  },
  {
    icon: Dna,
    title: 'Edad Biológica',
    desc: 'Estimación de edad biológica basada en todos los biomarcadores del estudio.',
  },
  {
    icon: Zap,
    title: 'Protocolo Personalizado',
    desc: 'Recomendaciones con dosis, mecanismo, ensayo clínico y resultado esperado.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen hero-gradient">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Dna size={18} className="text-background" />
          </div>
          <span className="font-semibold text-foreground text-lg">Longevity IA</span>
        </div>
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Iniciar sesión
        </Link>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
          <Zap size={12} />
          Medicina de Longevidad con IA
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-4 leading-tight">
          Tu salud analizada por nuestra{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-info">
            Inteligencia Artificial médica
          </span>{' '}
          en tiempo real
        </h1>

        <p className="text-lg text-muted-foreground/70 italic max-w-2xl mx-auto mb-3">
          Entendemos el envejecimiento como una dirección que tú controlas.
        </p>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Analiza tu salud con precisión. Claude extrae todos tus biomarcadores, busca estudios científicos
          en tiempo real y genera un dashboard médico completo con protocolo personalizado.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-accent text-background font-semibold px-8 py-4 rounded-xl hover:bg-accent/90 transition-all shadow-accent shadow-lg text-lg"
          >
            Comenzar ahora
            <ArrowRight size={20} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 border border-border text-foreground font-medium px-8 py-4 rounded-xl hover:bg-muted/40 transition-all text-lg"
          >
            Ver pacientes
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <div key={i} className="card-medical p-6 hover:border-accent/30 transition-all">
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>Longevity IA — Medicina de precisión impulsada por Claude</p>
      </div>
    </div>
  )
}
