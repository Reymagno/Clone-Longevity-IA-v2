/**
 * LONGEVITY IA — Análisis de Tendencias Longitudinales v1.0
 *
 * Compara biomarcadores entre múltiples análisis del mismo paciente.
 * Calcula deltas, velocidad de cambio, y proyecta cuándo un biomarcador
 * alcanzará un umbral crítico si la tendencia continúa.
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

// ── Tipos ────────────────────────────────────────────────────────

export interface BiomarkerSnapshot {
  date: string          // ISO date
  value: number
  status: 'optimal' | 'normal' | 'warning' | 'danger'
}

export interface BiomarkerTrend {
  key: string                    // ej: 'lipids.ldl'
  name: string                   // ej: 'LDL'
  unit: string                   // ej: 'mg/dL'
  system: string                 // ej: 'cardiovascular'
  snapshots: BiomarkerSnapshot[]
  currentValue: number
  previousValue: number | null
  delta: number | null           // cambio absoluto
  deltaPct: number | null        // cambio porcentual
  direction: 'improving' | 'worsening' | 'stable' | 'unknown'
  monthlyRate: number | null     // cambio por mes
  projectedMonthsToOptimal: number | null   // meses para llegar a óptimo (si mejora)
  projectedMonthsToDanger: number | null    // meses para llegar a danger (si empeora)
  alert: TrendAlert | null
}

export interface TrendAlert {
  level: 'info' | 'warning' | 'danger'
  message: string
}

export interface TrendsSummary {
  improving: BiomarkerTrend[]
  worsening: BiomarkerTrend[]
  stable: BiomarkerTrend[]
  totalAnalyses: number
  dateRange: { from: string; to: string }
  overallTrend: 'improving' | 'worsening' | 'stable' | 'mixed'
  scoreTrend: { date: string; score: number }[]
}

// ── Mapa de biomarcadores con metadatos ──────────────────────────

interface BiomarkerMeta {
  name: string
  unit: string
  system: string
  optimalLow: number
  optimalHigh: number
  dangerLow: number
  dangerHigh: number
  lowerIsBetter: boolean   // true = LDL, glucosa. false = HDL, albumina
}

const BIOMARKER_META: Record<string, BiomarkerMeta> = {
  'lipids.ldl':             { name: 'LDL', unit: 'mg/dL', system: 'cardiovascular', optimalLow: 0, optimalHigh: 70, dangerLow: 0, dangerHigh: 190, lowerIsBetter: true },
  'lipids.hdl':             { name: 'HDL', unit: 'mg/dL', system: 'cardiovascular', optimalLow: 60, optimalHigh: 100, dangerLow: 30, dangerHigh: 999, lowerIsBetter: false },
  'lipids.triglycerides':   { name: 'Triglicéridos', unit: 'mg/dL', system: 'cardiovascular', optimalLow: 0, optimalHigh: 100, dangerLow: 0, dangerHigh: 500, lowerIsBetter: true },
  'lipids.totalCholesterol':{ name: 'Colesterol Total', unit: 'mg/dL', system: 'cardiovascular', optimalLow: 150, optimalHigh: 180, dangerLow: 0, dangerHigh: 300, lowerIsBetter: true },
  'metabolic.glucose':      { name: 'Glucosa', unit: 'mg/dL', system: 'metabolic', optimalLow: 70, optimalHigh: 88, dangerLow: 54, dangerHigh: 200, lowerIsBetter: true },
  'metabolic.creatinine':   { name: 'Creatinina', unit: 'mg/dL', system: 'renal', optimalLow: 0.7, optimalHigh: 1.2, dangerLow: 0, dangerHigh: 4.0, lowerIsBetter: true },
  'metabolic.gfr':          { name: 'GFR', unit: 'mL/min', system: 'renal', optimalLow: 90, optimalHigh: 150, dangerLow: 15, dangerHigh: 999, lowerIsBetter: false },
  'metabolic.uricAcid':     { name: 'Ácido Úrico', unit: 'mg/dL', system: 'metabolic', optimalLow: 3.5, optimalHigh: 5.5, dangerLow: 0, dangerHigh: 9.0, lowerIsBetter: true },
  'liver.alt':              { name: 'ALT', unit: 'U/L', system: 'hepatic', optimalLow: 0, optimalHigh: 25, dangerLow: 0, dangerHigh: 200, lowerIsBetter: true },
  'liver.ast':              { name: 'AST', unit: 'U/L', system: 'hepatic', optimalLow: 0, optimalHigh: 25, dangerLow: 0, dangerHigh: 200, lowerIsBetter: true },
  'liver.ggt':              { name: 'GGT', unit: 'U/L', system: 'hepatic', optimalLow: 0, optimalHigh: 20, dangerLow: 0, dangerHigh: 200, lowerIsBetter: true },
  'liver.albumin':          { name: 'Albumina', unit: 'g/dL', system: 'hepatic', optimalLow: 4.5, optimalHigh: 5.5, dangerLow: 2.5, dangerHigh: 999, lowerIsBetter: false },
  'hematology.hemoglobin':  { name: 'Hemoglobina', unit: 'g/dL', system: 'hematologic', optimalLow: 13.5, optimalHigh: 17.0, dangerLow: 7.0, dangerHigh: 20.0, lowerIsBetter: false },
  'hematology.rdw':         { name: 'RDW', unit: '%', system: 'hematologic', optimalLow: 11, optimalHigh: 13, dangerLow: 0, dangerHigh: 20, lowerIsBetter: true },
  'hematology.platelets':   { name: 'Plaquetas', unit: '×10³/µL', system: 'hematologic', optimalLow: 175, optimalHigh: 300, dangerLow: 50, dangerHigh: 600, lowerIsBetter: false },
  'hematology.wbc':         { name: 'Leucocitos', unit: '×10³/µL', system: 'immune', optimalLow: 4.5, optimalHigh: 8.0, dangerLow: 2.0, dangerHigh: 20.0, lowerIsBetter: false },
  'inflammation.crp':       { name: 'PCR', unit: 'mg/L', system: 'inflammatory', optimalLow: 0, optimalHigh: 0.5, dangerLow: 0, dangerHigh: 10, lowerIsBetter: true },
  'inflammation.homocysteine': { name: 'Homocisteína', unit: 'µmol/L', system: 'inflammatory', optimalLow: 0, optimalHigh: 8, dangerLow: 0, dangerHigh: 30, lowerIsBetter: true },
  'vitamins.vitaminD':      { name: 'Vitamina D', unit: 'ng/mL', system: 'vitamins', optimalLow: 60, optimalHigh: 80, dangerLow: 10, dangerHigh: 150, lowerIsBetter: false },
  'vitamins.vitaminB12':    { name: 'Vitamina B12', unit: 'pg/mL', system: 'vitamins', optimalLow: 600, optimalHigh: 1200, dangerLow: 200, dangerHigh: 2000, lowerIsBetter: false },
  'vitamins.ferritin':      { name: 'Ferritina', unit: 'ng/mL', system: 'inflammatory', optimalLow: 50, optimalHigh: 100, dangerLow: 10, dangerHigh: 500, lowerIsBetter: false },
  'hormones.tsh':           { name: 'TSH', unit: 'mIU/L', system: 'hormonal', optimalLow: 0.5, optimalHigh: 2.0, dangerLow: 0.01, dangerHigh: 10, lowerIsBetter: false },
  'hormones.hba1c':         { name: 'HbA1c', unit: '%', system: 'metabolic', optimalLow: 4.0, optimalHigh: 5.4, dangerLow: 0, dangerHigh: 12, lowerIsBetter: true },
  'hormones.insulin':       { name: 'Insulina', unit: 'µIU/mL', system: 'metabolic', optimalLow: 0, optimalHigh: 5, dangerLow: 0, dangerHigh: 50, lowerIsBetter: true },
}

// ── Funciones de cálculo ─────────────────────────────────────────

function getVal(parsed: Record<string, unknown>, path: string): number | null {
  const [section, key] = path.split('.')
  const sec = parsed[section] as Record<string, unknown> | undefined
  if (!sec) return null
  const bm = sec[key] as { value: number | null } | null | undefined
  if (!bm || bm.value === null || bm.value === undefined) return null
  return bm.value
}

function getStatus(value: number, meta: BiomarkerMeta): 'optimal' | 'normal' | 'warning' | 'danger' {
  if (value >= meta.optimalLow && value <= meta.optimalHigh) return 'optimal'
  if (meta.lowerIsBetter) {
    if (value > meta.dangerHigh) return 'danger'
    if (value > meta.optimalHigh * 1.5) return 'warning'
    return 'normal'
  } else {
    if (value < meta.dangerLow) return 'danger'
    if (value < meta.optimalLow * 0.7) return 'warning'
    return 'normal'
  }
}

function monthsBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA)
  const b = new Date(dateB)
  const diffMs = Math.abs(b.getTime() - a.getTime())
  return diffMs / (1000 * 60 * 60 * 24 * 30.44)
}

function determineDirection(delta: number, meta: BiomarkerMeta): 'improving' | 'worsening' | 'stable' {
  const threshold = Math.abs(meta.optimalHigh - meta.optimalLow) * 0.05 // 5% del rango óptimo
  if (Math.abs(delta) < threshold) return 'stable'

  if (meta.lowerIsBetter) {
    return delta < 0 ? 'improving' : 'worsening'
  } else {
    return delta > 0 ? 'improving' : 'worsening'
  }
}

// ── Función principal ────────────────────────────────────────────

export interface AnalysisSnapshot {
  id: string
  result_date: string
  parsed_data: Record<string, unknown> | null
  ai_analysis: { overallScore?: number } | null
}

/**
 * Calcula tendencias longitudinales de biomarcadores a partir de múltiples análisis.
 * Requiere al menos 2 análisis para calcular tendencias.
 */
