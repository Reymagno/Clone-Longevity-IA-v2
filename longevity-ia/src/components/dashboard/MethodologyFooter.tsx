'use client'

import { useState } from 'react'
import { Info, ChevronDown } from 'lucide-react'

interface MethodologyFooterProps {
  type: 'scores' | 'age' | 'swot' | 'projection' | 'trends'
}

const METHODOLOGIES: Record<string, { title: string; content: string }> = {
  scores: {
    title: 'Metodología Longevity IA — System Scores v2.0',
    content: `Cada sistema se puntúa de 0 a 100 mediante promedio ponderado de los biomarcadores disponibles. Los biomarcadores se clasifican como: óptimo (100 pts), normal (75 pts), atención (40 pts), crítico (15 pts).

Pesos por sistema:
• Cardiovascular: LDL (0.20), HDL (0.15), TG (0.15), Col. Total (0.10), ApoB (0.20 si disponible), Lp(a) (0.10), TG/HDL (0.10).
• Metabólico: Glucosa (0.25), HbA1c (0.30 si disponible), Insulina (0.20), Ácido úrico (0.15), HOMA-IR (0.10).
• Hepático: ALT (0.25), AST (0.20), GGT (0.25), Fosfatasa alcalina (0.10), Bilirrubina (0.10), Albumina (0.10).
• Renal: Creatinina (0.30), GFR (0.40 si disponible), BUN/Urea (0.15), Ácido úrico (0.15).
• Inmune: Leucocitos (0.25), Neutrófilos (0.20), Linfocitos (0.25), Ratio N/L (0.30 si calculable).
• Hematológico: Hemoglobina (0.25), Hematocrito (0.15), RDW (0.25), Plaquetas (0.15), VCM (0.10), HCM (0.10).
• Inflamatorio: PCR (0.40), Homocisteína (0.30), Ferritina (0.30).
• Vitaminas: Vitamina D (0.35), B12 (0.25), Ferritina (0.20), Ácido fólico (0.20).

Score General = promedio ponderado de sistemas con datos: CV (0.20), Metabólico (0.20), Inflamatorio (0.15), Hepático (0.12), Renal (0.10), Hematológico (0.10), Inmune (0.08), Vitaminas (0.05).

Escala: 85-100 Óptimo | 65-84 Normal | 40-64 Atención | 0-39 Crítico.`,
  },
  age: {
    title: 'Metodología Longevity IA — Edad Biológica v2.0',
    content: `Edad biológica = Edad cronológica + Ajuste biológico.

Ajuste basado en Score General:
• Score ≥85: rejuvenecimiento ~8% (ej: 50 años → -4 años)
• Score 65-84: rejuvenecimiento ~3% (ej: 50 años → -1.5 años)
• Score 40-64: envejecimiento acelerado ~5% (ej: 50 años → +2.5 años)
• Score <40: envejecimiento acelerado ~12% (ej: 50 años → +6 años)

Modificadores adicionales:
• RDW >14%: +1 año | Albumina <4.0 g/dL: +2 años | PCR >3.0 mg/L: +2 años
• Vitamina D >60 ng/mL: -1 año | HbA1c <5.2%: -1 año | GFR >90: -0.5 años
• Ferritina >200 (H) / >150 (M): +1 año

Límites: mínimo 18 años, máximo edad cronológica + 15 años.

La edad biológica refleja cómo funcionan los sistemas del cuerpo en comparación con la edad cronológica, basándose en biomarcadores con evidencia de predicción de mortalidad (RDW, albumina, PCR, GFR — Shamliyan, Annals of Internal Medicine 2012; Fulop, Nature Reviews Immunology 2018).`,
  },
  swot: {
    title: 'Metodología Longevity IA — FODA Médica Híbrida v3.0',
    content: `El análisis FODA médico utiliza una arquitectura híbrida que combina selección determinista con narrativa personalizada por IA:

FASE 1 — Selección matemática (Motor Longevity IA):
El motor matemático selecciona los biomarcadores del FODA usando funciones sigmoideas y pesos de mortalidad calibrados con UK Biobank, NHANES III y Framingham. Criterios: Fortaleza = score sigmoid >= 80/100, Debilidad = score sigmoid < 55/100. El orden de prioridad se determina por el peso de mortalidad de cada biomarcador (ej: LDL=0.95, PCR=0.92, RDW=0.90, glucosa=0.88).

FASE 2 — Narrativa personalizada (Claude Sonnet 4.6):
La IA redacta el detalle de cada punto integrando la historia clínica del paciente: edad, ejercicio, dieta, antecedentes familiares, medicamentos actuales, sueño y estrés. Esto permite que el mismo biomarcador alterado se explique diferente para un atleta de 30 años vs un sedentario de 65 con antecedentes familiares de diabetes.

Fortalezas (4): Biomarcadores con score >= 80 que protegen activamente al paciente, ordenados por peso de mortalidad. Incluye impacto cuantificado personalizado.

Debilidades (3): Biomarcadores con score < 55 que representan riesgo actual, ordenados por peso de mortalidad. Incluye probabilidad de progresión (Alta/Media/Baja) calculada matemáticamente.

Oportunidades (4): Intervenciones con evidencia nivel 1-2 para cada debilidad. Impacto esperado cuantificado.

Amenazas (3): Enfermedades derivadas de las debilidades, con probabilidad ajustada por edad y antecedentes.

Cada punto está respaldado por evidencia científica (autor, revista, año, magnitud del efecto). Si la historia clínica no está disponible, el sistema usa narrativa basada en templates con evidencia preconfigurada como fallback.`,
  },
  projection: {
    title: 'Metodología Longevity IA — Proyección a 10 Años v2.0',
    content: `La proyección modela dos escenarios a 10 años basados en el Score General actual del paciente:

Sin intervención (deterioro natural):
• Año 1: Score General actual sin cambios.
• Años 2-10: deterioro anual progresivo según estado basal:
  - Score >70: deterioro del 3% anual (envejecimiento normal)
  - Score 40-70: deterioro del 6% anual (envejecimiento acelerado moderado)
  - Score <40: deterioro del 10% anual (envejecimiento acelerado severo)
• Modificador edad: pacientes >60 años tienen un 2% adicional de deterioro por año.
• Piso mínimo: 15 puntos (el score no puede bajar de 15).

Con intervención (protocolo terapéutico):
• Año 1: mejora del 15% del gap entre el score actual y 100 (el óptimo).
• Años 2-3: mejora acumulativa adicional del 10% anual (efecto terapéutico máximo).
• Años 4-10: meseta con mantenimiento del 99.5% anual (leve deterioro natural compensado).
• Techo máximo: 95 puntos (el envejecimiento biológico siempre existe).

Los 3 factores de proyección representan los biomarcadores con mayor impacto en el pronóstico del paciente, con valores actuales, objetivos óptimos, y pronóstico con/sin protocolo basado en evidencia científica.`,
  },
  trends: {
    title: 'Metodología Longevity IA — Tendencias Longitudinales v1.0',
    content: `Las tendencias longitudinales comparan biomarcadores entre múltiples análisis del mismo paciente para detectar patrones de mejora o deterioro.

Cálculo de dirección: Se compara el valor actual vs el valor anterior. El umbral de cambio significativo es 5% del rango óptimo del biomarcador — cambios menores se clasifican como "estable".

Velocidad de cambio: Se calcula la tasa mensual de cambio (delta / meses entre análisis). Con esta tasa se proyecta linealmente cuántos meses faltan para alcanzar el rango óptimo (si mejora) o el rango crítico (si empeora).

Scores por sistema: Se grafican los scores calculados por el motor matemático (funciones sigmoideas) de cada sistema a lo largo del tiempo, permitiendo ver si un sistema mejora o empeora consistentemente.

Alertas de velocidad: Se generan alertas automáticas cuando un biomarcador empeora >10% (warning) o >20% (danger) entre análisis, o cuando la proyección lineal indica que alcanzará nivel crítico en menos de 12 meses.

Clasificación general: Si >2x más biomarcadores mejoran que empeoran = "Mejorando". Si >2x más empeoran = "Empeorando". Si ninguno cambió = "Estable". En cualquier otro caso = "Mixta".

Metadatos: Se analizan 24 biomarcadores con rangos óptimos de longevidad (más estrictos que referencia convencional) calibrados con UK Biobank, NHANES III y Framingham.

Limitación: Las proyecciones asumen tendencia lineal constante. En realidad, las intervenciones terapéuticas pueden cambiar la trayectoria significativamente.`,
  },
}

export function MethodologyFooter({ type }: MethodologyFooterProps) {
  const [expanded, setExpanded] = useState(false)
  const methodology = METHODOLOGIES[type]
  if (!methodology) return null

  return (
    <div className="mt-6 border-t border-border/30 pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors w-full"
      >
        <Info size={12} />
        <span>{methodology.title}</span>
        <ChevronDown
          size={11}
          className={`ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-3 p-4 rounded-lg bg-muted/20 border border-border/20 animate-fade-in">
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed whitespace-pre-line">
            {methodology.content}
          </p>
          <p className="text-[10px] text-muted-foreground/40 mt-3 italic">
            Longevity IA v2.0 — Metodología propietaria basada en evidencia científica de instituciones de nivel mundial.
          </p>
        </div>
      )}
    </div>
  )
}
