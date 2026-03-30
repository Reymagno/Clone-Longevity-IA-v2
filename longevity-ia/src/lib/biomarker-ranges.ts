// ============================================================
// CATÁLOGO DE BIOMARCADORES — RANGOS DE REFERENCIA
// Medicina de Longevidad & Preventiva
// ============================================================
// Los rangos "optimal" reflejan medicina de longevidad (más estrictos).
// Los rangos "normal" reflejan rangos de laboratorio convencionales.
// Los rangos "attention" y "critical" indican intervención requerida.
// ============================================================

export type Gender = 'male' | 'female' | 'any'
export type AgeGroup = 'all' | '18-39' | '18-59' | '40-59' | '60+'
export type BiomarkerStatus = 'optimal' | 'normal' | 'attention' | 'critical'

export interface RangeSpec {
  min: number | null
  max: number | null
}

export interface GenderAgeRange {
  gender: Gender
  age: AgeGroup
  optimal: RangeSpec
  normal: RangeSpec
  attention: RangeSpec  // fuera de normal pero no crítico
  critical: RangeSpec   // requiere intervención urgente
}

export interface BiomarkerDefinition {
  id: string
  name: string
  shortName?: string
  category: string
  subcategory?: string
  unit: string
  alternativeUnits?: { unit: string; factor: number }[]
  description: string
  clinicalSignificance: string
  ranges: GenderAgeRange[]
  highMeaning: string   // qué significa si está alto
  lowMeaning: string    // qué significa si está bajo
  relatedBiomarkers?: string[]
  longevityRelevance: 'high' | 'medium' | 'low'
}

// ============================================================
// 1. HEMATOLOGÍA / BIOMETRÍA HEMÁTICA
// ============================================================

