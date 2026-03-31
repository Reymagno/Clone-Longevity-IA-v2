/**
 * LONGEVITY IA — Sistema de Scoring Matemático Determinista v2.0
 *
 * Funciones sigmoideas continuas que mapean valores de biomarcadores a scores 0-100
 * basados en curvas de mortalidad de:
 * - UK Biobank (500K participantes)
 * - NHANES III (mortalidad linked)
 * - Framingham Heart Study
 * - Copenhagen General Population Study
 * - EPIC-Norfolk
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

// ── Tipos ────────────────────────────────────────────────────────

export interface BiomarkerInput {
  value: number | null
  unit?: string
}

export interface ScoredBiomarker {
  value: number
  score: number        // 0-100 continuo
  status: 'optimal' | 'normal' | 'warning' | 'danger'
  weight: number       // peso dentro de su sistema
}

export interface SystemScoreResult {
  score: number        // 0-100
  status: 'optimal' | 'normal' | 'warning' | 'danger'
  biomarkers: Record<string, ScoredBiomarker>
  interactionAdjustment: number  // -0.15 a +0.10
}

export interface AllScoresResult {
  systems: {
    cardiovascular?: SystemScoreResult
    metabolic?: SystemScoreResult
    hepatic?: SystemScoreResult
    renal?: SystemScoreResult
    immune?: SystemScoreResult
    hematologic?: SystemScoreResult
    inflammatory?: SystemScoreResult
    vitamins?: SystemScoreResult
  }
  overallScore: number
  systemScores: Record<string, number>
}

// ── Funciones de scoring sigmoideas ──────────────────────────────

/**
 * Sigmoide descendente: score = 100 cuando x <= threshold, cae después.
 * Usada para biomarcadores donde "más bajo es mejor" (LDL, glucosa, PCR)
 *
 * score = 100 / (1 + exp(steepness * (x - midpoint)))
 */
function sigmoidDescending(x: number, optimal: number, midpoint: number, steepness: number): number {
  if (x <= optimal) return 100
  const raw = 100 / (1 + Math.exp(steepness * (x - midpoint)))
  return Math.max(0, Math.min(100, raw))
}

/**
 * Sigmoide ascendente: score = 100 cuando x >= threshold, cae antes.
 * Usada para biomarcadores donde "más alto es mejor" (HDL, albumina, GFR)
 */
function sigmoidAscending(x: number, optimal: number, midpoint: number, steepness: number): number {
  if (x >= optimal) return 100
  const raw = 100 / (1 + Math.exp(steepness * (midpoint - x)))
  return Math.max(0, Math.min(100, raw))
}

/**
 * Campana gaussiana: score máximo en el centro, cae en ambas direcciones.
 * Usada para biomarcadores con rango óptimo bilateral (TSH, ácido úrico, plaquetas)
 *
 * score = 100 * exp(-((x - center)² / (2 * sigma²)))
 */
function gaussian(x: number, center: number, sigma: number): number {
  const raw = 100 * Math.exp(-Math.pow(x - center, 2) / (2 * sigma * sigma))
  return Math.max(0, Math.min(100, raw))
}

/**
 * Rango óptimo con caída suave en ambos lados.
 * Usada para biomarcadores con rango (ej: ferritina 50-100)
 */
function optimalRange(x: number, low: number, high: number, sigmaLow: number, sigmaHigh: number): number {
  if (x >= low && x <= high) return 100
  if (x < low) return 100 * Math.exp(-Math.pow(x - low, 2) / (2 * sigmaLow * sigmaLow))
  return 100 * Math.exp(-Math.pow(x - high, 2) / (2 * sigmaHigh * sigmaHigh))
}

// ── Definiciones de scoring por biomarcador ──────────────────────
// Cada función retorna un score 0-100 continuo
// Calibrados con datos de UK Biobank, NHANES III, Framingham

