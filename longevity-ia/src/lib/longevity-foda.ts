/**
 * LONGEVITY IA — FODA Médica Computada v2.0
 *
 * FODA determinista basado en scores de biomarcadores.
 * Claude solo redacta la narrativa, no decide qué incluir.
 *
 * Evidencia:
 * - Framingham Heart Study (riesgo CV por biomarcador)
 * - SCORE2 (European Society of Cardiology 2021)
 * - GBD Study 2019 (carga global de enfermedad)
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

import type { AllScoresResult, ScoredBiomarker } from './longevity-scoring'

// ── Tipos ────────────────────────────────────────────────────────

export interface FODAItem {
  label: string
  detail: string
  evidence: string
  expectedImpact?: string   // solo fortalezas y oportunidades
  probability?: string      // solo debilidades y amenazas
  biomarker: string
  value: number
  score: number
}

export interface FODAResult {
  strengths: FODAItem[]      // 4 exactas
  weaknesses: FODAItem[]     // 3 exactas
  opportunities: FODAItem[]  // 4 exactas
  threats: FODAItem[]        // 3 exactas
}

// ── Base de conocimiento por biomarcador ──────────────────────────

interface BiomarkerKnowledge {
  nameES: string
  unit: string
  // Cuando es fortaleza (score alto)
  strengthLabel: string
  strengthDetail: string
  strengthEvidence: string
  strengthImpact: string
  // Cuando es debilidad (score bajo)
  weaknessLabel: string
  weaknessDetail: string
  weaknessEvidence: string
  weaknessProbability: (score: number) => string
  // Intervención principal (oportunidad)
  opportunityLabel: string
  opportunityDetail: string
  opportunityEvidence: string
  opportunityImpact: string
  // Enfermedad asociada (amenaza)
  threatDisease: string
  threatDetail: string
  threatEvidence: string
  threatProbability: (score: number, age: number) => string
  // Peso de mortalidad (para ordenar)
  mortalityWeight: number
}

const KNOWLEDGE: Record<string, BiomarkerKnowledge> = {
  ldl: {
    nameES: 'LDL', unit: 'mg/dL', mortalityWeight: 0.95,
    strengthLabel: 'LDL en rango de longevidad',
    strengthDetail: 'Nivel de LDL que minimiza aterogénesis acumulada a lo largo de la vida',
    strengthEvidence: 'Ference, JAMA 2022: LDL <70 = protección CV máxima',
    strengthImpact: 'Reducción de riesgo CV acumulado >50% vs LDL >130',
    weaknessLabel: 'LDL elevado',
    weaknessDetail: 'Cada 10 mg/dL de exceso sobre 70 aumenta 22% el riesgo CV acumulado',
    weaknessEvidence: 'Ference, JAMA 2022',
    weaknessProbability: (s) => s < 30 ? 'Alta' : s < 50 ? 'Media' : 'Baja',
    opportunityLabel: 'Reducción de LDL con berberina/omega-3',
    opportunityDetail: 'Berberina 500mg 3x/día reduce LDL -20% en 8 semanas, equivalente a estatina baja',
    opportunityEvidence: 'Liang, Endocr Rev 2022',
    opportunityImpact: 'LDL -20-30% en 2-3 meses',
    threatDisease: 'Aterosclerosis y evento cardiovascular mayor',
    threatDetail: 'Acumulación de placas ateroscleróticas con riesgo de infarto o ACV',
    threatEvidence: 'Pencina, Circulation 2019: LDL >130 sostenido = evento CV en 5-15 años',
    threatProbability: (s, a) => (s < 30 && a > 50) ? 'Alta' : s < 50 ? 'Media' : 'Baja',
  },
  hdl: {
    nameES: 'HDL', unit: 'mg/dL', mortalityWeight: 0.85,
    strengthLabel: 'HDL protector activo',
    strengthDetail: 'Transporte reverso de colesterol funcional, protección endotelial',
    strengthEvidence: 'Barter, NEJM 2007: cada +1 mg/dL HDL = -2% riesgo CV',
    strengthImpact: 'Protección cardiovascular sostenida',
    weaknessLabel: 'HDL bajo',
    weaknessDetail: 'Capacidad reducida de transporte reverso de colesterol',
    weaknessEvidence: 'Barter, NEJM 2007',
    weaknessProbability: (s) => s < 30 ? 'Alta' : 'Media',
    opportunityLabel: 'Mejorar HDL con ejercicio aeróbico',
    opportunityDetail: 'Ejercicio Zone 2 150+ min/semana aumenta HDL +5-10 mg/dL en 3 meses',
    opportunityEvidence: 'Kodama, Arch Intern Med 2007',
    opportunityImpact: 'HDL +8-15% en 12 semanas',
    threatDisease: 'Enfermedad coronaria prematura',
    threatDetail: 'HDL bajo es factor de riesgo independiente para enfermedad coronaria',
    threatEvidence: 'Gordon, Am J Med 1977 (Framingham)',
    threatProbability: (s, a) => (s < 40 && a > 45) ? 'Alta' : 'Media',
  },
  crp: {
    nameES: 'PCR ultrasensible', unit: 'mg/L', mortalityWeight: 0.92,
    strengthLabel: 'Inflammaging controlado',
    strengthDetail: 'PCR en nivel óptimo indica mínima inflamación crónica de bajo grado',
    strengthEvidence: 'Ridker, NEJM 2017 (CANTOS): PCR <0.5 = bajo riesgo inflamatorio',
    strengthImpact: 'Envejecimiento biológico desacelerado',
    weaknessLabel: 'Inflamación crónica activa',
    weaknessDetail: 'Inflammaging acelera todos los procesos de envejecimiento vía SASP',
    weaknessEvidence: 'Ridker, NEJM 2017 (CANTOS)',
    weaknessProbability: (s) => s < 25 ? 'Alta' : s < 50 ? 'Media' : 'Baja',
    opportunityLabel: 'Reducción de PCR con GlyNAC/curcumina',
    opportunityDetail: 'GlyNAC revierte 8/9 marcadores de envejecimiento incluyendo PCR',
    opportunityEvidence: 'Kumar, Baylor, J Gerontology 2022',
    opportunityImpact: 'PCR -50% en 12 semanas',
    threatDisease: 'Envejecimiento acelerado multisistémico',
    threatDetail: 'Inflammaging crónico vinculado a enfermedad CV, neurodegeneración y cáncer',
    threatEvidence: 'Franceschi, Nat Rev Endocrinol 2018',
    threatProbability: (s, a) => (s < 30 && a > 40) ? 'Alta' : 'Media',
  },
  glucose: {
    nameES: 'Glucosa', unit: 'mg/dL', mortalityWeight: 0.88,
    strengthLabel: 'Control glucémico óptimo',
    strengthDetail: 'Glucosa en rango de longevidad, sin resistencia a insulina',
    strengthEvidence: 'DECODE, Lancet 1999: glucosa <88 = riesgo CV mínimo',
    strengthImpact: 'Riesgo de DM2 minimizado',
    weaknessLabel: 'Glucosa elevada',
    weaknessDetail: 'Glicación proteica acelerada, estrés oxidativo, resistencia a insulina',
    weaknessEvidence: 'DECODE Study Group, Lancet 1999',
    weaknessProbability: (s) => s < 30 ? 'Alta' : s < 50 ? 'Media' : 'Baja',
    opportunityLabel: 'Control glucémico con berberina/ejercicio',
    opportunityDetail: 'Berberina + ejercicio aeróbico reducen glucosa -15-20% en 8 semanas',
    opportunityEvidence: 'Liang, Endocr Rev 2022; Mandsager JAMA 2018',
    opportunityImpact: 'Glucosa -15 mg/dL en 2 meses',
    threatDisease: 'Diabetes tipo 2 y complicaciones microvasculares',
    threatDetail: 'Progresión de pre-diabetes a DM2 con nefropatía, retinopatía y neuropatía',
    threatEvidence: 'Tabák, Lancet 2012: pre-diabetes → DM2 en 5-10 años sin intervención',
    threatProbability: (s, a) => (s < 30 && a > 40) ? 'Alta' : s < 50 ? 'Media' : 'Baja',
  },
  rdw: {
    nameES: 'RDW', unit: '%', mortalityWeight: 0.90,
    strengthLabel: 'Variabilidad eritrocitaria óptima',
    strengthDetail: 'RDW bajo indica eritropoyesis eficiente y buen estado nutricional',
    strengthEvidence: 'Patel, Arch Intern Med 2009: RDW <13% = mortalidad mínima',
    strengthImpact: 'Predictor de longevidad favorable',
    weaknessLabel: 'RDW elevado',
    weaknessDetail: 'Anisocitosis eritrocitaria asociada a mortalidad all-cause aumentada',
    weaknessEvidence: 'Patel, Arch Intern Med 2009: RDW >14.5% = +3x mortalidad',
    weaknessProbability: (s) => s < 30 ? 'Alta' : 'Media',
    opportunityLabel: 'Optimizar nutrientes hematológicos',
    opportunityDetail: 'Hierro, B12, folato y vitamina C optimizados reducen RDW',
    opportunityEvidence: 'Lippi, Clin Chem Lab Med 2014',
    opportunityImpact: 'RDW -0.5-1.0% en 3-6 meses',
    threatDisease: 'Mortalidad cardiovascular y all-cause aumentada',
    threatDetail: 'RDW elevado es predictor independiente más fuerte que muchos biomarcadores tradicionales',
    threatEvidence: 'Patel, Arch Intern Med 2009',
    threatProbability: (s, a) => (s < 30 && a > 55) ? 'Alta' : 'Media',
  },
  hemoglobin: {
    nameES: 'Hemoglobina', unit: 'g/dL', mortalityWeight: 0.82,
    strengthLabel: 'Hemoglobina óptima',
    strengthDetail: 'Capacidad de transporte de oxígeno en rango ideal',
    strengthEvidence: 'Zakai, Blood 2005',
    strengthImpact: 'Oxigenación tisular eficiente',
    weaknessLabel: 'Hemoglobina alterada',
    weaknessDetail: 'Anemia o policitemia con impacto en oxigenación tisular',
    weaknessEvidence: 'Zakai, Blood 2005: Hb baja = +2x mortalidad en mayores',
    weaknessProbability: (s) => s < 30 ? 'Alta' : 'Media',
    opportunityLabel: 'Corrección de anemia',
    opportunityDetail: 'Suplementación dirigida según causa (hierro, B12, folato, EPO)',
    opportunityEvidence: 'WHO Guidelines on Anaemia 2023',
    opportunityImpact: 'Hb +1-2 g/dL en 4-8 semanas',
    threatDisease: 'Insuficiencia cardíaca por anemia crónica',
    threatDetail: 'Anemia crónica sobrecarga al corazón por aumento de gasto cardíaco compensatorio',
    threatEvidence: 'Anand, Circulation 2004',
    threatProbability: (s, a) => (s < 30 && a > 60) ? 'Alta' : 'Baja',
  },
  vitaminD: {
    nameES: 'Vitamina D', unit: 'ng/mL', mortalityWeight: 0.75,
    strengthLabel: 'Vitamina D en rango de longevidad',
    strengthDetail: 'Nivel que optimiza función inmune, ósea y reduce mortalidad por cáncer',
    strengthEvidence: 'Manson, VITAL Trial, NEJM 2022: >40 ng/mL reduce mortalidad cáncer -25%',
    strengthImpact: 'Mortalidad por cáncer -25%, infecciones -13%',
    weaknessLabel: 'Vitamina D deficiente',
    weaknessDetail: 'Deficiencia asociada a inmunodepresión, osteoporosis y riesgo oncológico',
    weaknessEvidence: 'Melamed, Arch Intern Med 2008',
    weaknessProbability: (s) => s < 30 ? 'Alta' : 'Media',
    opportunityLabel: 'Suplementación D3 + K2',
    opportunityDetail: 'Vitamina D3 2000-5000 UI/día + K2 MK-7 alcanza niveles óptimos en 8-12 semanas',
    opportunityEvidence: 'Manson, VITAL Trial, NEJM 2022',
    opportunityImpact: 'VitD +20-40 ng/mL en 3 meses',
    threatDisease: 'Osteoporosis y fracturas',
    threatDetail: 'Deficiencia crónica de VitD causa desmineralización ósea progresiva',
    threatEvidence: 'Bischoff-Ferrari, JAMA 2005',
    threatProbability: (s, a) => (s < 30 && a > 50) ? 'Alta' : 'Media',
  },
  gfr: {
    nameES: 'GFR (Tasa filtración glomerular)', unit: 'mL/min', mortalityWeight: 0.88,
    strengthLabel: 'Función renal preservada',
    strengthDetail: 'GFR >90 indica filtración glomerular eficiente sin deterioro',
    strengthEvidence: 'Go, NEJM 2004',
    strengthImpact: 'Riesgo CV renal minimizado',
    weaknessLabel: 'Función renal deteriorada',
    weaknessDetail: 'GFR reducida indica enfermedad renal crónica con riesgo CV multiplicado',
    weaknessEvidence: 'Go, NEJM 2004: GFR <60 = +2-5x riesgo CV',
    weaknessProbability: (s) => s < 25 ? 'Alta' : s < 50 ? 'Media' : 'Baja',
    opportunityLabel: 'Nefroprotección con SGLT2i/hidratación',
    opportunityDetail: 'SGLT2i (dapagliflozina) reducen progresión de ERC -39% (DAPA-CKD)',
    opportunityEvidence: 'Heerspink, NEJM 2020 (DAPA-CKD)',
    opportunityImpact: 'Estabilización de GFR en 6-12 meses',
    threatDisease: 'Enfermedad renal crónica terminal',
    threatDetail: 'Progresión a diálisis si GFR continúa descendiendo sin intervención',
    threatEvidence: 'Go, NEJM 2004; KDIGO 2024 Guidelines',
    threatProbability: (s, a) => (s < 25 && a > 50) ? 'Alta' : s < 40 ? 'Media' : 'Baja',
  },
  albumin: {
    nameES: 'Albumina', unit: 'g/dL', mortalityWeight: 0.86,
    strengthLabel: 'Albumina óptima',
    strengthDetail: 'Estado nutricional excelente y función hepática sintética preservada',
    strengthEvidence: 'Phillips, Lancet 1989: albumina >4.5 = longevidad favorable',
    strengthImpact: 'Predictor independiente de supervivencia',
    weaknessLabel: 'Albumina baja',
    weaknessDetail: 'Desnutrición proteica o disfunción hepática sintética',
    weaknessEvidence: 'Phillips, Lancet 1989: albumina <3.5 = +4x mortalidad',
    weaknessProbability: (s) => s < 25 ? 'Alta' : 'Media',
    opportunityLabel: 'Optimización nutricional proteica',
    opportunityDetail: 'Proteína 1.2-1.6 g/kg/día + aminoácidos esenciales restauran albumina',
    opportunityEvidence: 'Bauer, JAMDA 2013 (PROT-AGE)',
    opportunityImpact: 'Albumina +0.3-0.5 g/dL en 4-8 semanas',
    threatDisease: 'Fragilidad y sarcopenia',
    threatDetail: 'Albumina baja predice pérdida muscular, caídas y mortalidad en mayores',
    threatEvidence: 'Cruz-Jentoft, EWGSOP2, Age Ageing 2019',
    threatProbability: (s, a) => (s < 30 && a > 60) ? 'Alta' : 'Baja',
  },
  ggt: {
    nameES: 'GGT', unit: 'U/L', mortalityWeight: 0.78,
    strengthLabel: 'GGT en rango de longevidad',
    strengthDetail: 'Estrés oxidativo hepático mínimo, función metabólica óptima',
    strengthEvidence: 'Lee, Circulation 2006: GGT <20 = riesgo CV mínimo',
    strengthImpact: 'Mortalidad CV significativamente reducida',
    weaknessLabel: 'GGT elevada',
    weaknessDetail: 'Estrés oxidativo hepático y riesgo metabólico aumentado',
    weaknessEvidence: 'Lee, Circulation 2006: GGT predice mortalidad CV independientemente',
    weaknessProbability: (s) => s < 30 ? 'Alta' : 'Media',
    opportunityLabel: 'Hepatoprotección con NAC/silimarina',
    opportunityDetail: 'NAC 600mg 2x/día + silimarina 420mg restauran glutatión hepático',
    opportunityEvidence: 'Mokhtari, J Clin Pharm Ther 2017',
    opportunityImpact: 'GGT -30-50% en 8-12 semanas',
    threatDisease: 'Esteatosis hepática y síndrome metabólico',
    threatDetail: 'GGT elevada predice progresión a hígado graso y resistencia a insulina',
    threatEvidence: 'Lee, Hepatology 2008',
    threatProbability: (s, a) => (s < 30 && a > 40) ? 'Media' : 'Baja',
  },
  homocysteine: {
    nameES: 'Homocisteína', unit: 'µmol/L', mortalityWeight: 0.80,
    strengthLabel: 'Homocisteína óptima',
    strengthDetail: 'Ciclo de metilación eficiente, riesgo CV y neurológico minimizado',
    strengthEvidence: 'Wald, BMJ 2002: homocisteína <8 = riesgo CV -25%',
    strengthImpact: 'Protección cardiovascular y neurológica',
    weaknessLabel: 'Homocisteína elevada',
    weaknessDetail: 'Hiperhomocisteinemia daña endotelio y aumenta riesgo de ACV y demencia',
    weaknessEvidence: 'Wald, BMJ 2002: cada +5 µmol/L = +30% riesgo ACV',
    weaknessProbability: (s) => s < 30 ? 'Alta' : 'Media',
    opportunityLabel: 'Reducción con complejo B metilado',
    opportunityDetail: '5-MTHF + P5P + metilcobalamina reducen homocisteína -25-30%',
    opportunityEvidence: 'Homocysteine Lowering Trialists, BMJ 2005',
    opportunityImpact: 'Homocisteína -3-5 µmol/L en 8 semanas',
    threatDisease: 'ACV y deterioro cognitivo',
    threatDetail: 'Homocisteína >15 = +3x riesgo de ACV isquémico y demencia vascular',
    threatEvidence: 'Seshadri, NEJM 2002',
    threatProbability: (s, a) => (s < 25 && a > 55) ? 'Alta' : 'Media',
  },
}

// ── Función principal ────────────────────────────────────────────

/**
 * Computa el FODA médico de forma determinista a partir de los scores.
 * Retorna exactamente 4 fortalezas, 3 debilidades, 4 oportunidades, 3 amenazas.
 */
