/**
 * LONGEVITY IA — Integración de Wearables v1.0
 *
 * Procesa datos de dispositivos de salud (Apple Watch, Oura Ring, Dexcom CGM,
 * Withings, Garmin, Freestyle Libre) y los integra al scoring de Longevity IA.
 *
 * DISEÑO: Si no hay datos de wearables, este módulo no tiene efecto.
 * Todas las funciones aceptan null/undefined y retornan ajustes neutros (0).
 *
 * Evidencia (actualizada 2022-2025):
 * - Zhang, Sci Rep 2025: HR reposo es factor independiente de mortalidad no accidental (>108,000 adultos chinos)
 * - Meta-análisis CMAJ 2016 (46 estudios, 1.24M pacientes): cada +10 bpm = HR 1.09 mortalidad all-cause
 * - Shaffer, Neurosci Biobehav Rev 2023: meta-análisis HRV — RMSSD Q1 vs otros = HR 1.56 mortalidad
 * - Meta-análisis HRV en IC 2025 (PMC12794729): ES=1.99 confirmando HRV como predictor de mortalidad
 * - Mandsager, JAMA 2018 + BJSM meta-análisis 2025: VO2max predictor #1, unfit = 2-3x mortalidad
 * - Lancet Public Health 2022 + Umbrella Review 2024: pasos/día HR 0.91 por +1000 pasos, piso protector 3,143
 * - GeroScience meta-análisis 2025: sueño <7h = +14% mortalidad, >9h = +34% mortalidad
 * - Windtree, SLEEP 2023: regularidad del sueño predice mortalidad mejor que duración
 * - Yan, JCSM 2024: SpO2 nocturno predice mortalidad all-cause (Sleep Heart Health Study, n=4,886)
 * - Int J Obesity 2022 (35 estudios, 923K participantes): cada +10% grasa corporal = HR 1.11
 * - Annals Family Med 2025: grasa corporal >27% H / >40% M = riesgo aumentado
 * - CGM/TIR: Battelino Diabetes Care 2019 + ICU study 2025: TIR asociado a complicaciones y mortalidad
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

// ── Tipos de datos de wearables ──────────────────────────────────

export interface WearableData {
  // Cardíaco (Apple Watch, Oura, Garmin)
  heartRate?: {
    restingAvg7d: number | null      // HR reposo promedio 7 días (bpm)
    restingTrend14d: number | null   // Tendencia: positivo = subiendo (malo), negativo = bajando (bueno)
    maxHR: number | null             // HR máxima registrada
  }

  // Variabilidad cardíaca (Oura, Apple Watch, Garmin)
  hrv?: {
    rmssdAvg7d: number | null        // RMSSD promedio 7 días (ms)
    trend14d: number | null          // Tendencia: positivo = mejorando
  }

  // Fitness (Apple Watch, Garmin)
  fitness?: {
    vo2maxEstimated: number | null   // VO2max estimado (mL/kg/min)
    stepsAvg7d: number | null        // Pasos/día promedio 7 días
    activeMinutesAvg7d: number | null // Minutos activos/día promedio
    exerciseSessionsWeek: number | null // Sesiones de ejercicio/semana
  }

  // Sueño (Oura, Apple Watch, Garmin, Withings)
  sleep?: {
    durationAvg7d: number | null     // Horas de sueño promedio 7 días
    deepSleepPct: number | null      // % sueño profundo
    remSleepPct: number | null       // % sueño REM
    efficiency: number | null         // Eficiencia de sueño (%)
    wakingsAvg: number | null         // Despertares promedio por noche
  }

  // Glucosa continua (Dexcom, Freestyle Libre)
  glucose?: {
    avg14d: number | null            // Glucosa promedio 14 días (mg/dL)
    timeInRange: number | null       // % tiempo en rango 70-180 mg/dL
    timeBelowRange: number | null    // % tiempo <70 mg/dL
    timeAboveRange: number | null    // % tiempo >180 mg/dL
    gmi: number | null               // Glucose Management Indicator (estimación HbA1c)
    cv: number | null                // Coeficiente de variación (%)
  }

  // Composición corporal (Withings)
  body?: {
    weightKg: number | null
    bmi: number | null
    fatPct: number | null            // % grasa corporal
    muscleMassKg: number | null
    boneMassKg: number | null
    waterPct: number | null           // % agua corporal
    weightTrend30d: number | null    // kg ganados/perdidos en 30 días
  }

  // Presión arterial (Withings)
  bloodPressure?: {
    systolicAvg7d: number | null     // Sistólica promedio 7 días
    diastolicAvg7d: number | null    // Diastólica promedio 7 días
    trend14d: number | null          // Tendencia sistólica
  }

  // Oximetría (Apple Watch, Garmin)
  spo2?: {
    nightAvg7d: number | null        // SpO2 nocturno promedio 7 días (%)
    minNocturnal: number | null      // SpO2 mínimo nocturno
  }

  // Estrés/Recuperación (Oura, Garmin)
  stress?: {
    stressScoreAvg7d: number | null  // Score de estrés (0-100, menor = mejor)
    readinessAvg7d: number | null    // Score de recuperación (0-100, mayor = mejor)
    bodyBatteryAvg: number | null    // Garmin Body Battery promedio
  }

  // Temperatura (Oura)
  temperature?: {
    deviationAvg7d: number | null    // Desviación de temperatura basal (°C)
  }

  // Metadatos
  _meta?: {
    sources: string[]                 // ['apple_watch', 'oura', 'dexcom', 'withings', 'garmin']
    lastSync: string                  // ISO timestamp
    dataQuality: 'high' | 'medium' | 'low'  // Basado en completitud de datos
  }
}

// ── Resultado del análisis de wearables ──────────────────────────

export interface WearableScoreAdjustment {
  system: string
  adjustment: number       // -15 a +15 puntos de ajuste al score del sistema
  reason: string
  evidence: string
  source: string           // dispositivo que provee el dato
  metric: string           // nombre de la métrica
  value: number
}

export interface WearableAnalysis {
  adjustments: WearableScoreAdjustment[]
  overallAdjustment: number          // ajuste neto al overallScore
  biologicalAgeAdjustment: number    // ajuste a edad biológica en años
  alerts: WearableAlert[]
  summary: string | null              // resumen en lenguaje natural (null si no hay datos)
  hasData: boolean                    // false si no hay datos de wearables
}

export interface WearableAlert {
  level: 'info' | 'warning' | 'danger' | 'critical'
  title: string
  detail: string
  metric: string
  value: number
  threshold: number
  source: string
}

// ── Funciones sigmoideas para métricas de wearables ──────────────

function sigmoidDesc(x: number, optimal: number, mid: number, steep: number): number {
  if (x <= optimal) return 100
  return Math.max(0, Math.min(100, 100 / (1 + Math.exp(steep * (x - mid)))))
}

function sigmoidAsc(x: number, optimal: number, mid: number, steep: number): number {
  if (x >= optimal) return 100
  return Math.max(0, Math.min(100, 100 / (1 + Math.exp(steep * (mid - x)))))
}

function rangeScore(x: number, low: number, high: number, sigL: number, sigH: number): number {
  if (x >= low && x <= high) return 100
  if (x < low) return 100 * Math.exp(-Math.pow(x - low, 2) / (2 * sigL * sigL))
  return 100 * Math.exp(-Math.pow(x - high, 2) / (2 * sigH * sigH))
}

// ── Función principal: analizar datos de wearables ───────────────

/**
 * Analiza datos de wearables y retorna ajustes al scoring.
 * Si no hay datos (wearableData es null/undefined o vacío), retorna hasData: false
 * y todos los ajustes en 0. NO AFECTA el análisis.
 */