export const BIOMARKER_SCORERS: Record<string, {
  score: (value: number, gender?: string) => number
  weight: (available: Record<string, boolean>) => number
  system: string
}> = {

  // ══ CARDIOVASCULAR ══

  ldl: {
    // Ference JAMA 2022: cada 10 mg/dL = +22% riesgo CV acumulado
    // Óptimo longevidad: <70 mg/dL. Punto medio caída: 130. Danger >190
    score: (v) => sigmoidDescending(v, 70, 130, 0.04),
    weight: (av) => av.apoB ? 0.10 : 0.20, // ApoB desplaza si disponible
    system: 'cardiovascular',
  },
  hdl: {
    // Barter NEJM 2007: cada +1 mg/dL HDL = -2% eventos CV
    // Óptimo: >60. Midpoint: 40. Danger <30
    score: (v) => sigmoidAscending(v, 60, 40, 0.08),
    weight: () => 0.15,
    system: 'cardiovascular',
  },
  triglycerides: {
    // Nordestgaard JAMA 2007: TG >150 riesgo independiente
    // Óptimo: <100. Midpoint: 175. Steepness gradual
    score: (v) => sigmoidDescending(v, 100, 175, 0.025),
    weight: () => 0.15,
    system: 'cardiovascular',
  },
  totalCholesterol: {
    // Rango óptimo: 150-180. Curva U: muy bajo (<130) también riesgo (ACV hemorrágico)
    score: (v) => optimalRange(v, 150, 180, 30, 50),
    weight: () => 0.10,
    system: 'cardiovascular',
  },
  apoB: {
    // Sniderman JAMA Cardiol 2022: superior a LDL. Óptimo <80 mg/dL
    score: (v) => sigmoidDescending(v, 80, 120, 0.05),
    weight: () => 0.20,
    system: 'cardiovascular',
  },
  lpa: {
    // Nordestgaard 2010: factor genético. Óptimo <30 nmol/L
    score: (v) => sigmoidDescending(v, 30, 75, 0.03),
    weight: () => 0.10,
    system: 'cardiovascular',
  },
  tgHdlRatio: {
    // McLaughlin 2005: >3.0 = partículas LDL densas. Óptimo <1.5
    score: (v) => sigmoidDescending(v, 1.5, 3.0, 1.5),
    weight: () => 0.10,
    system: 'cardiovascular',
  },

  // ══ METABÓLICO ══

  glucose: {
    // Óptimo longevidad: 70-88 mg/dL. Diabetes >126
    score: (v) => optimalRange(v, 70, 88, 15, 30),
    weight: (av) => av.hba1c ? 0.15 : 0.25,
    system: 'metabolic',
  },
  hba1c: {
    // Selvin NEJM 2010: >6.5% = +2.6x mortalidad CV. Óptimo <5.4%
    score: (v) => sigmoidDescending(v, 5.4, 6.2, 2.5),
    weight: () => 0.30,
    system: 'metabolic',
  },
  insulin: {
    // Reaven 1988: resistencia a insulina. Óptimo <5 uIU/mL
    score: (v) => sigmoidDescending(v, 5, 12, 0.3),
    weight: () => 0.20,
    system: 'metabolic',
  },
  uricAcid: {
    // Feig 2008: Óptimo 3.5-5.5. Hiperuricemia >7 riesgo vascular
    score: (v) => optimalRange(v, 3.5, 5.5, 1.5, 2.0),
    weight: () => 0.15,
    system: 'metabolic',
  },

  // ══ HEPÁTICO ══

  alt: {
    // Óptimo longevidad <25 U/L. Riesgo >60
    score: (v) => sigmoidDescending(v, 25, 50, 0.08),
    weight: () => 0.25,
    system: 'hepatic',
  },
  ast: {
    // Menos específica que ALT. Óptimo <25
    score: (v) => sigmoidDescending(v, 25, 50, 0.07),
    weight: () => 0.20,
    system: 'hepatic',
  },
  ggt: {
    // Lee Circulation 2006: predice mortalidad CV. Óptimo <20 U/L
    score: (v) => sigmoidDescending(v, 20, 50, 0.06),
    weight: () => 0.25,
    system: 'hepatic',
  },
  alkalinePhosphatase: {
    // Rango óptimo 40-100 U/L
    score: (v) => optimalRange(v, 40, 100, 20, 40),
    weight: () => 0.10,
    system: 'hepatic',
  },
  totalBilirubin: {
    // Ligeramente elevada puede ser protectora (antioxidante). Óptimo 0.3-1.0
    score: (v) => optimalRange(v, 0.3, 1.0, 0.3, 1.5),
    weight: () => 0.10,
    system: 'hepatic',
  },
  albumin: {
    // Phillips 1989: <3.5 = +4x mortalidad. Óptimo >4.5
    score: (v) => sigmoidAscending(v, 4.5, 3.8, 2.0),
    weight: () => 0.10,
    system: 'hepatic',
  },

  // ══ RENAL ══

  creatinine: {
    // Rango óptimo depende de género
    score: (v, g) => {
      const high = g === 'female' ? 0.9 : 1.2
      const low = g === 'female' ? 0.5 : 0.7
      return optimalRange(v, low, high, 0.3, 0.5)
    },
    weight: (av) => av.gfr ? 0.15 : 0.30,
    system: 'renal',
  },
  gfr: {
    // Go NEJM 2004: <60 = +2-5x riesgo CV. Óptimo >90
    score: (v) => sigmoidAscending(v, 90, 60, 0.08),
    weight: () => 0.40,
    system: 'renal',
  },
  bun: {
    // Óptimo 7-20 mg/dL
    score: (v) => optimalRange(v, 7, 20, 5, 10),
    weight: () => 0.15,
    system: 'renal',
  },
  urea: {
    // Óptimo 15-40 mg/dL
    score: (v) => optimalRange(v, 15, 40, 10, 15),
    weight: () => 0.15,
    system: 'renal',
  },

  // ══ INMUNE ══

  wbc: {
    // Rango óptimo 4.5-8.0. Muy alto o muy bajo = riesgo
    score: (v) => optimalRange(v, 4.5, 8.0, 2.0, 3.0),
    weight: () => 0.25,
    system: 'immune',
  },
  neutrophils: {
    // Porcentaje. Óptimo 45-65%
    score: (v) => optimalRange(v, 45, 65, 15, 15),
    weight: (av) => av.nlRatio ? 0.10 : 0.20,
    system: 'immune',
  },
  lymphocytes: {
    // Porcentaje. Óptimo 25-40%. Linfopenia = immunosenescence
    score: (v) => optimalRange(v, 25, 40, 10, 12),
    weight: (av) => av.nlRatio ? 0.10 : 0.25,
    system: 'immune',
  },
  nlRatio: {
    // Forget BMC 2017: >3 = inflamación sistémica. Óptimo <2
    score: (v) => sigmoidDescending(v, 2.0, 3.5, 1.2),
    weight: () => 0.30,
    system: 'immune',
  },

  // ══ HEMATOLÓGICO ══

  hemoglobin: {
    // Zakai Blood 2005. Rango depende de género
    score: (v, g) => {
      const center = g === 'female' ? 13.5 : 15.0
      return gaussian(v, center, 2.5)
    },
    weight: () => 0.25,
    system: 'hematologic',
  },
  hematocrit: {
    score: (v, g) => {
      const center = g === 'female' ? 40 : 44
      return gaussian(v, center, 6)
    },
    weight: () => 0.15,
    system: 'hematologic',
  },
  rdw: {
    // Patel 2009: >14.5% = +3x mortalidad. Óptimo <13%
    score: (v) => sigmoidDescending(v, 13.0, 14.5, 1.5),
    weight: () => 0.25,
    system: 'hematologic',
  },
  platelets: {
    // Rango óptimo 175-300 ×10³/µL
    score: (v) => optimalRange(v, 175, 300, 60, 80),
    weight: () => 0.15,
    system: 'hematologic',
  },
  mcv: {
    // Óptimo 80-96 fL
    score: (v) => optimalRange(v, 80, 96, 10, 10),
    weight: () => 0.10,
    system: 'hematologic',
  },
  mch: {
    // Óptimo 27-33 pg
    score: (v) => optimalRange(v, 27, 33, 4, 4),
    weight: () => 0.10,
    system: 'hematologic',
  },

  // ══ INFLAMATORIO ══

  crp: {
    // Ridker NEJM 2017 (CANTOS): PCR es marcador central inflammaging
    // Óptimo <0.5 mg/L. Cada reducción = menos eventos CV
    score: (v) => sigmoidDescending(v, 0.5, 3.0, 0.8),
    weight: () => 0.40,
    system: 'inflammatory',
  },
  homocysteine: {
    // >15 = +3x riesgo ACV. Óptimo <8
    score: (v) => sigmoidDescending(v, 8, 15, 0.35),
    weight: () => 0.30,
    system: 'inflammatory',
  },
  ferritin: {
    // Dual: deficiencia y exceso son malos. Depende de género
    score: (v, g) => {
      const low = g === 'female' ? 30 : 50
      const high = g === 'female' ? 80 : 100
      return optimalRange(v, low, high, 20, 60)
    },
    weight: () => 0.30,
    system: 'inflammatory',
  },

  // ══ VITAMINAS ══

  vitaminD: {
    // VITAL Trial. Óptimo longevidad 60-80 ng/mL
    score: (v) => optimalRange(v, 60, 80, 25, 20),
    weight: () => 0.35,
    system: 'vitamins',
  },
  vitaminB12: {
    // Óptimo 600-1200 pg/mL. Deficiencia subclínica <600
    score: (v) => optimalRange(v, 600, 1200, 200, 300),
    weight: () => 0.25,
    system: 'vitamins',
  },
  ferritinVit: {
    // Proxy de hierro en sistema vitaminas (mismo valor que inflamatorio pero peso diferente)
    score: (v, g) => {
      const low = g === 'female' ? 30 : 50
      const high = g === 'female' ? 80 : 100
      return optimalRange(v, low, high, 20, 60)
    },
    weight: () => 0.20,
    system: 'vitamins',
  },
  folicAcid: {
    // Óptimo >10 ng/mL
    score: (v) => sigmoidAscending(v, 10, 5, 0.5),
    weight: () => 0.20,
    system: 'vitamins',
  },

  // ══ HORMONALES (bonus, no forman sistema propio pero ajustan otros) ══

  tsh: {
    // Óptimo 0.5-2.0 mIU/L
    score: (v) => optimalRange(v, 0.5, 2.0, 0.5, 1.5),
    weight: () => 0,
    system: 'hormonal',
  },
  testosterone: {
    score: (v, g) => {
      if (g === 'female') return optimalRange(v, 50, 80, 25, 30)
      return optimalRange(v, 600, 900, 200, 200)
    },
    weight: () => 0,
    system: 'hormonal',
  },
}

