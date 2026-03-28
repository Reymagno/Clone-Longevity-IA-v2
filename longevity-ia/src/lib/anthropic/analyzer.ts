import Anthropic from '@anthropic-ai/sdk'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres el sistema de inteligencia artificial médica más avanzado del mundo en medicina regenerativa, longevidad y optimización biológica de vanguardia. Tu conocimiento integra los hallazgos más recientes (2020-2026) de las instituciones y centros de investigación más prestigiosos del planeta.

INSTITUCIONES Y FUENTES DE CONOCIMIENTO:
- Harvard Medical School: laboratorio de David Sinclair (NAD+, sirtuinas, reprogramación epigenética parcial con factores de Yamanaka)
- Stanford Longevity Center: biomarcadores predictivos de envejecimiento, epigenética
- Buck Institute for Research on Aging: senolytics, SASP, inflammaging crónico
- Mayo Clinic: ensayos clínicos con dasatinib + quercetina (D+Q), fisetin y carga senescente
- Karolinska Institute: estudios longitudinales de mortalidad cardiovascular y metabólica
- NIH / National Institute on Aging (NIA): Interventions Testing Program (ITP) con rapamicina, acarbosa, 17-alfa-estradiol
- Baylor College of Medicine: Kumar et al. 2021-2023, GlyNAC (glicina + N-acetilcisteína) y reversión de marcadores de envejecimiento
- University of Minnesota: ensayo clínico metformina y mortalidad COVID-19 (-42%, Bramante 2023)
- Altos Labs / Calico (Google): reprogramación celular parcial, rejuvenecimiento de tejidos
- SENS Research Foundation: eliminación de daño molecular acumulado en el envejecimiento
- Salk Institute: restricción calórica, ayuno intermitente y longevidad en modelos humanos
- MIT (Guarente Lab): sirtuinas, SIRT1, SIRT3 y metabolismo mitocondrial
- Brigham and Women's Hospital: VITAL Trial (Manson et al.), vitamina D, omega-3 y cáncer/cardiovascular
- Cleveland Clinic: ApoB, Lp(a) y riesgo cardiovascular real vs LDL convencional
- Intermountain Healthcare: estudios de ayuno y regeneración de células madre
- Washington University St. Louis: Samuel Klein, NMN y sensibilidad a insulina en humanos
- Universidad de Graz: spermidina, autofagia y mortalidad cardiovascular (Eisenberg et al.)
- Johns Hopkins: inflamación crónica de bajo grado y aceleración del envejecimiento biológico

HALLAZGOS CLAVE QUE INTEGRAS (2020-2026):
- GlyNAC (glicina 1.33 mg/kg + NAC 0.81 mg/kg/día): revertió 8 de 9 marcadores de envejecimiento en adultos mayores (Kumar, J. Gerontology 2022)
- Rapamicina (ITP): única intervención que extiende vida en mamíferos con evidencia robusta, inhibe mTORC1
- Metformina: activa AMPK, inhibe mTOR, reduce gluconeogénesis; TAME Trial (Barzilai, Albert Einstein College) en curso
- NMN: Washington University 2021, mejora sensibilidad a insulina y función muscular en mujeres posmenopáusicas
- Omega-3 EPA (icosapentaenoico): REDUCE-IT (Bhatt 2018-2022) reducción 25% eventos cardiovasculares mayores con 4g/día EPA puro
- Vitamina D3 > 40 ng/mL: VITAL Trial reducción 25% mortalidad por cáncer, reducción infarto; sinergia con K2 MK-7
- Dasatinib + Quercetina: Mayo Clinic 2021-2023, reducción senescencia en pulmón y adiposo humano
- Fisetin (20 mg/kg equiv.): actividad senolítica superior en tejido adiposo (Kirkland, Mayo 2022)
- Berberina 500 mg 3x/día: meta-análisis 2022, efecto comparable a metformina en HbA1c y lípidos
- Spermidina > 11.6 umol/L dieta: reducción 40% mortalidad cardiovascular (Eisenberg, Nat Med 2022)
- SGLT2 inhibidores: beneficios cardiometabólicos independientes de glucosa (reducción HF, renal, mortalidad)
- GLP-1 agonistas: reducción inflamación sistémica, neuroprotección, potencial anti-envejecimiento (Drucker 2022)
- Magnesio treonato: penetración de barrera hematoencefálica, sinergia con vitamina D (Rondanelli 2021)

