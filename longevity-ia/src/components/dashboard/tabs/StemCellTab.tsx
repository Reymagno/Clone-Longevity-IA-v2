'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Patient, ParsedData, AIAnalysis, BiomarkerValue } from '@/types'
import { toast } from 'sonner'
import {
  Dna, ChevronDown, ChevronUp, Syringe, FlaskConical,
  AlertTriangle, CheckCircle2, Info, Activity, User,
  BarChart3, Clock, ShieldCheck, BookOpen, Calculator, FileDown
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// TIPOS INTERNOS
// ─────────────────────────────────────────────────────────────

interface StemCellTabProps {
  patient: Patient
  parsedData: ParsedData
  analysis: AIAnalysis
}

interface DoseFactor {
  name: string
  value: string
  multiplier: number
  status: 'optimal' | 'normal' | 'warning' | 'danger' | 'unavailable'
  justification: string
  source: string
}

interface StemCellProtocol {
  mscDose: number           // millones de células
  exosomeDose: number       // ×10¹⁰ partículas
  route: string
  sessions: number
  schedule: string
  totalFactor: number
  factors: DoseFactor[]
  indication: 'preventivo' | 'terapéutico-moderado' | 'terapéutico-intensivo'
  monitoring: string[]
  contraindications: string[]
  alerts: string[]
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function statusColor(status: DoseFactor['status']): string {
  switch (status) {
    case 'optimal':     return '#2EAE7B'
    case 'normal':      return '#5BA4C9'
    case 'warning':     return '#D4A03A'
    case 'danger':      return '#D4536A'
    case 'unavailable': return '#6B6660'
  }
}

function statusLabel(status: DoseFactor['status']): string {
  switch (status) {
    case 'optimal':     return 'Óptimo'
    case 'normal':      return 'Normal'
    case 'warning':     return 'Atención'
    case 'danger':      return 'Crítico'
    case 'unavailable': return 'Sin dato'
  }
}

function bmStatus(bm: BiomarkerValue | null | undefined): 'optimal' | 'normal' | 'warning' | 'danger' | 'unavailable' {
  if (!bm || bm.value === null) return 'unavailable'
  return bm.status ?? 'unavailable'
}

function multiplierBadge(m: number): string {
  if (m < 1)   return `×${m.toFixed(2)} ↓`
  if (m === 1) return `×1.00 →`
  return `×${m.toFixed(2)} ↑`
}

function multiplierColor(m: number): string {
  if (m > 1.2) return '#D4536A'
  if (m > 1.0) return '#D4A03A'
  if (m < 1.0) return '#5BA4C9'
  return '#2EAE7B'
}

function formatMillions(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)} × 10⁹`
  return `${Math.round(n)} × 10⁶`
}

// ─────────────────────────────────────────────────────────────
// ALGORITMO DE DOSIFICACIÓN
// (Evidence-based: Signal Transduction & Targeted Therapy 2024–2025,
//  Frontiers in Medicine 2025, Longeveron Phase 2b Cell Stem Cell 2026,
//  Blood Advances ASH 2020, JCO 2024–2025)
// ─────────────────────────────────────────────────────────────

function computeProtocol(
  patient: Patient,
  parsedData: ParsedData,
  analysis: AIAnalysis
): StemCellProtocol {
  const factors: DoseFactor[] = []
  const alerts: string[] = []
  const contraindications: string[] = []

  // ── PESO base ──────────────────────────────────────────────
  const weight = patient.weight ?? 70
  const height = patient.height
  const bmi = height ? weight / Math.pow(height / 100, 2) : null

  if (!patient.weight) alerts.push('Peso no registrado — se usó 70 kg como referencia. Actualizar datos del paciente.')
  if (!patient.height) alerts.push('Estatura no registrada — IMC no calculable.')

  const BASE_MSC_PER_KG = 1_000_000   // 1×10⁶ células/kg IV (estándar clínico)
  const BASE_EXOSOME   = 2.0          // 2×10¹⁰ partículas IV

  // ── FACTOR 1: EDAD ─────────────────────────────────────────
  let ageFactor = 1.0
  let ageStatus: DoseFactor['status'] = 'normal'
  let ageJustification = ''
  const age = patient.age

  if (age < 40) {
    ageFactor = 0.85; ageStatus = 'optimal'
    ageJustification = 'Microambiente receptor joven — alta receptividad a células; se puede reducir dosis base.'
  } else if (age <= 55) {
    ageFactor = 1.0; ageStatus = 'normal'
    ageJustification = 'Rango estándar. Microambiente conservado — dosis base sin ajuste.'
  } else if (age <= 70) {
    ageFactor = 1.2; ageStatus = 'warning'
    ageJustification = 'Microambiente deteriorado por envejecimiento — mayor dosis para compensar menor eficiencia de injerto (Blood Advances 2020).'
  } else {
    ageFactor = 1.5; ageStatus = 'danger'
    ageJustification = 'Rango frailty (>70 años) — Longeveron Phase 2b (Cell Stem Cell 2026) documenta 100–200×10⁶ MSC en esta población para respuesta significativa.'
  }
  factors.push({
    name: 'Edad', value: `${age} años`, multiplier: ageFactor, status: ageStatus,
    justification: ageJustification, source: 'Longeveron Phase 2b / Blood Advances ASH 2020'
  })

  // ── FACTOR 2: IMC ──────────────────────────────────────────
  let bmiFactor = 1.0
  let bmiStatus: DoseFactor['status'] = 'unavailable'
  let bmiJustification = 'Sin estatura registrada — IMC no calculable.'

  if (bmi !== null) {
    if (bmi < 18.5) {
      bmiFactor = 0.9; bmiStatus = 'warning'
      bmiJustification = 'Bajo peso — tejido adiposo reducido puede limitar nicho paracrino. Dosis ligera reducción.'
    } else if (bmi <= 24.9) {
      bmiFactor = 1.0; bmiStatus = 'optimal'
      bmiJustification = 'IMC normal — distribución corporal óptima para biodistribución celular.'
    } else if (bmi <= 29.9) {
      bmiFactor = 1.05; bmiStatus = 'normal'
      bmiJustification = 'Sobrepeso — leve aumento para compensar retención en tejido adiposo expandido.'
    } else if (bmi <= 34.9) {
      bmiFactor = 1.1; bmiStatus = 'warning'
      bmiJustification = 'Obesidad I — masa adiposa crea microambiente inflamatorio que reduce eficiencia de injerto.'
    } else {
      bmiFactor = 1.15; bmiStatus = 'danger'
      bmiJustification = 'Obesidad II/III — alto riesgo de atrapamiento pulmonar aumentado; evaluar ruta alternativa.'
      alerts.push('Obesidad severa: considerar fraccionamiento de dosis IV para reducir riesgo de atrapamiento pulmonar.')
    }
  }
  factors.push({
    name: 'IMC', value: bmi !== null ? `${bmi.toFixed(1)} kg/m²` : 'Sin dato',
    multiplier: bmiFactor, status: bmiStatus,
    justification: bmiJustification, source: 'Signal Transduction & Targeted Therapy 2024 (Nature)'
  })

  // ── FACTOR 3: INFLAMACIÓN (CRP + Homocisteína) ─────────────
  const crp = parsedData.inflammation?.crp
  const hcy = parsedData.inflammation?.homocysteine
  let inflamFactor = 1.0
  let inflamStatus: DoseFactor['status'] = 'unavailable'
  let inflamJustification = ''
  let inflamValue = 'Sin dato'

  const crpSt = bmStatus(crp)
  const hcySt = bmStatus(hcy)

  if (crpSt !== 'unavailable' || hcySt !== 'unavailable') {
    const worst = [crpSt, hcySt].reduce((a, b) => {
      const order = ['unavailable', 'optimal', 'normal', 'warning', 'danger']
      return order.indexOf(b) > order.indexOf(a) ? b : a
    })
    inflamStatus = worst as DoseFactor['status']
    const parts = []
    if (crp?.value !== null && crp?.value !== undefined) parts.push(`PCR ${crp.value} ${crp.unit}`)
    if (hcy?.value !== null && hcy?.value !== undefined) parts.push(`Hcy ${hcy.value} ${hcy.unit}`)
    inflamValue = parts.join(' | ') || 'Sin dato'

    switch (inflamStatus) {
      case 'optimal':
        inflamFactor = 1.0
        inflamJustification = 'Inflamación sistémica baja — microambiente favorable, sin ajuste necesario.'
        break
      case 'normal':
        inflamFactor = 1.1
        inflamJustification = 'Inflamación borderline — leve potenciación del homing celular (las MSC migran hacia gradientes inflamatorios).'
        break
      case 'warning':
        inflamFactor = 1.3
        inflamJustification = 'Inflamación moderada — estado "primed" favorable para homing; mayor dosis potencia el efecto inmunomodulador. (Frontiers Immunology 2026)'
        break
      case 'danger':
        inflamFactor = 1.5
        inflamJustification = 'Inflamación sistémica activa — alta demanda de efecto paracrino; documentado en ensayos de GVHD y cirrosis (JCO 2025, Signal Transduction 2025).'
        break
    }
  } else {
    inflamJustification = 'PCR y homocisteína no disponibles en este estudio — factor neutro aplicado.'
  }
  factors.push({
    name: 'Inflamación sistémica', value: inflamValue, multiplier: inflamFactor, status: inflamStatus,
    justification: inflamJustification, source: 'Frontiers Immunology 2026 / JCO 2025'
  })

  // ── FACTOR 4: FUNCIÓN RENAL (GFR + Creatinina) ─────────────
  const gfr = parsedData.metabolic?.gfr
  const creatinine = parsedData.metabolic?.creatinine
  let renalFactor = 1.0
  let renalStatus: DoseFactor['status'] = 'unavailable'
  let renalJustification = ''
  let renalValue = 'Sin dato'

  const gfrSt = bmStatus(gfr)
  const creatSt = bmStatus(creatinine)

  if (gfrSt !== 'unavailable' || creatSt !== 'unavailable') {
    const worst = [gfrSt, creatSt].reduce((a, b) => {
      const order = ['unavailable', 'optimal', 'normal', 'warning', 'danger']
      return order.indexOf(b) > order.indexOf(a) ? b : a
    })
    renalStatus = worst as DoseFactor['status']
    const parts = []
    if (gfr?.value !== null && gfr?.value !== undefined) parts.push(`TFG ${gfr.value} ${gfr.unit}`)
    if (creatinine?.value !== null && creatinine?.value !== undefined) parts.push(`Cr ${creatinine.value} ${creatinine.unit}`)
    renalValue = parts.join(' | ') || 'Sin dato'

    switch (renalStatus) {
      case 'optimal': renalFactor = 1.0; renalJustification = 'Función renal óptima — clearance normal, sin ajuste.'; break
      case 'normal':  renalFactor = 1.0; renalJustification = 'Función renal normal — sin modificación de dosis.'; break
      case 'warning':
        renalFactor = 0.95
        renalJustification = 'Función renal disminuida — reducción leve por modificación farmacocinética. Monitorear creatinina post-infusión. (PMC4097822)'
        alerts.push('Función renal comprometida: monitorear creatinina y TFG 48–72h post-infusión.')
        break
      case 'danger':
        renalFactor = 0.85
        renalJustification = 'Insuficiencia renal — reducción de dosis para evitar sobrecarga del sistema de clearance. Evaluación nefrológica previa recomendada.'
        alerts.push('Insuficiencia renal: requiere evaluación nefrológica antes de proceder con terapia celular.')
        break
    }
  } else {
    renalJustification = 'TFG y creatinina no disponibles — factor neutro aplicado.'
  }
  factors.push({
    name: 'Función renal', value: renalValue, multiplier: renalFactor, status: renalStatus,
    justification: renalJustification, source: 'PMC4097822 / Signal Transduction 2024'
  })

  // ── FACTOR 5: FUNCIÓN HEPÁTICA (ALT + AST + GGT) ───────────
  const alt = parsedData.liver?.alt
  const ast = parsedData.liver?.ast
  const ggt = parsedData.liver?.ggt
  let hepaticFactor = 1.0
  let hepaticStatus: DoseFactor['status'] = 'unavailable'
  let hepaticJustification = ''
  let hepaticValue = 'Sin dato'

  const altSt = bmStatus(alt)
  const astSt = bmStatus(ast)
  const ggtSt = bmStatus(ggt)

  if (altSt !== 'unavailable' || astSt !== 'unavailable' || ggtSt !== 'unavailable') {
    const worst = [altSt, astSt, ggtSt].reduce((a, b) => {
      const order = ['unavailable', 'optimal', 'normal', 'warning', 'danger']
      return order.indexOf(b) > order.indexOf(a) ? b : a
    })
    hepaticStatus = worst as DoseFactor['status']
    const parts = []
    if (alt?.value !== null && alt?.value !== undefined) parts.push(`ALT ${alt.value}`)
    if (ast?.value !== null && ast?.value !== undefined) parts.push(`AST ${ast.value}`)
    if (ggt?.value !== null && ggt?.value !== undefined) parts.push(`GGT ${ggt.value}`)
    hepaticValue = parts.join(' | ') || 'Sin dato'

    switch (hepaticStatus) {
      case 'optimal': hepaticFactor = 1.0; hepaticJustification = 'Hígado en estado óptimo — metabolismo y síntesis proteica adecuados.'; break
      case 'normal':  hepaticFactor = 1.0; hepaticJustification = 'Función hepática normal — sin modificación.'; break
      case 'warning':
        hepaticFactor = 1.1
        hepaticJustification = 'Daño hepático moderado — las MSC ejercen efecto hepatoprotector paracrino; dosis aumentada para maximizar beneficio. (Signal Transduction 2025 Nature)'
        break
      case 'danger':
        hepaticFactor = 1.3
        hepaticJustification = 'Daño hepático significativo — indicación terapéutica primaria documentada con escalada de dosis en ensayo Fase Ia/Ib (Signal Transduction & Targeted Therapy 2025).'
        alerts.push('Daño hepático significativo: evaluar protocolo específico hepático con escalada por cohortes.')
        break
    }
  } else {
    hepaticJustification = 'ALT, AST y GGT no disponibles — factor neutro aplicado.'
  }
  factors.push({
    name: 'Función hepática', value: hepaticValue, multiplier: hepaticFactor, status: hepaticStatus,
    justification: hepaticJustification, source: 'Signal Transduction & Targeted Therapy 2025 (Nature)'
  })

  // ── FACTOR 6: ESTADO METABÓLICO (Glucosa + HbA1c + Insulina) ─
  const glucose = parsedData.metabolic?.glucose
  const hba1c   = parsedData.hormones?.hba1c
  const insulin  = parsedData.hormones?.insulin
  let metabFactor = 1.0
  let metabStatus: DoseFactor['status'] = 'unavailable'
  let metabJustification = ''
  let metabValue = 'Sin dato'

  const glcSt  = bmStatus(glucose)
  const hbaSt  = bmStatus(hba1c)
  const insSt  = bmStatus(insulin)

  if (glcSt !== 'unavailable' || hbaSt !== 'unavailable' || insSt !== 'unavailable') {
    const worst = [glcSt, hbaSt, insSt].reduce((a, b) => {
      const order = ['unavailable', 'optimal', 'normal', 'warning', 'danger']
      return order.indexOf(b) > order.indexOf(a) ? b : a
    })
    metabStatus = worst as DoseFactor['status']
    const parts = []
    if (glucose?.value !== null && glucose?.value !== undefined) parts.push(`Glc ${glucose.value} ${glucose.unit}`)
    if (hba1c?.value !== null && hba1c?.value !== undefined) parts.push(`HbA1c ${hba1c.value}%`)
    if (insulin?.value !== null && insulin?.value !== undefined) parts.push(`Ins ${insulin.value} ${insulin.unit}`)
    metabValue = parts.join(' | ') || 'Sin dato'

    switch (metabStatus) {
      case 'optimal': metabFactor = 1.0; metabJustification = 'Metabolismo glucídico óptimo — entorno favorable para diferenciación y supervivencia celular.'; break
      case 'normal':  metabFactor = 1.0; metabJustification = 'Estado metabólico normal — sin ajuste.'; break
      case 'warning':
        metabFactor = 1.1
        metabJustification = 'Resistencia a la insulina o glucosa elevada — el microambiente hiperglucémico reduce eficiencia de injerto; leve aumento de dosis compensatorio.'
        break
      case 'danger':
        metabFactor = 1.2
        metabJustification = 'DM2 o prediabetes avanzada — entorno hiperglucémico significativamente compromete supervivencia celular; mayor dosis requerida y optimización glucémica previa recomendada.'
        alerts.push('Hiperglucemia activa: optimizar control glucémico antes de terapia celular para maximizar injerto.')
        break
    }
  } else {
    metabJustification = 'Glucosa, HbA1c e insulina no disponibles — factor neutro aplicado.'
  }
  factors.push({
    name: 'Estado metabólico', value: metabValue, multiplier: metabFactor, status: metabStatus,
    justification: metabJustification, source: 'Stem Cell Research & Therapy 2025 / Frontiers Medicine 2025'
  })

  // ── FACTOR 7: ESTADO INMUNE (Score IA + Hematología) ───────
  const immuneScore = analysis.systemScores.immune
  const hematScore  = analysis.systemScores.hematologic
  const avgImmuneScore = (immuneScore + hematScore) / 2
  let immuneFactor = 1.0
  let immuneStatus: DoseFactor['status'] = 'normal'
  let immuneJustification = ''

  if (avgImmuneScore >= 85) {
    immuneFactor = 0.95; immuneStatus = 'optimal'
    immuneJustification = 'Sistema inmune óptimo — alta probabilidad de tolerancia y respuesta. Ligera reducción posible por robustez del sistema.'
  } else if (avgImmuneScore >= 65) {
    immuneFactor = 1.0; immuneStatus = 'normal'
    immuneJustification = 'Estado inmune adecuado — dosis estándar sin ajuste.'
  } else if (avgImmuneScore >= 40) {
    immuneFactor = 1.15; immuneStatus = 'warning'
    immuneJustification = 'Sistema inmune comprometido — mayor número de células necesario para efecto paracrino compensatorio. Evaluar perfil T helper antes del procedimiento.'
    alerts.push('Sistema inmune comprometido: considerar perfil de subpoblaciones linfocitarias (CD4+/CD8+/NK) previo a terapia.')
  } else {
    immuneFactor = 1.3; immuneStatus = 'danger'
    immuneJustification = 'Inmunodeficiencia significativa — dosis aumentada pero requiere evaluación especializada. Riesgo de respuesta subóptima por agotamiento del nicho de injerto.'
    alerts.push('Inmunodeficiencia severa: consulta con inmunólogo antes de proceder.')
  }
  factors.push({
    name: 'Estado inmunológico', value: `Score: ${avgImmuneScore.toFixed(0)}/100`,
    multiplier: immuneFactor, status: immuneStatus,
    justification: immuneJustification, source: 'Frontiers Immunology 2026 / Blood Advances ASH 2020'
  })

  // ── FACTOR 8: SALUD GLOBAL (Overall Score IA) ──────────────
  const overall = analysis.overallScore
  let globalFactor = 1.0
  let globalStatus: DoseFactor['status'] = 'normal'
  let globalJustification = ''

  if (overall >= 85) {
    globalFactor = 0.9; globalStatus = 'optimal'
    globalJustification = 'Paciente en excelente estado — protocolo preventivo/optimización. Dosis conservadora suficiente.'
  } else if (overall >= 65) {
    globalFactor = 1.0; globalStatus = 'normal'
    globalJustification = 'Estado de salud moderado — protocolo estándar.'
  } else if (overall >= 40) {
    globalFactor = 1.2; globalStatus = 'warning'
    globalJustification = 'Múltiples sistemas comprometidos — mayor carga terapéutica requerida para impacto sistémico.'
  } else {
    globalFactor = 1.4; globalStatus = 'danger'
    globalJustification = 'Estado crítico múltiple — protocolo intensivo indicado. Priorizar estabilización clínica antes del procedimiento.'
    alerts.push('Score global crítico: estabilizar condición clínica antes de iniciar terapia regenerativa.')
  }
  factors.push({
    name: 'Salud global (Score IA)', value: `${overall.toFixed(0)}/100`,
    multiplier: globalFactor, status: globalStatus,
    justification: globalJustification, source: 'Longevity IA Analysis Engine'
  })

  // ── CÁLCULO FINAL ───────────────────────────────────────────
  const totalFactor = ageFactor * bmiFactor * inflamFactor * renalFactor * hepaticFactor * metabFactor * immuneFactor * globalFactor

  // Dosis MSC en millones de células
  let mscDoseMM = (weight * BASE_MSC_PER_KG * totalFactor) / 1_000_000
  // Clamp clínico: 25M – 300M (evidencia clínica disponible)
  mscDoseMM = Math.min(300, Math.max(25, mscDoseMM))
  // Redondear a múltiplo de 5M
  mscDoseMM = Math.round(mscDoseMM / 5) * 5

  // Dosis de Exosomas ×10¹⁰ partículas
  let exosomeDose = BASE_EXOSOME * Math.sqrt(totalFactor) // escala más suave
  exosomeDose = Math.min(10, Math.max(1, exosomeDose))
  exosomeDose = Math.round(exosomeDose * 2) / 2  // redondear a 0.5

  // Ruta de administración
  let route = 'Intravenosa (IV)'
  if (hepaticStatus === 'danger' || hepaticStatus === 'warning') {
    route = 'Intravenosa (IV) — considerar protocolo hepático complementario'
  }
  if (bmi !== null && bmi > 35) {
    route = 'Intravenosa (IV) fraccionada — reducir riesgo de atrapamiento pulmonar'
  }

  // Sesiones y calendario
  let sessions = 1
  let schedule = 'Sesión única'
  const indication: StemCellProtocol['indication'] =
    totalFactor <= 1.05 ? 'preventivo' :
    totalFactor <= 1.3  ? 'terapéutico-moderado' : 'terapéutico-intensivo'

  if (indication === 'terapéutico-moderado') {
    sessions = 2
    schedule = '2 sesiones: mes 0 y mes 3'
  } else if (indication === 'terapéutico-intensivo') {
    sessions = 3
    schedule = '3 sesiones: mes 0, mes 1 y mes 3'
  }

  // Monitoreo post-protocolo
  const monitoring: string[] = [
    'PCR, VSG e IL-6 a las 72h, 4 semanas y 3 meses post-infusión',
    'Hemograma completo a las 24h y 2 semanas',
    'Panel metabólico (glucosa, creatinina, transaminasas) a las 48h',
    'Evaluación clínica funcional (escala de fatiga, calidad de vida) a 1 y 3 meses',
  ]
  if (hepaticStatus === 'warning' || hepaticStatus === 'danger') {
    monitoring.push('ALT, AST, GGT y albúmina semanal durante primer mes')
  }
  if (renalStatus === 'warning' || renalStatus === 'danger') {
    monitoring.push('TFG y creatinina a las 48–72h y a las 2 semanas')
  }
  if (age > 65) {
    monitoring.push('Evaluación física funcional (6MWT o equivalente) a los 3 meses (Longeveron Phase 2b protocol)')
  }

  // Contraindicaciones
  if (analysis.systemScores.immune < 30) {
    contraindications.push('Inmunodeficiencia severa — requiere evaluación de riesgo/beneficio')
  }
  if (analysis.systemScores.renal < 30) {
    contraindications.push('Insuficiencia renal avanzada — evaluación nefrológica obligatoria')
  }

  return {
    mscDose: mscDoseMM,
    exosomeDose,
    route,
    sessions,
    schedule,
    totalFactor,
    factors,
    indication,
    monitoring,
    contraindications,
    alerts,
  }
}

// ─────────────────────────────────────────────────────────────
// SUBCOMPONENTES
// ─────────────────────────────────────────────────────────────

function CollapsibleSection({
  title, icon: Icon, defaultOpen = false, children
}: {
  title: string
  icon: React.ElementType
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon size={16} className="text-accent" />
          {title}
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0 pb-5 px-5">{children}</CardContent>}
    </Card>
  )
}

function FactorRow({ factor }: { factor: DoseFactor }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-border last:border-0 py-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">{factor.name}</span>
          <span className="text-xs font-mono text-muted-foreground truncate">{factor.value}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded"
            style={{ color: multiplierColor(factor.multiplier), background: multiplierColor(factor.multiplier) + '18' }}
          >
            {multiplierBadge(factor.multiplier)}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ color: statusColor(factor.status), background: statusColor(factor.status) + '18' }}
          >
            {statusLabel(factor.status)}
          </span>
          {expanded ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="mt-2 ml-1 space-y-1">
          <p className="text-xs text-muted-foreground leading-relaxed">{factor.justification}</p>
          <p className="text-xs text-muted-foreground/60 font-mono">Fuente: {factor.source}</p>
        </div>
      )}
    </div>
  )
}

function IndicationBadge({ indication }: { indication: StemCellProtocol['indication'] }) {
  const config = {
    'preventivo':              { label: 'Preventivo / Optimización', color: '#2EAE7B' },
    'terapéutico-moderado':    { label: 'Terapéutico Moderado',       color: '#5BA4C9' },
    'terapéutico-intensivo':   { label: 'Terapéutico Intensivo',      color: '#D4A03A' },
  }
  const c = config[indication]
  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{ color: c.color, background: c.color + '20', border: `1px solid ${c.color}40` }}
    >
      {c.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function StemCellTab({ patient, parsedData, analysis }: StemCellTabProps) {
  const protocol = computeProtocol(patient, parsedData, analysis)
  const totalFactorPct = ((protocol.totalFactor - 1) * 100).toFixed(0)
  const factorSign = protocol.totalFactor >= 1 ? '+' : ''
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadPDF() {
    setDownloading(true)
    try {
      const { generateStemCellProtocolPDF } = await import('@/lib/stemcell-protocol-pdf')
      await generateStemCellProtocolPDF(patient, parsedData, analysis, {
        mscDose: protocol.mscDose,
        exosomeDose: protocol.exosomeDose,
        route: protocol.route,
        sessions: protocol.sessions,
        schedule: protocol.schedule,
        totalFactor: protocol.totalFactor,
        indication: protocol.indication,
        factors: protocol.factors,
        monitoring: protocol.monitoring,
        contraindications: protocol.contraindications,
        alerts: protocol.alerts,
      })
      toast.success('Protocolo PDF generado correctamente')
    } catch {
      toast.error('Error al generar el protocolo PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Download button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={handleDownloadPDF}
          loading={downloading}
          className="rounded-xl"
        >
          <FileDown size={14} />
          Descarga Recomendación PDF
        </Button>
      </div>

      {/* Alertas */}
      {(protocol.alerts.length > 0 || protocol.contraindications.length > 0) && (
        <div className="space-y-2">
          {protocol.contraindications.map((c, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-danger/40 bg-danger/5">
              <AlertTriangle size={15} className="text-danger mt-0.5 shrink-0" />
              <p className="text-xs text-danger">{c}</p>
            </div>
          ))}
          {protocol.alerts.map((a, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-warning/40 bg-warning/5">
              <Info size={15} className="text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">{a}</p>
            </div>
          ))}
        </div>
      )}

      {/* Resultado principal */}
      <CollapsibleSection title="Protocolo Recomendado" icon={Syringe} defaultOpen>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <IndicationBadge indication={protocol.indication} />
            <span className="text-xs font-mono text-muted-foreground">
              Factor total: <span className="text-foreground font-bold">{factorSign}{totalFactorPct}%</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* MSC */}
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Dna size={16} className="text-accent" />
                <span className="text-sm font-semibold text-foreground">Células Madre MSC</span>
              </div>
              <p className="text-2xl font-bold font-mono text-accent">{formatMillions(protocol.mscDose)}</p>
              <p className="text-xs text-muted-foreground mt-1">células mesenquimales</p>
              <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Base</span><span className="font-mono">{patient.weight ?? 70} kg × 1×10⁶/kg</span></div>
                <div className="flex justify-between"><span>Ajuste clínico</span><span className="font-mono">{factorSign}{totalFactorPct}%</span></div>
                <div className="flex justify-between"><span>Fuente recomendada</span><span className="font-mono">hucMSC (cordón umbilical)</span></div>
              </div>
            </div>

            {/* Exosomas */}
            <div className="rounded-xl border border-blue-400/30 bg-blue-400/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical size={16} className="text-blue-400" />
                <span className="text-sm font-semibold text-foreground">Exosomas / VEs</span>
              </div>
              <p className="text-2xl font-bold font-mono text-blue-400">{protocol.exosomeDose.toFixed(1)} × 10¹⁰</p>
              <p className="text-xs text-muted-foreground mt-1">partículas IV</p>
              <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Base</span><span className="font-mono">2.0 × 10¹⁰ IV estándar</span></div>
                <div className="flex justify-between"><span>Marcadores</span><span className="font-mono">CD9 / CD63 / CD81</span></div>
                <div className="flex justify-between"><span>Tamaño</span><span className="font-mono">30–150 nm</span></div>
              </div>
            </div>
          </div>

          {/* Ruta + Sesiones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Syringe size={12} /> Vía</p>
              <p className="text-sm font-medium text-foreground">{protocol.route}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Activity size={12} /> Sesiones</p>
              <p className="text-sm font-bold text-foreground">{protocol.sessions}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock size={12} /> Calendario</p>
              <p className="text-sm font-medium text-foreground">{protocol.schedule}</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Perfil del paciente */}
      <CollapsibleSection title="Perfil del Paciente" icon={User} defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Edad', value: `${patient.age} años` },
            { label: 'Peso', value: patient.weight ? `${patient.weight} kg` : 'Sin dato' },
            { label: 'Estatura', value: patient.height ? `${patient.height} cm` : 'Sin dato' },
            {
              label: 'IMC',
              value: patient.weight && patient.height
                ? `${(patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)} kg/m²`
                : 'Sin dato'
            },
            { label: 'Género', value: patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro' },
            { label: 'Score global', value: `${analysis.overallScore.toFixed(0)}/100` },
            { label: 'Edad biológica', value: `${analysis.longevity_age} años` },
            { label: 'Score inmune', value: `${((analysis.systemScores.immune + analysis.systemScores.hematologic) / 2).toFixed(0)}/100` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Factores del algoritmo */}
      <CollapsibleSection title="Factores del Algoritmo" icon={BarChart3}>
        <p className="text-xs text-muted-foreground mb-3">
          Cada factor modifica la dosis base. Toca un factor para ver la justificación clínica y fuente.
        </p>
        <div>
          {protocol.factors.map((f, i) => <FactorRow key={i} factor={f} />)}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Factor compuesto total</span>
            <span className="font-mono text-sm font-bold" style={{ color: multiplierColor(protocol.totalFactor) }}>
              ×{protocol.totalFactor.toFixed(3)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Producto de los {protocol.factors.length} factores clínicos aplicados.
          </p>
        </div>
      </CollapsibleSection>

      {/* Explicación del cálculo */}
      <CollapsibleSection title="¿Cómo se calculó este protocolo?" icon={BookOpen}>
        <div className="space-y-5">

          {/* Ajuste clínico */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={13} className="text-accent" />
              <p className="text-xs font-semibold text-foreground">Qué significa el «Ajuste Clínico»</p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                La <span className="text-foreground font-semibold">dosis base</span> se calcula multiplicando el peso del paciente por el estándar clínico de{' '}
                <span className="font-mono text-accent">1×10⁶ células/kg</span> (1 millón de células por cada kg de peso).
                Para un paciente de <span className="font-mono text-foreground">{patient.weight ?? 70} kg</span>, eso da una dosis base de{' '}
                <span className="font-mono text-foreground">{patient.weight ?? 70} × 10⁶ células</span>.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                El <span className="text-foreground font-semibold">Ajuste Clínico</span> es el porcentaje en que esa dosis base sube o baja según el estado de salud del paciente.
                Se obtiene del <span className="text-foreground font-semibold">Factor Compuesto Total</span> (×{protocol.totalFactor.toFixed(3)}):
              </p>
              <div className="font-mono text-xs rounded bg-muted/50 border border-border px-4 py-3 space-y-1">
                <p className="text-muted-foreground">Ajuste (%) = (Factor Total − 1) × 100</p>
                <p className="text-foreground">
                  = ({protocol.totalFactor.toFixed(3)} − 1) × 100 ={' '}
                  <span style={{ color: multiplierColor(protocol.totalFactor) }} className="font-bold">
                    {factorSign}{((protocol.totalFactor - 1) * 100).toFixed(1)}%
                  </span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {protocol.totalFactor > 1
                  ? `Un ajuste positivo significa que las condiciones del paciente requieren más células para lograr el mismo efecto terapéutico (por ejemplo, inflamación elevada, edad avanzada o sistemas comprometidos que "consumen" más del efecto celular).`
                  : `Un ajuste negativo significa que el paciente está en condiciones óptimas — su cuerpo aprovecha mejor las células y no necesita una dosis tan alta.`}
              </p>
            </div>
          </div>

          {/* Fórmula MSC paso a paso */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Dna size={13} className="text-accent" />
              <p className="text-xs font-semibold text-foreground">Cálculo de Células Madre MSC — paso a paso</p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-muted/50 border border-border p-3">
                  <p className="text-muted-foreground mb-1">① Dosis base</p>
                  <p className="font-mono text-foreground font-semibold">
                    {patient.weight ?? 70} kg × 1×10⁶/kg
                  </p>
                  <p className="font-mono text-accent font-bold mt-1">
                    = {patient.weight ?? 70} × 10⁶ células
                  </p>
                </div>
                <div className="rounded bg-muted/50 border border-border p-3">
                  <p className="text-muted-foreground mb-1">② × Factor total</p>
                  <p className="font-mono text-foreground font-semibold">
                    {patient.weight ?? 70} × 10⁶ × {protocol.totalFactor.toFixed(3)}
                  </p>
                  <p className="font-mono mt-1" style={{ color: multiplierColor(protocol.totalFactor) }}>
                    = {((patient.weight ?? 70) * protocol.totalFactor).toFixed(1)} × 10⁶
                  </p>
                </div>
                <div className="rounded bg-accent/10 border border-accent/30 p-3">
                  <p className="text-muted-foreground mb-1">③ Dosis final (redondeada)</p>
                  <p className="font-mono text-accent font-bold text-sm">
                    {formatMillions(protocol.mscDose)}
                  </p>
                  <p className="text-muted-foreground text-[10px] mt-1">
                    redondeado al múltiplo de 5M más cercano, entre 25M y 300M
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-semibold">¿Por qué se limita entre 25M y 300M?</span>{' '}
                Toda la evidencia clínica disponible (ensayos Fase I/II/III) opera en ese rango. Por debajo de 25M no hay efecto terapéutico documentado; por encima de 300M no hay datos de seguridad adicional y el riesgo de atrapamiento pulmonar aumenta significativamente.
              </p>
            </div>
          </div>

          {/* Fórmula Exosomas */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical size={13} className="text-blue-400" />
              <p className="text-xs font-semibold text-foreground">Cálculo de Exosomas / VEs</p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-muted/50 border border-border p-3">
                  <p className="text-muted-foreground mb-1">① Dosis base IV</p>
                  <p className="font-mono text-foreground font-semibold">2.0 × 10¹⁰ partículas</p>
                  <p className="text-muted-foreground text-[10px] mt-1">estándar clínico para vía IV</p>
                </div>
                <div className="rounded bg-muted/50 border border-border p-3">
                  <p className="text-muted-foreground mb-1">② × √Factor total</p>
                  <p className="font-mono text-foreground font-semibold">
                    2.0 × √{protocol.totalFactor.toFixed(3)}
                  </p>
                  <p className="text-muted-foreground text-[10px] mt-1">escala más suave que MSC</p>
                </div>
                <div className="rounded bg-blue-400/10 border border-blue-400/30 p-3">
                  <p className="text-muted-foreground mb-1">③ Dosis final</p>
                  <p className="font-mono text-blue-400 font-bold text-sm">
                    {protocol.exosomeDose.toFixed(1)} × 10¹⁰
                  </p>
                  <p className="text-muted-foreground text-[10px] mt-1">entre 1 y 10 × 10¹⁰</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-semibold">¿Por qué raíz cuadrada y no multiplicación directa?</span>{' '}
                Los exosomas son vesículas extracelulares — tienen mayor biodisponibilidad y menor riesgo de atrapamiento que las células completas. Su dosis escala de forma más conservadora (√factor) para evitar sobredosificación con los mismos factores de ajuste.
              </p>
            </div>
          </div>

          {/* Factor compuesto — multiplicación visible */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={13} className="text-accent" />
              <p className="text-xs font-semibold text-foreground">Cómo se forma el Factor Compuesto Total</p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-4">
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Cada uno de los 8 factores clínicos produce un multiplicador. El Factor Total es el <span className="text-foreground font-semibold">producto de todos</span> — no una suma ni un promedio.
              </p>
              <div className="font-mono text-xs leading-relaxed overflow-x-auto">
                <p className="text-muted-foreground">Factor Total =</p>
                <div className="flex flex-wrap gap-1 mt-1 items-center">
                  {protocol.factors.map((f, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ color: multiplierColor(f.multiplier), background: multiplierColor(f.multiplier) + '18' }}
                        title={f.name}
                      >
                        {f.multiplier.toFixed(2)}
                      </span>
                      {i < protocol.factors.length - 1 && <span className="text-muted-foreground">×</span>}
                    </span>
                  ))}
                  <span className="text-muted-foreground ml-1">=</span>
                  <span className="font-bold ml-1" style={{ color: multiplierColor(protocol.totalFactor) }}>
                    {protocol.totalFactor.toFixed(4)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2 text-[10px] text-muted-foreground">
                  {protocol.factors.map((f, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="opacity-70">{f.name.split(' ')[0]}</span>
                      {i < protocol.factors.length - 1 && <span>·</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sesiones */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={13} className="text-accent" />
              <p className="text-xs font-semibold text-foreground">Cómo se determinan las sesiones</p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border divide-y divide-border">
              {[
                { rango: 'Factor Total ≤ 1.05', sesiones: '1 sesión única', indicacion: 'Preventivo / Optimización', color: '#2EAE7B', desc: 'Paciente en buen estado. Una sola infusión es suficiente.' },
                { rango: '1.05 < Factor ≤ 1.30', sesiones: '2 sesiones (mes 0 y mes 3)', indicacion: 'Terapéutico Moderado', color: '#5BA4C9', desc: 'Algunos sistemas comprometidos. Se necesita refuerzo a los 3 meses.' },
                { rango: 'Factor Total > 1.30', sesiones: '3 sesiones (mes 0, 1 y 3)', indicacion: 'Terapéutico Intensivo', color: '#D4A03A', desc: 'Múltiples sistemas comprometidos. Protocolo intensivo con seguimiento mensual.' },
              ].map(({ rango, sesiones, indicacion, color, desc }) => (
                <div key={rango} className={`p-3 flex items-start gap-3 ${protocol.totalFactor <= 1.05 && color === '#2EAE7B' ? 'bg-accent/5' : protocol.totalFactor > 1.05 && protocol.totalFactor <= 1.3 && color === '#5BA4C9' ? 'bg-blue-400/5' : protocol.totalFactor > 1.3 && color === '#D4A03A' ? 'bg-warning/5' : ''}`}>
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-muted-foreground">{rango}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: color + '20' }}>{indicacion}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{sesiones}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {((protocol.totalFactor <= 1.05 && color === '#2EAE7B') ||
                    (protocol.totalFactor > 1.05 && protocol.totalFactor <= 1.3 && color === '#5BA4C9') ||
                    (protocol.totalFactor > 1.3 && color === '#D4A03A')) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{ color, background: color + '20' }}>
                      ← este paciente
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </CollapsibleSection>

      {/* Monitoreo */}
      <CollapsibleSection title="Monitoreo Post-Protocolo" icon={ShieldCheck}>
        <ul className="space-y-2">
          {protocol.monitoring.map((m, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-accent mt-0.5 shrink-0" />
              <span className="text-xs text-muted-foreground">{m}</span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Nota clínica */}
      <div className="p-4 rounded-lg border border-border bg-muted/10">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Nota clínica: </span>
          Este protocolo es una estimación algorítmica basada en evidencia publicada (Cell Stem Cell 2026, Signal Transduction &amp; Targeted Therapy 2024–2025, Frontiers in Medicine 2025, Blood Advances ASH 2020). No sustituye el criterio médico especializado. La dosis final debe ser validada por el médico tratante considerando el estado clínico actual del paciente, disponibilidad del producto celular y potencia por lote (batch potency).
        </p>
      </div>

    </div>
  )
}