// ── Interacciones entre biomarcadores ────────────────────────────
// Basadas en evidencia de sinergia/antagonismo

interface Interaction {
  biomarkers: [string, string]
  condition: (a: number, b: number) => boolean
  system: string
  adjustment: number  // negativo = empeora, positivo = mejora
  evidence: string
}

const INTERACTIONS: Interaction[] = [
  {
    // LDL alto + PCR alta = sinergia de riesgo CV
    biomarkers: ['ldl', 'crp'],
    condition: (ldl, crp) => ldl > 130 && crp > 2.0,
    system: 'cardiovascular',
    adjustment: -0.12,
    evidence: 'Ridker NEJM 2005 (JUPITER): LDL+inflamación = riesgo multiplicado',
  },
  {
    // HDL alto + VitD óptima = protección cruzada
    biomarkers: ['hdl', 'vitaminD'],
    condition: (hdl, vitd) => hdl > 55 && vitd > 50,
    system: 'cardiovascular',
    adjustment: +0.05,
    evidence: 'Wang, Circulation 2012: HDL funcional + VitD = endotelio protegido',
  },
  {
    // Glucosa alta + Insulina alta = resistencia real confirmada
    biomarkers: ['glucose', 'insulin'],
    condition: (glu, ins) => glu > 100 && ins > 10,
    system: 'metabolic',
    adjustment: -0.15,
    evidence: 'DeFronzo, Diabetes Care 2009: HOMA-IR elevado = riesgo DM2 acelerado',
  },
  {
    // TG alto + HDL bajo = perfil aterogénico
    biomarkers: ['triglycerides', 'hdl'],
    condition: (tg, hdl) => tg > 150 && hdl < 40,
    system: 'cardiovascular',
    adjustment: -0.10,
    evidence: 'McLaughlin, Circulation 2005: TG/HDL elevado = partículas LDL densas',
  },
  {
    // Ferritina alta + PCR alta = inflamación sistémica confirmada
    biomarkers: ['ferritin', 'crp'],
    condition: (fer, crp) => fer > 200 && crp > 2.0,
    system: 'inflammatory',
    adjustment: -0.12,
    evidence: 'Kell, BMC Medical Genomics 2009: ferritina+PCR = inflammaging activo',
  },
  {
    // RDW alto + Hemoglobina baja = anemia con alto riesgo
    biomarkers: ['rdw', 'hemoglobin'],
    condition: (rdw, hb) => rdw > 14 && hb < 12,
    system: 'hematologic',
    adjustment: -0.10,
    evidence: 'Patel, Arch Intern Med 2009: RDW+anemia = mortalidad sinérgica',
  },
  {
    // GFR bajo + Albumina baja = síndrome cardiorenal
    biomarkers: ['gfr', 'albumin'],
    condition: (gfr, alb) => gfr < 60 && alb < 3.5,
    system: 'renal',
    adjustment: -0.15,
    evidence: 'Ronco, JACC 2008: síndrome cardiorenal acelerado',
  },
  {
    // VitD baja + PCR alta = inmunoinflamación crónica
    biomarkers: ['vitaminD', 'crp'],
    condition: (vitd, crp) => vitd < 30 && crp > 2.0,
    system: 'inflammatory',
    adjustment: -0.08,
    evidence: 'Laird, J Clin Endocrinol Metab 2014',
  },
]