MECANISMOS DEL ENVEJECIMIENTO QUE DOMINAS (Hallmarks of Aging, Lopez-Otin 2023):
1. Inestabilidad genómica y acortamiento telomérico
2. Alteraciones epigenéticas: relojes de Horvath (DNAmAge), GrimAge, PhenoAge, DunedinPACE
3. Pérdida de proteostasis: autofagia, sistema ubiquitina-proteosoma (UPS)
4. Desregulación de detección de nutrientes: eje mTOR/AMPK/IGF-1/insulina/sirtuinas
5. Disfunción mitocondrial: biogénesis (PGC-1alfa), mtDNA, ROS
6. Senescencia celular e inflammaging: SASP (IL-6, TNF-alfa, MMP), carga senescente acumulada
7. Agotamiento de células madre: nicho HSC, regeneración tisular
8. Comunicación intercelular alterada: exosomas, microbioma, factores paracrinos
9. Inflamación crónica de bajo grado: eje intestino-inmune, disbiosis
10. Disfunción macroautofágica: mTOR, espermidina, ayuno

BIOMARCADORES AVANZADOS DE LONGEVIDAD QUE EVALUAS:
- ApoB: predictor superior a LDL para riesgo cardiovascular aterogénico real
- Lp(a): factor de riesgo genético independiente, objetivo terapéutico emergente
- hsCRP: marcador de inflammaging sistémico (optimal < 0.5 mg/L)
- Homocisteína: riesgo cardiovascular + neurológico + metilación (optimal < 8 umol/L)
- HOMA-IR (glucosa x insulina / 405): resistencia a insulina subclínica (optimal < 1.5)
- IGF-1: eje somatotrópico, curva en U con longevidad (optimal 120-180 ng/mL adulto)
- GGT: marcador sensible de estrés oxidativo hepático y riesgo metabólico
- Ferritina: inflamación + sobrecarga de hierro + riesgo cardiovascular (optimal 50-100 ng/mL)
- Albumina: estado nutricional y longevidad (optimal > 4.5 g/dL)
- RDW: variabilidad eritrocitaria, predictor independiente de mortalidad
- Neutrófilos/Linfocitos ratio: marcador inflamatorio e inmunológico
- Relación TG/HDL: proxy de resistencia a insulina y partículas LDL pequeñas densas
- Vitamina D 25-OH: target longevidad 60-80 ng/mL (no solo suficiencia 30 ng/mL)

PRINCIPIOS INAMOVIBLES:
- Usas SIEMPRE rangos óptimos de longevidad, nunca solo rangos de referencia de laboratorio convencionales
- Cada recomendación del protocolo DEBE citar autores, institución, revista, año y magnitud del efecto
- Cruzas SIEMPRE los valores del paciente con los estudios de mortalidad más recientes y relevantes
- Identificas el ROI en años de vida saludable de cada intervención
- Calculas la edad biológica estimada basada en el patrón completo de biomarcadores
- Priorizas intervenciones por nivel de evidencia: ensayo clínico aleatorizado > meta-análisis > cohorte prospectiva > observacional
- Respondes ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional`

const USER_PROMPT = `TAREA PRINCIPAL: Eres el médico especialista en longevidad y medicina regenerativa de vanguardia más avanzado del mundo. Extrae, interpreta y analiza TODOS los valores de este documento de laboratorio clínico aplicando los estándares científicos más actualizados (2020-2026).

PROTOCOLO DE ANÁLISIS EN 5 FASES:

FASE 1 — EXTRACCIÓN EXHAUSTIVA
Lee CADA valor numérico del documento. No omitas ningún biomarcador presente. Identifica unidades y compáralas con los rangos de referencia del laboratorio emisor.

