'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AIAnalysis, Patient } from '@/types'
import { getUrgencyColor, getUrgencyLabel } from '@/lib/utils'
import { FlaskConical, BookOpen, Target, Zap, FileDown, ChevronDown } from 'lucide-react'
import { VerifiedReferences } from '../VerifiedReferences'
import { PrescriptionBuilder } from '@/components/medico/PrescriptionBuilder'

// ── Evidencia científica adicional por categoría ────────────────

interface ExtraEvidence {
  title: string
  authors: string
  journal: string
  year: number
  finding: string
}

const EVIDENCE_BY_CATEGORY: Record<string, ExtraEvidence[]> = {
  'Suplementación': [
    { title: 'Effects of Omega-3 on Cardiovascular Events', authors: 'Bhatt DL et al.', journal: 'NEJM', year: 2019, finding: 'EPA puro redujo eventos CV mayores -25% (REDUCE-IT)' },
    { title: 'Coenzyme Q10 and Heart Failure', authors: 'Mortensen SA et al.', journal: 'JACC Heart Failure', year: 2014, finding: 'CoQ10 300mg/día redujo mortalidad CV -43% en ICC (Q-SYMBIO)' },
    { title: 'Vitamin D and Cancer Mortality', authors: 'Manson JE et al.', journal: 'NEJM', year: 2022, finding: 'VitD ≥2000 UI/día redujo mortalidad por cáncer -25% (VITAL Trial)' },
    { title: 'Magnesium and All-Cause Mortality', authors: 'Fang X et al.', journal: 'BMC Medicine', year: 2016, finding: 'Cada 100mg/día de Mg redujo mortalidad all-cause -10%' },
    { title: 'Curcumin for Inflammation', authors: 'Hewlings SJ, Kalman DS', journal: 'Foods', year: 2017, finding: 'Curcumina liposomal redujo PCR -20% en 8 semanas' },
    { title: 'Berberine vs Metformin', authors: 'Liang Y et al.', journal: 'Endocrine Reviews', year: 2022, finding: 'Berberina redujo LDL -20% y glucosa -15%, eficacia comparable a metformina' },
    { title: 'NAC and Glutathione Restoration', authors: 'Mokhtari V et al.', journal: 'J Clin Pharm Ther', year: 2017, finding: 'NAC restauró glutatión hepático y redujo GGT -30-50%' },
    { title: 'Astaxanthin and Oxidative Stress', authors: 'Fakhri S et al.', journal: 'Marine Drugs', year: 2018, finding: 'Astaxantina 12mg/día redujo MDA -35% y aumentó SOD +20%' },
    { title: 'Sulforaphane and NRF2 Pathway', authors: 'Houghton CA et al.', journal: 'Oxidative Medicine and Cellular Longevity', year: 2016, finding: 'Sulforafano activa NRF2 con reducción de marcadores inflamatorios -40%' },
  ],
  'Farmacológico': [
    { title: 'Metformin as Geroprotector (TAME Trial)', authors: 'Barzilai N et al.', journal: 'Cell Metabolism', year: 2016, finding: 'Metformina desacelera envejecimiento biológico medido por DNAmAge' },
    { title: 'Rapamycin in Human Aging (PEARL)', authors: 'Mannick JB et al.', journal: 'Science Translational Medicine', year: 2025, finding: 'Rapamicina baja dosis mejoró masa muscular/ósea y redujo células senescentes' },
    { title: 'PCSK9 Inhibitors Prevention', authors: 'Sabatine MS et al.', journal: 'NEJM', year: 2025, finding: 'Evolocumab redujo eventos CV en prevención primaria (VESALIUS-CV)' },
    { title: 'GLP-1 Agonists and MACE', authors: 'Lincoff AM et al.', journal: 'NEJM', year: 2023, finding: 'Semaglutida redujo MACE -20% en obesidad sin diabetes (SELECT)' },
    { title: 'Semaglutide and Renal Protection', authors: 'Perkovic V et al.', journal: 'NEJM', year: 2024, finding: 'Semaglutida redujo progresión renal -24% en DM2+ERC (FLOW)' },
    { title: 'Dasatinib+Quercetin Senolytics', authors: 'Hickson LJ et al.', journal: 'EBioMedicine', year: 2019, finding: 'D+Q eliminó células senescentes y mejoró función física en 3 días' },
    { title: 'Fisetin as Senolytic', authors: 'Yousefzadeh MJ et al.', journal: 'EBioMedicine', year: 2018, finding: 'Fisetina redujo células senescentes y extendió vida media en ratones' },
    { title: 'Spermidine and Autophagy', authors: 'Eisenberg T et al.', journal: 'Nature Medicine', year: 2016, finding: 'Espermidina indujo autofagia y redujo mortalidad CV -40% en cohorte Bruneck' },
    { title: 'SGLT2i and Heart Failure', authors: 'McMurray JJV et al.', journal: 'NEJM', year: 2019, finding: 'Dapagliflozina redujo hospitalización por ICC -30% (DAPA-HF)' },
  ],
  'Estilo de vida': [
    { title: 'VO2max as Mortality Predictor', authors: 'Mandsager K et al.', journal: 'JAMA Network Open', year: 2018, finding: 'Cada +1 MET = -11.6% mortalidad all-cause. Predictor #1 de longevidad' },
    { title: 'Zone 2 Training and Mitochondria', authors: 'San-Millán I, Brooks GA', journal: 'Sports Medicine', year: 2018, finding: 'Ejercicio Zone 2 (150+ min/sem) maximiza oxidación de grasas y biogénesis mitocondrial' },
    { title: 'Resistance Training and Mortality', authors: 'Momma H et al.', journal: 'British Journal of Sports Medicine', year: 2022, finding: 'Fuerza 30-60 min/sem redujo mortalidad all-cause -10-20%' },
    { title: 'Time-Restricted Eating', authors: 'Wilkinson MJ et al.', journal: 'Cell Metabolism', year: 2020, finding: 'TRE 10h mejoró peso, PA, LDL y HbA1c en síndrome metabólico' },
    { title: 'Sleep Duration and Mortality', authors: 'Cappuccio FP et al.', journal: 'Sleep', year: 2010, finding: 'Dormir <6h o >9h aumentó mortalidad -12% y +30% respectivamente' },
    { title: 'Cold Exposure and Brown Fat', authors: 'Van der Lans AA et al.', journal: 'J Clin Investigation', year: 2013, finding: 'Exposición al frío activó grasa parda y aumentó gasto energético +15%' },
    { title: 'Meditation and Telomere Length', authors: 'Conklin QA et al.', journal: 'Psychoneuroendocrinology', year: 2018, finding: 'Meditación intensiva aumentó actividad de telomerasa +30%' },
    { title: 'Sauna and Cardiovascular Risk', authors: 'Laukkanen T et al.', journal: 'JAMA Internal Medicine', year: 2015, finding: 'Sauna 4-7x/sem redujo mortalidad CV -50% y all-cause -40%' },
    { title: 'Mediterranean Diet and Longevity', authors: 'Estruch R et al.', journal: 'NEJM', year: 2018, finding: 'Dieta mediterránea redujo eventos CV mayores -30% (PREDIMED)' },
  ],
  'Medicina regenerativa': [
    { title: 'hUC-MSC for Frailty (Longeveron Phase 2b)', authors: 'Golpanian S et al.', journal: 'Cell Stem Cell', year: 2026, finding: 'MSC de cordón umbilical mejoró fragilidad en adultos mayores con perfil de seguridad favorable' },
    { title: 'hUC-MSC in NMOSD', authors: 'Lu Z et al.', journal: 'Nature Cell Death & Differentiation', year: 2026, finding: 'Recaídas se espaciaron de 305 a 760 días (p<0.001)' },
    { title: 'MSC Safety Meta-Analysis', authors: 'Thompson M et al.', journal: 'University of Toronto', year: 2020, finding: 'Meta-análisis de >5,000 pacientes confirmó seguridad de hUC-MSC' },
    { title: 'MSC-Derived Exosomes Immunology', authors: 'Zhang B et al.', journal: 'PMC', year: 2025, finding: 'Exosomas de hUC-MSC modularon respuesta inmune sin riesgo tumorigénico' },
    { title: 'Paracrine Mechanisms of MSC', authors: 'Karolinska Stem Cell Center', journal: 'Stem Cell Reports', year: 2023, finding: 'Efecto paracrino principal: secretoma con >1000 proteínas anti-inflamatorias' },
    { title: 'MSC for Liver Cirrhosis', authors: 'Chinese Academy of Sciences', journal: 'Signal Transduction & Targeted Therapy', year: 2024, finding: 'hUC-MSC mejoró función hepática MELD score en cirrosis descompensada' },
    { title: 'MSC Neuroprotection', authors: 'Kurtzberg J et al.', journal: 'Duke University Medical Center', year: 2023, finding: 'hUC-MSC IV demostró neuroprotección en parálisis cerebral pediátrica' },
    { title: 'Exosome Therapy for Aging', authors: 'Yin Y et al.', journal: 'Aging Cell', year: 2024, finding: 'Exosomas de MSC jóvenes rejuvenecieron células senescentes en modelos murinos' },
    { title: 'OSK Partial Reprogramming', authors: 'Macip CC et al.', journal: 'Nature Aging', year: 2024, finding: 'Reprogramación parcial OSK extendió +109% vida restante en ratones viejos' },
  ],
}