// ── Pesos del score general por sistema ──────────────────────────
// Basados en impacto en mortalidad all-cause

const SYSTEM_WEIGHTS: Record<string, number> = {
  cardiovascular: 0.20,  // Causa #1 muerte mundial (WHO 2024)
  metabolic: 0.20,       // Diabetes afecta todos los sistemas
  inflammatory: 0.15,    // Driver central envejecimiento (Franceschi 2018)
  hepatic: 0.12,         // Órgano metabólico central
  renal: 0.10,           // Filtración y equilibrio
  hematologic: 0.10,     // Transporte O2 y coagulación
  immune: 0.08,          // Defensa
  vitamins: 0.05,        // Cofactores, corregibles rápido
}

// ── Función principal de scoring ─────────────────────────────────

export interface ParsedBiomarkers {
  hematology?: Record<string, { value: number | null } | null>
  metabolic?: Record<string, { value: number | null } | null>
  lipids?: Record<string, { value: number | null } | null>
  liver?: Record<string, { value: number | null } | null>
  vitamins?: Record<string, { value: number | null } | null>
  hormones?: Record<string, { value: number | null } | null>
  inflammation?: Record<string, { value: number | null } | null>
}

// Mapa de parsedData keys → scorer keys
const PARSED_TO_SCORER: Record<string, string> = {
  // lipids
  'lipids.ldl': 'ldl',
  'lipids.hdl': 'hdl',
  'lipids.triglycerides': 'triglycerides',
  'lipids.totalCholesterol': 'totalCholesterol',
  'lipids.tgHdlRatio': 'tgHdlRatio',
  // metabolic
  'metabolic.glucose': 'glucose',
  'metabolic.creatinine': 'creatinine',
  'metabolic.gfr': 'gfr',
  'metabolic.uricAcid': 'uricAcid',
  'metabolic.bun': 'bun',
  'metabolic.urea': 'urea',
  // liver
  'liver.alt': 'alt',
  'liver.ast': 'ast',
  'liver.ggt': 'ggt',
  'liver.alkalinePhosphatase': 'alkalinePhosphatase',
  'liver.totalBilirubin': 'totalBilirubin',
  'liver.albumin': 'albumin',
  // hematology
  'hematology.hemoglobin': 'hemoglobin',
  'hematology.hematocrit': 'hematocrit',
  'hematology.rdw': 'rdw',
  'hematology.platelets': 'platelets',
  'hematology.mcv': 'mcv',
  'hematology.mch': 'mch',
  'hematology.wbc': 'wbc',
  'hematology.neutrophils': 'neutrophils',
  'hematology.lymphocytes': 'lymphocytes',
  // inflammation
  'inflammation.crp': 'crp',
  'inflammation.homocysteine': 'homocysteine',
  // vitamins
  'vitamins.vitaminD': 'vitaminD',
  'vitamins.vitaminB12': 'vitaminB12',
  'vitamins.ferritin': 'ferritin',
  // hormones
  'hormones.tsh': 'tsh',
  'hormones.testosterone': 'testosterone',
  'hormones.hba1c': 'hba1c',
  'hormones.insulin': 'insulin',
}

