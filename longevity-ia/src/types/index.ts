// ============================================================
// TIPOS BASE DE BIOMARCADORES
// ============================================================

export interface BiomarkerValue {
  value: number | null
  unit: string
  refMin: number | null
  refMax: number | null
  optMin: number | null
  optMax: number | null
  status: 'optimal' | 'normal' | 'warning' | 'danger' | null
}

export interface Hematology {
  rbc: BiomarkerValue | null
  hemoglobin: BiomarkerValue | null
  hematocrit: BiomarkerValue | null
  mcv: BiomarkerValue | null
  mch: BiomarkerValue | null
  mchc: BiomarkerValue | null
  rdw: BiomarkerValue | null
  wbc: BiomarkerValue | null
  neutrophils: BiomarkerValue | null
  lymphocytes: BiomarkerValue | null
  monocytes: BiomarkerValue | null
  eosinophils: BiomarkerValue | null
  platelets: BiomarkerValue | null
  mpv: BiomarkerValue | null
}

export interface Metabolic {
  glucose: BiomarkerValue | null
  urea: BiomarkerValue | null
  bun: BiomarkerValue | null
  creatinine: BiomarkerValue | null
  gfr: BiomarkerValue | null
  uricAcid: BiomarkerValue | null
}

export interface Lipids {
  totalCholesterol: BiomarkerValue | null
  triglycerides: BiomarkerValue | null
  hdl: BiomarkerValue | null
  ldl: BiomarkerValue | null
  vldl: BiomarkerValue | null
  nonHdl: BiomarkerValue | null
  atherogenicIndex: BiomarkerValue | null
  ldlHdlRatio: BiomarkerValue | null
  tgHdlRatio: BiomarkerValue | null
}

export interface Liver {
  alkalinePhosphatase: BiomarkerValue | null
  ast: BiomarkerValue | null
  alt: BiomarkerValue | null
  ggt: BiomarkerValue | null
  ldh: BiomarkerValue | null
  totalProtein: BiomarkerValue | null
  albumin: BiomarkerValue | null
  globulin: BiomarkerValue | null
  amylase: BiomarkerValue | null
  totalBilirubin: BiomarkerValue | null
}

export interface Vitamins {
  vitaminD: BiomarkerValue | null
  vitaminB12: BiomarkerValue | null
  ferritin: BiomarkerValue | null
}

export interface Hormones {
  tsh: BiomarkerValue | null
  testosterone: BiomarkerValue | null
  cortisol: BiomarkerValue | null
  insulin: BiomarkerValue | null
  hba1c: BiomarkerValue | null
}

export interface Inflammation {
  crp: BiomarkerValue | null
  homocysteine: BiomarkerValue | null
}

export interface ParsedData {
  hematology: Hematology | null
  metabolic: Metabolic | null
  lipids: Lipids | null
  liver: Liver | null
  vitamins: Vitamins | null
  hormones: Hormones | null
  inflammation: Inflammation | null
}

// ============================================================
// ANÁLISIS IA
// ============================================================

export interface SystemScores {
  cardiovascular: number
  metabolic: number
  hepatic: number
  renal: number
  immune: number
  hematologic: number
  inflammatory: number
  vitamins: number
}

export interface KeyAlert {
  title: string
  description: string
  level: 'optimal' | 'normal' | 'warning' | 'danger'
  value: string
  target: string
}

export interface SwotItem {
  label: string
  detail: string
  expectedImpact?: string
  probability?: string
}

export interface Swot {
  strengths: SwotItem[]
  weaknesses: SwotItem[]
  opportunities: SwotItem[]
  threats: SwotItem[]
}

export interface DiseaseRisk {
  disease: string
  probability: number
  horizon: string
  drivers: string[]
  color: string
}

export interface ProtocolItem {
  number: number
  category: string
  molecule: string
  dose: string
  mechanism: string
  evidence: string
  clinicalTrial: string
  targetBiomarkers: string[]
  expectedResult: string
  action: string
  urgency: 'immediate' | 'high' | 'medium' | 'low'
}

export interface YearRisk {
  biomarkers: string[]
  conditions: string[]
  urgencyNote: string
}

export interface ProjectionFactor {
  factor: string
  currentValue: string
  optimalValue: string
  medicalJustification: string
  withoutProtocol: string
  withProtocol: string
}

export interface ProjectionPoint {
  year: number
  withoutIntervention: number
  withIntervention: number
  yearRisk?: YearRisk
}

export interface AIAnalysis {
  systemScores: SystemScores
  overallScore: number
  longevity_age: number
  clinicalSummary: string
  keyAlerts: KeyAlert[]
  swot: Swot
  risks: DiseaseRisk[]
  protocol: ProtocolItem[]
  projectionData: ProjectionPoint[]
  projectionFactors: ProjectionFactor[]
}

// ============================================================
// HISTORIA CLÍNICA (chatbot de intake)
// ============================================================

export interface ClinicalHistory {
  anthropometric: {
    waist_cm: number | null
    blood_pressure: string | null
    energy_level: string | null
  }
  allergies: {
    food: string | null
    medication: string | null
    environmental: string | null
  }
  diet: {
    type: string
    meals_per_day: string
    water_intake: string | null
    processed_food: string | null
    alcohol: string
    supplements: string | null
  }
  physical_activity: {
    type: string | null
    frequency: string | null
    sedentary_hours: string | null
  }
  sleep: {
    hours: string
    quality: string | null
    snoring: string | null
  }
  mental_health: {
    stress_level: string
    mood: string | null
    anxiety: string | null
    cognitive: string | null
  }
  cardiovascular: {
    chest_pain: string | null
    shortness_of_breath: string | null
    palpitations: string | null
    thyroid_symptoms: string | null
    hormonal_symptoms: string | null
  }
  medical_history: {
    chronic_conditions: string[]
    surgeries: string | null
    smoker: string
    current_medications: string | null
    recent_condition: string | null
    recent_treatment: string | null
  }
  family_history: {
    conditions: string[]
    longevity: string | null
    details: string | null
  }
  completed_at: string
}

// ============================================================
// MODELOS DE BASE DE DATOS
// ============================================================

export type Gender = 'male' | 'female' | 'other'

export interface Patient {
  id: string
  name: string
  code: string
  age: number
  gender: Gender
  weight: number | null
  height: number | null
  notes: string | null
  clinical_history: ClinicalHistory | null
  created_at: string
}

export interface LabResult {
  id: string
  patient_id: string
  result_date: string
  file_urls: string[]
  parsed_data: ParsedData | null
  ai_analysis: AIAnalysis | null
  created_at: string
}

export interface PatientWithLatestResult extends Patient {
  latest_result?: LabResult | null
}

// ============================================================
// ESTADO DE ANÁLISIS (ZUSTAND)
// ============================================================

export type AnalysisStep =
  | 'idle'
  | 'uploading'
  | 'reading'
  | 'analyzing'
  | 'saving'
  | 'done'
  | 'error'

export interface AnalysisState {
  step: AnalysisStep
  progress: number
  error: string | null
  resultId: string | null
}

// ============================================================
// PROPS DE DASHBOARD
// ============================================================

export interface DashboardProps {
  patient: Patient
  result: LabResult
}