export function computeTrends(analyses: AnalysisSnapshot[]): TrendsSummary | null {
  // Ordenar por fecha ascendente
  const sorted = [...analyses]
    .filter(a => a.parsed_data)
    .sort((a, b) => new Date(a.result_date).getTime() - new Date(b.result_date).getTime())

  if (sorted.length < 2) return null

  const trends: BiomarkerTrend[] = []

  // Para cada biomarcador conocido, extraer valores de todos los análisis
  for (const [path, meta] of Object.entries(BIOMARKER_META)) {
    const snapshots: BiomarkerSnapshot[] = []

    for (const analysis of sorted) {
      if (!analysis.parsed_data) continue
      const value = getVal(analysis.parsed_data, path)
      if (value === null) continue
      snapshots.push({
        date: analysis.result_date,
        value,
        status: getStatus(value, meta),
      })
    }

    if (snapshots.length < 2) continue

    const current = snapshots[snapshots.length - 1]
    const previous = snapshots[snapshots.length - 2]
    const first = snapshots[0]

    const delta = current.value - previous.value
    const deltaPct = previous.value !== 0 ? (delta / previous.value) * 100 : null
    const direction = determineDirection(delta, meta)

    // Velocidad de cambio (por mes)
    const months = monthsBetween(previous.date, current.date)
    const monthlyRate = months > 0 ? delta / months : null

    // Proyección: cuántos meses para llegar a óptimo o danger
    let projectedMonthsToOptimal: number | null = null
    let projectedMonthsToDanger: number | null = null

    if (monthlyRate !== null && monthlyRate !== 0) {
      if (direction === 'improving') {
        // Cuánto falta para el rango óptimo
        const target = meta.lowerIsBetter ? meta.optimalHigh : meta.optimalLow
        const gap = meta.lowerIsBetter ? current.value - target : target - current.value
        if (gap > 0) {
          projectedMonthsToOptimal = Math.round(gap / Math.abs(monthlyRate))
        }
      }
      if (direction === 'worsening') {
        // Cuánto falta para danger
        const dangerTarget = meta.lowerIsBetter ? meta.dangerHigh : meta.dangerLow
        const gapToDanger = meta.lowerIsBetter ? dangerTarget - current.value : current.value - dangerTarget
        if (gapToDanger > 0) {
          projectedMonthsToDanger = Math.round(gapToDanger / Math.abs(monthlyRate))
        }
      }
    }

    // Generar alerta si hay empeoramiento significativo
    let alert: TrendAlert | null = null
    if (direction === 'worsening' && deltaPct !== null) {
      if (Math.abs(deltaPct) > 20) {
        alert = { level: 'danger', message: `${meta.name} empeoró ${Math.abs(deltaPct).toFixed(0)}% desde el último análisis` }
      } else if (Math.abs(deltaPct) > 10) {
        alert = { level: 'warning', message: `${meta.name} empeoró ${Math.abs(deltaPct).toFixed(0)}% — monitorear` }
      }
    }
    if (projectedMonthsToDanger !== null && projectedMonthsToDanger < 12) {
      alert = { level: 'danger', message: `${meta.name} alcanzará nivel crítico en ~${projectedMonthsToDanger} meses si continúa esta tendencia` }
    }

    trends.push({
      key: path,
      name: meta.name,
      unit: meta.unit,
      system: meta.system,
      snapshots,
      currentValue: current.value,
      previousValue: previous.value,
      delta,
      deltaPct: deltaPct !== null ? Math.round(deltaPct * 10) / 10 : null,
      direction,
      monthlyRate: monthlyRate !== null ? Math.round(monthlyRate * 100) / 100 : null,
      projectedMonthsToOptimal,
      projectedMonthsToDanger,
      alert,
    })
  }

  // Clasificar
  const improving = trends.filter(t => t.direction === 'improving').sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0))
  const worsening = trends.filter(t => t.direction === 'worsening').sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0))
  const stable = trends.filter(t => t.direction === 'stable')

  // Score trend
  const scoreTrend = sorted
    .filter(a => a.ai_analysis?.overallScore != null)
    .map(a => ({ date: a.result_date, score: a.ai_analysis!.overallScore! }))

  // Tendencia general
  let overallTrend: TrendsSummary['overallTrend']
  if (improving.length > worsening.length * 2) overallTrend = 'improving'
  else if (worsening.length > improving.length * 2) overallTrend = 'worsening'
  else if (improving.length === 0 && worsening.length === 0) overallTrend = 'stable'
  else overallTrend = 'mixed'

  return {
    improving,
    worsening,
    stable,
    totalAnalyses: sorted.length,
    dateRange: { from: sorted[0].result_date, to: sorted[sorted.length - 1].result_date },
    overallTrend,
    scoreTrend,
  }
}