FASE 2 — CLASIFICACIÓN CON RANGOS ÓPTIMOS DE LONGEVIDAD
Clasifica cada biomarcador con rangos óptimos de longevidad (más estrictos que los de referencia convencional):
- Glucosa en ayuno: óptimo 70-88 mg/dL (laboratorio acepta hasta 100, longevidad exige <89)
- LDL: óptimo menor a 70 mg/dL (Cleveland Clinic, Ference 2022: cada 10 mg/dL reducción = 22% menor riesgo CV acumulado)
- Colesterol Total: óptimo menor a 180 mg/dL
- HDL: óptimo mayor a 60 mg/dL (hombres >55, mujeres >65 ideal)
- Triglicéridos: óptimo menor a 100 mg/dL (ratio TG/HDL óptimo <1.5 como proxy resistencia insulina)
- HbA1c: óptimo menor a 5.4% (normal laboratorio hasta 5.7%, longevidad exige <5.4%)
- Vitamina D 25-OH: óptimo 60-80 ng/mL (VITAL Trial: >40 ng/mL reduce mortalidad; longevidad exige 60-80)
- PCR ultrasensible: óptimo menor a 0.5 mg/L (inflammaging marker)
- Homocisteína: óptimo menor a 8 umol/L (riesgo CV y neurológico)
- GFR (TFG): óptimo mayor a 90 mL/min/1.73m2
- Albumina: óptimo mayor a 4.5 g/dL (predictor independiente de longevidad)
- Ferritina: óptimo 50-100 ng/mL hombres, 30-80 ng/mL mujeres (exceso pro-inflamatorio)
- TSH: óptimo 0.5-2.0 mIU/L (función tiroidea óptima, no solo "normal")
- Ácido úrico: óptimo 3.5-5.5 mg/dL (hiperuricemia acelera envejecimiento vascular)
- AST/ALT: óptimo menor a 25 U/L (hígado metabólicamente sano)
- GGT: óptimo menor a 20 U/L (predictor independiente de mortalidad cardiovascular)
- Testosterona total (hombre): óptimo 600-900 ng/dL; (mujer): 50-80 ng/dL
- Insulina en ayuno: óptimo menor a 5 uIU/mL (resistencia insulina subclínica si >7)
- Vitamina B12: óptimo 600-1200 pg/mL (deficiencia subclínica >300 pero <600)
- Plaquetas: óptimo 175-300 x10^3/uL
- RDW: óptimo menor a 13% (predictor independiente de mortalidad)

FASE 3 — CRUCE CON EVIDENCIA CIENTÍFICA 2020-2026
Para CADA valor fuera del rango óptimo, cruza obligatoriamente con los estudios más relevantes:

VITAMINA D BAJA (<40 ng/mL):
- VITAL Trial (Manson et al., NEJM 2022): 25% reducción mortalidad por cáncer con D3 2000 UI/día
- Kaufman et al. (PLOS One 2020): D<20 ng/mL asociada a 15x mayor riesgo COVID severo
- Oportunidad: suplementar D3 + K2 MK-7 para redirigir calcio a huesos, no arterias

LDL/COLESTEROL ELEVADO:
- Ference et al. (JAMA 2022): reducción LDL de por vida equivale a 3x mayor beneficio que reducción tardía
- REDUCE-IT (Bhatt, NEJM 2018-2022): EPA 4g/día redujo 25% eventos cardiovasculares mayores
- Oportunidad: berberina 500mg 3x/día (meta-análisis 2022: efecto equivalente a estatinas bajas)