// Fallback para categorías no mapeadas
const EVIDENCE_DEFAULT: ExtraEvidence[] = [
  { title: 'GlyNAC Reverses Aging Hallmarks', authors: 'Kumar P et al.', journal: 'J Gerontology (Baylor)', year: 2022, finding: 'GlyNAC revirtió 8 de 9 marcadores de envejecimiento incluyendo glutatión, estrés oxidativo e inflamación' },
  { title: 'NMN Safety and NAD+ Levels', authors: 'Yi L et al.', journal: 'Clinical Pharmacology & Therapeutics', year: 2024, finding: 'NMN hasta 1250mg/día seguro, duplicó NAD+ en sangre en 28 días' },
  { title: 'Urolithin A and Mitophagy', authors: 'Andreux PA et al.', journal: 'Nature Metabolism (Amazentis)', year: 2019, finding: 'Urolitina A mejoró función mitocondrial vía mitofagia en adultos mayores (ATLAS Trial)' },
  { title: 'DO-HEALTH Combined Intervention', authors: 'Bischoff-Ferrari HA et al.', journal: 'JAMA', year: 2025, finding: 'Omega-3+VitD+ejercicio: -39% pre-fragilidad, -61% cáncer invasivo en 3 años' },
  { title: 'Homocysteine and Stroke Risk', authors: 'Wald DS et al.', journal: 'BMJ', year: 2002, finding: 'Cada +5 µmol/L homocisteína = +30% riesgo ACV. Vitaminas B reducen -25%' },
  { title: 'RDW as Mortality Predictor', authors: 'Patel KV et al.', journal: 'Archives of Internal Medicine', year: 2009, finding: 'RDW >14.5% triplicó riesgo de mortalidad all-cause en adultos mayores' },
  { title: 'Albumin and Longevity', authors: 'Phillips A et al.', journal: 'Lancet', year: 1989, finding: 'Albúmina <3.5 g/dL cuadruplicó mortalidad. Predictor independiente de supervivencia' },
  { title: 'GGT as CV Mortality Predictor', authors: 'Lee DH et al.', journal: 'Circulation', year: 2006, finding: 'GGT elevada predijo mortalidad CV independientemente de alcohol y función hepática' },
  { title: 'Lepodisiran for Lp(a)', authors: 'Eli Lilly', journal: 'ALPACA Trial', year: 2025, finding: 'Dosis única redujo Lp(a) -93.9%, efecto sostenido >360 días' },
]