const HEMATOLOGY: BiomarkerDefinition[] = [
  {
    id: 'hemoglobin',
    name: 'Hemoglobina',
    shortName: 'Hb',
    category: 'Hematología',
    unit: 'g/dL',
    description: 'Proteína en glóbulos rojos que transporta oxígeno a los tejidos',
    clinicalSignificance: 'Indicador principal de anemia o policitemia. Esencial para oxigenación celular y rendimiento energético.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 14.5, max: 16.5 }, normal: { min: 13.5, max: 17.5 }, attention: { min: 12.0, max: 18.5 }, critical: { min: null, max: null } },
      { gender: 'female', age: '18-39', optimal: { min: 13.0, max: 15.0 }, normal: { min: 12.0, max: 16.0 }, attention: { min: 10.5, max: 17.0 }, critical: { min: null, max: null } },
      { gender: 'female', age: '40-59', optimal: { min: 12.5, max: 15.0 }, normal: { min: 12.0, max: 16.0 }, attention: { min: 10.5, max: 17.0 }, critical: { min: null, max: null } },
      { gender: 'female', age: '60+', optimal: { min: 12.0, max: 15.0 }, normal: { min: 11.5, max: 16.0 }, attention: { min: 10.0, max: 17.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Policitemia, deshidratación, enfermedad pulmonar crónica, altitud elevada',
    lowMeaning: 'Anemia (ferropénica, megaloblástica, crónica), hemorragia, deficiencia nutricional',
    relatedBiomarkers: ['hematocrit', 'ferritin', 'iron', 'vitamin_b12', 'folate'],
    longevityRelevance: 'high',
  },
  {
    id: 'hematocrit',
    name: 'Hematocrito',
    shortName: 'Hto',
    category: 'Hematología',
    unit: '%',
    description: 'Porcentaje del volumen sanguíneo ocupado por glóbulos rojos',
    clinicalSignificance: 'Refleja capacidad de transporte de oxígeno. Valores extremos aumentan riesgo cardiovascular.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 42, max: 48 }, normal: { min: 40, max: 52 }, attention: { min: 36, max: 55 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 38, max: 44 }, normal: { min: 36, max: 48 }, attention: { min: 32, max: 52 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Policitemia, deshidratación, hipoxia crónica',
    lowMeaning: 'Anemia, sobrehidratación, pérdida de sangre',
    relatedBiomarkers: ['hemoglobin', 'rbc'],
    longevityRelevance: 'medium',
  },
  {
    id: 'rbc',
    name: 'Eritrocitos',
    shortName: 'GR',
    category: 'Hematología',
    unit: 'mill/µL',
    alternativeUnits: [{ unit: 'x10^12/L', factor: 1 }],
    description: 'Conteo de glóbulos rojos en sangre',
    clinicalSignificance: 'Evalúa producción medular y capacidad de oxigenación.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 4.5, max: 5.5 }, normal: { min: 4.2, max: 5.8 }, attention: { min: 3.5, max: 6.2 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 4.0, max: 5.0 }, normal: { min: 3.8, max: 5.2 }, attention: { min: 3.2, max: 5.8 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Policitemia vera, deshidratación, hipoxia',
    lowMeaning: 'Anemia, hemorragia, enfermedad crónica',
    relatedBiomarkers: ['hemoglobin', 'hematocrit'],
    longevityRelevance: 'medium',
  },
  {
    id: 'wbc',
    name: 'Leucocitos',
    shortName: 'GB',
    category: 'Hematología',
    unit: 'mil/µL',
    alternativeUnits: [{ unit: 'x10^9/L', factor: 1 }],
    description: 'Conteo total de glóbulos blancos (sistema inmune)',
    clinicalSignificance: 'Leucocitos elevados crónicamente asociados a inflamación sistémica y mayor mortalidad cardiovascular.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 4.0, max: 6.5 }, normal: { min: 4.0, max: 11.0 }, attention: { min: 3.0, max: 15.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Infección, inflamación crónica, estrés, leucemia, tabaquismo',
    lowMeaning: 'Inmunosupresión, infección viral, deficiencia medular, autoinmune',
    relatedBiomarkers: ['neutrophils', 'lymphocytes', 'crp_hs'],
    longevityRelevance: 'high',
  },
  {
    id: 'platelets',
    name: 'Plaquetas',
    category: 'Hematología',
    unit: 'mil/µL',
    alternativeUnits: [{ unit: 'x10^9/L', factor: 1 }],
    description: 'Fragmentos celulares esenciales para la coagulación',
    clinicalSignificance: 'Valores extremos indican riesgo hemorrágico o trombótico.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 180, max: 300 }, normal: { min: 150, max: 400 }, attention: { min: 100, max: 450 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Trombocitosis reactiva, inflamación, deficiencia de hierro, mieloproliferativo',
    lowMeaning: 'Trombocitopenia, infección viral, hepática, autoinmune, medicamentos',
    relatedBiomarkers: ['mpv'],
    longevityRelevance: 'medium',
  },
  {
    id: 'mcv',
    name: 'Volumen Corpuscular Medio',
    shortName: 'VCM',
    category: 'Hematología',
    unit: 'fL',
    description: 'Tamaño promedio de los glóbulos rojos',
    clinicalSignificance: 'Clasifica anemias: microcítica (bajo), normocítica, macrocítica (alto). VCM alto asociado a deficiencia B12/folato.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 82, max: 92 }, normal: { min: 80, max: 100 }, attention: { min: 70, max: 110 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Deficiencia B12 o folato, alcoholismo, hipotiroidismo, mielodisplasia',
    lowMeaning: 'Deficiencia de hierro, talasemia, anemia de enfermedad crónica',
    relatedBiomarkers: ['iron', 'ferritin', 'vitamin_b12', 'folate'],
    longevityRelevance: 'medium',
  },
  {
    id: 'mch',
    name: 'Hemoglobina Corpuscular Media',
    shortName: 'HCM',
    category: 'Hematología',
    unit: 'pg',
    description: 'Cantidad promedio de hemoglobina por glóbulo rojo',
    clinicalSignificance: 'Complementa VCM en clasificación de anemias.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 28, max: 32 }, normal: { min: 27, max: 33 }, attention: { min: 24, max: 36 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Macrocitosis, deficiencia B12/folato',
    lowMeaning: 'Microcitosis, deficiencia de hierro, talasemia',
    relatedBiomarkers: ['mcv', 'mchc'],
    longevityRelevance: 'low',
  },
  {
    id: 'mchc',
    name: 'Concentración de Hemoglobina Corpuscular Media',
    shortName: 'CMHC',
    category: 'Hematología',
    unit: 'g/dL',
    description: 'Concentración promedio de hemoglobina en glóbulos rojos',
    clinicalSignificance: 'Valores bajos sugieren hipocromía (deficiencia de hierro).',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 33, max: 35 }, normal: { min: 32, max: 36 }, attention: { min: 30, max: 37 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Esferocitosis, deshidratación eritrocitaria',
    lowMeaning: 'Deficiencia de hierro, talasemia',
    relatedBiomarkers: ['mcv', 'mch'],
    longevityRelevance: 'low',
  },
  {
    id: 'rdw',
    name: 'Ancho de Distribución Eritrocitaria',
    shortName: 'RDW',
    category: 'Hematología',
    unit: '%',
    description: 'Variabilidad en el tamaño de los glóbulos rojos',
    clinicalSignificance: 'RDW elevado es predictor independiente de mortalidad cardiovascular y general. Marcador de estrés oxidativo.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 11.5, max: 13.5 }, normal: { min: 11.0, max: 14.5 }, attention: { min: 10.0, max: 16.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Deficiencia nutricional mixta, inflamación crónica, estrés oxidativo, predictor de mortalidad',
    lowMeaning: 'Sin significado clínico relevante',
    relatedBiomarkers: ['mcv', 'iron', 'ferritin', 'vitamin_b12'],
    longevityRelevance: 'high',
  },
  {
    id: 'mpv',
    name: 'Volumen Plaquetario Medio',
    shortName: 'VPM',
    category: 'Hematología',
    unit: 'fL',
    description: 'Tamaño promedio de las plaquetas',
    clinicalSignificance: 'VPM elevado indica plaquetas más reactivas, asociado a mayor riesgo trombótico.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 8.0, max: 10.0 }, normal: { min: 7.5, max: 12.0 }, attention: { min: 6.5, max: 13.5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Mayor actividad plaquetaria, riesgo trombótico, diabetes, síndrome metabólico',
    lowMeaning: 'Trombocitopenia por producción reducida',
    relatedBiomarkers: ['platelets'],
    longevityRelevance: 'medium',
  },
  {
    id: 'neutrophils',
    name: 'Neutrófilos',
    category: 'Hematología',
    subcategory: 'Diferencial leucocitario',
    unit: '%',
    description: 'Principal tipo de glóbulo blanco, primera línea de defensa contra bacterias',
    clinicalSignificance: 'Neutrofilia crónica indica inflamación sistémica.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 40, max: 60 }, normal: { min: 40, max: 70 }, attention: { min: 30, max: 80 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Infección bacteriana, estrés, inflamación, corticosteroides',
    lowMeaning: 'Infección viral, autoinmune, medicamentos, neutropenia',
    relatedBiomarkers: ['wbc', 'lymphocytes', 'nlr'],
    longevityRelevance: 'medium',
  },
  {
    id: 'lymphocytes',
    name: 'Linfocitos',
    category: 'Hematología',
    subcategory: 'Diferencial leucocitario',
    unit: '%',
    description: 'Células del sistema inmune adaptativo (T, B, NK)',
    clinicalSignificance: 'Linfopenia crónica asociada a inmunosenescencia y mayor mortalidad.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 25, max: 40 }, normal: { min: 20, max: 45 }, attention: { min: 15, max: 50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Infección viral, linfoma, autoinmune',
    lowMeaning: 'Inmunosupresión, VIH, corticosteroides, estrés crónico, envejecimiento',
    relatedBiomarkers: ['wbc', 'neutrophils', 'nlr'],
    longevityRelevance: 'high',
  },
  {
    id: 'monocytes',
    name: 'Monocitos',
    category: 'Hematología',
    subcategory: 'Diferencial leucocitario',
    unit: '%',
    description: 'Glóbulos blancos que se transforman en macrófagos en los tejidos',
    clinicalSignificance: 'Monocitosis asociada a inflamación crónica y aterosclerosis.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 2, max: 6 }, normal: { min: 2, max: 8 }, attention: { min: 1, max: 12 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Infección crónica, inflamación, recuperación post-infección, leucemia monocítica',
    lowMeaning: 'Tratamiento con corticosteroides, aplasia medular',
    relatedBiomarkers: ['wbc'],
    longevityRelevance: 'medium',
  },
  {
    id: 'eosinophils',
    name: 'Eosinófilos',
    category: 'Hematología',
    subcategory: 'Diferencial leucocitario',
    unit: '%',
    description: 'Glóbulos blancos involucrados en respuesta alérgica y parasitaria',
    clinicalSignificance: 'Eosinofilia indica alergia, parasitosis o enfermedad autoinmune.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 1, max: 3 }, normal: { min: 0, max: 5 }, attention: { min: 0, max: 8 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Alergia, asma, parasitosis, eosinofilia, vasculitis',
    lowMeaning: 'Sin significado clínico (pueden ser 0 normalmente)',
    relatedBiomarkers: ['wbc', 'ige'],
    longevityRelevance: 'low',
  },
  {
    id: 'basophils',
    name: 'Basófilos',
    category: 'Hematología',
    subcategory: 'Diferencial leucocitario',
    unit: '%',
    description: 'Tipo más raro de glóbulo blanco, involucrado en respuestas alérgicas',
    clinicalSignificance: 'Basofilia puede indicar trastorno mieloproliferativo.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 1 }, normal: { min: 0, max: 2 }, attention: { min: 0, max: 3 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Alergia severa, mieloproliferativo, hipotiroidismo',
    lowMeaning: 'Sin significado clínico',
    relatedBiomarkers: ['wbc'],
    longevityRelevance: 'low',
  },
  {
    id: 'nlr',
    name: 'Relación Neutrófilos/Linfocitos',
    shortName: 'NLR',
    category: 'Hematología',
    subcategory: 'Índices calculados',
    unit: 'ratio',
    description: 'Cociente entre neutrófilos y linfocitos absolutos',
    clinicalSignificance: 'Marcador emergente de inflamación sistémica. NLR > 3 asociado a mayor riesgo cardiovascular y mortalidad. Predictor de envejecimiento biológico.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 1.0, max: 2.0 }, normal: { min: 1.0, max: 3.0 }, attention: { min: 0.5, max: 5.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Inflamación sistémica, estrés, infección, mayor riesgo cardiovascular y oncológico',
    lowMeaning: 'Sin significado clínico relevante',
    relatedBiomarkers: ['neutrophils', 'lymphocytes', 'crp_hs'],
    longevityRelevance: 'high',
  },
  {
    id: 'esr',
    name: 'Velocidad de Sedimentación Globular',
    shortName: 'VSG',
    category: 'Hematología',
    unit: 'mm/h',
    description: 'Velocidad a la que sedimentan los eritrocitos, marcador inespecífico de inflamación',
    clinicalSignificance: 'Marcador general de inflamación. Elevada crónicamente asociada a enfermedades autoinmunes.',
    ranges: [
      { gender: 'male', age: '18-39', optimal: { min: 0, max: 10 }, normal: { min: 0, max: 15 }, attention: { min: 0, max: 30 }, critical: { min: null, max: null } },
      { gender: 'male', age: '40-59', optimal: { min: 0, max: 12 }, normal: { min: 0, max: 20 }, attention: { min: 0, max: 35 }, critical: { min: null, max: null } },
      { gender: 'male', age: '60+', optimal: { min: 0, max: 15 }, normal: { min: 0, max: 25 }, attention: { min: 0, max: 40 }, critical: { min: null, max: null } },
      { gender: 'female', age: '18-39', optimal: { min: 0, max: 12 }, normal: { min: 0, max: 20 }, attention: { min: 0, max: 35 }, critical: { min: null, max: null } },
      { gender: 'female', age: '40-59', optimal: { min: 0, max: 15 }, normal: { min: 0, max: 25 }, attention: { min: 0, max: 40 }, critical: { min: null, max: null } },
      { gender: 'female', age: '60+', optimal: { min: 0, max: 20 }, normal: { min: 0, max: 30 }, attention: { min: 0, max: 50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Inflamación, infección, autoinmune, cáncer, embarazo',
    lowMeaning: 'Policitemia, hipofibrinogenemia',
    relatedBiomarkers: ['crp_hs', 'fibrinogen'],
    longevityRelevance: 'medium',
  },
]

// ============================================================
// 2. METABOLISMO — GLUCOSA E INSULINA
// ============================================================

const METABOLISM_GLUCOSE: BiomarkerDefinition[] = [
  {
    id: 'glucose_fasting',
    name: 'Glucosa en Ayunas',
    category: 'Metabolismo',
    subcategory: 'Glucosa e Insulina',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.0555 }],
    description: 'Nivel de azúcar en sangre después de 8-12 horas de ayuno',
    clinicalSignificance: 'Marcador primario de metabolismo glucídico. Glucosa elevada acelera glicación, estrés oxidativo y envejecimiento celular.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 70, max: 90 }, normal: { min: 65, max: 100 }, attention: { min: 55, max: 125 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Prediabetes (100-125), diabetes (>126), resistencia a insulina, estrés, Cushing',
    lowMeaning: 'Hipoglucemia, exceso de insulina, insuficiencia adrenal, hepática',
    relatedBiomarkers: ['hba1c', 'insulin_fasting', 'homa_ir'],
    longevityRelevance: 'high',
  },
  {
    id: 'hba1c',
    name: 'Hemoglobina Glicosilada',
    shortName: 'HbA1c',
    category: 'Metabolismo',
    subcategory: 'Glucosa e Insulina',
    unit: '%',
    alternativeUnits: [{ unit: 'mmol/mol', factor: 10.929 }],
    description: 'Promedio de glucosa en sangre de los últimos 2-3 meses',
    clinicalSignificance: 'Gold standard para control glucémico. HbA1c > 5.5% acelera glicación y AGEs (productos de glicación avanzada), acelerando envejecimiento.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 4.5, max: 5.2 }, normal: { min: 4.0, max: 5.7 }, attention: { min: 5.7, max: 6.4 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Prediabetes (5.7-6.4%), diabetes (>6.5%), glicación acelerada, envejecimiento vascular',
    lowMeaning: 'Anemia hemolítica, hemorragia, hipoglucemia crónica',
    relatedBiomarkers: ['glucose_fasting', 'insulin_fasting', 'homa_ir'],
    longevityRelevance: 'high',
  },
  {
    id: 'insulin_fasting',
    name: 'Insulina en Ayunas',
    category: 'Metabolismo',
    subcategory: 'Glucosa e Insulina',
    unit: 'µU/mL',
    alternativeUnits: [{ unit: 'pmol/L', factor: 6.945 }],
    description: 'Nivel de insulina después de 8-12 horas de ayuno',
    clinicalSignificance: 'Marcador temprano de resistencia a insulina, años antes de que la glucosa se eleve. Hiperinsulinemia crónica acelera envejecimiento vía mTOR.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 2.0, max: 6.0 }, normal: { min: 2.0, max: 12.0 }, attention: { min: 12.0, max: 25.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Resistencia a insulina, síndrome metabólico, activación mTOR excesiva, riesgo oncológico',
    lowMeaning: 'Diabetes tipo 1, insuficiencia pancreática',
    relatedBiomarkers: ['glucose_fasting', 'hba1c', 'homa_ir', 'triglycerides'],
    longevityRelevance: 'high',
  },
  {
    id: 'homa_ir',
    name: 'Índice HOMA-IR',
    shortName: 'HOMA-IR',
    category: 'Metabolismo',
    subcategory: 'Glucosa e Insulina',
    unit: 'índice',
    description: 'Modelo de evaluación de resistencia a insulina (Glucosa × Insulina / 405)',
    clinicalSignificance: 'Marcador calculado de sensibilidad a insulina. HOMA-IR > 2.5 indica resistencia a insulina significativa.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0.5, max: 1.5 }, normal: { min: 0.5, max: 2.5 }, attention: { min: 2.5, max: 4.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Resistencia a insulina, síndrome metabólico, NAFLD, inflamación crónica',
    lowMeaning: 'Excelente sensibilidad a insulina',
    relatedBiomarkers: ['glucose_fasting', 'insulin_fasting', 'triglycerides'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 3. METABOLISMO — RENAL
// ============================================================

const METABOLISM_RENAL: BiomarkerDefinition[] = [
  {
    id: 'creatinine',
    name: 'Creatinina',
    category: 'Metabolismo',
    subcategory: 'Función Renal',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'µmol/L', factor: 88.4 }],
    description: 'Producto de desecho del metabolismo muscular, filtrado por riñones',
    clinicalSignificance: 'Marcador principal de función renal. Varía según masa muscular.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 0.8, max: 1.1 }, normal: { min: 0.7, max: 1.3 }, attention: { min: 1.3, max: 2.0 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 0.6, max: 0.9 }, normal: { min: 0.5, max: 1.1 }, attention: { min: 1.1, max: 1.8 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Insuficiencia renal, deshidratación, exceso de proteína, rabdomiólisis',
    lowMeaning: 'Masa muscular baja, desnutrición, embarazo',
    relatedBiomarkers: ['bun', 'egfr', 'uric_acid', 'cystatin_c'],
    longevityRelevance: 'high',
  },
  {
    id: 'bun',
    name: 'Nitrógeno Ureico en Sangre',
    shortName: 'BUN',
    category: 'Metabolismo',
    subcategory: 'Función Renal',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.357 }],
    description: 'Producto de desecho del metabolismo proteico',
    clinicalSignificance: 'Evalúa función renal y estado de hidratación. BUN/Creatinina ratio ayuda a diferenciar causas.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 8, max: 18 }, normal: { min: 7, max: 20 }, attention: { min: 5, max: 30 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Insuficiencia renal, deshidratación, dieta hiperproteica, hemorragia GI',
    lowMeaning: 'Insuficiencia hepática, desnutrición, sobrehidratación',
    relatedBiomarkers: ['creatinine', 'egfr'],
    longevityRelevance: 'medium',
  },
  {
    id: 'urea',
    name: 'Urea',
    category: 'Metabolismo',
    subcategory: 'Función Renal',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.166 }],
    description: 'Producto final del metabolismo de proteínas, sintetizado en hígado',
    clinicalSignificance: 'Refleja función renal y hepática, estado nutricional e hidratación.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 15, max: 35 }, normal: { min: 10, max: 45 }, attention: { min: 5, max: 60 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Insuficiencia renal, deshidratación, dieta hiperproteica, catabolismo',
    lowMeaning: 'Insuficiencia hepática, desnutrición, embarazo',
    relatedBiomarkers: ['creatinine', 'bun', 'egfr'],
    longevityRelevance: 'medium',
  },
  {
    id: 'uric_acid',
    name: 'Ácido Úrico',
    category: 'Metabolismo',
    subcategory: 'Función Renal',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'µmol/L', factor: 59.48 }],
    description: 'Producto final del metabolismo de purinas',
    clinicalSignificance: 'Valores elevados asociados a gota, cálculos renales, y riesgo cardiovascular. Es antioxidante pero en exceso es proinflamatorio.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 3.5, max: 5.5 }, normal: { min: 3.0, max: 7.0 }, attention: { min: 7.0, max: 9.0 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 2.5, max: 5.0 }, normal: { min: 2.0, max: 6.0 }, attention: { min: 6.0, max: 8.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Gota, cálculos renales, síndrome metabólico, dieta rica en purinas, riesgo CV',
    lowMeaning: 'Enfermedad de Wilson, síndrome de Fanconi, exceso de alopurinol',
    relatedBiomarkers: ['creatinine', 'egfr', 'triglycerides'],
    longevityRelevance: 'high',
  },
  {
    id: 'egfr',
    name: 'Tasa de Filtración Glomerular Estimada',
    shortName: 'TFGe',
    category: 'Metabolismo',
    subcategory: 'Función Renal',
    unit: 'mL/min/1.73m²',
    description: 'Estimación de la capacidad de filtración de los riñones',
    clinicalSignificance: 'Mejor marcador de función renal global. Declina con la edad. Preservar TFGe es clave en longevidad.',
    ranges: [
      { gender: 'any', age: '18-39', optimal: { min: 100, max: 130 }, normal: { min: 90, max: 140 }, attention: { min: 60, max: 90 }, critical: { min: null, max: null } },
      { gender: 'any', age: '40-59', optimal: { min: 90, max: 120 }, normal: { min: 80, max: 130 }, attention: { min: 60, max: 80 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 80, max: 110 }, normal: { min: 60, max: 120 }, attention: { min: 45, max: 60 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hiperfiltración (diabetes temprana), embarazo',
    lowMeaning: 'Enfermedad renal crónica (ERC): 60-89=leve, 30-59=moderada, 15-29=severa, <15=terminal',
    relatedBiomarkers: ['creatinine', 'cystatin_c', 'bun'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 4. PERFIL LIPÍDICO
// ============================================================

const LIPIDS: BiomarkerDefinition[] = [
  {
    id: 'total_cholesterol',
    name: 'Colesterol Total',
    category: 'Lípidos',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.0259 }],
    description: 'Suma de todas las fracciones de colesterol en sangre',
    clinicalSignificance: 'Marcador general. Más importante ver las fracciones (LDL, HDL) y ratios que el total aislado.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 150, max: 190 }, normal: { min: 130, max: 200 }, attention: { min: 200, max: 240 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Riesgo aterosclerótico si predomina LDL, hipotiroidismo, familiar, dieta',
    lowMeaning: 'Hipertiroidismo, desnutrición, malabsorción, enfermedad hepática',
    relatedBiomarkers: ['ldl', 'hdl', 'triglycerides', 'apob'],
    longevityRelevance: 'medium',
  },
  {
    id: 'ldl',
    name: 'Colesterol LDL',
    shortName: 'LDL-C',
    category: 'Lípidos',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.0259 }],
    description: 'Lipoproteína de baja densidad, principal transportador de colesterol a tejidos',
    clinicalSignificance: 'LDL oxidado es el principal motor de aterosclerosis. En longevidad, LDL bajo reduce exposición acumulativa (AUC de LDL a lo largo de la vida).',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 50, max: 100 }, normal: { min: 50, max: 130 }, attention: { min: 130, max: 160 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Riesgo aterosclerótico, hipercolesterolemia familiar, hipotiroidismo, dieta',
    lowMeaning: 'Hipertiroidismo, malabsorción, desnutrición (raramente problemático)',
    relatedBiomarkers: ['total_cholesterol', 'apob', 'hdl', 'lpa'],
    longevityRelevance: 'high',
  },
  {
    id: 'hdl',
    name: 'Colesterol HDL',
    shortName: 'HDL-C',
    category: 'Lípidos',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.0259 }],
    description: 'Lipoproteína de alta densidad, transporte reverso de colesterol (protector)',
    clinicalSignificance: 'HDL facilita remoción de colesterol de arterias. HDL funcional es más importante que HDL alto. Valores > 90 pueden indicar HDL disfuncional.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 50, max: 80 }, normal: { min: 40, max: 90 }, attention: { min: 30, max: 40 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 55, max: 85 }, normal: { min: 45, max: 95 }, attention: { min: 35, max: 45 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Generalmente protector, pero HDL muy alto (>90) puede ser disfuncional',
    lowMeaning: 'Riesgo cardiovascular aumentado, síndrome metabólico, sedentarismo, tabaquismo',
    relatedBiomarkers: ['total_cholesterol', 'ldl', 'triglycerides'],
    longevityRelevance: 'high',
  },
  {
    id: 'vldl',
    name: 'Colesterol VLDL',
    shortName: 'VLDL-C',
    category: 'Lípidos',
    unit: 'mg/dL',
    description: 'Lipoproteína de muy baja densidad, transporta triglicéridos',
    clinicalSignificance: 'VLDL elevado refleja metabolismo de triglicéridos alterado y riesgo aterogénico.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 5, max: 20 }, normal: { min: 5, max: 30 }, attention: { min: 30, max: 50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hipertrigliceridemia, síndrome metabólico, resistencia a insulina',
    lowMeaning: 'Sin significado clínico relevante',
    relatedBiomarkers: ['triglycerides', 'ldl'],
    longevityRelevance: 'medium',
  },
  {
    id: 'triglycerides',
    name: 'Triglicéridos',
    shortName: 'TG',
    category: 'Lípidos',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.0113 }],
    description: 'Principal forma de almacenamiento de grasa en sangre',
    clinicalSignificance: 'Triglicéridos elevados son marcador de resistencia a insulina y riesgo de pancreatitis. Ratio TG/HDL es excelente predictor de resistencia a insulina.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 40, max: 80 }, normal: { min: 35, max: 150 }, attention: { min: 150, max: 300 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Resistencia a insulina, dieta alta en carbohidratos/alcohol, hipotiroidismo, pancreatitis (>500)',
    lowMeaning: 'Hipertiroidismo, malabsorción, desnutrición',
    relatedBiomarkers: ['hdl', 'insulin_fasting', 'homa_ir', 'glucose_fasting'],
    longevityRelevance: 'high',
  },
  {
    id: 'apob',
    name: 'Apolipoproteína B',
    shortName: 'ApoB',
    category: 'Lípidos',
    subcategory: 'Avanzado',
    unit: 'mg/dL',
    description: 'Proteína presente en cada partícula LDL, VLDL e IDL. Una ApoB = una partícula aterogénica',
    clinicalSignificance: 'Mejor predictor de riesgo aterosclerótico que LDL-C. Cuenta el número real de partículas aterogénicas.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 40, max: 80 }, normal: { min: 40, max: 100 }, attention: { min: 100, max: 130 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Alto número de partículas aterogénicas, riesgo cardiovascular elevado independiente del LDL-C',
    lowMeaning: 'Excelente perfil aterogénico',
    relatedBiomarkers: ['ldl', 'total_cholesterol', 'lpa'],
    longevityRelevance: 'high',
  },
  {
    id: 'lpa',
    name: 'Lipoproteína(a)',
    shortName: 'Lp(a)',
    category: 'Lípidos',
    subcategory: 'Avanzado',
    unit: 'nmol/L',
    alternativeUnits: [{ unit: 'mg/dL', factor: 0.4 }],
    description: 'Variante genética de LDL con potencial protrombótico y proinflamatorio',
    clinicalSignificance: '90% determinada genéticamente. Lp(a) elevada es factor de riesgo cardiovascular independiente. No responde a estatinas.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 30 }, normal: { min: 0, max: 75 }, attention: { min: 75, max: 125 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Riesgo cardiovascular genético, estenosis aórtica, trombosis',
    lowMeaning: 'Perfil favorable',
    relatedBiomarkers: ['ldl', 'apob'],
    longevityRelevance: 'high',
  },
  {
    id: 'tg_hdl_ratio',
    name: 'Relación Triglicéridos/HDL',
    shortName: 'TG/HDL',
    category: 'Lípidos',
    subcategory: 'Índices calculados',
    unit: 'ratio',
    description: 'Cociente entre triglicéridos y HDL colesterol',
    clinicalSignificance: 'Mejor predictor de resistencia a insulina que HOMA-IR en algunos estudios. TG/HDL > 3 indica perfil aterogénico y resistencia a insulina.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0.5, max: 1.2 }, normal: { min: 0.5, max: 2.0 }, attention: { min: 2.0, max: 4.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Resistencia a insulina, LDL pequeño y denso, riesgo cardiovascular aumentado',
    lowMeaning: 'Excelente perfil metabólico',
    relatedBiomarkers: ['triglycerides', 'hdl', 'insulin_fasting'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 5. FUNCIÓN HEPÁTICA
// ============================================================

const HEPATIC: BiomarkerDefinition[] = [
  {
    id: 'alt',
    name: 'Alanina Aminotransferasa',
    shortName: 'ALT/GPT',
    category: 'Hepático',
    unit: 'U/L',
    description: 'Enzima hepática específica, presente principalmente en hepatocitos',
    clinicalSignificance: 'Marcador más específico de daño hepático. ALT crónicamente elevada asociada a NAFLD (hígado graso no alcohólico).',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 10, max: 25 }, normal: { min: 7, max: 40 }, attention: { min: 40, max: 80 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 8, max: 20 }, normal: { min: 5, max: 35 }, attention: { min: 35, max: 70 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Daño hepático, NAFLD, hepatitis, medicamentos, alcohol, esteatohepatitis',
    lowMeaning: 'Deficiencia de B6 (cofactor), sin significado clínico',
    relatedBiomarkers: ['ast', 'ggt', 'alkaline_phosphatase', 'bilirubin_total'],
    longevityRelevance: 'high',
  },
  {
    id: 'ast',
    name: 'Aspartato Aminotransferasa',
    shortName: 'AST/GOT',
    category: 'Hepático',
    unit: 'U/L',
    description: 'Enzima presente en hígado, corazón, músculo y riñón',
    clinicalSignificance: 'Menos específica que ALT. Ratio AST/ALT (De Ritis) ayuda a diferenciar causas: >2 sugiere daño alcohólico, <1 sugiere NAFLD.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 10, max: 25 }, normal: { min: 8, max: 40 }, attention: { min: 40, max: 80 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 8, max: 22 }, normal: { min: 6, max: 35 }, attention: { min: 35, max: 70 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Daño hepático, infarto, rabdomiólisis, ejercicio intenso, hemólisis',
    lowMeaning: 'Deficiencia de B6, insuficiencia renal',
    relatedBiomarkers: ['alt', 'ggt', 'ldh', 'ck'],
    longevityRelevance: 'medium',
  },
  {
    id: 'ggt',
    name: 'Gamma-Glutamil Transferasa',
    shortName: 'GGT',
    category: 'Hepático',
    unit: 'U/L',
    description: 'Enzima hepática sensible a alcohol y medicamentos',
    clinicalSignificance: 'Marcador sensible de consumo de alcohol y estrés oxidativo hepático. GGT elevada es predictor independiente de mortalidad cardiovascular y diabetes.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 8, max: 25 }, normal: { min: 8, max: 50 }, attention: { min: 50, max: 100 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 5, max: 20 }, normal: { min: 5, max: 35 }, attention: { min: 35, max: 70 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Alcohol, NAFLD, medicamentos, obstrucción biliar, estrés oxidativo, síndrome metabólico',
    lowMeaning: 'Sin significado clínico',
    relatedBiomarkers: ['alt', 'ast', 'alkaline_phosphatase'],
    longevityRelevance: 'high',
  },
  {
    id: 'alkaline_phosphatase',
    name: 'Fosfatasa Alcalina',
    shortName: 'FA',
    category: 'Hepático',
    unit: 'U/L',
    description: 'Enzima presente en hígado, hueso, intestino y riñón',
    clinicalSignificance: 'Elevada en patología biliar y ósea. FA > 120 sostenida sugiere obstrucción biliar o enfermedad ósea.',
    ranges: [
      { gender: 'any', age: '18-39', optimal: { min: 40, max: 80 }, normal: { min: 30, max: 100 }, attention: { min: 100, max: 150 }, critical: { min: null, max: null } },
      { gender: 'any', age: '40-59', optimal: { min: 40, max: 90 }, normal: { min: 30, max: 115 }, attention: { min: 115, max: 160 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 45, max: 100 }, normal: { min: 35, max: 125 }, attention: { min: 125, max: 180 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Obstrucción biliar, metástasis hepáticas, enfermedad de Paget, hiperparatiroidismo',
    lowMeaning: 'Hipotiroidismo, anemia, desnutrición, deficiencia de zinc/magnesio',
    relatedBiomarkers: ['ggt', 'bilirubin_total', 'calcium', 'vitamin_d'],
    longevityRelevance: 'medium',
  },
  {
    id: 'bilirubin_total',
    name: 'Bilirrubina Total',
    category: 'Hepático',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'µmol/L', factor: 17.1 }],
    description: 'Pigmento producido por degradación de hemoglobina',
    clinicalSignificance: 'Bilirrubina ligeramente elevada (síndrome de Gilbert) es protectora como antioxidante. Valores altos indican hemólisis u obstrucción.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0.3, max: 1.0 }, normal: { min: 0.1, max: 1.2 }, attention: { min: 1.2, max: 2.5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Ictericia: hemólisis, hepatitis, obstrucción biliar, Gilbert (benigno si <3)',
    lowMeaning: 'Sin significado clínico',
    relatedBiomarkers: ['bilirubin_direct', 'alt', 'ast', 'hemoglobin'],
    longevityRelevance: 'medium',
  },
  {
    id: 'bilirubin_direct',
    name: 'Bilirrubina Directa',
    shortName: 'BD',
    category: 'Hepático',
    unit: 'mg/dL',
    description: 'Bilirrubina conjugada por el hígado, lista para excreción biliar',
    clinicalSignificance: 'Elevada específicamente en obstrucción biliar y daño hepatocelular.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0.0, max: 0.2 }, normal: { min: 0.0, max: 0.3 }, attention: { min: 0.3, max: 0.8 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Obstrucción biliar, hepatitis, cirrosis, colestasis',
    lowMeaning: 'Sin significado clínico',
    relatedBiomarkers: ['bilirubin_total', 'alkaline_phosphatase', 'ggt'],
    longevityRelevance: 'low',
  },
  {
    id: 'albumin',
    name: 'Albúmina',
    category: 'Hepático',
    unit: 'g/dL',
    description: 'Proteína más abundante en sangre, sintetizada por el hígado',
    clinicalSignificance: 'Marcador de función hepática sintética y estado nutricional. Albúmina baja es predictor fuerte de mortalidad en adultos mayores.',
    ranges: [
      { gender: 'any', age: '18-59', optimal: { min: 4.2, max: 5.0 }, normal: { min: 3.5, max: 5.5 }, attention: { min: 3.0, max: 3.5 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 4.0, max: 4.8 }, normal: { min: 3.4, max: 5.2 }, attention: { min: 2.8, max: 3.4 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Deshidratación',
    lowMeaning: 'Insuficiencia hepática, desnutrición, inflamación crónica, síndrome nefrótico, envejecimiento',
    relatedBiomarkers: ['total_protein', 'alt', 'crp_hs'],
    longevityRelevance: 'high',
  },
  {
    id: 'total_protein',
    name: 'Proteínas Totales',
    category: 'Hepático',
    unit: 'g/dL',
    description: 'Suma de albúmina y globulinas en sangre',
    clinicalSignificance: 'Evalúa estado nutricional y función hepática.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 6.5, max: 7.5 }, normal: { min: 6.0, max: 8.0 }, attention: { min: 5.5, max: 9.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Deshidratación, mieloma, infección crónica, autoinmune',
    lowMeaning: 'Desnutrición, malabsorción, insuficiencia hepática, pérdida renal',
    relatedBiomarkers: ['albumin'],
    longevityRelevance: 'medium',
  },
  {
    id: 'ldh',
    name: 'Lactato Deshidrogenasa',
    shortName: 'LDH',
    category: 'Hepático',
    unit: 'U/L',
    description: 'Enzima presente en casi todos los tejidos del cuerpo',
    clinicalSignificance: 'Marcador inespecífico de daño tisular. Elevada en hemólisis, infarto, cáncer, ejercicio intenso.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 120, max: 200 }, normal: { min: 100, max: 250 }, attention: { min: 250, max: 400 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Daño tisular generalizado, hemólisis, infarto, cáncer, anemia megaloblástica',
    lowMeaning: 'Sin significado clínico relevante',
    relatedBiomarkers: ['ast', 'ck'],
    longevityRelevance: 'low',
  },
]

// ============================================================
// 6. TIROIDES
// ============================================================

const THYROID: BiomarkerDefinition[] = [
  {
    id: 'tsh',
    name: 'Hormona Estimulante de Tiroides',
    shortName: 'TSH',
    category: 'Tiroides',
    unit: 'mUI/L',
    alternativeUnits: [{ unit: 'µIU/mL', factor: 1 }],
    description: 'Hormona hipofisaria que regula la función tiroidea',
    clinicalSignificance: 'Marcador más sensible de disfunción tiroidea. TSH óptima en longevidad tiende a 1-2 mUI/L. Hipotiroidismo subclínico acelera envejecimiento cardiovascular.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 1.0, max: 2.5 }, normal: { min: 0.4, max: 4.0 }, attention: { min: 0.1, max: 10.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hipotiroidismo (primario), deficiencia de yodo, Hashimoto, litio',
    lowMeaning: 'Hipertiroidismo, Graves, nódulo tóxico, exceso de hormona exógena',
    relatedBiomarkers: ['ft4', 'ft3', 'anti_tpo', 'anti_tg'],
    longevityRelevance: 'high',
  },
  {
    id: 'ft4',
    name: 'T4 Libre',
    shortName: 'FT4',
    category: 'Tiroides',
    unit: 'ng/dL',
    alternativeUnits: [{ unit: 'pmol/L', factor: 12.87 }],
    description: 'Forma libre (activa) de tiroxina, principal hormona tiroidea circulante',
    clinicalSignificance: 'Refleja producción tiroidea directa. T4 se convierte a T3 (activa) en tejidos periféricos.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 1.1, max: 1.5 }, normal: { min: 0.8, max: 1.8 }, attention: { min: 0.6, max: 2.5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hipertiroidismo, tiroiditis aguda, exceso de levotiroxina',
    lowMeaning: 'Hipotiroidismo, deficiencia de yodo, enfermedad no tiroidea',
    relatedBiomarkers: ['tsh', 'ft3'],
    longevityRelevance: 'high',
  },
  {
    id: 'ft3',
    name: 'T3 Libre',
    shortName: 'FT3',
    category: 'Tiroides',
    unit: 'pg/mL',
    alternativeUnits: [{ unit: 'pmol/L', factor: 1.536 }],
    description: 'Forma libre de triyodotironina, la hormona tiroidea más activa metabólicamente',
    clinicalSignificance: 'T3 es la hormona tiroidea activa. Ratio T3/T4 bajo sugiere pobre conversión periférica (estrés, inflamación, selenio bajo).',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 3.0, max: 3.8 }, normal: { min: 2.3, max: 4.2 }, attention: { min: 1.8, max: 5.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hipertiroidismo, T3 tirotoxicosis',
    lowMeaning: 'Síndrome de T3 baja (enfermedad no tiroidea), hipotiroidismo, estrés crónico, deficiencia de selenio',
    relatedBiomarkers: ['tsh', 'ft4', 'selenium'],
    longevityRelevance: 'high',
  },
  {
    id: 'anti_tpo',
    name: 'Anticuerpos Anti-Peroxidasa Tiroidea',
    shortName: 'Anti-TPO',
    category: 'Tiroides',
    subcategory: 'Autoinmune',
    unit: 'UI/mL',
    description: 'Anticuerpos contra la enzima peroxidasa tiroidea',
    clinicalSignificance: 'Marcador de tiroiditis autoinmune (Hashimoto). Presencia predice progresión a hipotiroidismo.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 15 }, normal: { min: 0, max: 35 }, attention: { min: 35, max: 200 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Tiroiditis de Hashimoto, Graves, autoinmunidad tiroidea',
    lowMeaning: 'Normal (ausencia de autoinmunidad tiroidea)',
    relatedBiomarkers: ['tsh', 'ft4', 'anti_tg'],
    longevityRelevance: 'medium',
  },
  {
    id: 'anti_tg',
    name: 'Anticuerpos Anti-Tiroglobulina',
    shortName: 'Anti-Tg',
    category: 'Tiroides',
    subcategory: 'Autoinmune',
    unit: 'UI/mL',
    description: 'Anticuerpos contra la tiroglobulina (proteína precursora de hormonas tiroideas)',
    clinicalSignificance: 'Complemento de Anti-TPO en diagnóstico de autoinmunidad tiroidea.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 20 }, normal: { min: 0, max: 40 }, attention: { min: 40, max: 200 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Tiroiditis autoinmune, cáncer tiroideo diferenciado',
    lowMeaning: 'Normal',
    relatedBiomarkers: ['anti_tpo', 'tsh'],
    longevityRelevance: 'medium',
  },
]

// ============================================================
// 7. HORMONAS
// ============================================================

const HORMONES: BiomarkerDefinition[] = [
  {
    id: 'testosterone_total',
    name: 'Testosterona Total',
    category: 'Hormonas',
    unit: 'ng/dL',
    alternativeUnits: [{ unit: 'nmol/L', factor: 0.0347 }],
    description: 'Principal andrógeno en hombres, presente en menor cantidad en mujeres',
    clinicalSignificance: 'Declina ~1-2% por año después de los 30. Niveles óptimos esenciales para masa muscular, densidad ósea, cognición y calidad de vida.',
    ranges: [
      { gender: 'male', age: '18-39', optimal: { min: 500, max: 900 }, normal: { min: 300, max: 1000 }, attention: { min: 200, max: 300 }, critical: { min: null, max: null } },
      { gender: 'male', age: '40-59', optimal: { min: 450, max: 800 }, normal: { min: 250, max: 900 }, attention: { min: 150, max: 250 }, critical: { min: null, max: null } },
      { gender: 'male', age: '60+', optimal: { min: 400, max: 700 }, normal: { min: 200, max: 800 }, attention: { min: 100, max: 200 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 15, max: 50 }, normal: { min: 8, max: 60 }, attention: { min: 60, max: 100 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hombre: exógena, tumor. Mujer: SOP, hirsutismo, tumor adrenal/ovárico',
    lowMeaning: 'Hipogonadismo, sarcopenia, osteoporosis, depresión, fatiga, disfunción sexual',
    relatedBiomarkers: ['testosterone_free', 'shbg', 'estradiol', 'lh', 'fsh'],
    longevityRelevance: 'high',
  },
  {
    id: 'testosterone_free',
    name: 'Testosterona Libre',
    category: 'Hormonas',
    unit: 'pg/mL',
    description: 'Fracción no unida a proteínas, biológicamente activa',
    clinicalSignificance: 'Más relevante clínicamente que testosterona total, especialmente si SHBG está elevada.',
    ranges: [
      { gender: 'male', age: '18-39', optimal: { min: 15, max: 25 }, normal: { min: 9, max: 30 }, attention: { min: 5, max: 9 }, critical: { min: null, max: null } },
      { gender: 'male', age: '40-59', optimal: { min: 10, max: 20 }, normal: { min: 6, max: 25 }, attention: { min: 3, max: 6 }, critical: { min: null, max: null } },
      { gender: 'male', age: '60+', optimal: { min: 8, max: 18 }, normal: { min: 5, max: 22 }, attention: { min: 2, max: 5 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 0.5, max: 3.0 }, normal: { min: 0.2, max: 5.0 }, attention: { min: 5.0, max: 10.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Similar a testosterona total elevada',
    lowMeaning: 'Hipogonadismo funcional, SHBG elevada, envejecimiento',
    relatedBiomarkers: ['testosterone_total', 'shbg'],
    longevityRelevance: 'high',
  },
  {
    id: 'estradiol',
    name: 'Estradiol',
    shortName: 'E2',
    category: 'Hormonas',
    unit: 'pg/mL',
    alternativeUnits: [{ unit: 'pmol/L', factor: 3.671 }],
    description: 'Principal estrógeno activo, esencial para salud ósea y cardiovascular',
    clinicalSignificance: 'En hombres: niveles moderados son protectores para hueso y corazón, pero exceso causa ginecomastia. En mujeres: regula ciclo menstrual y salud ósea.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 20, max: 35 }, normal: { min: 10, max: 45 }, attention: { min: 45, max: 60 }, critical: { min: null, max: null } },
      { gender: 'female', age: '18-39', optimal: { min: 50, max: 250 }, normal: { min: 30, max: 400 }, attention: { min: 15, max: 30 }, critical: { min: null, max: null } },
      { gender: 'female', age: '40-59', optimal: { min: 30, max: 200 }, normal: { min: 15, max: 350 }, attention: { min: 10, max: 15 }, critical: { min: null, max: null } },
      { gender: 'female', age: '60+', optimal: { min: 10, max: 30 }, normal: { min: 5, max: 50 }, attention: { min: 0, max: 5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hombre: ginecomastia, aromatización. Mujer: tumor ovárico, obesidad',
    lowMeaning: 'Hombre: riesgo óseo y CV. Mujer: menopausia, insuficiencia ovárica',
    relatedBiomarkers: ['testosterone_total', 'fsh', 'lh', 'shbg'],
    longevityRelevance: 'high',
  },
  {
    id: 'dhea_s',
    name: 'DHEA-Sulfato',
    shortName: 'DHEA-S',
    category: 'Hormonas',
    unit: 'µg/dL',
    alternativeUnits: [{ unit: 'µmol/L', factor: 0.0272 }],
    description: 'Hormona adrenal precursora de andrógenos y estrógenos',
    clinicalSignificance: 'Biomarcador de envejecimiento adrenal ("adrenopausia"). DHEA-S disminuye 2-3% por año. Niveles óptimos asociados a mejor inmunidad y longevidad.',
    ranges: [
      { gender: 'male', age: '18-39', optimal: { min: 300, max: 500 }, normal: { min: 200, max: 560 }, attention: { min: 100, max: 200 }, critical: { min: null, max: null } },
      { gender: 'male', age: '40-59', optimal: { min: 200, max: 400 }, normal: { min: 100, max: 450 }, attention: { min: 50, max: 100 }, critical: { min: null, max: null } },
      { gender: 'male', age: '60+', optimal: { min: 150, max: 300 }, normal: { min: 80, max: 370 }, attention: { min: 30, max: 80 }, critical: { min: null, max: null } },
      { gender: 'female', age: '18-39', optimal: { min: 200, max: 400 }, normal: { min: 120, max: 520 }, attention: { min: 50, max: 120 }, critical: { min: null, max: null } },
      { gender: 'female', age: '40-59', optimal: { min: 150, max: 350 }, normal: { min: 80, max: 430 }, attention: { min: 30, max: 80 }, critical: { min: null, max: null } },
      { gender: 'female', age: '60+', optimal: { min: 100, max: 250 }, normal: { min: 50, max: 300 }, attention: { min: 20, max: 50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'SOP, hiperplasia adrenal, tumor adrenal',
    lowMeaning: 'Adrenopausia, estrés crónico (agotamiento adrenal), envejecimiento acelerado',
    relatedBiomarkers: ['cortisol', 'testosterone_total'],
    longevityRelevance: 'high',
  },
  {
    id: 'cortisol',
    name: 'Cortisol (AM)',
    category: 'Hormonas',
    unit: 'µg/dL',
    alternativeUnits: [{ unit: 'nmol/L', factor: 27.59 }],
    description: 'Hormona del estrés producida por las glándulas adrenales (medición matutina)',
    clinicalSignificance: 'Cortisol crónicamente elevado acelera sarcopenia, osteoporosis, resistencia a insulina e inmunosupresión.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 8, max: 15 }, normal: { min: 6, max: 18 }, attention: { min: 3, max: 25 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Estrés crónico, Cushing, exógeno, depresión, insomnio',
    lowMeaning: 'Insuficiencia adrenal (Addison), fatiga adrenal, hipopituitarismo',
    relatedBiomarkers: ['dhea_s', 'insulin_fasting'],
    longevityRelevance: 'high',
  },
  {
    id: 'shbg',
    name: 'Globulina Fijadora de Hormonas Sexuales',
    shortName: 'SHBG',
    category: 'Hormonas',
    unit: 'nmol/L',
    description: 'Proteína que une y transporta testosterona y estradiol, regulando su biodisponibilidad',
    clinicalSignificance: 'SHBG alta reduce hormonas libres. SHBG baja asociada a resistencia a insulina y síndrome metabólico.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 25, max: 50 }, normal: { min: 15, max: 65 }, attention: { min: 10, max: 80 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 40, max: 80 }, normal: { min: 20, max: 130 }, attention: { min: 15, max: 150 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hipertiroidismo, estrógenos, cirrosis, envejecimiento, anticonvulsivantes',
    lowMeaning: 'Resistencia a insulina, obesidad, hipotiroidismo, SOP',
    relatedBiomarkers: ['testosterone_total', 'testosterone_free', 'estradiol'],
    longevityRelevance: 'medium',
  },
  {
    id: 'igf1',
    name: 'Factor de Crecimiento Insulínico tipo 1',
    shortName: 'IGF-1',
    category: 'Hormonas',
    unit: 'ng/mL',
    description: 'Mediador principal de la hormona de crecimiento, producido por el hígado',
    clinicalSignificance: 'IGF-1 es clave en longevidad: niveles moderados son óptimos. Muy alto acelera envejecimiento y riesgo oncológico (vía mTOR). Muy bajo causa sarcopenia.',
    ranges: [
      { gender: 'any', age: '18-39', optimal: { min: 150, max: 250 }, normal: { min: 100, max: 350 }, attention: { min: 80, max: 400 }, critical: { min: null, max: null } },
      { gender: 'any', age: '40-59', optimal: { min: 120, max: 220 }, normal: { min: 80, max: 300 }, attention: { min: 60, max: 350 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 100, max: 180 }, normal: { min: 60, max: 250 }, attention: { min: 40, max: 300 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Acromegalia, activación excesiva de mTOR, riesgo oncológico elevado',
    lowMeaning: 'Deficiencia de GH, desnutrición, enfermedad hepática, anorexia, sarcopenia',
    relatedBiomarkers: ['insulin_fasting', 'homa_ir'],
    longevityRelevance: 'high',
  },
  {
    id: 'fsh',
    name: 'Hormona Folículo Estimulante',
    shortName: 'FSH',
    category: 'Hormonas',
    unit: 'mUI/mL',
    description: 'Hormona hipofisaria que regula función gonadal',
    clinicalSignificance: 'En mujeres: marcador de reserva ovárica. FSH elevada indica menopausia/perimenopausia. En hombres: evalúa espermatogénesis.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 2, max: 8 }, normal: { min: 1.5, max: 12 }, attention: { min: 12, max: 30 }, critical: { min: null, max: null } },
      { gender: 'female', age: '18-39', optimal: { min: 3, max: 10 }, normal: { min: 1.5, max: 15 }, attention: { min: 15, max: 40 }, critical: { min: null, max: null } },
      { gender: 'female', age: '40-59', optimal: { min: 5, max: 25 }, normal: { min: 2, max: 100 }, attention: { min: 0, max: 2 }, critical: { min: null, max: null } },
      { gender: 'female', age: '60+', optimal: { min: 20, max: 80 }, normal: { min: 15, max: 130 }, attention: { min: 0, max: 15 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Menopausia, insuficiencia gonadal primaria, síndrome de Turner',
    lowMeaning: 'Hipogonadismo hipotalámico/hipofisario, anorexia, estrés',
    relatedBiomarkers: ['lh', 'estradiol', 'testosterone_total'],
    longevityRelevance: 'medium',
  },
  {
    id: 'lh',
    name: 'Hormona Luteinizante',
    shortName: 'LH',
    category: 'Hormonas',
    unit: 'mUI/mL',
    description: 'Hormona hipofisaria que estimula producción de testosterona y ovulación',
    clinicalSignificance: 'Ratio LH/FSH ayuda en diagnóstico de SOP. LH elevada en insuficiencia gonadal.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 2, max: 8 }, normal: { min: 1.5, max: 10 }, attention: { min: 10, max: 25 }, critical: { min: null, max: null } },
      { gender: 'female', age: '18-39', optimal: { min: 2, max: 12 }, normal: { min: 1, max: 20 }, attention: { min: 20, max: 50 }, critical: { min: null, max: null } },
      { gender: 'female', age: '60+', optimal: { min: 10, max: 50 }, normal: { min: 5, max: 80 }, attention: { min: 0, max: 5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Menopausia, insuficiencia gonadal primaria, SOP (ratio LH/FSH > 2)',
    lowMeaning: 'Hipogonadismo central, estrés, anorexia, hiperprolactinemia',
    relatedBiomarkers: ['fsh', 'testosterone_total', 'estradiol'],
    longevityRelevance: 'medium',
  },
  {
    id: 'prolactin',
    name: 'Prolactina',
    category: 'Hormonas',
    unit: 'ng/mL',
    description: 'Hormona hipofisaria, regula lactancia y función reproductiva',
    clinicalSignificance: 'Hiperprolactinemia suprime eje gonadal y reduce libido.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 3, max: 12 }, normal: { min: 2, max: 18 }, attention: { min: 18, max: 40 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 4, max: 20 }, normal: { min: 3, max: 29 }, attention: { min: 29, max: 60 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Prolactinoma, medicamentos (antipsicóticos), hipotiroidismo, estrés',
    lowMeaning: 'Hipopituitarismo (raro)',
    relatedBiomarkers: ['tsh', 'testosterone_total'],
    longevityRelevance: 'low',
  },
]

// ============================================================
// 8. VITAMINAS Y MINERALES
// ============================================================

const VITAMINS_MINERALS: BiomarkerDefinition[] = [
  {
    id: 'vitamin_d',
    name: 'Vitamina D (25-OH)',
    shortName: '25(OH)D',
    category: 'Vitaminas y Minerales',
    unit: 'ng/mL',
    alternativeUnits: [{ unit: 'nmol/L', factor: 2.496 }],
    description: 'Forma circulante de vitamina D, esencial para huesos, inmunidad y longevidad',
    clinicalSignificance: 'Deficiencia asociada a osteoporosis, cáncer, autoinmunidad, depresión y mayor mortalidad. En longevidad, rangos de 50-80 ng/mL son óptimos.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 50, max: 80 }, normal: { min: 30, max: 100 }, attention: { min: 15, max: 30 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Toxicidad (>100): hipercalcemia, cálculos renales. Raro sin suplementación excesiva.',
    lowMeaning: 'Raquitismo/osteomalacia, osteoporosis, inmunosupresión, depresión, mayor riesgo de cáncer',
    relatedBiomarkers: ['calcium', 'phosphorus', 'pth'],
    longevityRelevance: 'high',
  },
  {
    id: 'vitamin_b12',
    name: 'Vitamina B12',
    shortName: 'B12',
    category: 'Vitaminas y Minerales',
    unit: 'pg/mL',
    alternativeUnits: [{ unit: 'pmol/L', factor: 0.738 }],
    description: 'Esencial para función neurológica, formación de glóbulos rojos y síntesis de ADN',
    clinicalSignificance: 'Deficiencia causa anemia megaloblástica y neuropatía. Absorción disminuye con edad y uso de metformina/IBP.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 500, max: 900 }, normal: { min: 200, max: 1100 }, attention: { min: 150, max: 200 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Exceso de suplementación (generalmente benigno), leucemia, enfermedad hepática',
    lowMeaning: 'Anemia perniciosa, malabsorción, veganos, metformina, IBP, gastritis atrófica, neuropatía',
    relatedBiomarkers: ['folate', 'homocysteine', 'mcv', 'methylmalonic_acid'],
    longevityRelevance: 'high',
  },
  {
    id: 'folate',
    name: 'Ácido Fólico',
    shortName: 'Folato',
    category: 'Vitaminas y Minerales',
    unit: 'ng/mL',
    alternativeUnits: [{ unit: 'nmol/L', factor: 2.266 }],
    description: 'Vitamina B9, esencial para síntesis de ADN y metilación',
    clinicalSignificance: 'Deficiencia causa anemia megaloblástica y eleva homocisteína. Crucial en embarazo. Cofactor de metilación del ADN.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 10, max: 25 }, normal: { min: 5, max: 30 }, attention: { min: 3, max: 5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Exceso de suplementación (puede enmascarar deficiencia de B12)',
    lowMeaning: 'Anemia megaloblástica, hiperhomocisteinemia, defectos del tubo neural, riesgo cardiovascular',
    relatedBiomarkers: ['vitamin_b12', 'homocysteine'],
    longevityRelevance: 'high',
  },
  {
    id: 'ferritin',
    name: 'Ferritina',
    category: 'Vitaminas y Minerales',
    unit: 'ng/mL',
    alternativeUnits: [{ unit: 'µg/L', factor: 1 }],
    description: 'Proteína de almacenamiento de hierro, también reactante de fase aguda',
    clinicalSignificance: 'Marcador de reservas de hierro y de inflamación. Ferritina elevada es proinflamatoria y pro-oxidante. En longevidad, ferritina moderada-baja es óptima.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 40, max: 150 }, normal: { min: 20, max: 300 }, attention: { min: 300, max: 500 }, critical: { min: null, max: null } },
      { gender: 'female', age: '18-39', optimal: { min: 30, max: 100 }, normal: { min: 12, max: 200 }, attention: { min: 200, max: 400 }, critical: { min: null, max: null } },
      { gender: 'female', age: '40-59', optimal: { min: 30, max: 120 }, normal: { min: 12, max: 250 }, attention: { min: 250, max: 400 }, critical: { min: null, max: null } },
      { gender: 'female', age: '60+', optimal: { min: 30, max: 150 }, normal: { min: 15, max: 300 }, attention: { min: 300, max: 500 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Sobrecarga de hierro, hemocromatosis, inflamación, infección, cáncer, hígado graso, estrés oxidativo',
    lowMeaning: 'Deficiencia de hierro (anemia ferropénica), hemorragia, malabsorción',
    relatedBiomarkers: ['iron', 'transferrin_saturation', 'tibc', 'crp_hs'],
    longevityRelevance: 'high',
  },
  {
    id: 'iron',
    name: 'Hierro Sérico',
    category: 'Vitaminas y Minerales',
    unit: 'µg/dL',
    alternativeUnits: [{ unit: 'µmol/L', factor: 0.179 }],
    description: 'Hierro circulante en sangre, unido a transferrina',
    clinicalSignificance: 'Varía mucho durante el día. Mejor interpretar con ferritina, transferrina y TIBC juntos.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 70, max: 150 }, normal: { min: 50, max: 170 }, attention: { min: 35, max: 200 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 60, max: 140 }, normal: { min: 40, max: 160 }, attention: { min: 25, max: 185 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hemocromatosis, hepatitis, suplementación excesiva',
    lowMeaning: 'Deficiencia de hierro, inflamación crónica (secuestro), hemorragia',
    relatedBiomarkers: ['ferritin', 'transferrin_saturation', 'tibc', 'hemoglobin'],
    longevityRelevance: 'medium',
  },
  {
    id: 'transferrin_saturation',
    name: 'Saturación de Transferrina',
    shortName: 'Sat. Transferrina',
    category: 'Vitaminas y Minerales',
    unit: '%',
    description: 'Porcentaje de transferrina ocupada por hierro',
    clinicalSignificance: 'Mejor marcador de disponibilidad de hierro junto con ferritina.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 25, max: 40 }, normal: { min: 20, max: 50 }, attention: { min: 15, max: 55 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 22, max: 38 }, normal: { min: 15, max: 50 }, attention: { min: 12, max: 55 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Sobrecarga de hierro, hemocromatosis (>55%)',
    lowMeaning: 'Deficiencia de hierro, inflamación crónica',
    relatedBiomarkers: ['iron', 'ferritin', 'tibc'],
    longevityRelevance: 'medium',
  },
  {
    id: 'calcium',
    name: 'Calcio Total',
    category: 'Vitaminas y Minerales',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.25 }],
    description: 'Mineral esencial para huesos, coagulación, músculos y señalización celular',
    clinicalSignificance: 'Regulado estrechamente por PTH y vitamina D. Hipercalcemia puede indicar hiperparatiroidismo o cáncer.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 9.0, max: 10.0 }, normal: { min: 8.5, max: 10.5 }, attention: { min: 7.5, max: 11.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hiperparatiroidismo, cáncer con metástasis óseas, exceso de vitamina D, sarcoidosis',
    lowMeaning: 'Hipoparatiroidismo, deficiencia de vitamina D, malabsorción, insuficiencia renal',
    relatedBiomarkers: ['vitamin_d', 'phosphorus', 'pth', 'magnesium'],
    longevityRelevance: 'medium',
  },
  {
    id: 'magnesium',
    name: 'Magnesio',
    category: 'Vitaminas y Minerales',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.411 }],
    description: 'Cofactor en >300 reacciones enzimáticas, esencial para energía, músculos y nervios',
    clinicalSignificance: 'Deficiencia subclínica es extremadamente común (afecta ~50% de la población). Asociada a arritmias, resistencia a insulina, hipertensión y envejecimiento acelerado.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 2.0, max: 2.4 }, normal: { min: 1.7, max: 2.5 }, attention: { min: 1.4, max: 1.7 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Insuficiencia renal, exceso de suplementos, hipotiroidismo',
    lowMeaning: 'Deficiencia dietética, diuréticos, alcohol, diabetes, IBP, arritmias, calambres',
    relatedBiomarkers: ['calcium', 'potassium', 'vitamin_d'],
    longevityRelevance: 'high',
  },
  {
    id: 'zinc',
    name: 'Zinc',
    category: 'Vitaminas y Minerales',
    unit: 'µg/dL',
    alternativeUnits: [{ unit: 'µmol/L', factor: 0.153 }],
    description: 'Oligoelemento esencial para inmunidad, cicatrización, hormonas y ADN',
    clinicalSignificance: 'Zinc declina con edad. Deficiencia impacta inmunidad, testosterona, tiroides y cicatrización.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 80, max: 120 }, normal: { min: 60, max: 130 }, attention: { min: 50, max: 60 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Suplementación excesiva, deficiencia de cobre secundaria',
    lowMeaning: 'Inmunodepresión, hipogonadismo, alopecia, dermatitis, anosmia, mala cicatrización',
    relatedBiomarkers: ['testosterone_total', 'tsh'],
    longevityRelevance: 'high',
  },
  {
    id: 'selenium',
    name: 'Selenio',
    category: 'Vitaminas y Minerales',
    unit: 'µg/L',
    description: 'Oligoelemento esencial, cofactor de glutatión peroxidasa y deiodinasas tiroideas',
    clinicalSignificance: 'Esencial para conversión T4→T3 y defensa antioxidante. Deficiencia asociada a mayor riesgo de cáncer y disfunción tiroidea.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 100, max: 150 }, normal: { min: 70, max: 180 }, attention: { min: 50, max: 70 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Toxicidad (>200): selenosis (cabello frágil, uñas, neuropatía)',
    lowMeaning: 'Hipotiroidismo funcional (mala conversión T4→T3), estrés oxidativo, cardiomiopatía (Keshan)',
    relatedBiomarkers: ['ft3', 'ft4', 'tsh'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 9. INFLAMACIÓN
// ============================================================

const INFLAMMATION: BiomarkerDefinition[] = [
  {
    id: 'crp_hs',
    name: 'Proteína C Reactiva Ultrasensible',
    shortName: 'PCR-us',
    category: 'Inflamación',
    unit: 'mg/L',
    description: 'Marcador de inflamación sistémica de baja intensidad',
    clinicalSignificance: 'Predictor independiente de riesgo cardiovascular. Inflamación crónica de bajo grado ("inflammaging") es motor principal de envejecimiento.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 0.5 }, normal: { min: 0, max: 1.0 }, attention: { min: 1.0, max: 3.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Riesgo CV: bajo (<1), moderado (1-3), alto (>3). Inflamación crónica, infección, autoinmune, obesidad visceral',
    lowMeaning: 'Excelente estado antiinflamatorio',
    relatedBiomarkers: ['homocysteine', 'fibrinogen', 'esr', 'il6', 'ferritin'],
    longevityRelevance: 'high',
  },
  {
    id: 'homocysteine',
    name: 'Homocisteína',
    category: 'Inflamación',
    unit: 'µmol/L',
    description: 'Aminoácido del metabolismo de metionina, depurado por B12, B6 y folato',
    clinicalSignificance: 'Hiperhomocisteinemia es factor de riesgo cardiovascular independiente y neurotóxico. Marcador funcional de deficiencia de B12/folato/B6.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 5, max: 8 }, normal: { min: 4, max: 12 }, attention: { min: 12, max: 20 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Riesgo cardiovascular, daño endotelial, trombosis, deterioro cognitivo, deficiencia B12/folato/B6, MTHFR mutado',
    lowMeaning: 'Sin significado clínico (generalmente favorable)',
    relatedBiomarkers: ['vitamin_b12', 'folate', 'crp_hs'],
    longevityRelevance: 'high',
  },
  {
    id: 'fibrinogen',
    name: 'Fibrinógeno',
    category: 'Inflamación',
    unit: 'mg/dL',
    description: 'Proteína de coagulación y reactante de fase aguda',
    clinicalSignificance: 'Fibrinógeno elevado aumenta riesgo de trombosis y es marcador de inflamación crónica.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 180, max: 300 }, normal: { min: 150, max: 400 }, attention: { min: 400, max: 550 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Inflamación, riesgo trombótico, tabaquismo, obesidad, embarazo',
    lowMeaning: 'Coagulopatía, insuficiencia hepática, CID',
    relatedBiomarkers: ['crp_hs', 'esr', 'd_dimer'],
    longevityRelevance: 'medium',
  },
  {
    id: 'il6',
    name: 'Interleucina-6',
    shortName: 'IL-6',
    category: 'Inflamación',
    subcategory: 'Citoquinas',
    unit: 'pg/mL',
    description: 'Citoquina proinflamatoria clave en la respuesta inmune',
    clinicalSignificance: 'IL-6 crónicamente elevada es biomarcador central del "inflammaging". Predictor de fragilidad, sarcopenia y mortalidad en adultos mayores.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 1.5 }, normal: { min: 0, max: 3.0 }, attention: { min: 3.0, max: 7.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Inflamación crónica, infección, autoinmune, obesidad visceral, envejecimiento acelerado',
    lowMeaning: 'Excelente estado antiinflamatorio',
    relatedBiomarkers: ['crp_hs', 'tnf_alpha', 'ferritin'],
    longevityRelevance: 'high',
  },
  {
    id: 'tnf_alpha',
    name: 'Factor de Necrosis Tumoral Alfa',
    shortName: 'TNF-α',
    category: 'Inflamación',
    subcategory: 'Citoquinas',
    unit: 'pg/mL',
    description: 'Citoquina proinflamatoria producida por macrófagos',
    clinicalSignificance: 'TNF-α crónico acelera resistencia a insulina, sarcopenia y neurodegeneración.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 1.0 }, normal: { min: 0, max: 2.0 }, attention: { min: 2.0, max: 5.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Inflamación crónica, autoinmune, obesidad, sepsis',
    lowMeaning: 'Favorable',
    relatedBiomarkers: ['il6', 'crp_hs'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 10. ELECTROLITOS
// ============================================================

const ELECTROLYTES: BiomarkerDefinition[] = [
  {
    id: 'sodium',
    name: 'Sodio',
    shortName: 'Na+',
    category: 'Electrolitos',
    unit: 'mEq/L',
    alternativeUnits: [{ unit: 'mmol/L', factor: 1 }],
    description: 'Principal catión extracelular, regula volumen de fluidos y presión arterial',
    clinicalSignificance: 'Hiponatremia crónica leve (Na 133-136) asociada a mayor mortalidad y deterioro cognitivo en adultos mayores.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 138, max: 142 }, normal: { min: 136, max: 145 }, attention: { min: 130, max: 150 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Deshidratación, diabetes insípida, Cushing, ingesta excesiva de sodio',
    lowMeaning: 'SIADH, diuréticos, insuficiencia cardíaca, polidipsia, hipotiroidismo',
    relatedBiomarkers: ['potassium', 'chloride'],
    longevityRelevance: 'medium',
  },
  {
    id: 'potassium',
    name: 'Potasio',
    shortName: 'K+',
    category: 'Electrolitos',
    unit: 'mEq/L',
    alternativeUnits: [{ unit: 'mmol/L', factor: 1 }],
    description: 'Principal catión intracelular, esencial para función cardíaca y muscular',
    clinicalSignificance: 'Valores extremos causan arritmias potencialmente fatales.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 4.0, max: 4.8 }, normal: { min: 3.5, max: 5.0 }, attention: { min: 3.0, max: 5.5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Insuficiencia renal, acidosis, IECAs/ARA-II, hemólisis (artefacto), arritmias',
    lowMeaning: 'Diuréticos, vómitos, diarrea, alcalosis, arritmias, debilidad muscular',
    relatedBiomarkers: ['sodium', 'magnesium', 'creatinine'],
    longevityRelevance: 'medium',
  },
  {
    id: 'chloride',
    name: 'Cloro',
    shortName: 'Cl-',
    category: 'Electrolitos',
    unit: 'mEq/L',
    description: 'Principal anión extracelular, acompaña al sodio',
    clinicalSignificance: 'Importante en equilibrio ácido-base. Generalmente se mueve paralelo al sodio.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 100, max: 104 }, normal: { min: 98, max: 106 }, attention: { min: 94, max: 110 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Deshidratación, acidosis metabólica, insuficiencia renal',
    lowMeaning: 'Vómitos prolongados, alcalosis metabólica, SIADH',
    relatedBiomarkers: ['sodium', 'bicarbonate'],
    longevityRelevance: 'low',
  },
  {
    id: 'phosphorus',
    name: 'Fósforo',
    category: 'Electrolitos',
    unit: 'mg/dL',
    alternativeUnits: [{ unit: 'mmol/L', factor: 0.323 }],
    description: 'Mineral esencial para huesos, energía (ATP) y membranas celulares',
    clinicalSignificance: 'Fósforo elevado crónico acelera calcificación vascular y envejecimiento (vía FGF23/Klotho).',
    ranges: [
      { gender: 'any', age: '18-59', optimal: { min: 2.8, max: 4.0 }, normal: { min: 2.5, max: 4.5 }, attention: { min: 2.0, max: 5.5 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 2.5, max: 3.8 }, normal: { min: 2.3, max: 4.5 }, attention: { min: 2.0, max: 5.5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Insuficiencia renal, hipoparatiroidismo, calcificación vascular acelerada, envejecimiento (Klotho)',
    lowMeaning: 'Hiperparatiroidismo, deficiencia vitamina D, malabsorción, realimentación',
    relatedBiomarkers: ['calcium', 'vitamin_d', 'pth'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 11. COAGULACIÓN
// ============================================================

const COAGULATION: BiomarkerDefinition[] = [
  {
    id: 'pt_inr',
    name: 'Tiempo de Protrombina / INR',
    shortName: 'TP/INR',
    category: 'Coagulación',
    unit: 'INR',
    description: 'Evalúa vía extrínseca de coagulación y función hepática',
    clinicalSignificance: 'Monitorea anticoagulación con warfarina y función hepática sintética.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0.9, max: 1.1 }, normal: { min: 0.8, max: 1.2 }, attention: { min: 1.2, max: 2.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Deficiencia factores coagulación, warfarina, insuficiencia hepática, deficiencia vitamina K',
    lowMeaning: 'Estado hipercoagulable (raro)',
    relatedBiomarkers: ['ptt', 'fibrinogen'],
    longevityRelevance: 'low',
  },
  {
    id: 'd_dimer',
    name: 'Dímero D',
    category: 'Coagulación',
    unit: 'ng/mL',
    alternativeUnits: [{ unit: 'µg/L', factor: 1 }, { unit: 'mg/L FEU', factor: 0.001 }],
    description: 'Producto de degradación de fibrina, marcador de activación de coagulación',
    clinicalSignificance: 'Elevado en trombosis (TVP, TEP), pero también en inflamación, cáncer, cirugía, embarazo. Aumenta con la edad.',
    ranges: [
      { gender: 'any', age: '18-59', optimal: { min: 0, max: 250 }, normal: { min: 0, max: 500 }, attention: { min: 500, max: 1000 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 0, max: 350 }, normal: { min: 0, max: 750 }, attention: { min: 750, max: 1500 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Trombosis venosa/pulmonar, CID, inflamación, cáncer, post-cirugía',
    lowMeaning: 'Excelente (descarta trombosis activa)',
    relatedBiomarkers: ['fibrinogen', 'pt_inr'],
    longevityRelevance: 'medium',
  },
]

// ============================================================
// 12. MARCADORES CARDÍACOS
// ============================================================

const CARDIAC: BiomarkerDefinition[] = [
  {
    id: 'nt_probnp',
    name: 'NT-proBNP',
    category: 'Cardíaco',
    unit: 'pg/mL',
    description: 'Péptido liberado por ventrículos cardíacos en respuesta a estiramiento por sobrecarga de volumen/presión',
    clinicalSignificance: 'Gold standard para detección de insuficiencia cardíaca. Aumenta con edad. Predictor de mortalidad cardiovascular.',
    ranges: [
      { gender: 'any', age: '18-59', optimal: { min: 0, max: 75 }, normal: { min: 0, max: 125 }, attention: { min: 125, max: 450 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 0, max: 150 }, normal: { min: 0, max: 300 }, attention: { min: 300, max: 900 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Insuficiencia cardíaca, fibrilación auricular, hipertensión pulmonar, embolia pulmonar',
    lowMeaning: 'Excelente función cardíaca (descarta IC con alta confianza)',
    relatedBiomarkers: ['troponin'],
    longevityRelevance: 'high',
  },
  {
    id: 'troponin',
    name: 'Troponina de Alta Sensibilidad',
    shortName: 'hs-Troponina',
    category: 'Cardíaco',
    unit: 'ng/L',
    description: 'Proteína liberada por cardiomiocitos dañados',
    clinicalSignificance: 'Marcador definitivo de daño miocárdico. Troponina ultrasensible elevada crónicamente predice eventos cardiovasculares.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 0, max: 10 }, normal: { min: 0, max: 22 }, attention: { min: 22, max: 52 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 0, max: 8 }, normal: { min: 0, max: 14 }, attention: { min: 14, max: 40 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Infarto agudo, miocarditis, embolia pulmonar, insuficiencia cardíaca, ejercicio extremo',
    lowMeaning: 'Excelente (sin daño miocárdico)',
    relatedBiomarkers: ['nt_probnp', 'ck'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 13. MARCADORES TUMORALES
// ============================================================

const TUMOR_MARKERS: BiomarkerDefinition[] = [
  {
    id: 'psa',
    name: 'Antígeno Prostático Específico',
    shortName: 'PSA',
    category: 'Marcadores Tumorales',
    unit: 'ng/mL',
    description: 'Proteína producida por la próstata, utilizada en screening de cáncer prostático',
    clinicalSignificance: 'PSA no es específico de cáncer (se eleva en hiperplasia benigna, prostatitis). Velocidad de cambio del PSA es más informativa que valor absoluto.',
    ranges: [
      { gender: 'male', age: '18-39', optimal: { min: 0, max: 1.0 }, normal: { min: 0, max: 2.0 }, attention: { min: 2.0, max: 4.0 }, critical: { min: null, max: null } },
      { gender: 'male', age: '40-59', optimal: { min: 0, max: 1.5 }, normal: { min: 0, max: 3.0 }, attention: { min: 3.0, max: 6.0 }, critical: { min: null, max: null } },
      { gender: 'male', age: '60+', optimal: { min: 0, max: 2.5 }, normal: { min: 0, max: 4.0 }, attention: { min: 4.0, max: 10.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Cáncer de próstata, hiperplasia prostática benigna, prostatitis, post-biopsia',
    lowMeaning: 'Normal (sin patología prostática)',
    relatedBiomarkers: ['testosterone_total'],
    longevityRelevance: 'medium',
  },
  {
    id: 'cea',
    name: 'Antígeno Carcinoembrionario',
    shortName: 'CEA',
    category: 'Marcadores Tumorales',
    unit: 'ng/mL',
    description: 'Marcador tumoral inespecífico, útil para seguimiento de cáncer colorrectal',
    clinicalSignificance: 'Más útil en seguimiento que en screening. Elevado en fumadores y condiciones benignas.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 2.5 }, normal: { min: 0, max: 5.0 }, attention: { min: 5.0, max: 10.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Cáncer colorrectal, páncreas, pulmón, mama, tabaquismo, colitis',
    lowMeaning: 'Normal',
    relatedBiomarkers: [],
    longevityRelevance: 'low',
  },
]

// ============================================================
// 14. MARCADORES DE LONGEVIDAD / ENVEJECIMIENTO
// ============================================================

const LONGEVITY: BiomarkerDefinition[] = [
  {
    id: 'omega3_index',
    name: 'Índice Omega-3',
    category: 'Longevidad',
    unit: '%',
    description: 'Porcentaje de EPA + DHA en membranas de eritrocitos',
    clinicalSignificance: 'Índice Omega-3 > 8% asociado a 35% menor mortalidad cardiovascular. Marcador de salud de membranas celulares y antiinflamación.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 8, max: 12 }, normal: { min: 5, max: 14 }, attention: { min: 3, max: 5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Excelente (protector)',
    lowMeaning: 'Riesgo cardiovascular aumentado, inflamación, depresión',
    relatedBiomarkers: ['crp_hs', 'triglycerides'],
    longevityRelevance: 'high',
  },
  {
    id: 'coq10',
    name: 'Coenzima Q10',
    shortName: 'CoQ10',
    category: 'Longevidad',
    unit: 'µg/mL',
    description: 'Antioxidante y cofactor mitocondrial esencial para producción de ATP',
    clinicalSignificance: 'CoQ10 declina con edad y uso de estatinas. Deficiencia causa fatiga, debilidad muscular y miopatía.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 1.0, max: 3.0 }, normal: { min: 0.5, max: 3.5 }, attention: { min: 0.3, max: 0.5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Suplementación (generalmente benigno)',
    lowMeaning: 'Fatiga mitocondrial, miopatía por estatinas, envejecimiento celular, insuficiencia cardíaca',
    relatedBiomarkers: [],
    longevityRelevance: 'high',
  },
  {
    id: 'glutathione',
    name: 'Glutatión (GSH)',
    category: 'Longevidad',
    unit: 'µmol/L',
    description: 'Principal antioxidante intracelular, "master antioxidant"',
    clinicalSignificance: 'Glutatión es el antioxidante más importante del cuerpo. Declina significativamente con edad. Marcador de capacidad antioxidante celular.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 700, max: 1000 }, normal: { min: 500, max: 1100 }, attention: { min: 300, max: 500 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Excelente capacidad antioxidante',
    lowMeaning: 'Estrés oxidativo, envejecimiento acelerado, toxicidad hepática, enfermedad crónica',
    relatedBiomarkers: ['vitamin_d', 'selenium'],
    longevityRelevance: 'high',
  },
  {
    id: 'nad_plus',
    name: 'NAD+',
    category: 'Longevidad',
    unit: 'µmol/L',
    description: 'Coenzima esencial para metabolismo energético y activación de sirtuinas',
    clinicalSignificance: 'NAD+ declina ~50% entre los 40 y 60 años. Esencial para reparación de ADN (PARP), sirtuinas (SIRT1-7) y función mitocondrial.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 25, max: 50 }, normal: { min: 15, max: 60 }, attention: { min: 8, max: 15 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Suplementación con NMN/NR (favorable)',
    lowMeaning: 'Envejecimiento celular acelerado, disfunción mitocondrial, reparación de ADN comprometida',
    relatedBiomarkers: [],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 15. URINARIO
// ============================================================

const URINARY: BiomarkerDefinition[] = [
  {
    id: 'microalbumin_creatinine_ratio',
    name: 'Relación Albúmina/Creatinina en Orina',
    shortName: 'ACR',
    category: 'Urinario',
    unit: 'mg/g',
    description: 'Detecta microalbuminuria, daño renal temprano',
    clinicalSignificance: 'Marcador más temprano de nefropatía diabética y daño endotelial. Elevado también en hipertensión y enfermedad cardiovascular.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 10 }, normal: { min: 0, max: 30 }, attention: { min: 30, max: 300 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Microalbuminuria (30-300): daño renal temprano, riesgo CV. Macroalbuminuria (>300): nefropatía establecida',
    lowMeaning: 'Función renal glomerular normal',
    relatedBiomarkers: ['creatinine', 'egfr', 'hba1c'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 16. PANCREÁTICO
// ============================================================

const PANCREATIC: BiomarkerDefinition[] = [
  {
    id: 'amylase',
    name: 'Amilasa',
    category: 'Pancreático',
    unit: 'U/L',
    description: 'Enzima digestiva producida por páncreas y glándulas salivales',
    clinicalSignificance: 'Marcador de pancreatitis aguda. Eleva 6-12h post-inicio y normaliza en 3-5 días. Ref: Mayo Clinic Laboratory.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 25, max: 80 }, normal: { min: 20, max: 110 }, attention: { min: 110, max: 300 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Pancreatitis aguda (>3x normal), parotiditis, obstrucción biliar, insuficiencia renal',
    lowMeaning: 'Insuficiencia pancreática exocrina, fibrosis quística avanzada',
    relatedBiomarkers: ['lipase'],
    longevityRelevance: 'low',
  },
  {
    id: 'lipase',
    name: 'Lipasa',
    category: 'Pancreático',
    unit: 'U/L',
    description: 'Enzima pancreática que digiere grasas, más específica que amilasa para páncreas',
    clinicalSignificance: 'Más específica y sensible que amilasa para pancreatitis. Permanece elevada más tiempo (8-14 días). Ref: UpToDate — Diagnosis of acute pancreatitis.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 10, max: 50 }, normal: { min: 5, max: 60 }, attention: { min: 60, max: 180 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Pancreatitis aguda (>3x normal es diagnóstico), cálculos biliares, alcohol',
    lowMeaning: 'Insuficiencia pancreática exocrina crónica',
    relatedBiomarkers: ['amylase', 'triglycerides'],
    longevityRelevance: 'low',
  },
  {
    id: 'c_peptide',
    name: 'Péptido C',
    shortName: 'C-Péptido',
    category: 'Pancreático',
    unit: 'ng/mL',
    alternativeUnits: [{ unit: 'nmol/L', factor: 0.331 }],
    description: 'Subproducto de la producción de insulina, refleja secreción pancreática endógena',
    clinicalSignificance: 'A diferencia de la insulina, no es afectado por insulina exógena. Diferencia DM tipo 1 vs tipo 2. Ref: Stanford Diabetes Research Center.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 1.0, max: 2.5 }, normal: { min: 0.8, max: 3.5 }, attention: { min: 0.4, max: 5.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Resistencia a insulina, insulinoma, síndrome metabólico',
    lowMeaning: 'Diabetes tipo 1, insuficiencia pancreática, insulina exógena',
    relatedBiomarkers: ['insulin_fasting', 'glucose_fasting', 'hba1c'],
    longevityRelevance: 'high',
  },
  {
    id: 'fructosamine',
    name: 'Fructosamina',
    category: 'Pancreático',
    unit: 'µmol/L',
    description: 'Proteínas glicosiladas que reflejan control glucémico de 2-3 semanas',
    clinicalSignificance: 'Alternativa a HbA1c cuando esta no es confiable (hemoglobinopatías, anemia hemolítica). Ref: UpToDate — Glycemic monitoring.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 190, max: 260 }, normal: { min: 170, max: 285 }, attention: { min: 285, max: 380 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Control glucémico deficiente en las últimas 2-3 semanas',
    lowMeaning: 'Excelente control glucémico, hipoalbuminemia (falso bajo)',
    relatedBiomarkers: ['hba1c', 'glucose_fasting'],
    longevityRelevance: 'medium',
  },
]

// ============================================================
// 17. INMUNOLÓGICO
// ============================================================

const IMMUNOLOGIC: BiomarkerDefinition[] = [
  {
    id: 'iga',
    name: 'Inmunoglobulina A',
    shortName: 'IgA',
    category: 'Inmunológico',
    unit: 'mg/dL',
    description: 'Anticuerpo predominante en mucosas (respiratoria, digestiva, urogenital)',
    clinicalSignificance: 'Deficiencia de IgA es la inmunodeficiencia primaria más común. IgA elevada en enfermedad celíaca, cirrosis, infecciones crónicas. Ref: Mayo Clinic — Immunoglobulin testing.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 80, max: 300 }, normal: { min: 70, max: 400 }, attention: { min: 40, max: 500 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Enfermedad celíaca, cirrosis, infecciones crónicas, nefropatía IgA',
    lowMeaning: 'Deficiencia selectiva de IgA (1:500 personas), inmunodeficiencia',
    relatedBiomarkers: ['igg', 'igm'],
    longevityRelevance: 'medium',
  },
  {
    id: 'igg',
    name: 'Inmunoglobulina G',
    shortName: 'IgG',
    category: 'Inmunológico',
    unit: 'mg/dL',
    description: 'Anticuerpo más abundante en sangre, memoria inmunológica a largo plazo',
    clinicalSignificance: 'IgG subclases (1-4) son relevantes en inmunodeficiencias. IgG elevada en infecciones crónicas, autoinmunidad, mieloma. Ref: Harrison\'s Principles of Internal Medicine.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 700, max: 1400 }, normal: { min: 600, max: 1600 }, attention: { min: 400, max: 2000 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Infección crónica, autoinmune, mieloma IgG, hepatitis, sarcoidosis',
    lowMeaning: 'Hipogammaglobulinemia, inmunodeficiencia primaria/secundaria, pérdida renal/intestinal',
    relatedBiomarkers: ['iga', 'igm', 'ige'],
    longevityRelevance: 'medium',
  },
  {
    id: 'igm',
    name: 'Inmunoglobulina M',
    shortName: 'IgM',
    category: 'Inmunológico',
    unit: 'mg/dL',
    description: 'Primer anticuerpo producido en respuesta inmune aguda',
    clinicalSignificance: 'IgM elevada indica infección aguda o reciente. Macroglobulinemia de Waldenström produce exceso monoclonal. Ref: UpToDate — Approach to the patient with an elevated serum IgM.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 50, max: 200 }, normal: { min: 40, max: 250 }, attention: { min: 25, max: 350 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Infección aguda, Waldenström, cirrosis biliar primaria, hepatitis',
    lowMeaning: 'Inmunodeficiencia, síndrome nefrótico',
    relatedBiomarkers: ['iga', 'igg'],
    longevityRelevance: 'low',
  },
  {
    id: 'ige',
    name: 'Inmunoglobulina E',
    shortName: 'IgE Total',
    category: 'Inmunológico',
    unit: 'UI/mL',
    description: 'Anticuerpo mediador de reacciones alérgicas y defensa antiparasitaria',
    clinicalSignificance: 'IgE elevada es marcador de atopia, alergia, y parasitosis. Ref: Mayo Clinic — Allergy testing.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 50 }, normal: { min: 0, max: 100 }, attention: { min: 100, max: 500 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Atopia, asma alérgica, dermatitis atópica, parasitosis, aspergilosis, síndrome hiper-IgE',
    lowMeaning: 'Sin significado clínico (puede ser normal)',
    relatedBiomarkers: ['eosinophils'],
    longevityRelevance: 'low',
  },
  {
    id: 'complement_c3',
    name: 'Complemento C3',
    category: 'Inmunológico',
    subcategory: 'Sistema del Complemento',
    unit: 'mg/dL',
    description: 'Componente central del sistema del complemento inmune',
    clinicalSignificance: 'C3 bajo indica consumo por activación (lupus, glomerulonefritis). C3 elevado como reactante de fase aguda. Ref: UpToDate — Complement pathway.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 90, max: 160 }, normal: { min: 80, max: 180 }, attention: { min: 60, max: 220 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Inflamación aguda (reactante de fase aguda), obstrucción biliar',
    lowMeaning: 'Lupus activo, glomerulonefritis, hepatitis crónica, sepsis, CID',
    relatedBiomarkers: ['complement_c4', 'crp_hs'],
    longevityRelevance: 'medium',
  },
  {
    id: 'complement_c4',
    name: 'Complemento C4',
    category: 'Inmunológico',
    subcategory: 'Sistema del Complemento',
    unit: 'mg/dL',
    description: 'Componente de la vía clásica del complemento',
    clinicalSignificance: 'C4 crónicamente bajo sugiere angioedema hereditario o lupus activo. Ref: UpToDate — Hereditary angioedema.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 15, max: 35 }, normal: { min: 10, max: 40 }, attention: { min: 6, max: 50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Inflamación aguda',
    lowMeaning: 'Angioedema hereditario, lupus activo, crioglobulinemia',
    relatedBiomarkers: ['complement_c3'],
    longevityRelevance: 'low',
  },
]

// ============================================================
// 18. LÍPIDOS AVANZADOS (Harvard Cardiovascular Risk)
// ============================================================

const LIPIDS_ADVANCED: BiomarkerDefinition[] = [
  {
    id: 'sdldl',
    name: 'LDL Pequeño y Denso',
    shortName: 'sdLDL',
    category: 'Lípidos',
    subcategory: 'Avanzado',
    unit: 'mg/dL',
    description: 'Subfracción de LDL más aterogénica por su capacidad de penetrar endotelio y oxidarse',
    clinicalSignificance: 'sdLDL es 3-5x más aterogénico que LDL grande. Patrón B (sdLDL predominante) asociado a resistencia a insulina. Ref: Harvard Heart Letter — LDL particle size matters.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 20 }, normal: { min: 0, max: 30 }, attention: { min: 30, max: 50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Alto riesgo aterosclerótico independiente del LDL-C total, patrón B, resistencia a insulina',
    lowMeaning: 'Perfil favorable (patrón A: partículas grandes y flotantes)',
    relatedBiomarkers: ['ldl', 'apob', 'triglycerides', 'homa_ir'],
    longevityRelevance: 'high',
  },
  {
    id: 'oxldl',
    name: 'LDL Oxidado',
    shortName: 'ox-LDL',
    category: 'Lípidos',
    subcategory: 'Avanzado',
    unit: 'U/L',
    description: 'LDL modificado por oxidación, motor directo de formación de placa aterosclerótica',
    clinicalSignificance: 'ox-LDL es captado por macrófagos formando células espumosas (inicio de aterosclerosis). Marcador directo de estrés oxidativo vascular. Ref: Stanford Cardiovascular Institute.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 20, max: 50 }, normal: { min: 20, max: 70 }, attention: { min: 70, max: 100 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Estrés oxidativo vascular activo, aterosclerosis acelerada, disfunción endotelial',
    lowMeaning: 'Excelente defensa antioxidante',
    relatedBiomarkers: ['ldl', 'sdldl', 'crp_hs', 'glutathione'],
    longevityRelevance: 'high',
  },
  {
    id: 'remnant_cholesterol',
    name: 'Colesterol Remanente',
    shortName: 'RC',
    category: 'Lípidos',
    subcategory: 'Avanzado',
    unit: 'mg/dL',
    description: 'Colesterol en lipoproteínas ricas en triglicéridos (VLDL + IDL). Calculado: CT - LDL - HDL',
    clinicalSignificance: 'Factor de riesgo causal de aterosclerosis independiente de LDL. Colesterol remanente elevado triplica riesgo de cardiopatía isquémica. Ref: Copenhagen General Population Study (Varbo et al., JAMA 2014).',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 15 }, normal: { min: 0, max: 24 }, attention: { min: 24, max: 40 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Riesgo aterosclerótico independiente, dislipidemia aterogénica, resistencia a insulina',
    lowMeaning: 'Perfil lipídico favorable',
    relatedBiomarkers: ['triglycerides', 'vldl', 'total_cholesterol'],
    longevityRelevance: 'high',
  },
  {
    id: 'non_hdl_cholesterol',
    name: 'Colesterol No-HDL',
    shortName: 'No-HDL-C',
    category: 'Lípidos',
    subcategory: 'Avanzado',
    unit: 'mg/dL',
    description: 'Colesterol total menos HDL. Captura todas las partículas aterogénicas (LDL + VLDL + IDL + Lp(a))',
    clinicalSignificance: 'Mejor predictor de riesgo CV que LDL-C solo, especialmente en pacientes con triglicéridos elevados. Recomendado por ACC/AHA como objetivo secundario. Ref: 2018 ACC/AHA Cholesterol Guidelines.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 70, max: 120 }, normal: { min: 70, max: 160 }, attention: { min: 160, max: 200 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Carga aterogénica total elevada, riesgo cardiovascular aumentado',
    lowMeaning: 'Excelente perfil aterogénico global',
    relatedBiomarkers: ['total_cholesterol', 'hdl', 'ldl', 'apob'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 19. VITAMINAS Y MINERALES AMPLIADOS
// ============================================================

const VITAMINS_MINERALS_EXTENDED: BiomarkerDefinition[] = [
  {
    id: 'vitamin_a',
    name: 'Vitamina A (Retinol)',
    category: 'Vitaminas y Minerales',
    unit: 'µg/dL',
    alternativeUnits: [{ unit: 'µmol/L', factor: 0.0349 }],
    description: 'Vitamina liposoluble esencial para visión, inmunidad, piel y diferenciación celular',
    clinicalSignificance: 'Deficiencia causa ceguera nocturna e inmunosupresión. Exceso es hepatotóxico y teratogénico. Ref: Mayo Clinic — Vitamin testing.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 40, max: 70 }, normal: { min: 30, max: 80 }, attention: { min: 20, max: 100 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hipervitaminosis A: hepatotoxicidad, pseudotumor cerebri, teratogenicidad',
    lowMeaning: 'Ceguera nocturna, xeroftalmia, inmunosupresión, queratomalacia',
    relatedBiomarkers: ['vitamin_d', 'zinc'],
    longevityRelevance: 'medium',
  },
  {
    id: 'vitamin_e',
    name: 'Vitamina E (Alfa-Tocoferol)',
    category: 'Vitaminas y Minerales',
    unit: 'mg/L',
    alternativeUnits: [{ unit: 'µmol/L', factor: 2.322 }],
    description: 'Antioxidante liposoluble que protege membranas celulares de oxidación lipídica',
    clinicalSignificance: 'Protege LDL de oxidación. Deficiencia rara excepto en malabsorción grasa. Exceso puede aumentar mortalidad. Ref: Miller et al., Annals of Internal Medicine 2005.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 7, max: 15 }, normal: { min: 5, max: 20 }, attention: { min: 3, max: 25 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Suplementación excesiva: posible aumento de mortalidad y riesgo hemorrágico',
    lowMeaning: 'Neuropatía periférica, ataxia, miopatía, anemia hemolítica, malabsorción',
    relatedBiomarkers: ['vitamin_a'],
    longevityRelevance: 'medium',
  },
  {
    id: 'vitamin_b6',
    name: 'Vitamina B6 (Piridoxal-5-fosfato)',
    shortName: 'PLP',
    category: 'Vitaminas y Minerales',
    unit: 'ng/mL',
    alternativeUnits: [{ unit: 'nmol/L', factor: 4.046 }],
    description: 'Cofactor en >100 reacciones enzimáticas, metabolismo de aminoácidos y neurotransmisores',
    clinicalSignificance: 'Deficiencia causa neuropatía, anemia sideroblástica, elevación de homocisteína. Cofactor para conversión de triptófano a serotonina. Ref: UpToDate — Vitamin B6 deficiency.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 10, max: 30 }, normal: { min: 5, max: 50 }, attention: { min: 3, max: 5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Suplementación excesiva crónica (>100mg/día): neuropatía sensorial periférica',
    lowMeaning: 'Neuropatía, dermatitis, glositis, depresión, homocisteína elevada, anemia sideroblástica',
    relatedBiomarkers: ['vitamin_b12', 'folate', 'homocysteine'],
    longevityRelevance: 'medium',
  },
  {
    id: 'vitamin_b1',
    name: 'Vitamina B1 (Tiamina)',
    shortName: 'Tiamina',
    category: 'Vitaminas y Minerales',
    unit: 'nmol/L',
    description: 'Cofactor esencial para metabolismo energético (piruvato deshidrogenasa, ciclo de Krebs)',
    clinicalSignificance: 'Deficiencia causa beriberi y encefalopatía de Wernicke. Común en alcoholismo, cirugía bariátrica, diuréticos de asa. Ref: UpToDate — Wernicke encephalopathy.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 80, max: 150 }, normal: { min: 70, max: 180 }, attention: { min: 40, max: 70 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Sin toxicidad conocida',
    lowMeaning: 'Beriberi (cardíaco/neurológico), encefalopatía de Wernicke, neuropatía periférica, insuficiencia cardíaca',
    relatedBiomarkers: ['vitamin_b12'],
    longevityRelevance: 'medium',
  },
  {
    id: 'copper',
    name: 'Cobre',
    category: 'Vitaminas y Minerales',
    unit: 'µg/dL',
    alternativeUnits: [{ unit: 'µmol/L', factor: 0.157 }],
    description: 'Oligoelemento esencial para enzimas antioxidantes (SOD), formación de colágeno y metabolismo del hierro',
    clinicalSignificance: 'Ratio zinc/cobre es relevante para inflamación. Cobre libre elevado es pro-oxidante. Exceso asociado a Alzheimer. Ref: Brewer GJ, Chem Res Toxicol 2010.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 80, max: 120 }, normal: { min: 70, max: 140 }, attention: { min: 50, max: 170 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 85, max: 135 }, normal: { min: 75, max: 155 }, attention: { min: 55, max: 185 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Inflamación, infección, estrógenos, enfermedad de Wilson (si ceruloplasmina baja), estrés oxidativo',
    lowMeaning: 'Anemia, neutropenia, osteoporosis, deficiencia nutricional, exceso de zinc (competitivo)',
    relatedBiomarkers: ['zinc', 'ceruloplasmin', 'iron'],
    longevityRelevance: 'medium',
  },
  {
    id: 'ceruloplasmin',
    name: 'Ceruloplasmina',
    category: 'Vitaminas y Minerales',
    unit: 'mg/dL',
    description: 'Proteína transportadora de cobre, también oxidasa ferrosa',
    clinicalSignificance: 'Baja en enfermedad de Wilson (acumulación tóxica de cobre). Reactante de fase aguda. Ref: AASLD Practice Guidelines — Wilson disease.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 22, max: 35 }, normal: { min: 18, max: 40 }, attention: { min: 10, max: 18 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Inflamación, embarazo, anticonceptivos orales',
    lowMeaning: 'Enfermedad de Wilson, insuficiencia hepática severa, Menkes, desnutrición',
    relatedBiomarkers: ['copper'],
    longevityRelevance: 'low',
  },
  {
    id: 'iodine_urine',
    name: 'Yodo en Orina',
    category: 'Vitaminas y Minerales',
    unit: 'µg/L',
    description: 'Refleja ingesta de yodo de las últimas 24-48h, esencial para síntesis de hormonas tiroideas',
    clinicalSignificance: 'Deficiencia de yodo es causa prevenible más común de hipotiroidismo mundial. Exceso puede causar tiroiditis. Ref: WHO — Assessment of iodine deficiency disorders.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 100, max: 250 }, normal: { min: 50, max: 300 }, attention: { min: 20, max: 50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Exceso de yodo: tiroiditis, hipertiroidismo (Jod-Basedow), hipotiroidismo (Wolff-Chaikoff)',
    lowMeaning: 'Hipotiroidismo, bocio, cretinismo (en niños), deterioro cognitivo',
    relatedBiomarkers: ['tsh', 'ft4', 'ft3'],
    longevityRelevance: 'medium',
  },
  {
    id: 'chromium',
    name: 'Cromo',
    category: 'Vitaminas y Minerales',
    unit: 'µg/L',
    description: 'Oligoelemento que potencia la acción de la insulina',
    clinicalSignificance: 'Cromo potencia señalización de insulina. Deficiencia asociada a resistencia a insulina. Evidencia mixta sobre suplementación. Ref: Cefalu & Hu, Diabetes Care 2004.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0.1, max: 0.5 }, normal: { min: 0.05, max: 0.8 }, attention: { min: 0.02, max: 0.05 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Exposición ocupacional (cromo hexavalente: carcinogénico)',
    lowMeaning: 'Posible resistencia a insulina, intolerancia a glucosa',
    relatedBiomarkers: ['insulin_fasting', 'homa_ir'],
    longevityRelevance: 'low',
  },
  {
    id: 'methylmalonic_acid',
    name: 'Ácido Metilmalónico',
    shortName: 'MMA',
    category: 'Vitaminas y Minerales',
    unit: 'nmol/L',
    description: 'Metabolito que se acumula cuando hay deficiencia funcional de vitamina B12',
    clinicalSignificance: 'Más sensible y específico que B12 sérica para detectar deficiencia funcional de B12. Elevado incluso con B12 "normal baja" (200-400 pg/mL). Ref: UpToDate — Clinical manifestations and diagnosis of vitamin B12 deficiency.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 50, max: 200 }, normal: { min: 50, max: 350 }, attention: { min: 350, max: 600 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Deficiencia funcional de B12 (incluso con B12 sérica normal), insuficiencia renal (falso elevado)',
    lowMeaning: 'Excelente estatus de B12',
    relatedBiomarkers: ['vitamin_b12', 'homocysteine', 'folate'],
    longevityRelevance: 'high',
  },
  {
    id: 'pth',
    name: 'Hormona Paratiroidea',
    shortName: 'PTH',
    category: 'Vitaminas y Minerales',
    unit: 'pg/mL',
    alternativeUnits: [{ unit: 'pmol/L', factor: 0.106 }],
    description: 'Hormona que regula calcio y fósforo, producida por glándulas paratiroideas',
    clinicalSignificance: 'PTH elevada con calcio normal/alto = hiperparatiroidismo primario. PTH elevada con vitamina D baja = hiperparatiroidismo secundario. Ref: AACE/AAES Guidelines for Hyperparathyroidism.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 15, max: 45 }, normal: { min: 10, max: 65 }, attention: { min: 65, max: 120 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hiperparatiroidismo primario/secundario, deficiencia vitamina D, insuficiencia renal, osteoporosis',
    lowMeaning: 'Hipoparatiroidismo, hipercalcemia no-PTH, exceso de vitamina D',
    relatedBiomarkers: ['calcium', 'phosphorus', 'vitamin_d'],
    longevityRelevance: 'high',
  },
  {
    id: 'prealbumin',
    name: 'Prealbúmina (Transtiretina)',
    category: 'Vitaminas y Minerales',
    unit: 'mg/dL',
    description: 'Proteína hepática con vida media corta (2 días), marcador sensible de estado nutricional',
    clinicalSignificance: 'Más sensible que albúmina (vida media 20 días) para detectar desnutrición aguda. Ref: Shenkin A, Clin Chem 2006.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 20, max: 35 }, normal: { min: 15, max: 40 }, attention: { min: 10, max: 15 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Insuficiencia renal (disminuye catabolismo), corticosteroides',
    lowMeaning: 'Desnutrición aguda, inflamación, insuficiencia hepática, sobrecarga de volumen',
    relatedBiomarkers: ['albumin', 'crp_hs', 'total_protein'],
    longevityRelevance: 'medium',
  },
  {
    id: 'tibc',
    name: 'Capacidad Total de Fijación de Hierro',
    shortName: 'TIBC',
    category: 'Vitaminas y Minerales',
    unit: 'µg/dL',
    description: 'Mide la capacidad máxima de transferrina para unir hierro',
    clinicalSignificance: 'TIBC elevada indica deficiencia de hierro (el cuerpo produce más transferrina). TIBC baja en sobrecarga de hierro o enfermedad crónica. Ref: Mayo Clinic — Iron studies.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 260, max: 360 }, normal: { min: 250, max: 400 }, attention: { min: 200, max: 450 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Deficiencia de hierro (compensatoria), embarazo, anticonceptivos orales',
    lowMeaning: 'Sobrecarga de hierro, enfermedad crónica, insuficiencia hepática, desnutrición',
    relatedBiomarkers: ['iron', 'ferritin', 'transferrin_saturation'],
    longevityRelevance: 'medium',
  },
]

// ============================================================
// 20. HORMONAS AMPLIADAS
// ============================================================

const HORMONES_EXTENDED: BiomarkerDefinition[] = [
  {
    id: 'progesterone',
    name: 'Progesterona',
    category: 'Hormonas',
    unit: 'ng/mL',
    alternativeUnits: [{ unit: 'nmol/L', factor: 3.18 }],
    description: 'Hormona esteroidea producida por ovarios (cuerpo lúteo) y adrenales',
    clinicalSignificance: 'Confirma ovulación (fase lútea > 3 ng/mL). En hombres, niveles muy bajos son normales. Neuroprotectora. Ref: ACOG Practice Bulletin — Infertility workup.',
    ranges: [
      { gender: 'female', age: '18-39', optimal: { min: 5, max: 20 }, normal: { min: 1, max: 25 }, attention: { min: 0.5, max: 1 }, critical: { min: null, max: null } },
      { gender: 'female', age: '40-59', optimal: { min: 2, max: 15 }, normal: { min: 0.5, max: 20 }, attention: { min: 0.2, max: 0.5 }, critical: { min: null, max: null } },
      { gender: 'female', age: '60+', optimal: { min: 0.1, max: 1 }, normal: { min: 0.05, max: 1.5 }, attention: { min: 0, max: 0.05 }, critical: { min: null, max: null } },
      { gender: 'male', age: 'all', optimal: { min: 0.2, max: 1.0 }, normal: { min: 0.1, max: 1.5 }, attention: { min: 1.5, max: 3.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Embarazo, quiste de cuerpo lúteo, hiperplasia adrenal congénita',
    lowMeaning: 'Anovulación, insuficiencia lútea, amenorrea, menopausia',
    relatedBiomarkers: ['estradiol', 'fsh', 'lh'],
    longevityRelevance: 'medium',
  },
  {
    id: 'growth_hormone',
    name: 'Hormona de Crecimiento',
    shortName: 'GH',
    category: 'Hormonas',
    unit: 'ng/mL',
    description: 'Hormona hipofisaria pulsátil que estimula crecimiento, reparación tisular y lipólisis',
    clinicalSignificance: 'GH basal tiene utilidad limitada por secreción pulsátil. IGF-1 es mejor reflejo del eje GH. En longevidad, GH/IGF-1 moderado es óptimo (evitar exceso). Ref: Endocrine Society — GH deficiency guidelines.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0.5, max: 5.0 }, normal: { min: 0.1, max: 10.0 }, attention: { min: 0, max: 0.1 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Acromegalia/gigantismo, tumor hipofisario, estrés agudo, ejercicio intenso',
    lowMeaning: 'Deficiencia de GH, hipopituitarismo, obesidad (supresión fisiológica)',
    relatedBiomarkers: ['igf1'],
    longevityRelevance: 'high',
  },
  {
    id: 'leptin',
    name: 'Leptina',
    category: 'Hormonas',
    subcategory: 'Adipoquinas',
    unit: 'ng/mL',
    description: 'Hormona producida por adipocitos que señaliza saciedad al hipotálamo',
    clinicalSignificance: 'Obesidad causa resistencia a leptina (niveles altos pero señal inefectiva). Leptina baja indica bajo porcentaje graso o lipodistrofia. Ref: Friedman JM, Nature Medicine 2004.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 1, max: 8 }, normal: { min: 0.5, max: 12 }, attention: { min: 12, max: 25 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 4, max: 15 }, normal: { min: 2, max: 25 }, attention: { min: 25, max: 50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Obesidad, resistencia a leptina, inflamación, síndrome metabólico',
    lowMeaning: 'Bajo porcentaje graso, lipodistrofia, anorexia, amenorrea hipotalámica',
    relatedBiomarkers: ['insulin_fasting', 'adiponectin', 'homa_ir'],
    longevityRelevance: 'high',
  },
  {
    id: 'adiponectin',
    name: 'Adiponectina',
    category: 'Hormonas',
    subcategory: 'Adipoquinas',
    unit: 'µg/mL',
    description: 'Hormona antiinflamatoria e insulino-sensibilizadora producida por adipocitos',
    clinicalSignificance: 'Única adipoquina que es protectora: antiinflamatoria, antiaterogénica, insulino-sensibilizadora. Paradójicamente baja en obesidad. Centenarios tienen niveles altos. Ref: Arita et al., BBRC 1999; Barzilai N, JAMA 2012.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 8, max: 20 }, normal: { min: 4, max: 25 }, attention: { min: 2, max: 4 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 10, max: 25 }, normal: { min: 5, max: 30 }, attention: { min: 3, max: 5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Protector: asociado a longevidad, sensibilidad a insulina, bajo riesgo CV',
    lowMeaning: 'Resistencia a insulina, obesidad visceral, síndrome metabólico, riesgo CV elevado',
    relatedBiomarkers: ['leptin', 'insulin_fasting', 'crp_hs', 'homa_ir'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 21. MARCADORES TUMORALES AMPLIADOS (NCCN Guidelines)
// ============================================================

const TUMOR_MARKERS_EXTENDED: BiomarkerDefinition[] = [
  {
    id: 'ca125',
    name: 'CA-125',
    category: 'Marcadores Tumorales',
    unit: 'U/mL',
    description: 'Antígeno de cáncer 125, asociado a cáncer de ovario',
    clinicalSignificance: 'Útil en seguimiento de cáncer de ovario, no para screening en población general. Elevado en condiciones benignas. Ref: NCCN Guidelines — Ovarian Cancer.',
    ranges: [
      { gender: 'female', age: 'all', optimal: { min: 0, max: 20 }, normal: { min: 0, max: 35 }, attention: { min: 35, max: 100 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Cáncer de ovario, endometriosis, PID, cirrosis, embarazo, menstruación',
    lowMeaning: 'Normal',
    relatedBiomarkers: [],
    longevityRelevance: 'low',
  },
  {
    id: 'ca199',
    name: 'CA 19-9',
    category: 'Marcadores Tumorales',
    unit: 'U/mL',
    description: 'Antígeno carbohidrato 19-9, asociado a cáncer pancreático y biliar',
    clinicalSignificance: 'Más útil para seguimiento que screening. No detectable en 5-10% de población (Lewis antigen negativo). Ref: NCCN Guidelines — Pancreatic Adenocarcinoma.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 20 }, normal: { min: 0, max: 37 }, attention: { min: 37, max: 100 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Cáncer pancreático, biliar, gástrico, colorrectal, colangitis, pancreatitis',
    lowMeaning: 'Normal (o Lewis antigen negativo)',
    relatedBiomarkers: ['cea', 'lipase'],
    longevityRelevance: 'low',
  },
  {
    id: 'afp',
    name: 'Alfa-Fetoproteína',
    shortName: 'AFP',
    category: 'Marcadores Tumorales',
    unit: 'ng/mL',
    description: 'Proteína oncofetal, marcador de carcinoma hepatocelular y tumores germinales',
    clinicalSignificance: 'Screening de hepatocarcinoma en pacientes con cirrosis (cada 6 meses + ecografía). Ref: AASLD Guidelines — HCC screening.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 5 }, normal: { min: 0, max: 10 }, attention: { min: 10, max: 100 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Carcinoma hepatocelular, tumores germinales, hepatitis aguda, cirrosis, embarazo',
    lowMeaning: 'Normal',
    relatedBiomarkers: ['alt', 'ast'],
    longevityRelevance: 'low',
  },
  {
    id: 'ca153',
    name: 'CA 15-3',
    category: 'Marcadores Tumorales',
    unit: 'U/mL',
    description: 'Antígeno de cáncer 15-3, asociado a cáncer de mama',
    clinicalSignificance: 'Útil para monitoreo de cáncer de mama metastásico, no para screening. Ref: ASCO Guidelines — Breast cancer biomarkers.',
    ranges: [
      { gender: 'female', age: 'all', optimal: { min: 0, max: 20 }, normal: { min: 0, max: 31 }, attention: { min: 31, max: 80 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Cáncer de mama (especialmente metastásico), cirrosis, lupus',
    lowMeaning: 'Normal',
    relatedBiomarkers: ['cea'],
    longevityRelevance: 'low',
  },
]

// ============================================================
// 22. CARDÍACO AMPLIADO
// ============================================================

const CARDIAC_EXTENDED: BiomarkerDefinition[] = [
  {
    id: 'ck',
    name: 'Creatina Quinasa Total',
    shortName: 'CK',
    category: 'Cardíaco',
    unit: 'U/L',
    description: 'Enzima de músculo esquelético, cardíaco y cerebro',
    clinicalSignificance: 'CK total elevada es inespecífica. Se eleva con ejercicio intenso, inyecciones IM, miopatía por estatinas. Ref: UpToDate — Elevated creatine kinase.',
    ranges: [
      { gender: 'male', age: 'all', optimal: { min: 50, max: 180 }, normal: { min: 30, max: 250 }, attention: { min: 250, max: 500 }, critical: { min: null, max: null } },
      { gender: 'female', age: 'all', optimal: { min: 30, max: 150 }, normal: { min: 20, max: 200 }, attention: { min: 200, max: 400 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Rabdomiólisis, infarto, miopatía (estatinas), ejercicio intenso, hipotiroidismo',
    lowMeaning: 'Masa muscular muy baja, enfermedad hepática',
    relatedBiomarkers: ['ck_mb', 'troponin', 'ldh', 'ast'],
    longevityRelevance: 'medium',
  },
  {
    id: 'ck_mb',
    name: 'Creatina Quinasa MB',
    shortName: 'CK-MB',
    category: 'Cardíaco',
    unit: 'ng/mL',
    description: 'Isoenzima CK predominante en miocardio',
    clinicalSignificance: 'Históricamente usado para diagnóstico de infarto. Ahora superado por troponina ultrasensible. Útil para detectar re-infarto. Ref: ACC/AHA — STEMI Guidelines.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 3 }, normal: { min: 0, max: 5 }, attention: { min: 5, max: 15 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Infarto de miocardio, miocarditis, cirugía cardíaca, cardioversión',
    lowMeaning: 'Normal (sin daño miocárdico)',
    relatedBiomarkers: ['troponin', 'ck'],
    longevityRelevance: 'medium',
  },
]

// ============================================================
// 23. COAGULACIÓN AMPLIADA
// ============================================================

const COAGULATION_EXTENDED: BiomarkerDefinition[] = [
  {
    id: 'ptt',
    name: 'Tiempo de Tromboplastina Parcial',
    shortName: 'TTPa',
    category: 'Coagulación',
    unit: 'segundos',
    description: 'Evalúa vía intrínseca de coagulación (factores XII, XI, IX, VIII, X, V, II)',
    clinicalSignificance: 'Monitorea terapia con heparina. Prolongado en hemofilia A/B y anticoagulante lúpico. Ref: UpToDate — Clinical use of coagulation tests.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 25, max: 33 }, normal: { min: 23, max: 35 }, attention: { min: 35, max: 50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Hemofilia, heparina, anticoagulante lúpico, deficiencia de factores, CID',
    lowMeaning: 'Estado hipercoagulable (raro)',
    relatedBiomarkers: ['pt_inr', 'fibrinogen', 'd_dimer'],
    longevityRelevance: 'low',
  },
]

// ============================================================
// 24. LONGEVIDAD AMPLIADO (Harvard/Stanford Aging Research)
// ============================================================

const LONGEVITY_EXTENDED: BiomarkerDefinition[] = [
  {
    id: 'telomere_length',
    name: 'Longitud de Telómeros',
    category: 'Longevidad',
    unit: 'kb',
    description: 'Longitud de las secuencias repetitivas protectoras en los extremos de los cromosomas',
    clinicalSignificance: 'Telómeros se acortan con cada división celular. Longitud refleja edad biológica vs cronológica. Acortamiento acelerado por estrés, inflamación, tabaco. Ref: Blackburn EH (Nobel 2009), Epel ES — UCSF Telomere Research.',
    ranges: [
      { gender: 'any', age: '18-39', optimal: { min: 7.0, max: 10.0 }, normal: { min: 5.5, max: 11.0 }, attention: { min: 4.5, max: 5.5 }, critical: { min: null, max: null } },
      { gender: 'any', age: '40-59', optimal: { min: 6.0, max: 8.5 }, normal: { min: 4.5, max: 9.5 }, attention: { min: 3.5, max: 4.5 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 5.0, max: 7.5 }, normal: { min: 3.5, max: 8.5 }, attention: { min: 2.5, max: 3.5 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Edad biológica menor que cronológica (favorable), raro: telomerasas activadas (neoplasia)',
    lowMeaning: 'Envejecimiento biológico acelerado, mayor riesgo de cáncer, CV, neurodegeneración, mortalidad',
    relatedBiomarkers: ['crp_hs', 'homocysteine', 'vitamin_d'],
    longevityRelevance: 'high',
  },
  {
    id: 'grail_galleri',
    name: 'GRAIL Galleri (cfDNA Multi-Cancer)',
    category: 'Longevidad',
    unit: 'señal',
    description: 'Test de ADN libre circulante tumoral que detecta >50 tipos de cáncer por metilación',
    clinicalSignificance: 'Detección temprana multi-cáncer. Especificidad >99.5%. Sensibilidad varía por estadio (17% estadio I, 40% II, 77% III, 90% IV). Ref: Klein EA et al., Annals of Oncology 2021 (PATHFINDER study).',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 0 }, normal: { min: 0, max: 0 }, attention: { min: 1, max: 1 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Señal de cáncer detectada — requiere evaluación diagnóstica confirmatoria',
    lowMeaning: 'Sin señal de cáncer detectada (no descarta cáncer en estadio temprano)',
    relatedBiomarkers: [],
    longevityRelevance: 'high',
  },
  {
    id: 'biological_age_horvath',
    name: 'Edad Biológica (Reloj Epigenético Horvath)',
    category: 'Longevidad',
    unit: 'años',
    description: 'Edad biológica estimada por patrones de metilación de ADN en 353 sitios CpG',
    clinicalSignificance: 'Gold standard de relojes epigenéticos. Diferencia edad bio vs crono indica aceleración/desaceleración del envejecimiento. Ref: Horvath S, Genome Biology 2013; Levine ME — GrimAge, 2018.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: -5, max: 0 }, normal: { min: -3, max: 3 }, attention: { min: 3, max: 8 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Envejecimiento acelerado (edad bio > crono): mayor riesgo de mortalidad, cáncer, CV',
    lowMeaning: 'Envejecimiento desacelerado (edad bio < crono): perfil de longevidad favorable',
    relatedBiomarkers: ['telomere_length', 'crp_hs', 'hba1c'],
    longevityRelevance: 'high',
  },
  {
    id: 'cystatin_c',
    name: 'Cistatina C',
    category: 'Longevidad',
    unit: 'mg/L',
    description: 'Marcador de filtración glomerular producido por todas las células nucleadas, no afectado por masa muscular',
    clinicalSignificance: 'Más preciso que creatinina para estimar TFG, especialmente en ancianos, sarcopenia, y extremos de masa muscular. Cistatina C elevada es predictor independiente de mortalidad. Ref: Shlipak MG, NEJM 2013; CKD-EPI Cystatin C equation.',
    ranges: [
      { gender: 'any', age: '18-59', optimal: { min: 0.55, max: 0.85 }, normal: { min: 0.50, max: 1.00 }, attention: { min: 1.00, max: 1.40 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 0.60, max: 0.95 }, normal: { min: 0.55, max: 1.10 }, attention: { min: 1.10, max: 1.50 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Enfermedad renal, predictor de mortalidad cardiovascular, inflamación, hipotiroidismo, corticosteroides',
    lowMeaning: 'Hipertiroidismo (raro clínicamente relevante)',
    relatedBiomarkers: ['creatinine', 'egfr', 'bun'],
    longevityRelevance: 'high',
  },
  {
    id: 'gdf15',
    name: 'Factor de Diferenciación de Crecimiento 15',
    shortName: 'GDF-15',
    category: 'Longevidad',
    unit: 'pg/mL',
    description: 'Citoquina de la superfamilia TGF-β, marcador emergente de estrés celular y envejecimiento',
    clinicalSignificance: 'GDF-15 aumenta con edad y es uno de los biomarcadores más robustos de mortalidad por todas las causas. Integra estrés mitocondrial, inflamación y daño tisular. Ref: Wiklund FE, PLoS ONE 2010; Tanaka T — Baltimore Longitudinal Study of Aging.',
    ranges: [
      { gender: 'any', age: '18-59', optimal: { min: 200, max: 800 }, normal: { min: 150, max: 1200 }, attention: { min: 1200, max: 2500 }, critical: { min: null, max: null } },
      { gender: 'any', age: '60+', optimal: { min: 400, max: 1200 }, normal: { min: 300, max: 1800 }, attention: { min: 1800, max: 3500 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Envejecimiento acelerado, insuficiencia cardíaca, cáncer, enfermedad renal, estrés mitocondrial',
    lowMeaning: 'Favorable (bajo estrés celular)',
    relatedBiomarkers: ['crp_hs', 'il6', 'nt_probnp', 'cystatin_c'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// 25. METABOLISMO AVANZADO
// ============================================================

const METABOLISM_ADVANCED: BiomarkerDefinition[] = [
  {
    id: 'lactate',
    name: 'Lactato',
    shortName: 'Ácido Láctico',
    category: 'Metabolismo',
    subcategory: 'Avanzado',
    unit: 'mmol/L',
    description: 'Producto del metabolismo anaeróbico, marcador de perfusión tisular',
    clinicalSignificance: 'Lactato > 2 mmol/L indica hipoperfusión tisular o metabolismo anaeróbico. Predictor de mortalidad en sepsis. Ref: Surviving Sepsis Campaign Guidelines 2021.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0.5, max: 1.2 }, normal: { min: 0.5, max: 2.0 }, attention: { min: 2.0, max: 4.0 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Sepsis, shock, insuficiencia hepática, isquemia, ejercicio intenso, metformina, deficiencia tiamina',
    lowMeaning: 'Sin significado clínico',
    relatedBiomarkers: ['creatinine', 'vitamin_b1'],
    longevityRelevance: 'medium',
  },
  {
    id: 'ammonia',
    name: 'Amonio',
    category: 'Metabolismo',
    subcategory: 'Avanzado',
    unit: 'µmol/L',
    alternativeUnits: [{ unit: 'µg/dL', factor: 0.587 }],
    description: 'Producto tóxico del metabolismo de aminoácidos, depurado por el hígado (ciclo de urea)',
    clinicalSignificance: 'Amonio elevado causa encefalopatía hepática. Ref: AASLD Guidelines — Hepatic Encephalopathy.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 10, max: 35 }, normal: { min: 10, max: 50 }, attention: { min: 50, max: 100 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Encefalopatía hepática, cirrosis, shunt portosistémico, defectos ciclo de urea, Reye',
    lowMeaning: 'Sin significado clínico',
    relatedBiomarkers: ['alt', 'ast', 'albumin', 'bilirubin_total'],
    longevityRelevance: 'low',
  },
  {
    id: 'urine_protein_creatinine',
    name: 'Relación Proteína/Creatinina en Orina',
    shortName: 'P/C',
    category: 'Urinario',
    unit: 'mg/g',
    description: 'Estima proteinuria de 24h a partir de muestra puntual',
    clinicalSignificance: 'P/C > 200 mg/g sugiere proteinuria significativa. Marcador de daño renal glomerular o tubular. Ref: KDIGO Guidelines — CKD evaluation.',
    ranges: [
      { gender: 'any', age: 'all', optimal: { min: 0, max: 100 }, normal: { min: 0, max: 200 }, attention: { min: 200, max: 500 }, critical: { min: null, max: null } },
    ],
    highMeaning: 'Enfermedad renal glomerular, nefropatía diabética, hipertensiva, síndrome nefrótico (>3500)',
    lowMeaning: 'Función renal glomerular normal',
    relatedBiomarkers: ['microalbumin_creatinine_ratio', 'egfr', 'creatinine'],
    longevityRelevance: 'high',
  },
]

// ============================================================
// CATÁLOGO COMPLETO
// ============================================================

export const BIOMARKER_CATALOG: BiomarkerDefinition[] = [
  ...HEMATOLOGY,
  ...METABOLISM_GLUCOSE,
  ...METABOLISM_RENAL,
  ...LIPIDS,
  ...LIPIDS_ADVANCED,
  ...HEPATIC,
  ...THYROID,
  ...HORMONES,
  ...HORMONES_EXTENDED,
  ...VITAMINS_MINERALS,
  ...VITAMINS_MINERALS_EXTENDED,
  ...INFLAMMATION,
  ...ELECTROLYTES,
  ...COAGULATION,
  ...COAGULATION_EXTENDED,
  ...CARDIAC,
  ...CARDIAC_EXTENDED,
  ...PANCREATIC,
  ...IMMUNOLOGIC,
  ...TUMOR_MARKERS,
  ...TUMOR_MARKERS_EXTENDED,
  ...LONGEVITY,
  ...LONGEVITY_EXTENDED,
  ...METABOLISM_ADVANCED,
  ...URINARY,
]

// ============================================================
// CATEGORÍAS
// ============================================================

export const BIOMARKER_CATEGORIES = [
  'Hematología',
  'Metabolismo',
  'Lípidos',
  'Hepático',
  'Tiroides',
  'Hormonas',
  'Vitaminas y Minerales',
  'Inflamación',
  'Electrolitos',
  'Coagulación',
  'Cardíaco',
  'Pancreático',
  'Inmunológico',
  'Marcadores Tumorales',
  'Longevidad',
  'Urinario',
] as const

// ============================================================
// FUNCIONES DE EVALUACIÓN
// ============================================================

export function findBiomarker(nameOrId: string): BiomarkerDefinition | undefined {
  const normalized = nameOrId.toLowerCase().trim()
  return BIOMARKER_CATALOG.find(b =>
    b.id === normalized ||
    b.name.toLowerCase() === normalized ||
    b.shortName?.toLowerCase() === normalized
  )
}

export function getAgeGroup(age: number): AgeGroup {
  if (age < 18) return 'all'
  if (age <= 39) return '18-39'
  if (age <= 59) return '40-59'
  return '60+'
}

function matchesAgeGroup(ageGroup: AgeGroup, age: number): boolean {
  if (ageGroup === 'all') return true
  if (ageGroup === '18-39') return age >= 18 && age <= 39
  if (ageGroup === '18-59') return age >= 18 && age <= 59
  if (ageGroup === '40-59') return age >= 40 && age <= 59
  if (ageGroup === '60+') return age >= 60
  return false
}

export function evaluateBiomarker(
  biomarkerId: string,
  value: number,
  gender: 'male' | 'female',
  age: number
): { status: BiomarkerStatus; biomarker: BiomarkerDefinition } | null {
  const biomarker = BIOMARKER_CATALOG.find(b => b.id === biomarkerId)
  if (!biomarker) return null

  // Find most specific range: match gender+age, then gender+all, then any+age, then any+all
  const range =
    biomarker.ranges.find(r => r.gender === gender && matchesAgeGroup(r.age, age)) ??
    biomarker.ranges.find(r => r.gender === gender && r.age === 'all') ??
    biomarker.ranges.find(r => r.gender === 'any' && matchesAgeGroup(r.age, age)) ??
    biomarker.ranges.find(r => r.gender === 'any' && r.age === 'all')

  if (!range) return null

  let status: BiomarkerStatus = 'critical'
  if (isInRange(value, range.optimal)) status = 'optimal'
  else if (isInRange(value, range.normal)) status = 'normal'
  else if (isInRange(value, range.attention)) status = 'attention'

  return { status, biomarker }
}

function isInRange(value: number, range: RangeSpec): boolean {
  const aboveMin = range.min === null || value >= range.min
  const belowMax = range.max === null || value <= range.max
  return aboveMin && belowMax
}

export function evaluateAll(
  biomarkers: Record<string, number>,
  gender: 'male' | 'female',
  age: number
): Record<string, { status: BiomarkerStatus; biomarker: BiomarkerDefinition }> {
  const results: Record<string, { status: BiomarkerStatus; biomarker: BiomarkerDefinition }> = {}
  for (const [id, value] of Object.entries(biomarkers)) {
    const result = evaluateBiomarker(id, value, gender, age)
    if (result) results[id] = result
  }
  return results
}

// ============================================================
// ESTADÍSTICAS DEL CATÁLOGO
// ============================================================

export const CATALOG_STATS = {
  totalBiomarkers: BIOMARKER_CATALOG.length,
  categories: BIOMARKER_CATEGORIES.length,
  highLongevityRelevance: BIOMARKER_CATALOG.filter(b => b.longevityRelevance === 'high').length,
  byCategory: BIOMARKER_CATEGORIES.map(cat => ({
    category: cat,
    count: BIOMARKER_CATALOG.filter(b => b.category === cat).length,
  })),
} as const