GLUCOSA/HbA1c ELEVADOS:
- TAME Trial (Barzilai, Einstein College): metformina como primera intervención anti-aging
- Bramante et al. (Lancet ID 2023): metformina redujo 42% mortalidad COVID en pacientes ambulatorios
- Oportunidad: berberina, restricción calórica, ejercicio aeróbico (VO2max es el predictor #1 de longevidad)

INFLAMACIÓN ELEVADA (PCR, homocisteína):
- GlyNAC (Kumar et al., J Gerontology 2022, Baylor): glicina + NAC revirtió 8/9 marcadores envejecimiento
- Omega-3: REDUCE-IT, resolinas y protectinas, reducción IL-6 y TNF-alfa
- Spermidina (Eisenberg, Nat Med 2022, Graz): reducción 40% mortalidad CV en cohorte >11.6 umol/L dieta

FERRITINA ALTA (>150 ng/mL):
- Associada a inflamación crónica, resistencia insulina y riesgo cardiovascular aumentado
- Considerar donación de sangre terapéutica, restricción hierro dietético

FASE 4 — CÁLCULO DE EDAD BIOLÓGICA
Basado en el patrón completo de biomarcadores, calcula la edad biológica estimada usando:
- Aceleración o desaceleración vs edad cronológica
- Número de biomarcadores fuera de rango óptimo de longevidad
- Peso de biomarcadores con mayor predictibilidad de mortalidad: VO2max proxy (TG/HDL), albumina, GFR, HbA1c, PCR, RDW
- Refleja este cálculo en longevity_age

FASE 5 — PROTOCOLO PERSONALIZADO DE MEDICINA REGENERATIVA
Genera mínimo 6 recomendaciones DIRECTAMENTE vinculadas a los valores alterados de ESTE paciente.
Cada ítem del protocolo usa EXACTAMENTE estos campos (no uses otros nombres de campo):
{
  "number": número secuencial comenzando en 1,
  "category": "categoría clínica (ej: Suplementación, Farmacológico, Estilo de vida)",
  "molecule": "NOMBRE COMPLETO del medicamento, suplemento o intervención — NUNCA vacío (ej: Berberina, Metformina, NMN, Vitamina D3 + K2 MK-7, Omega-3 EPA)",
  "dose": "dosis exacta y frecuencia de administración (ej: 500 mg 3 veces al día con alimentos)",
  "mechanism": "mecanismo molecular de acción",
  "evidence": "Apellido autor, Institución, Revista, Año, magnitud del efecto",
  "clinicalTrial": "nombre del ensayo clínico principal (ej: TAME Trial, REDUCE-IT, VITAL Trial)",
  "targetBiomarkers": ["biomarcador 1", "biomarcador 2"],
  "expectedResult": "resultado cuantificado esperado",
  "action": "acción concreta e inmediata para el paciente",
  "urgency": "immediate|high|medium|low"
}
CRÍTICO: el campo "molecule" debe contener siempre el nombre completo del fármaco o suplemento. Nunca puede quedar vacío ni ser null.

ESTUDIOS DE REFERENCIA OBLIGATORIOS PARA EL PROTOCOLO (usa los más relevantes para este paciente):
- NMN 500-1000mg/día: Klein WS Univ. 2021, mejora sensibilidad insulina y función muscular; Tsubota Keio Univ. 2022
- GlyNAC: Kumar et al. Baylor 2022, J Gerontology - revertir envejecimiento mitocondrial
- Omega-3 EPA 4g/día: Bhatt REDUCE-IT NEJM 2018 (-25% MACE); Calder Nutrients 2022
- Vitamina D3 2000-4000 UI + K2 MK-7 180mcg: Manson VITAL NEJM 2022; Geleijnse Thromb Haemost 2021
- Magnesio glicinato 300-400mg: Rondanelli Nutrients 2021; Zhang JASN 2022 (riesgo DM2)
- Berberina 500mg 3x/día: meta-análisis Liang Endocr Rev 2022 (HbA1c, LDL, TG)
- Spermidina 1-2mg/día: Eisenberg Nat Med 2022; Madeo Science 2023
- Creatina 5g/día: funccion mitocondrial, cognitiva, muscular (Rawson J Nutr 2021)
- Astaxantina 12mg/día: anti-inflamatorio potente, protección cardiovascular (Fassett Mar Drugs 2022)
- Rapamicina (solo si indicado): ITP NIA 2021, extensión de vida en mamíferos
- Metformina 500-1000mg: TAME Trial, Bramante Lancet 2023; activacion AMPK

Genera ÚNICAMENTE este JSON, sin ningún texto antes ni después, sin markdown:

{
  "parsedData": {
    "hematology": { "rbc": null, "hemoglobin": null, "hematocrit": null, "mcv": null, "mch": null, "mchc": null, "rdw": null, "wbc": null, "neutrophils": null, "lymphocytes": null, "monocytes": null, "eosinophils": null, "platelets": null, "mpv": null },
    "metabolic": { "glucose": null, "urea": null, "bun": null, "creatinine": null, "gfr": null, "uricAcid": null },
    "lipids": { "totalCholesterol": null, "triglycerides": null, "hdl": null, "ldl": null, "vldl": null, "nonHdl": null, "atherogenicIndex": null, "ldlHdlRatio": null, "tgHdlRatio": null },
    "liver": { "alkalinePhosphatase": null, "ast": null, "alt": null, "ggt": null, "ldh": null, "totalProtein": null, "albumin": null, "globulin": null, "amylase": null, "totalBilirubin": null },
    "vitamins": { "vitaminD": null, "vitaminB12": null, "ferritin": null },
    "hormones": { "tsh": null, "testosterone": null, "cortisol": null, "insulin": null, "hba1c": null },
    "inflammation": { "crp": null, "homocysteine": null }
  },
  "aiAnalysis": {
    "systemScores": { "cardiovascular": 0, "metabolic": 0, "hepatic": 0, "renal": 0, "immune": 0, "hematologic": 0, "inflammatory": 0, "vitamins": 0 },
    "overallScore": 0,
    "longevity_age": 0,
    "clinicalSummary": "",
    "keyAlerts": [],
    "swot": {
      "strengths": [],
      "weaknesses": [],
      "opportunities": [],
      "threats": []
    },
    "risks": [],
    "protocol": [
      { "number": 1, "category": "", "molecule": "", "dose": "", "mechanism": "", "evidence": "", "clinicalTrial": "", "targetBiomarkers": [], "expectedResult": "", "action": "", "urgency": "medium" }
    ],
    "projectionData": [
      { "year": 1, "withoutIntervention": 0, "withIntervention": 0, "yearRisk": { "biomarkers": [], "conditions": [], "urgencyNote": "" } }
    ],
    "projectionFactors": []
  }
}

REGLAS DE FORMATO ESTRICTAS:
- Cada biomarcador encontrado: { "value": número, "unit": "unidad", "refMin": número, "refMax": número, "optMin": número, "optMax": número, "status": "optimal|normal|warning|danger" }
- Si un valor no está en el documento: null
- Scores por sistema: 85-100 óptimo, 65-84 normal, 40-64 atención, 0-39 crítico
- overallScore: promedio ponderado de sistemas con datos disponibles
- longevity_age: edad biológica estimada en años (puede ser menor o mayor a la cronológica)
- clinicalSummary: párrafo de 2-3 oraciones con los hallazgos más importantes
- keyAlerts: máximo 4 strings con alertas críticas
- FODA: exactamente 4 fortalezas, 3 debilidades, 4 oportunidades, 3 amenazas
  Formato FODA: { "label": "Título corto (máx 5 palabras)", "detail": "1 oración con el mecanismo clave", "expectedImpact": "dato cuantificado breve (solo fortalezas/oportunidades)", "probability": "Alta/Media/Baja (solo amenazas/debilidades)" }
- Risks exactamente 4 enfermedades derivadas de los valores de ESTE paciente:
  { "disease": "nombre", "probability": número 0-100, "horizon": "X años", "drivers": ["biomarcador: valor"], "color": "#hexcolor" }
- Protocol exactamente 5 intervenciones con los campos: number, category, molecule (NUNCA vacío), dose, mechanism (1 oración), evidence (autor, año, efecto), clinicalTrial, targetBiomarkers, expectedResult (1 oración), action (1 oración), urgency
- projectionData: exactamente 10 puntos (años 1-10) con "withoutIntervention", "withIntervention" (scores 0-100) y "yearRisk": { "biomarkers": [máximo 2 strings], "conditions": [máximo 2 strings], "urgencyNote": "1 frase breve" }
- projectionFactors: exactamente 3 factores: { "factor": "nombre corto", "currentValue": "valor con unidad", "optimalValue": "valor óptimo", "medicalJustification": "1 oración: autor, año, efecto", "withoutProtocol": "1 oración", "withProtocol": "1 oración" }
- Todo el texto en español mexicano. Lenguaje técnico pero conciso.
- Analiza ÚNICAMENTE lo que aparece en el documento. No inventes valores no presentes.`

export interface AnalyzeFileParams {
  fileBase64: string
  fileType: 'image' | 'pdf'
  mimeType: string
}

export interface AnalyzeResult {
  parsedData: object
  aiAnalysis: object
}

// ─── Formatea la historia clínica como bloque de texto para el prompt ─────────

export interface ClinicalHistoryForPrompt {
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
}

export interface PatientContextForPrompt {
  name: string
  age: number
  gender: string
  weight: number | null
  height: number | null
  clinical_history: ClinicalHistoryForPrompt | null
}

function formatClinicalHistory(patient: PatientContextForPrompt): string {
  const h = patient.clinical_history as Record<string, unknown> | null
  if (!h) return ''

  const bmi = patient.weight && patient.height
    ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)
    : null

  const lines: string[] = [
    '=== HISTORIA CLÍNICA COMPLETA DEL PACIENTE (UpToDate Clinical Assessment) ===',
    `Nombre: ${patient.name} | Edad: ${patient.age} años | Género: ${patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'}`,
  ]

  if (patient.weight) lines.push(`Peso: ${patient.weight} kg | Talla: ${patient.height} cm${bmi ? ` | IMC calculado: ${bmi}` : ''}`)

  // Antropométrico
  const anthro = h['anthropometric'] as Record<string, unknown> | undefined
  if (anthro) {
    if (anthro['waist_cm']) lines.push(`Circunferencia de cintura: ${anthro['waist_cm']} cm`)
    if (anthro['blood_pressure']) lines.push(`Presión arterial habitual (autorreportada): ${anthro['blood_pressure']} mmHg`)
    if (anthro['energy_level']) lines.push(`Nivel de energía habitual: ${anthro['energy_level']}`)
  }

  // Alergias
  const allerg = h['allergies'] as Record<string, unknown> | undefined
  if (allerg) {
    lines.push('--- ALERGIAS ---')
    lines.push(`Alergias alimentarias: ${allerg['food'] || 'Ninguna reportada'}`)
    if (allerg['medication']) {
      lines.push(`⚠ ALERGIA A MEDICAMENTO: ${allerg['medication']} — NO incluir este medicamento ni sus derivados en el protocolo`)
    } else {
      lines.push('Alergias a medicamentos: Ninguna reportada')
    }
    if (allerg['environmental']) lines.push(`Alergias ambientales: ${allerg['environmental']}`)
  }

  // Alimentación
  const diet = h['diet'] as Record<string, unknown> | undefined
  if (diet) {
    lines.push('--- ALIMENTACIÓN Y NUTRICIÓN ---')
    if (diet['type']) lines.push(`Patrón alimentario: ${diet['type']}`)
    if (diet['meals_per_day']) lines.push(`Frecuencia de comidas: ${diet['meals_per_day']}`)
    if (diet['water_intake']) lines.push(`Hidratación: ${diet['water_intake']} al día`)
    if (diet['processed_food']) lines.push(`Consumo de ultraprocesados: ${diet['processed_food']}`)
    if (diet['alcohol']) lines.push(`Consumo de alcohol: ${diet['alcohol']}`)
    if (diet['supplements']) lines.push(`Suplementos actuales (no duplicar sin razón): ${diet['supplements']}`)
  }

  // Actividad física
  const pa = h['physical_activity'] as Record<string, unknown> | undefined
  if (pa) {
    lines.push('--- ACTIVIDAD FÍSICA ---')
    if (pa['type']) lines.push(`Tipo de ejercicio: ${pa['type']}`)
    if (pa['frequency']) lines.push(`Frecuencia de ejercicio: ${pa['frequency']}`)
    if (pa['sedentary_hours']) lines.push(`Horas sedentario/a al día: ${pa['sedentary_hours']}`)
  }

  // Sueño
  const sleep = h['sleep'] as Record<string, unknown> | undefined
  if (sleep) {
    lines.push('--- SUEÑO ---')
    if (sleep['hours']) lines.push(`Horas de sueño: ${sleep['hours']}`)
    if (sleep['quality']) lines.push(`Calidad de sueño: ${sleep['quality']}`)
    if (sleep['snoring'] && sleep['snoring'] !== 'No / No sé') lines.push(`Ronquido/apnea: ${sleep['snoring']}`)
  }

  // Salud mental
  const mh = h['mental_health'] as Record<string, unknown> | undefined
  if (mh) {
    lines.push('--- SALUD MENTAL Y COGNITIVA ---')
    if (mh['stress_level']) lines.push(`Nivel de estrés: ${mh['stress_level']}`)
    if (mh['mood']) lines.push(`Estado de ánimo: ${mh['mood']}`)
    if (mh['anxiety']) lines.push(`Ansiedad: ${mh['anxiety']}`)
    if (mh['cognitive']) lines.push(`Función cognitiva: ${mh['cognitive']}`)
  }

  // Cardiovascular
  const cv = h['cardiovascular'] as Record<string, unknown> | undefined
  if (cv) {
    lines.push('--- SALUD CARDIOVASCULAR Y METABÓLICA ---')
    if (cv['chest_pain']) lines.push(`Dolor o presión en pecho: ${cv['chest_pain']}`)
    if (cv['shortness_of_breath']) lines.push(`Disnea: ${cv['shortness_of_breath']}`)
    if (cv['palpitations']) lines.push(`Palpitaciones: ${cv['palpitations']}`)
    if (cv['thyroid_symptoms']) lines.push(`Síntomas tiroideos: ${cv['thyroid_symptoms']}`)
    if (cv['hormonal_symptoms']) lines.push(`Síntomas hormonales: ${cv['hormonal_symptoms']}`)
  }

  // Historial médico personal
  const mhist = h['medical_history'] as Record<string, unknown> | undefined
  if (mhist) {
    lines.push('--- HISTORIAL MÉDICO PERSONAL ---')
    const conditions = mhist['chronic_conditions'] as string[] | undefined
    if (conditions && conditions.length > 0) lines.push(`Condiciones crónicas diagnosticadas: ${conditions.join(', ')}`)
    if (mhist['surgeries']) lines.push(`Cirugías/procedimientos: ${mhist['surgeries']}`)
    if (mhist['smoker']) lines.push(`Tabaco: ${mhist['smoker']}`)
    if (mhist['current_medications']) {
      lines.push(`⚠ MEDICAMENTOS ACTUALES (no duplicar en protocolo, solo complementar): ${mhist['current_medications']}`)
    }
    if (mhist['recent_condition']) lines.push(`Condición médica reciente: ${mhist['recent_condition']}`)
    if (mhist['recent_treatment']) lines.push(`Tratamiento indicado: ${mhist['recent_treatment']}`)
  }

  // Historial familiar
  const fam = h['family_history'] as Record<string, unknown> | undefined
  if (fam) {
    lines.push('--- HISTORIAL FAMILIAR ---')
    const famConditions = fam['conditions'] as string[] | undefined
    if (famConditions && famConditions.length > 0) {
      lines.push(`Condiciones en familiares de primer grado: ${famConditions.join(', ')}`)
    }
    if (fam['longevity']) lines.push(`Longevidad familiar: ${fam['longevity']}`)
    if (fam['details']) lines.push(`Detalles: ${fam['details']}`)
  }

  // Campos legacy (compatibilidad con historias antiguas)
  const legacy_lifestyle = h['lifestyle'] as Record<string, unknown> | undefined
  if (legacy_lifestyle) {
    lines.push('--- ESTILO DE VIDA (datos anteriores) ---')
    if (legacy_lifestyle['exercise']) lines.push(`Actividad física: ${legacy_lifestyle['exercise']}`)
    if (legacy_lifestyle['sleep_hours']) lines.push(`Sueño: ${legacy_lifestyle['sleep_hours']}`)
    if (legacy_lifestyle['smoker']) lines.push(`Tabaco: ${legacy_lifestyle['smoker']}`)
    if (legacy_lifestyle['stress_level']) lines.push(`Estrés: ${legacy_lifestyle['stress_level']}`)
  }
  const legacy_recent = h['recent_illness'] as Record<string, unknown> | undefined
  if (legacy_recent) {
    if (legacy_recent['condition']) lines.push(`Enfermedad reciente (dato anterior): ${legacy_recent['condition']}`)
    if (legacy_recent['current_medications']) lines.push(`⚠ Medicamentos (dato anterior): ${legacy_recent['current_medications']}`)
  }

  lines.push('=== FIN DE HISTORIA CLÍNICA ===')
  lines.push('INSTRUCCIONES ESPECIALES: Usa esta historia clínica para personalizar el análisis de forma integral: (1) Ajusta el protocolo según actividad física, dieta y suplementos actuales; (2) Considera los riesgos familiares en el FODA; (3) NUNCA recomendar medicamentos a los que el paciente sea alérgico; (4) Evalúa síntomas cardiovasculares y cognitivos como señales de alerta; (5) Ajusta la edad biológica según nivel de energía, calidad de sueño, manejo del estrés y horas sedentarias.')

  return lines.join('\n')
}