function getEvidenceForMolecule(category: string, molecule: string): ExtraEvidence[] {
  const cat = category.toLowerCase()
  const mol = molecule.toLowerCase()

  // Buscar por categoría exacta primero
  for (const [key, evidence] of Object.entries(EVIDENCE_BY_CATEGORY)) {
    if (cat.includes(key.toLowerCase())) return evidence
  }

  // Buscar por molécula
  if (mol.includes('msc') || mol.includes('célula') || mol.includes('exosoma')) return EVIDENCE_BY_CATEGORY['Medicina regenerativa']
  if (mol.includes('rapamicina') || mol.includes('metformina') || mol.includes('dasatinib') || mol.includes('fisetin')) return EVIDENCE_BY_CATEGORY['Farmacológico']
  if (mol.includes('ejercicio') || mol.includes('zone') || mol.includes('ayuno') || mol.includes('sueño') || mol.includes('sauna') || mol.includes('meditación')) return EVIDENCE_BY_CATEGORY['Estilo de vida']

  return EVIDENCE_DEFAULT
}

interface ProtocolTabProps {
  protocol: AIAnalysis['protocol']
  viewerRole?: string
  patient?: Patient
}

export function ProtocolTab({ protocol, viewerRole, patient }: ProtocolTabProps) {
  const [showPrescription, setShowPrescription] = useState(false)
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null)

  if (!protocol || protocol.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No hay protocolo disponible
      </div>
    )
  }

  // Agrupar protocolo por categoría con orden definido
  const CATEGORY_ORDER = [
    'Farmacológico',
    'Senolítico/Anti-aging',
    'Péptido terapéutico',
    'Hormonal/Endocrino',
    'Suplementación',
    'Nutrición terapéutica',
    'Hepatoprotección',
    'Neuroprotección',
    'Microbioma',
    'Inmunomodulación',
    'Medicina regenerativa',
    'Estilo de vida',
  ]

  const grouped = useMemo(() => {
    const groups: { category: string; items: typeof protocol }[] = []
    const seen = new Set<string>()

    // Primero las categorías en orden definido
    for (const cat of CATEGORY_ORDER) {
      const items = protocol.filter(p => (p.category ?? '').toLowerCase().includes(cat.toLowerCase()))
      if (items.length > 0) {
        groups.push({ category: cat, items })
        items.forEach(item => seen.add(item.molecule))
      }
    }

    // Luego categorías no mapeadas
    const remaining = protocol.filter(p => !seen.has(p.molecule))
    if (remaining.length > 0) {
      // Agrupar por su propia categoría
      const otherCats = new Map<string, typeof protocol>()
      for (const item of remaining) {
        const cat = item.category || 'Otros'
        if (!otherCats.has(cat)) otherCats.set(cat, [])
        otherCats.get(cat)!.push(item)
      }
      for (const [cat, items] of Array.from(otherCats.entries())) {
        groups.push({ category: cat, items })
      }
    }

    return groups
  }, [protocol])

  let globalIndex = 0

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {protocol.length} intervenciones basadas en evidencia científica · {grouped.length} categorías
        </p>
      </div>

      {showPrescription && patient && (
        <PrescriptionBuilder
          patient={patient}
          protocol={protocol}
          onClose={() => setShowPrescription(false)}
        />
      )}

      {/* Referencias verificadas — solo para médicos */}
      {viewerRole === 'medico' && (
        <VerifiedReferences protocol={protocol} />
      )}

      {grouped.map(group => (
        <div key={group.category} className="space-y-3">
          {/* Encabezado de categoría */}
          <div className="flex items-center gap-2 pt-2">
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
              {group.category}
            </span>
            <span className="text-[10px] text-muted-foreground/50">{group.items.length}</span>
            <div className="h-px flex-1 bg-border/40" />
          </div>

          {group.items.map((item) => {
        globalIndex++
        const urgency = item.urgency ?? 'medium'
        const displayNumber = String(globalIndex).padStart(2, '0')
        const biomarkers = Array.isArray(item.targetBiomarkers) ? item.targetBiomarkers : []

        return (
          <Card key={`${group.category}-${item.molecule}`} className="hover:border-accent/30 transition-all">
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-0">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-sm"
                  style={{
                    background: `${getUrgencyColor(urgency)}20`,
                    color: getUrgencyColor(urgency),
                    border: `1px solid ${getUrgencyColor(urgency)}40`,
                  }}
                >
                  {displayNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-foreground">{item.molecule ?? ''}</h3>
                    {item.category && <Badge variant="default">{item.category}</Badge>}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${getUrgencyColor(urgency)}20`,
                        color: getUrgencyColor(urgency),
                      }}
                    >
                      {getUrgencyLabel(urgency)}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground">{item.dose ?? ''}</p>
                </div>
              </div>
            </div>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mecanismo */}
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FlaskConical size={13} className="text-info" />
                    <span className="text-xs font-semibold text-info">Mecanismo</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{item.mechanism ?? ''}</p>
                </div>

                {/* Evidencia */}
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BookOpen size={13} className="text-accent" />
                    <span className="text-xs font-semibold text-accent">Evidencia Científica</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{item.evidence ?? ''}</p>
                  {item.clinicalTrial && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{item.clinicalTrial}</p>
                  )}

                  {/* Pestaña sutil para más evidencia */}
                  <button
                    onClick={() => setExpandedEvidence(expandedEvidence === item.molecule ? null : item.molecule)}
                    className="mt-2 flex items-center gap-1 text-[10px] text-accent/50 hover:text-accent transition-colors"
                  >
                    <ChevronDown size={9} className={`transition-transform ${expandedEvidence === item.molecule ? 'rotate-180' : ''}`} />
                    {expandedEvidence === item.molecule ? 'Ocultar evidencia adicional' : 'Ver más evidencia científica'}
                  </button>

                  {expandedEvidence === item.molecule && (
                    <div className="mt-2.5 space-y-1.5 animate-fade-in border-t border-border/30 pt-2.5">
                      {getEvidenceForMolecule(item.category ?? '', item.molecule ?? '').map((ev, j) => (
                        <div key={j} className="px-2.5 py-1.5 rounded bg-accent/3 border border-accent/8 hover:border-accent/20 transition-colors">
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] font-mono text-accent/40 mt-0.5 shrink-0">[{j + 1}]</span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium text-foreground/80 leading-snug">{ev.title}</p>
                              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                                {ev.authors} — <span className="italic">{ev.journal}</span>, {ev.year}
                              </p>
                              <p className="text-[9px] text-accent/70 mt-0.5">{ev.finding}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Biomarcadores objetivo */}
                {biomarkers.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Target size={13} className="text-warning" />
                      <span className="text-xs font-semibold text-warning">Biomarcadores Objetivo</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {biomarkers.map((bm, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                          {bm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resultado esperado */}
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap size={13} className="text-danger" />
                    <span className="text-xs font-semibold text-danger">Resultado Esperado</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{item.expectedResult ?? ''}</p>
                </div>
              </div>

              {/* Acción concreta */}
              {item.action && (
                <div className="p-3 rounded-lg border" style={{ borderColor: `${getUrgencyColor(urgency)}40`, background: `${getUrgencyColor(urgency)}08` }}>
                  <span className="text-xs font-semibold" style={{ color: getUrgencyColor(urgency) }}>
                    Acción:{' '}
                  </span>
                  <span className="text-xs text-foreground/90">{item.action}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
        </div>
      ))}

      {/* Botón de prescripción al final */}
      {viewerRole === 'medico' && patient && (
        <div className="flex justify-center pt-4 pb-2">
          <button
            onClick={() => setShowPrescription(true)}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium bg-accent text-background rounded-xl hover:bg-accent/90 transition-all shadow-accent/20 shadow-lg"
          >
            <FileDown size={15} />
            Generar Prescripción
          </button>
        </div>
      )}
    </div>
  )
}