export function analyzeWearables(wearableData: WearableData | null | undefined): WearableAnalysis {
  // Si no hay datos, retornar resultado neutro
  if (!wearableData) {
    return { adjustments: [], overallAdjustment: 0, biologicalAgeAdjustment: 0, alerts: [], summary: null, hasData: false }
  }

  const adjustments: WearableScoreAdjustment[] = []
  const alerts: WearableAlert[] = []
  let bioAgeAdj = 0

  // ── HR Reposo ──────────────────────────────────────────────────
  // Cooney CMAJ 2010: HR reposo >75 = +3.5x mortalidad CV
  // Jensen CMAJ 2012: HR reposo óptima 50-65 bpm
  const hr = wearableData.heartRate?.restingAvg7d
  if (hr != null) {
    const hrScore = rangeScore(hr, 50, 65, 15, 12)
    const adj = (hrScore - 70) / 10  // normalizar a -7..+3 puntos
    adjustments.push({
      system: 'cardiovascular',
      adjustment: Math.round(adj * 10) / 10,
      reason: hr < 60 ? 'HR reposo excelente — alta eficiencia cardíaca' :
              hr > 80 ? 'HR reposo elevada — estrés simpático o desacondicionamiento' :
              'HR reposo en rango aceptable',
      evidence: 'Zhang, Sci Rep 2025 (>108K adultos); Meta-análisis CMAJ 2016 (1.24M pac): +10bpm = HR 1.09',
      source: 'smartwatch', metric: 'HR reposo 7d', value: hr,
    })

    if (hr > 90) {
      alerts.push({ level: 'warning', title: 'HR reposo elevada', detail: `Promedio 7 días: ${hr} bpm. >90 bpm asociado a riesgo CV aumentado.`, metric: 'restingHR', value: hr, threshold: 90, source: 'smartwatch' })
    }
    if (hr > 100) {
      alerts.push({ level: 'danger', title: 'Taquicardia en reposo', detail: `Promedio 7 días: ${hr} bpm. Evaluación médica recomendada.`, metric: 'restingHR', value: hr, threshold: 100, source: 'smartwatch' })
    }
    bioAgeAdj += hr < 55 ? -1 : hr > 80 ? +1.5 : hr > 70 ? +0.5 : 0
  }

  // ── HRV (RMSSD) ────────────────────────────────────────────────
  // Thayer 2012: HRV alto = buen tono vagal. RMSSD >40ms = favorable
  const hrv = wearableData.hrv?.rmssdAvg7d
  if (hrv != null) {
    const hrvScore = sigmoidAsc(hrv, 50, 25, 0.08)
    const adj = (hrvScore - 70) / 12
    adjustments.push({
      system: 'cardiovascular',
      adjustment: Math.round(adj * 10) / 10,
      reason: hrv > 50 ? 'HRV excelente — tono parasimpático robusto' :
              hrv < 20 ? 'HRV baja — estrés crónico o disfunción autonómica' :
              'HRV en rango normal',
      evidence: 'Shaffer, Neurosci Biobehav Rev 2023: RMSSD Q1 = HR 1.56 mortalidad; Meta-análisis IC 2025: ES 1.99',
      source: 'smartwatch/oura', metric: 'HRV RMSSD 7d', value: hrv,
    })
    bioAgeAdj += hrv > 60 ? -1 : hrv < 15 ? +2 : hrv < 25 ? +1 : 0
  }

  // ── VO2max ─────────────────────────────────────────────────────
  // Mandsager JAMA 2018: VO2max = predictor #1 de longevidad
  // Cada 1 MET (~3.5 mL/kg/min) = -11.6% mortalidad all-cause
  const vo2 = wearableData.fitness?.vo2maxEstimated
  if (vo2 != null) {
    const vo2Score = sigmoidAsc(vo2, 45, 30, 0.12)
    const adj = (vo2Score - 65) / 8
    adjustments.push({
      system: 'cardiovascular',
      adjustment: Math.round(adj * 10) / 10,
      reason: vo2 > 45 ? 'VO2max excelente — fitness cardiorrespiratorio superior' :
              vo2 < 25 ? 'VO2max bajo — desacondicionamiento severo' :
              'VO2max en rango moderado',
      evidence: 'Mandsager JAMA 2018 + BJSM meta-análisis 2025 (398K obs): unfit = 2-3x mortalidad vs fit',
      source: 'smartwatch/garmin', metric: 'VO2max estimado', value: vo2,
    })
    bioAgeAdj += vo2 > 50 ? -2 : vo2 > 40 ? -1 : vo2 < 25 ? +3 : vo2 < 30 ? +1.5 : 0
  }

  // ── Pasos diarios ──────────────────────────────────────────────
  // Saint-Maurice JAMA 2020: 8,000 pasos = -51% mortalidad, 12,000 = -65%
  const steps = wearableData.fitness?.stepsAvg7d
  if (steps != null) {
    const stepsScore = sigmoidAsc(steps, 10000, 5000, 0.0008)
    const adj = (stepsScore - 60) / 15
    adjustments.push({
      system: 'metabolic',
      adjustment: Math.round(adj * 10) / 10,
      reason: steps > 10000 ? 'Actividad diaria excelente' :
              steps < 4000 ? 'Sedentarismo — riesgo metabólico aumentado' :
              'Actividad diaria moderada',
      evidence: 'Lancet Public Health 2022 (15 cohortes) + Umbrella Review 2024: HR 0.91 por +1000 pasos, >12,500 = HR 0.35',
      source: 'smartwatch', metric: 'Pasos/día 7d', value: steps,
    })
    bioAgeAdj += steps > 12000 ? -1 : steps < 3000 ? +2 : steps < 5000 ? +1 : 0
  }

  // ── Sueño ──────────────────────────────────────────────────────
  // Walker 2017: 7-9h óptimo. <6h = +13% mortalidad, <5h = +21%
  const sleepH = wearableData.sleep?.durationAvg7d
  if (sleepH != null) {
    const sleepScore = rangeScore(sleepH, 7, 9, 1.5, 1.5)
    const adj = (sleepScore - 70) / 15
    adjustments.push({
      system: 'immune',
      adjustment: Math.round(adj * 10) / 10,
      reason: sleepH >= 7 && sleepH <= 9 ? 'Sueño óptimo para recuperación y función inmune' :
              sleepH < 6 ? 'Privación de sueño — compromiso inmune y cognitivo' :
              'Duración de sueño subóptima',
      evidence: 'GeroScience meta-análisis 2025: <7h = +14% mortalidad, >9h = +34%; SLEEP 2023: regularidad > duración',
      source: 'oura/smartwatch', metric: 'Sueño promedio 7d (h)', value: sleepH,
    })

    if (sleepH < 5) {
      alerts.push({ level: 'danger', title: 'Privación severa de sueño', detail: `Promedio ${sleepH}h/noche. Riesgo significativo para salud cognitiva e inmune.`, metric: 'sleepDuration', value: sleepH, threshold: 5, source: 'oura/smartwatch' })
    }
    bioAgeAdj += (sleepH >= 7 && sleepH <= 8.5) ? -0.5 : sleepH < 5 ? +2 : sleepH < 6 ? +1 : 0
  }

  // Sueño profundo
  const deepPct = wearableData.sleep?.deepSleepPct
  if (deepPct != null) {
    const deepScore = sigmoidAsc(deepPct, 20, 10, 0.15)
    const adj = (deepScore - 65) / 20
    adjustments.push({
      system: 'immune',
      adjustment: Math.round(adj * 10) / 10,
      reason: deepPct > 20 ? 'Sueño profundo adecuado — regeneración tisular óptima' :
              deepPct < 10 ? 'Sueño profundo deficiente — recuperación comprometida' :
              'Sueño profundo moderado',
      evidence: 'Xie Science 2013 + Fultz Science 2019: clearance glinfático dependiente de sueño profundo',
      source: 'oura/smartwatch', metric: 'Sueño profundo (%)', value: deepPct,
    })
  }

  // ── Glucosa continua (CGM) ─────────────────────────────────────
  // Battelino, Diabetes Care 2019: TIR >70% = buen control
  const tir = wearableData.glucose?.timeInRange
  if (tir != null) {
    const tirScore = sigmoidAsc(tir, 85, 60, 0.08)
    const adj = (tirScore - 65) / 10
    adjustments.push({
      system: 'metabolic',
      adjustment: Math.round(adj * 10) / 10,
      reason: tir > 85 ? 'Control glucémico excelente — mínima variabilidad' :
              tir < 50 ? 'Control glucémico pobre — glicación proteica acelerada' :
              'Control glucémico moderado',
      evidence: 'Battelino, Diabetes Care 2019 + ICU retrospective 2025: TIR asociado a complicaciones y mortalidad',
      source: 'dexcom/libre', metric: 'Time in Range (%)', value: tir,
    })
    bioAgeAdj += tir > 90 ? -1 : tir < 50 ? +2 : tir < 60 ? +1 : 0
  }

  const glucAvg = wearableData.glucose?.avg14d
  if (glucAvg != null) {
    const glucScore = rangeScore(glucAvg, 80, 110, 15, 30)
    const adj = (glucScore - 70) / 12
    adjustments.push({
      system: 'metabolic',
      adjustment: Math.round(adj * 10) / 10,
      reason: glucAvg < 100 ? 'Glucosa promedio en rango óptimo' :
              glucAvg > 140 ? 'Glucosa promedio elevada — riesgo de DM2' :
              'Glucosa promedio ligeramente elevada',
      evidence: 'CGM advances 2024 (Diabetes Technology & Therapeutics): HbA1c -0.25-3.0%, TIR +15-34%',
      source: 'dexcom/libre', metric: 'Glucosa promedio 14d (mg/dL)', value: glucAvg,
    })

    if (glucAvg > 180) {
      alerts.push({ level: 'danger', title: 'Glucosa promedio muy elevada', detail: `${glucAvg} mg/dL promedio 14 días. Control endocrinológico urgente.`, metric: 'glucoseAvg', value: glucAvg, threshold: 180, source: 'cgm' })
    }
  }

  const glucCV = wearableData.glucose?.cv
  if (glucCV != null && glucCV > 36) {
    alerts.push({ level: 'warning', title: 'Variabilidad glucémica alta', detail: `CV ${glucCV}% (>36% = inestabilidad glucémica). Riesgo de hipoglucemia.`, metric: 'glucoseCV', value: glucCV, threshold: 36, source: 'cgm' })
  }

  // ── Presión arterial ───────────────────────────────────────────
  const sys = wearableData.bloodPressure?.systolicAvg7d
  const dia = wearableData.bloodPressure?.diastolicAvg7d
  if (sys != null) {
    const sysScore = rangeScore(sys, 110, 125, 15, 20)
    const adj = (sysScore - 70) / 12
    adjustments.push({
      system: 'cardiovascular',
      adjustment: Math.round(adj * 10) / 10,
      reason: sys < 120 ? 'Presión arterial óptima' :
              sys > 140 ? 'Hipertensión — riesgo CV significativo' :
              'Pre-hipertensión',
      evidence: 'Whelton, ACC/AHA 2017 Guidelines',
      source: 'withings', metric: 'PA sistólica 7d (mmHg)', value: sys,
    })

    if (sys > 160) {
      alerts.push({ level: 'danger', title: 'Hipertensión severa', detail: `Sistólica promedio ${sys}/${dia ?? '?'} mmHg. Evaluación médica urgente.`, metric: 'bloodPressure', value: sys, threshold: 160, source: 'withings' })
    } else if (sys > 140) {
      alerts.push({ level: 'warning', title: 'Hipertensión', detail: `Sistólica promedio ${sys}/${dia ?? '?'} mmHg.`, metric: 'bloodPressure', value: sys, threshold: 140, source: 'withings' })
    }
    bioAgeAdj += sys < 115 ? -0.5 : sys > 150 ? +2 : sys > 140 ? +1 : 0
  }

  // ── SpO2 nocturno ──────────────────────────────────────────────
  // Young NEJM 1993: SpO2 nocturno bajo indica apnea
  const spo2 = wearableData.spo2?.nightAvg7d
  if (spo2 != null) {
    const spo2Score = sigmoidAsc(spo2, 96, 92, 0.5)
    const adj = (spo2Score - 80) / 20
    adjustments.push({
      system: 'hematologic',
      adjustment: Math.round(adj * 10) / 10,
      reason: spo2 > 96 ? 'Oxigenación nocturna óptima' :
              spo2 < 92 ? 'Desaturación nocturna — posible apnea del sueño' :
              'SpO2 nocturno ligeramente bajo',
      evidence: 'Yan, JCSM 2024 (Sleep Heart Health Study, n=4,886): SpO2 nocturno predice mortalidad all-cause',
      source: 'smartwatch', metric: 'SpO2 nocturno 7d (%)', value: spo2,
    })

    if (spo2 < 90) {
      alerts.push({ level: 'critical', title: 'Desaturación nocturna severa', detail: `SpO2 nocturno promedio ${spo2}%. Estudio de sueño urgente.`, metric: 'spo2', value: spo2, threshold: 90, source: 'smartwatch' })
    } else if (spo2 < 93) {
      alerts.push({ level: 'warning', title: 'SpO2 nocturno bajo', detail: `Promedio ${spo2}%. Considerar evaluación por apnea del sueño.`, metric: 'spo2', value: spo2, threshold: 93, source: 'smartwatch' })
    }
    bioAgeAdj += spo2 > 97 ? -0.5 : spo2 < 90 ? +2 : spo2 < 93 ? +1 : 0
  }

  // ── Composición corporal ───────────────────────────────────────
  const fatPct = wearableData.body?.fatPct
  if (fatPct != null) {
    // Rangos dependen de género, usamos promedio
    const fatScore = rangeScore(fatPct, 12, 22, 8, 12)
    const adj = (fatScore - 65) / 15
    adjustments.push({
      system: 'metabolic',
      adjustment: Math.round(adj * 10) / 10,
      reason: fatPct < 15 ? 'Grasa corporal en rango atlético' :
              fatPct > 30 ? 'Exceso de grasa corporal — riesgo metabólico' :
              'Grasa corporal en rango aceptable',
      evidence: 'Int J Obesity 2022 (923K participantes): +10% grasa = HR 1.11; Ann Fam Med 2025: >27% H / >40% M = riesgo',
      source: 'withings', metric: 'Grasa corporal (%)', value: fatPct,
    })
    bioAgeAdj += fatPct < 15 ? -0.5 : fatPct > 35 ? +2 : fatPct > 28 ? +1 : 0
  }

  const weightTrend = wearableData.body?.weightTrend30d
  if (weightTrend != null && Math.abs(weightTrend) > 3) {
    alerts.push({
      level: 'warning',
      title: weightTrend > 0 ? 'Aumento de peso significativo' : 'Pérdida de peso significativa',
      detail: `${weightTrend > 0 ? '+' : ''}${weightTrend.toFixed(1)} kg en 30 días. Evaluar causa.`,
      metric: 'weightTrend', value: weightTrend, threshold: 3, source: 'withings',
    })
  }

  // ── Estrés / Recuperación ──────────────────────────────────────
  const readiness = wearableData.stress?.readinessAvg7d
  if (readiness != null) {
    const readScore = sigmoidAsc(readiness, 80, 55, 0.08)
    const adj = (readScore - 65) / 15
    adjustments.push({
      system: 'immune',
      adjustment: Math.round(adj * 10) / 10,
      reason: readiness > 80 ? 'Recuperación excelente — sistema nervioso bien regulado' :
              readiness < 50 ? 'Recuperación baja — estrés crónico o sobreentrenamiento' :
              'Recuperación moderada',
      evidence: 'Shaffer, Neurosci Biobehav Rev 2023; GeroScience 2025: recuperación predice longevidad',
      source: 'oura/garmin', metric: 'Readiness score 7d', value: readiness,
    })
    bioAgeAdj += readiness > 85 ? -0.5 : readiness < 40 ? +1.5 : 0
  }

  // ── Temperatura basal ──────────────────────────────────────────
  const tempDev = wearableData.temperature?.deviationAvg7d
  if (tempDev != null && Math.abs(tempDev) > 0.5) {
    alerts.push({
      level: 'info',
      title: 'Desviación de temperatura basal',
      detail: `${tempDev > 0 ? '+' : ''}${tempDev.toFixed(2)}°C vs basal. Posible infección, estrés o cambio hormonal.`,
      metric: 'temperature', value: tempDev, threshold: 0.5, source: 'oura',
    })
  }

  // ── Calcular ajuste total ──────────────────────────────────────

  // Verificar si realmente hay datos significativos
  const hasData = adjustments.length > 0

  if (!hasData) {
    return { adjustments: [], overallAdjustment: 0, biologicalAgeAdjustment: 0, alerts: [], summary: null, hasData: false }
  }

  // Ajuste al overallScore: promedio de ajustes capped a ±10
  const totalAdj = adjustments.reduce((sum, a) => sum + a.adjustment, 0)
  const overallAdjustment = Math.max(-10, Math.min(10, Math.round(totalAdj * 10) / 10))

  // Ajuste a edad biológica capped a ±5 años
  const biologicalAgeAdjustment = Math.max(-5, Math.min(5, Math.round(bioAgeAdj * 10) / 10))

  // Generar resumen
  const sources = wearableData._meta?.sources ?? []
  const sourceStr = sources.length > 0 ? sources.join(', ') : 'dispositivos de salud'
  const posAdj = adjustments.filter(a => a.adjustment > 0.5)
  const negAdj = adjustments.filter(a => a.adjustment < -0.5)

  let summary = `Análisis de datos de ${sourceStr}. `
  if (posAdj.length > 0) {
    summary += `Factores favorables: ${posAdj.map(a => a.metric).join(', ')}. `
  }
  if (negAdj.length > 0) {
    summary += `Áreas de atención: ${negAdj.map(a => a.metric).join(', ')}. `
  }
  if (alerts.length > 0) {
    summary += `${alerts.length} alerta${alerts.length > 1 ? 's' : ''} generada${alerts.length > 1 ? 's' : ''}.`
  }

  return {
    adjustments,
    overallAdjustment,
    biologicalAgeAdjustment,
    alerts,
    summary,
    hasData,
  }
}