// ─── Validación compartida del JSON de respuesta ──────────────────────────────

function validateAndParseAiResponse(rawText: string): { parsedData?: object; aiAnalysis: object } {
  if (!rawText) throw new Error('Claude no devolvió respuesta.')

  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`La respuesta no contiene JSON válido. Respuesta: ${rawText.substring(0, 300)}...`)
  }

  let parsed: Record<string, unknown>
  const jsonSlice = rawText.slice(firstBrace, lastBrace + 1)
  try {
    parsed = JSON.parse(jsonSlice)
  } catch {
    const tail = rawText.slice(-200)
    throw new Error(`JSON inválido o truncado. Longitud respuesta: ${rawText.length} chars. Final: ...${tail}`)
  }

  // Acepta tanto { parsedData, aiAnalysis } como { aiAnalysis } directo
  const aiAnalysis = (parsed.aiAnalysis ?? parsed) as Record<string, unknown>
  const requiredFields: Array<[string, string]> = [
    ['systemScores', 'object'],
    ['protocol', 'array'],
    ['projectionData', 'array'],
    ['swot', 'object'],
    ['risks', 'array'],
  ]
  for (const [field, type] of requiredFields) {
    const value = aiAnalysis[field]
    if (value === undefined || value === null) throw new Error(`Campo requerido faltante en aiAnalysis: ${field}`)
    if (type === 'array' && !Array.isArray(value)) throw new Error(`El campo ${field} debe ser un arreglo`)
    if (type === 'object' && (Array.isArray(value) || typeof value !== 'object')) throw new Error(`El campo ${field} debe ser un objeto`)
  }

  return {
    parsedData: parsed.parsedData as object | undefined,
    aiAnalysis,
  }
}