export function computeFODA(
  scores: AllScoresResult,
  patientAge: number
): FODAResult {
  // Recopilar todos los biomarcadores scored de todos los sistemas
  const allBiomarkers: { key: string; scored: ScoredBiomarker }[] = []

  for (const system of Object.values(scores.systems)) {
    if (!system) continue
    for (const [key, scored] of Object.entries(system.biomarkers)) {
      allBiomarkers.push({ key, scored })
    }
  }

  // Separar en fuertes (score >= 80) y débiles (score < 55)
  const strong = allBiomarkers
    .filter(b => b.scored.score >= 80 && KNOWLEDGE[b.key])
    .sort((a, b) => (KNOWLEDGE[b.key]?.mortalityWeight ?? 0) - (KNOWLEDGE[a.key]?.mortalityWeight ?? 0))

  const weak = allBiomarkers
    .filter(b => b.scored.score < 55 && KNOWLEDGE[b.key])
    .sort((a, b) => (KNOWLEDGE[b.key]?.mortalityWeight ?? 0) - (KNOWLEDGE[a.key]?.mortalityWeight ?? 0))

  // Construir fortalezas (top 4 por peso de mortalidad)
  const strengths: FODAItem[] = strong.slice(0, 4).map(b => {
    const k = KNOWLEDGE[b.key]!
    return {
      label: k.strengthLabel,
      detail: k.strengthDetail,
      evidence: k.strengthEvidence,
      expectedImpact: k.strengthImpact,
      biomarker: k.nameES,
      value: b.scored.value,
      score: b.scored.score,
    }
  })

  // Construir debilidades (top 3 por peso de mortalidad)
  const weaknesses: FODAItem[] = weak.slice(0, 3).map(b => {
    const k = KNOWLEDGE[b.key]!
    return {
      label: k.weaknessLabel,
      detail: `${k.weaknessDetail} (${k.nameES}: ${b.scored.value} ${k.unit})`,
      evidence: k.weaknessEvidence,
      probability: k.weaknessProbability(b.scored.score),
      biomarker: k.nameES,
      value: b.scored.value,
      score: b.scored.score,
    }
  })

  // Construir oportunidades (top 4 — una por cada debilidad + una extra)
  const opportunityKeys = new Set<string>()
  const opportunities: FODAItem[] = weak.slice(0, 4).map(b => {
    const k = KNOWLEDGE[b.key]!
    opportunityKeys.add(b.key)
    return {
      label: k.opportunityLabel,
      detail: k.opportunityDetail,
      evidence: k.opportunityEvidence,
      expectedImpact: k.opportunityImpact,
      biomarker: k.nameES,
      value: b.scored.value,
      score: b.scored.score,
    }
  })

  // Construir amenazas (top 3 — derivadas de debilidades)
  const threats: FODAItem[] = weak.slice(0, 3).map(b => {
    const k = KNOWLEDGE[b.key]!
    return {
      label: k.threatDisease,
      detail: k.threatDetail,
      evidence: k.threatEvidence,
      probability: k.threatProbability(b.scored.score, patientAge),
      biomarker: k.nameES,
      value: b.scored.value,
      score: b.scored.score,
    }
  })

  // Rellenar si no hay suficientes (mínimo requerido)
  while (strengths.length < 4) strengths.push(genericStrength(scores.overallScore))
  while (weaknesses.length < 3) weaknesses.push(genericWeakness())
  while (opportunities.length < 4) opportunities.push(genericOpportunity())
  while (threats.length < 3) threats.push(genericThreat(patientAge))

  return { strengths, weaknesses, opportunities, threats }
}