// ── Función de integración con scoring existente ─────────────────

/**
 * Aplica ajustes de wearables a los scores computados.
 * Si wearableAnalysis.hasData es false, no modifica nada.
 */
export function applyWearableAdjustments(
  systemScores: Record<string, number>,
  overallScore: number,
  biologicalAge: number,
  wearableAnalysis: WearableAnalysis
): {
  systemScores: Record<string, number>
  overallScore: number
  biologicalAge: number
} {
  if (!wearableAnalysis.hasData) {
    return { systemScores, overallScore, biologicalAge }
  }

  // Aplicar ajustes por sistema
  const adjusted = { ...systemScores }
  for (const adj of wearableAnalysis.adjustments) {
    if (adjusted[adj.system] != null) {
      adjusted[adj.system] = Math.max(0, Math.min(100, Math.round(adjusted[adj.system] + adj.adjustment)))
    }
  }

  // Recalcular overall con ajustes
  const newOverall = Math.max(0, Math.min(100, Math.round(overallScore + wearableAnalysis.overallAdjustment)))

  // Ajustar edad biológica
  const newBioAge = Math.max(18, Math.round(biologicalAge + wearableAnalysis.biologicalAgeAdjustment))

  return {
    systemScores: adjusted,
    overallScore: newOverall,
    biologicalAge: newBioAge,
  }
}