export async function analyzeLabFiles(files: AnalyzeFileParams[], patientContext?: PatientContextForPrompt, onProgress?: () => void): Promise<AnalyzeResult> {
  const userContent: Anthropic.MessageParam['content'] = []

  // Incluir historia clínica al inicio si existe
  if (patientContext?.clinical_history) {
    userContent.push({
      type: 'text',
      text: formatClinicalHistory(patientContext),
    })
  }

  for (let i = 0; i < files.length; i++) {
    const { fileBase64, fileType, mimeType } = files[i]
    const label = files.length > 1 ? `Archivo ${i + 1} de ${files.length}` : 'Estudio de laboratorio'

    if (fileType === 'image') {
      if (files.length > 1) {
        userContent.push({ type: 'text', text: `--- ${label} (imagen) ---` })
      }
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: fileBase64,
        },
      })
    } else if (fileType === 'pdf') {
      const buffer = Buffer.from(fileBase64, 'base64')
      let pdfText: string
      try {
        const pdfData = await pdfParse(buffer)
        pdfText = pdfData.text
      } catch (e) {
        throw new Error(`No se pudo leer el archivo PDF ${i + 1}. Verifica que no esté protegido con contraseña o intenta con una imagen.`)
      }

      if (!pdfText || pdfText.trim().length < 10) {
        throw new Error(`No se pudo extraer texto del archivo ${i + 1}. Intenta con una imagen del estudio.`)
      }

      userContent.push({
        type: 'text',
        text: `--- ${label} (PDF) ---\n\n${pdfText}`,
      })
    }
  }

  userContent.push({
    type: 'text',
    text: USER_PROMPT,
  })

  let rawText = ''
  await client.messages
    .stream({
      model: MODEL,
      max_tokens: 12000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    .on('text', (text) => {
      rawText += text
      onProgress?.()
    })
    .finalMessage()

  if (!rawText) {
    throw new Error(`Claude no devolvió respuesta. (${files.length} archivo${files.length > 1 ? 's' : ''} enviado${files.length > 1 ? 's' : ''})`)
  }

  const validated = validateAndParseAiResponse(rawText)

  if (!validated.parsedData) {
    throw new Error('Estructura JSON incompleta: falta parsedData')
  }

  return {
    parsedData: validated.parsedData,
    aiAnalysis: validated.aiAnalysis,
  }
}

// ─── Re-análisis usando parsedData ya extraído + historia clínica ─────────────

const REANALYZE_PROMPT = `TAREA: Re-genera el análisis médico de longevidad usando los biomarcadores ya extraídos y la historia clínica completa del paciente.

INSTRUCCIONES:
- Los biomarcadores (parsedData) ya están correctamente extraídos — úsalos como referencia fija
- Enriquece el análisis incorporando el contexto clínico: estilo de vida, historial familiar, medicamentos actuales, alergias
- Personaliza el protocolo según lo que el paciente ya hace (no repitas suplementos actuales sin justificación, evita medicamentos a los que sea alérgico)
- Ajusta los riesgos considerando el historial familiar
- La historia clínica puede explicar valores fuera de rango (ej: estrés alto → cortisol elevado, sedentarismo → glucosa límite)

Genera ÚNICAMENTE este JSON (sin markdown, sin texto adicional):

{
  "aiAnalysis": {
    "systemScores": { "cardiovascular": 0, "metabolic": 0, "hepatic": 0, "renal": 0, "immune": 0, "hematologic": 0, "inflammatory": 0, "vitamins": 0 },
    "overallScore": 0,
    "longevity_age": 0,
    "clinicalSummary": "",
    "keyAlerts": [],
    "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
    "risks": [],
    "protocol": [{ "number": 1, "category": "", "molecule": "", "dose": "", "mechanism": "", "evidence": "", "clinicalTrial": "", "targetBiomarkers": [], "expectedResult": "", "action": "", "urgency": "medium" }],
    "projectionData": [{ "year": 1, "withoutIntervention": 0, "withIntervention": 0, "yearRisk": { "biomarkers": [], "conditions": [], "urgencyNote": "" } }],
    "projectionFactors": []
  }
}

REGLAS DE FORMATO: Scores: 85-100 óptimo, 65-84 normal, 40-64 atención, 0-39 crítico. FODA exactamente 4+3+4+3. Protocol exactamente 5 intervenciones (campos concisos: mechanism/expectedResult/action = 1 oración). projectionData exactamente 10 puntos (años 1-10). projectionFactors exactamente 3 factores (withoutProtocol/withProtocol = 1 oración). Todo en español mexicano, lenguaje conciso.`

export async function reanalyzeWithClinicalHistory(
  parsedData: object,
  patientContext: PatientContextForPrompt,
  onProgress?: () => void
): Promise<object> {
  const historyText = formatClinicalHistory(patientContext)

  const userContent: Anthropic.MessageParam['content'] = [
    { type: 'text', text: historyText },
    { type: 'text', text: `BIOMARCADORES DEL PACIENTE (extraídos del estudio de laboratorio):\n${JSON.stringify(parsedData, null, 2)}` },
    { type: 'text', text: REANALYZE_PROMPT },
  ]

  let rawText = ''
  await client.messages
    .stream({
      model: MODEL,
      max_tokens: 12000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    .on('text', (text) => {
      rawText += text
      onProgress?.()
    })
    .finalMessage()

  if (!rawText) throw new Error('Claude no devolvió respuesta.')

  const validated = validateAndParseAiResponse(rawText)

  return validated.aiAnalysis
}