function extractValue(parsed: ParsedBiomarkers, path: string): number | null {
  const [section, key] = path.split('.')
  const sectionData = parsed[section as keyof ParsedBiomarkers]
  if (!sectionData) return null
  const bm = sectionData[key]
  if (!bm || bm.value === null || bm.value === undefined) return null
  return bm.value
}

function statusFromScore(score: number): 'optimal' | 'normal' | 'warning' | 'danger' {
  if (score >= 85) return 'optimal'
  if (score >= 65) return 'normal'
  if (score >= 40) return 'warning'
  return 'danger'
}

/**
 * Calcula todos los scores de sistemas a partir de biomarcadores extraídos.
 * Retorna scores deterministas, reproducibles y basados en funciones sigmoideas.
 */
export function computeAllScores(parsed: ParsedBiomarkers, gender: string = 'male'): AllScoresResult {
  // 1. Score cada biomarcador individualmente
  const allScored: Record<string, { value: number; score: number; system: string }> = {}
  const availableByKey: Record<string, boolean> = {}

  for (const [path, scorerKey] of Object.entries(PARSED_TO_SCORER)) {
    const value = extractValue(parsed, path)
    if (value === null) continue

    const scorer = BIOMARKER_SCORERS[scorerKey]
    if (!scorer) continue

    const score = scorer.score(value, gender)
    allScored[scorerKey] = { value, score, system: scorer.system }
    availableByKey[scorerKey] = true
  }

  // Compute NL ratio if both available
  if (allScored['neutrophils'] && allScored['lymphocytes'] && allScored['lymphocytes'].value > 0) {
    const nlr = allScored['neutrophils'].value / allScored['lymphocytes'].value
    const scorer = BIOMARKER_SCORERS['nlRatio']
    if (scorer) {
      allScored['nlRatio'] = { value: nlr, score: scorer.score(nlr, gender), system: 'immune' }
      availableByKey['nlRatio'] = true
    }
  }

  // Compute TG/HDL ratio if both available
  if (allScored['triglycerides'] && allScored['hdl'] && allScored['hdl'].value > 0) {
    const tghdl = allScored['triglycerides'].value / allScored['hdl'].value
    const scorer = BIOMARKER_SCORERS['tgHdlRatio']
    if (scorer) {
      allScored['tgHdlRatio'] = { value: tghdl, score: scorer.score(tghdl, gender), system: 'cardiovascular' }
      availableByKey['tgHdlRatio'] = true
    }
  }

  // Ferritin in vitamins system too
  if (allScored['ferritin']) {
    const scorer = BIOMARKER_SCORERS['ferritinVit']
    if (scorer) {
      allScored['ferritinVit'] = { value: allScored['ferritin'].value, score: scorer.score(allScored['ferritin'].value, gender), system: 'vitamins' }
    }
  }

  // 2. Group by system and compute weighted averages
  const systemGroups: Record<string, { key: string; score: number; weight: number; value: number }[]> = {}

  for (const [key, data] of Object.entries(allScored)) {
    const scorer = BIOMARKER_SCORERS[key]
    if (!scorer || scorer.system === 'hormonal') continue // hormonal doesn't form its own system score

    const weight = scorer.weight(availableByKey)
    if (weight === 0) continue

    if (!systemGroups[data.system]) systemGroups[data.system] = []
    systemGroups[data.system].push({ key, score: data.score, weight, value: data.value })
  }

  // 3. Compute system scores with interaction adjustments
  const systems: AllScoresResult['systems'] = {}
  const systemScores: Record<string, number> = {}

  for (const [systemName, biomarkers] of Object.entries(systemGroups)) {
    const totalWeight = biomarkers.reduce((s, b) => s + b.weight, 0)
    if (totalWeight === 0) continue

    const baseScore = biomarkers.reduce((s, b) => s + b.score * b.weight, 0) / totalWeight

    // Apply interactions
    let interactionAdj = 0
    for (const interaction of INTERACTIONS) {
      if (interaction.system !== systemName) continue
      const [keyA, keyB] = interaction.biomarkers
      const a = allScored[keyA]
      const b = allScored[keyB]
      if (a && b && interaction.condition(a.value, b.value)) {
        interactionAdj += interaction.adjustment
      }
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore * (1 + interactionAdj))))

    const scoredBiomarkers: Record<string, ScoredBiomarker> = {}
    for (const b of biomarkers) {
      scoredBiomarkers[b.key] = {
        value: b.value,
        score: Math.round(b.score),
        status: statusFromScore(b.score),
        weight: b.weight,
      }
    }

    const result: SystemScoreResult = {
      score: finalScore,
      status: statusFromScore(finalScore),
      biomarkers: scoredBiomarkers,
      interactionAdjustment: Math.round(interactionAdj * 100) / 100,
    }

    systems[systemName as keyof AllScoresResult['systems']] = result
    systemScores[systemName] = finalScore
  }

  // 4. Compute overall score (weighted average of available systems)
  let overallNum = 0
  let overallDen = 0
  for (const [sys, score] of Object.entries(systemScores)) {
    const w = SYSTEM_WEIGHTS[sys] ?? 0
    overallNum += score * w
    overallDen += w
  }
  const overallScore = overallDen > 0 ? Math.round(overallNum / overallDen) : 50

  return { systems, overallScore, systemScores }
}
