/**
 * LONGEVITY IA — Calculadoras Clínicas v1.0
 *
 * Calculadoras médicas estándar auto-computadas con los datos del paciente.
 * Todas retornan null si faltan datos requeridos.
 *
 * Incluye: HOMA-IR, FIB-4, CKD-EPI eGFR, ASCVD Risk, Framingham,
 * índice aterogénico, ratio TG/HDL, índice de masa corporal.
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

export interface CalculatorResult {
  name: string
  value: number
  unit: string
  interpretation: string
  risk: 'low' | 'moderate' | 'high' | 'very_high'
  reference: string       // cita de la fórmula
  inputs: Record<string, number | string>  // valores usados
}

export interface AllCalculatorsResult {
  homaIR: CalculatorResult | null
  fib4: CalculatorResult | null
  ckdEpiGFR: CalculatorResult | null
  atherogenicIndex: CalculatorResult | null
  tgHdlRatio: CalculatorResult | null
  bmi: CalculatorResult | null
  framinghamRisk: CalculatorResult | null
  ascvdRisk: CalculatorResult | null
}

// ── Tipos de entrada ─────────────────────────────────────────────

export interface PatientData {
  age: number
  gender: 'male' | 'female' | string
  weight?: number | null       // kg
  height?: number | null       // cm
  smoker?: boolean
  diabetic?: boolean
  onHypertensionTreatment?: boolean
}

export interface LabData {
  glucose?: number | null      // mg/dL fasting
  insulin?: number | null      // µIU/mL fasting
  ast?: number | null          // U/L
  alt?: number | null          // U/L
  platelets?: number | null    // ×10³/µL
  creatinine?: number | null   // mg/dL
  totalCholesterol?: number | null  // mg/dL
  hdl?: number | null          // mg/dL
  ldl?: number | null          // mg/dL
  triglycerides?: number | null // mg/dL
  systolicBP?: number | null   // mmHg
}

// ── HOMA-IR ──────────────────────────────────────────────────────
// Matthews, Diabetologia 1985. Estándar para resistencia a insulina.

function computeHomaIR(glucose: number | null | undefined, insulin: number | null | undefined): CalculatorResult | null {
  if (glucose == null || insulin == null) return null

  const value = (glucose * insulin) / 405
  const rounded = Math.round(value * 100) / 100

  let interpretation: string
  let risk: CalculatorResult['risk']

  if (rounded < 1.0) {
    interpretation = 'Sensibilidad a insulina óptima'
    risk = 'low'
  } else if (rounded < 1.5) {
    interpretation = 'Sensibilidad normal'
    risk = 'low'
  } else if (rounded < 2.5) {
    interpretation = 'Resistencia a insulina temprana'
    risk = 'moderate'
  } else if (rounded < 4.0) {
    interpretation = 'Resistencia a insulina significativa'
    risk = 'high'
  } else {
    interpretation = 'Resistencia a insulina severa — alto riesgo de DM2'
    risk = 'very_high'
  }

  return {
    name: 'HOMA-IR',
    value: rounded,
    unit: '',
    interpretation,
    risk,
    reference: 'Matthews, Diabetologia 1985. Óptimo longevidad: <1.5',
    inputs: { glucose, insulin },
  }
}

// ── FIB-4 ────────────────────────────────────────────────────────
// Sterling, Hepatology 2006. Screening de fibrosis hepática.
// FIB-4 = (Edad × AST) / (Plaquetas × √ALT)

function computeFib4(age: number, ast: number | null | undefined, alt: number | null | undefined, platelets: number | null | undefined): CalculatorResult | null {
  if (ast == null || alt == null || platelets == null || alt <= 0 || platelets <= 0) return null

  const value = (age * ast) / (platelets * Math.sqrt(alt))
  const rounded = Math.round(value * 100) / 100

  let interpretation: string
  let risk: CalculatorResult['risk']

  if (rounded < 1.3) {
    interpretation = 'Fibrosis avanzada descartada (VPN >90%)'
    risk = 'low'
  } else if (rounded <= 2.67) {
    interpretation = 'Zona indeterminada — considerar elastografía hepática'
    risk = 'moderate'
  } else {
    interpretation = 'Alta probabilidad de fibrosis avanzada (F3-F4)'
    risk = 'high'
  }

  return {
    name: 'FIB-4 (Fibrosis Hepática)',
    value: rounded,
    unit: '',
    interpretation,
    risk,
    reference: 'Sterling, Hepatology 2006. Cortes: <1.3 descarta, >2.67 confirma fibrosis',
    inputs: { age, ast, alt, platelets },
  }
}

// ── CKD-EPI eGFR ────────────────────────────────────────────────
// Levey, Annals Int Med 2009 + KDIGO 2021 sin raza.
// eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^(-1.200) × 0.9938^edad × (1.012 si mujer)

function computeCkdEpiGFR(age: number, gender: string, creatinine: number | null | undefined): CalculatorResult | null {
  if (creatinine == null || creatinine <= 0) return null

  const isFemale = gender === 'female'
  const kappa = isFemale ? 0.7 : 0.9
  const alpha = isFemale ? -0.241 : -0.302
  const scrKappa = creatinine / kappa

  const value = 142
    * Math.pow(Math.min(scrKappa, 1), alpha)
    * Math.pow(Math.max(scrKappa, 1), -1.200)
    * Math.pow(0.9938, age)
    * (isFemale ? 1.012 : 1)

  const rounded = Math.round(value)

  let interpretation: string
  let risk: CalculatorResult['risk']

  if (rounded >= 90) {
    interpretation = 'Función renal normal (G1)'
    risk = 'low'
  } else if (rounded >= 60) {
    interpretation = 'Disminución leve (G2) — monitorear anualmente'
    risk = 'moderate'
  } else if (rounded >= 45) {
    interpretation = 'ERC estadio 3a — riesgo CV aumentado'
    risk = 'high'
  } else if (rounded >= 30) {
    interpretation = 'ERC estadio 3b — referir a nefrología'
    risk = 'high'
  } else if (rounded >= 15) {
    interpretation = 'ERC estadio 4 — preparar terapia renal sustitutiva'
    risk = 'very_high'
  } else {
    interpretation = 'Falla renal (G5) — diálisis/trasplante'
    risk = 'very_high'
  }

  return {
    name: 'CKD-EPI eGFR',
    value: rounded,
    unit: 'mL/min/1.73m²',
    interpretation,
    risk,
    reference: 'Levey, Ann Intern Med 2009 + KDIGO 2021 (sin coeficiente de raza)',
    inputs: { age, gender, creatinine },
  }
}

// ── Índice Aterogénico ───────────────────────────────────────────
// (Colesterol Total - HDL) / HDL
// Castelli, Can J Cardiol 2004

function computeAtherogenicIndex(totalChol: number | null | undefined, hdl: number | null | undefined): CalculatorResult | null {
  if (totalChol == null || hdl == null || hdl <= 0) return null

  const value = (totalChol - hdl) / hdl
  const rounded = Math.round(value * 100) / 100

  let interpretation: string
  let risk: CalculatorResult['risk']

  if (rounded < 3.0) {
    interpretation = 'Riesgo aterogénico bajo'
    risk = 'low'
  } else if (rounded < 4.0) {
    interpretation = 'Riesgo aterogénico moderado'
    risk = 'moderate'
  } else if (rounded < 5.0) {
    interpretation = 'Riesgo aterogénico alto'
    risk = 'high'
  } else {
    interpretation = 'Riesgo aterogénico muy alto'
    risk = 'very_high'
  }

  return {
    name: 'Índice Aterogénico (Castelli)',
    value: rounded,
    unit: '',
    interpretation,
    risk,
    reference: 'Castelli, Can J Cardiol 2004. Óptimo: <3.0',
    inputs: { totalCholesterol: totalChol, hdl },
  }
}

// ── Ratio TG/HDL ─────────────────────────────────────────────────
// McLaughlin, Circulation 2005. Proxy de partículas LDL densas.

function computeTgHdlRatio(tg: number | null | undefined, hdl: number | null | undefined): CalculatorResult | null {
  if (tg == null || hdl == null || hdl <= 0) return null

  const value = tg / hdl
  const rounded = Math.round(value * 100) / 100

  let interpretation: string
  let risk: CalculatorResult['risk']

  if (rounded < 1.5) {
    interpretation = 'Perfil de partículas LDL grande y flotante (favorable)'
    risk = 'low'
  } else if (rounded < 2.5) {
    interpretation = 'Perfil intermedio'
    risk = 'moderate'
  } else if (rounded < 3.5) {
    interpretation = 'Predominio de partículas LDL pequeñas y densas'
    risk = 'high'
  } else {
    interpretation = 'Perfil altamente aterogénico — resistencia a insulina probable'
    risk = 'very_high'
  }

  return {
    name: 'Ratio TG/HDL',
    value: rounded,
    unit: '',
    interpretation,
    risk,
    reference: 'McLaughlin, Circulation 2005. Óptimo: <1.5. >3.0 = partículas LDL densas',
    inputs: { triglycerides: tg, hdl },
  }
}

// ── IMC ──────────────────────────────────────────────────────────

function computeBMI(weight: number | null | undefined, height: number | null | undefined): CalculatorResult | null {
  if (weight == null || height == null || height <= 0) return null

  const heightM = height / 100
  const value = weight / (heightM * heightM)
  const rounded = Math.round(value * 10) / 10

  let interpretation: string
  let risk: CalculatorResult['risk']

  if (rounded < 18.5) {
    interpretation = 'Bajo peso — riesgo de desnutrición y sarcopenia'
    risk = 'moderate'
  } else if (rounded < 25) {
    interpretation = 'Peso normal'
    risk = 'low'
  } else if (rounded < 30) {
    interpretation = 'Sobrepeso — riesgo metabólico aumentado'
    risk = 'moderate'
  } else if (rounded < 35) {
    interpretation = 'Obesidad grado I'
    risk = 'high'
  } else if (rounded < 40) {
    interpretation = 'Obesidad grado II'
    risk = 'high'
  } else {
    interpretation = 'Obesidad grado III (mórbida)'
    risk = 'very_high'
  }

  return {
    name: 'Índice de Masa Corporal (IMC)',
    value: rounded,
    unit: 'kg/m²',
    interpretation,
    risk,
    reference: 'WHO 2024. Nota: IMC no distingue masa muscular de grasa',
    inputs: { weight, height },
  }
}

// ── Framingham Risk Score (simplificado) ─────────────────────────
// Wilson, Circulation 1998 + D'Agostino, Circulation 2008
// Riesgo CV a 10 años simplificado

function computeFraminghamRisk(
  age: number, gender: string, totalChol: number | null | undefined,
  hdl: number | null | undefined, systolicBP: number | null | undefined,
  smoker: boolean, onTreatment: boolean
): CalculatorResult | null {
  if (totalChol == null || hdl == null || systolicBP == null) return null

  const isMale = gender === 'male'

  // Coeficientes simplificados (D'Agostino 2008)
  let points = 0

  // Edad
  if (isMale) {
    if (age < 35) points += 0; else if (age < 40) points += 2; else if (age < 45) points += 5
    else if (age < 50) points += 7; else if (age < 55) points += 8; else if (age < 60) points += 10
    else if (age < 65) points += 11; else if (age < 70) points += 12; else points += 13
  } else {
    if (age < 35) points += 0; else if (age < 40) points += 2; else if (age < 45) points += 4
    else if (age < 50) points += 5; else if (age < 55) points += 7; else if (age < 60) points += 8
    else if (age < 65) points += 9; else if (age < 70) points += 10; else points += 11
  }

  // Colesterol total
  if (totalChol < 160) points += 0; else if (totalChol < 200) points += 1
  else if (totalChol < 240) points += 2; else if (totalChol < 280) points += 3
  else points += 4

  // HDL
  if (hdl >= 60) points -= 2; else if (hdl >= 50) points -= 1
  else if (hdl < 40) points += 2

  // Presión sistólica
  const bpAdj = onTreatment ? 1 : 0
  if (systolicBP < 120) points += 0; else if (systolicBP < 130) points += bpAdj + 1
  else if (systolicBP < 140) points += bpAdj + 2; else if (systolicBP < 160) points += bpAdj + 3
  else points += bpAdj + 4

  // Tabaquismo
  if (smoker) points += 3

  // Mapear puntos a riesgo % (aproximación simplificada)
  const riskMap: Record<number, number> = {
    0: 1, 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6,
    10: 8, 11: 10, 12: 12, 13: 15, 14: 18, 15: 22, 16: 25, 17: 30,
  }
  const clampedPoints = Math.max(0, Math.min(17, points))
  const riskPct = riskMap[clampedPoints] ?? (points > 17 ? 35 : 1)

  let interpretation: string
  let risk: CalculatorResult['risk']

  if (riskPct < 5) { interpretation = 'Riesgo CV bajo a 10 años'; risk = 'low' }
  else if (riskPct < 10) { interpretation = 'Riesgo CV borderline'; risk = 'moderate' }
  else if (riskPct < 20) { interpretation = 'Riesgo CV intermedio'; risk = 'high' }
  else { interpretation = 'Riesgo CV alto'; risk = 'very_high' }

  return {
    name: 'Framingham Risk Score',
    value: riskPct,
    unit: '% riesgo a 10 años',
    interpretation,
    risk,
    reference: "D'Agostino, Circulation 2008. Riesgo de evento CV mayor a 10 años",
    inputs: { age, gender, totalCholesterol: totalChol, hdl, systolicBP, smoker: smoker ? 1 : 0 },
  }
}

// ── ASCVD Risk (Pooled Cohort Equations simplificado) ────────────
// Goff, Circulation 2014 (ACC/AHA). Riesgo ASCVD a 10 años.

function computeASCVDRisk(
  age: number, gender: string, totalChol: number | null | undefined,
  hdl: number | null | undefined, systolicBP: number | null | undefined,
  smoker: boolean, diabetic: boolean, onTreatment: boolean
): CalculatorResult | null {
  if (totalChol == null || hdl == null || systolicBP == null) return null
  if (age < 40 || age > 79) return null // Fuera de rango validado

  const isMale = gender === 'male'

  // Coeficientes simplificados de Pooled Cohort Equations
  // Usando la versión log-transformada
  const lnAge = Math.log(age)
  const lnTC = Math.log(totalChol)
  const lnHDL = Math.log(hdl)
  const lnSBP = Math.log(systolicBP)
  const smokingVal = smoker ? 1 : 0
  const dmVal = diabetic ? 1 : 0

  let xb: number
  let baseline: number

  if (isMale) {
    xb = 12.344 * lnAge + 11.853 * lnTC - 2.664 * lnAge * lnTC
      - 7.990 * lnHDL + 1.769 * lnAge * lnHDL
      + (onTreatment ? 1.797 : 1.764) * lnSBP
      + 7.837 * smokingVal - 1.795 * lnAge * smokingVal
      + 0.658 * dmVal
    baseline = 0.9144  // supervivencia a 10 años
    xb -= 61.18
  } else {
    xb = -29.799 * lnAge + 4.884 * lnAge * lnAge
      + 13.540 * lnTC - 3.114 * lnAge * lnTC
      - 13.578 * lnHDL + 3.149 * lnAge * lnHDL
      + (onTreatment ? 2.019 : 1.957) * lnSBP
      + 7.574 * smokingVal - 1.665 * lnAge * smokingVal
      + 0.661 * dmVal
    baseline = 0.9665
    xb -= (-29.18)
  }

  const riskPct = Math.round((1 - Math.pow(baseline, Math.exp(xb))) * 1000) / 10
  const clampedRisk = Math.max(0, Math.min(100, riskPct))

  let interpretation: string
  let risk: CalculatorResult['risk']

  if (clampedRisk < 5) { interpretation = 'Riesgo ASCVD bajo'; risk = 'low' }
  else if (clampedRisk < 7.5) { interpretation = 'Riesgo ASCVD borderline'; risk = 'moderate' }
  else if (clampedRisk < 20) { interpretation = 'Riesgo ASCVD intermedio — considerar estatina'; risk = 'high' }
  else { interpretation = 'Riesgo ASCVD alto — intervención intensiva'; risk = 'very_high' }

  return {
    name: 'ASCVD Risk (ACC/AHA)',
    value: clampedRisk,
    unit: '% riesgo a 10 años',
    interpretation,
    risk,
    reference: 'Goff, Circulation 2014 (Pooled Cohort Equations). Validado 40-79 años',
    inputs: { age, gender, totalCholesterol: totalChol, hdl, systolicBP, smoker: smokingVal, diabetic: dmVal },
  }
}

// ── Función principal ────────────────────────────────────────────

/**
 * Calcula todas las calculadoras clínicas disponibles con los datos del paciente.
 * Cada calculadora retorna null si faltan datos requeridos.
 */
export function computeAllCalculators(patient: PatientData, labs: LabData): AllCalculatorsResult {
  return {
    homaIR: computeHomaIR(labs.glucose, labs.insulin),
    fib4: computeFib4(patient.age, labs.ast, labs.alt, labs.platelets),
    ckdEpiGFR: computeCkdEpiGFR(patient.age, patient.gender, labs.creatinine),
    atherogenicIndex: computeAtherogenicIndex(labs.totalCholesterol, labs.hdl),
    tgHdlRatio: computeTgHdlRatio(labs.triglycerides, labs.hdl),
    bmi: computeBMI(patient.weight, patient.height),
    framinghamRisk: computeFraminghamRisk(
      patient.age, patient.gender, labs.totalCholesterol, labs.hdl,
      labs.systolicBP, patient.smoker ?? false, patient.onHypertensionTreatment ?? false
    ),
    ascvdRisk: computeASCVDRisk(
      patient.age, patient.gender, labs.totalCholesterol, labs.hdl,
      labs.systolicBP, patient.smoker ?? false, patient.diabetic ?? false,
      patient.onHypertensionTreatment ?? false
    ),
  }
}