// ── Genéricos de relleno ─────────────────────────────────────────

function genericStrength(overallScore: number): FODAItem {
  return {
    label: 'Score general favorable',
    detail: `Score general de ${overallScore}/100 indica perfil de biomarcadores mayoritariamente en rango`,
    evidence: 'Evaluación integral Longevity IA v2.0',
    expectedImpact: 'Base favorable para intervenciones de optimización',
    biomarker: 'Score general', value: overallScore, score: overallScore,
  }
}

function genericWeakness(): FODAItem {
  return {
    label: 'Datos insuficientes para evaluar',
    detail: 'Biomarcadores faltantes limitan la evaluación completa del sistema',
    evidence: 'Longevity IA v2.0 — análisis limitado por datos disponibles',
    probability: 'Indeterminada',
    biomarker: 'N/A', value: 0, score: 50,
  }
}

function genericOpportunity(): FODAItem {
  return {
    label: 'Ampliar panel de biomarcadores',
    detail: 'Solicitar ApoB, Lp(a), insulina, homocisteína y PCR ultrasensible para evaluación completa',
    evidence: 'UpToDate 2025 — panel ampliado de longevidad',
    expectedImpact: 'Evaluación 360° del perfil de envejecimiento',
    biomarker: 'Panel ampliado', value: 0, score: 50,
  }
}

function genericThreat(age: number): FODAItem {
  return {
    label: 'Envejecimiento cronológico natural',
    detail: `A los ${age} años, el deterioro fisiológico natural es un factor de riesgo independiente`,
    evidence: 'López-Otín, Hallmarks of Aging, Cell 2023',
    probability: age > 55 ? 'Alta' : age > 40 ? 'Media' : 'Baja',
    biomarker: 'Edad', value: age, score: Math.max(20, 100 - age),
  }
}
