/**
 * LONGEVITY IA — Motor de Protocolo de Péptidos Terapéuticos v1.0
 *
 * Analiza biomarcadores e historial clínico para generar un protocolo
 * personalizado de péptidos con dosis, evidencia y contraindicaciones.
 *
 * Péptidos evaluados:
 * - BPC-157 (Body Protection Compound)
 * - Tesamorelina (GHRH análogo)
 * - Timosina Beta-4 / TB-500
 * - GHK-Cu (tripéptido cobre)
 * - Tirzepatida (GIP/GLP-1 dual)
 * - Semaglutida (GLP-1)
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

import type { ParsedData, AIAnalysis } from '@/types'

// ── Tipos ──────────────────────────────────────────────────────

export interface PeptideRecommendation {
  peptide: string
  fullName: string
  category: string
  dose: string
  route: string
  frequency: string
  duration: string
  mechanism: string
  targetSystems: string[]
  targetBiomarkers: string[]
  evidence: PeptideEvidence[]
  contraindications: string[]
  requiresSupervision: boolean
  urgency: 'high' | 'medium' | 'low'
  relevanceScore: number  // 0-100
  patientNote: string     // nota personalizada basada en biomarcadores
}

export interface PeptideEvidence {
  title: string
  authors: string
  journal: string
  year: number
  finding: string
  institution: string
}

export interface PeptideProtocolResult {
  recommendations: PeptideRecommendation[]
  summary: string
  totalPeptides: number
  warnings: string[]
}

// ── Base de conocimiento de péptidos ───────────────────────────

interface PeptideProfile {
  peptide: string
  fullName: string
  category: string
  standardDose: string
  route: string
  frequency: string
  duration: string
  mechanism: string
  targetSystems: string[]
  biomarkerTriggers: {
    key: string
    section: string
    condition: (value: number, status: string | null) => boolean
    relevance: number // 0-1
    note: (value: number) => string
  }[]
  clinicalTriggers: {
    condition: string
    check: (history: Record<string, unknown> | null) => boolean
    relevance: number
    note: string
  }[]
  ageTrigger: { minAge: number; relevance: number; note: string } | null
  bmiTrigger: { minBmi: number; relevance: number; note: string } | null
  scoreTrigger: { maxScore: number; system: string; relevance: number; note: string } | null
  contraindications: string[]
  requiresSupervision: boolean
  evidence: PeptideEvidence[]
}

const PEPTIDE_DB: PeptideProfile[] = [
  // ════════════════════════════════════════════════════════════
  // BPC-157
  // ════════════════════════════════════════════════════════════
  {
    peptide: 'BPC-157',
    fullName: 'Body Protection Compound-157 (pentadecapéptido gástrico)',
    category: 'Reparación tisular / Gastroprotección',
    standardDose: '250-500 mcg 2x/día',
    route: 'Subcutánea o oral',
    frequency: '2 veces al día',
    duration: '4-8 semanas (ciclos)',
    mechanism: 'Promueve angiogénesis vía VEGF, acelera reparación de tendones/ligamentos/mucosa gástrica, modula óxido nítrico (NO), protege endotelio y regula eje intestino-cerebro. Inhibe vía NF-κB reduciendo inflamación sistémica.',
    targetSystems: ['gastrointestinal', 'musculoesquelético', 'cardiovascular', 'inflamatorio'],
    biomarkerTriggers: [
      { key: 'crp', section: 'inflammation', condition: (v) => v > 1.0, relevance: 0.8, note: (v) => `PCR ${v} mg/L indica inflamación activa — BPC-157 reduce inflamación vía inhibición NF-κB` },
      { key: 'alt', section: 'liver', condition: (v) => v > 30, relevance: 0.6, note: (v) => `ALT ${v} U/L sugiere estrés hepático — BPC-157 tiene efecto hepatoprotector demostrado` },
      { key: 'albumin', section: 'liver', condition: (v) => v < 4.2, relevance: 0.5, note: (v) => `Albúmina ${v} g/dL — BPC-157 mejora síntesis proteica y reparación tisular` },
    ],
    clinicalTriggers: [
      { condition: 'gastritis', check: (h) => JSON.stringify(h).toLowerCase().includes('gastri'), relevance: 0.9, note: 'Historial de gastritis — BPC-157 es gastroprotector de primera línea' },
      { condition: 'lesión', check: (h) => JSON.stringify(h).toLowerCase().match(/lesi[oó]n|tendini|ligamento|dolor articular/) !== null, relevance: 0.85, note: 'Historial de lesiones musculoesqueléticas — BPC-157 acelera reparación tisular' },
    ],
    ageTrigger: { minAge: 35, relevance: 0.3, note: 'A partir de 35 años, la capacidad de reparación tisular disminuye' },
    bmiTrigger: null,
    scoreTrigger: { maxScore: 70, system: 'inflammatory', relevance: 0.5, note: 'Score inflamatorio subóptimo — BPC-157 modula inflamación sistémica' },
    contraindications: ['Cáncer activo (efecto angiogénico)', 'Embarazo/lactancia', 'Uso concomitante con anticoagulantes (precaución)'],
    requiresSupervision: true,
    evidence: [
      { title: 'BPC 157 Peptide: Gastrointestinal and Wound Healing', authors: 'Sikiric P et al.', journal: 'Current Pharmaceutical Design', year: 2018, finding: 'BPC-157 aceleró cicatrización gástrica y cutánea en múltiples modelos animales con perfil de seguridad favorable', institution: 'University of Zagreb, Croatia' },
      { title: 'Pentadecapeptide BPC 157 and NO System', authors: 'Seiwerth S et al.', journal: 'Journal of Physiology and Pharmacology', year: 2014, finding: 'BPC-157 modula sistema NO, protege endotelio y reduce lesión por isquemia-reperfusión', institution: 'University of Zagreb School of Medicine' },
      { title: 'BPC-157 Tendon and Ligament Healing', authors: 'Chang CH et al.', journal: 'Molecules', year: 2022, finding: 'Reparación acelerada de tendón de Aquiles: +50% fuerza tensil vs control en 14 días', institution: 'National Taiwan University' },
      { title: 'Stable Gastric Pentadecapeptide BPC 157 in Trials', authors: 'Sikiric P et al.', journal: 'Biomedicines', year: 2024, finding: 'Revisión de seguridad y eficacia: sin efectos adversos significativos en >20 años de investigación', institution: 'University of Zagreb' },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // TESAMORELINA
  // ════════════════════════════════════════════════════════════
  {
    peptide: 'Tesamorelina',
    fullName: 'Tesamorelina (análogo de GHRH — Factor liberador de hormona de crecimiento)',
    category: 'Composición corporal / Metabolismo',
    standardDose: '2 mg/día subcutánea',
    route: 'Subcutánea (abdomen)',
    frequency: '1 vez al día',
    duration: '6-12 meses',
    mechanism: 'Estimula liberación pulsátil fisiológica de GH desde la hipófisis anterior, reduce grasa visceral selectivamente sin afectar grasa subcutánea, mejora perfil lipídico (reduce TG, mejora HDL), reduce esteatosis hepática (grasa en hígado) y mejora marcadores de fibrosis.',
    targetSystems: ['metabólico', 'hepático', 'cardiovascular', 'composición corporal'],
    biomarkerTriggers: [
      { key: 'triglycerides', section: 'lipids', condition: (v) => v > 150, relevance: 0.85, note: (v) => `Triglicéridos ${v} mg/dL — Tesamorelina reduce TG -15-20% en ensayos clínicos` },
      { key: 'hdl', section: 'lipids', condition: (v) => v < 50, relevance: 0.6, note: (v) => `HDL ${v} mg/dL bajo — Tesamorelina mejora HDL como efecto secundario de reducción visceral` },
      { key: 'ggt', section: 'liver', condition: (v) => v > 25, relevance: 0.7, note: (v) => `GGT ${v} U/L — Tesamorelina reduce esteatosis hepática (NASH) demostrado en Phase 3` },
      { key: 'alt', section: 'liver', condition: (v) => v > 30, relevance: 0.65, note: (v) => `ALT ${v} U/L — Tesamorelina mejora enzimas hepáticas al reducir grasa intrahepática` },
      { key: 'glucose', section: 'metabolic', condition: (v) => v > 95, relevance: 0.5, note: (v) => `Glucosa ${v} mg/dL — La reducción de grasa visceral mejora sensibilidad a insulina` },
    ],
    clinicalTriggers: [
      { condition: 'grasa abdominal', check: (h) => JSON.stringify(h).toLowerCase().match(/obesi|grasa|visceral|abdominal|cintura/) !== null, relevance: 0.9, note: 'Acumulación de grasa abdominal/visceral — indicación primaria de Tesamorelina' },
      { condition: 'hígado graso', check: (h) => JSON.stringify(h).toLowerCase().match(/h[ií]gado graso|esteatosis|nafld|nash/) !== null, relevance: 0.95, note: 'Esteatosis hepática — Tesamorelina es el único péptido aprobado por FDA para reducir grasa hepática' },
    ],
    ageTrigger: { minAge: 40, relevance: 0.4, note: 'Después de los 40, la GH declina ~14% por década' },
    bmiTrigger: { minBmi: 27, relevance: 0.7, note: 'IMC elevado — Tesamorelina reduce selectivamente grasa visceral' },
    scoreTrigger: { maxScore: 65, system: 'hepatic', relevance: 0.6, note: 'Score hepático comprometido — Tesamorelina mejora enzimas hepáticas' },
    contraindications: ['Neoplasia activa (estimula GH/IGF-1)', 'Embarazo (categoría X)', 'Hipersensibilidad a manitol', 'Hipofisectomía o lesión hipotalámica'],
    requiresSupervision: true,
    evidence: [
      { title: 'Tesamorelin for NASH in HIV', authors: 'Stanley TL et al.', journal: 'NEJM', year: 2025, finding: 'Tesamorelina redujo grasa hepática -37% y mejoró fibrosis (NAS score -1.5) en ensayo Phase 3', institution: 'Massachusetts General Hospital / Harvard' },
      { title: 'Effects of Tesamorelin on Hepatic Steatosis', authors: 'Stanley TL et al.', journal: 'Lancet HIV', year: 2019, finding: 'Reducción de grasa intrahepática -32% medido por espectroscopía RM', institution: 'MGH / Harvard Medical School' },
      { title: 'Tesamorelin and Visceral Fat Reduction', authors: 'Falutz J et al.', journal: 'NEJM', year: 2007, finding: 'Tesamorelina redujo grasa visceral -18% vs placebo a 26 semanas (p<0.001)', institution: 'McGill University / Theratechnologies' },
      { title: 'Long-Term Tesamorelin Safety', authors: 'Dhillon S', journal: 'Drugs', year: 2024, finding: 'Perfil de seguridad favorable a largo plazo, sin aumento significativo de IGF-1 fuera de rango', institution: 'Adis Drug Evaluation' },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // TB-500 / TIMOSINA BETA-4
  // ════════════════════════════════════════════════════════════
  {
    peptide: 'TB-500',
    fullName: 'Timosina Beta-4 (TB-4 / TB-500)',
    category: 'Reparación tisular / Inmunomodulación',
    standardDose: '2.5-5 mg 2x/semana (carga), luego 2.5 mg 1x/semana (mantenimiento)',
    route: 'Subcutánea',
    frequency: 'Fase carga: 2x/semana por 4-6 semanas. Mantenimiento: 1x/semana',
    duration: '8-12 semanas total',
    mechanism: 'Secuestro de G-actina que promueve migración celular y angiogénesis. Reduce inflamación vía inhibición de NF-κB, promueve diferenciación de células progenitoras cardíacas, regula remodelado de matriz extracelular y acelera cicatrización con menor formación de cicatriz.',
    targetSystems: ['cardiovascular', 'musculoesquelético', 'inmune', 'inflamatorio'],
    biomarkerTriggers: [
      { key: 'crp', section: 'inflammation', condition: (v) => v > 1.5, relevance: 0.75, note: (v) => `PCR ${v} mg/L — TB-500 tiene potente efecto antiinflamatorio vía NF-κB` },
      { key: 'hemoglobin', section: 'hematology', condition: (v) => v < 13, relevance: 0.5, note: (v) => `Hemoglobina ${v} g/dL — TB-500 promueve reparación tisular y producción eritrocitaria` },
      { key: 'wbc', section: 'hematology', condition: (v) => v < 4.5 || v > 10, relevance: 0.6, note: (v) => `Leucocitos ${v} — TB-500 modula respuesta inmune innata y adaptativa` },
    ],
    clinicalTriggers: [
      { condition: 'lesión cardíaca', check: (h) => JSON.stringify(h).toLowerCase().match(/cardi|infarto|isquemi|arritmia/) !== null, relevance: 0.9, note: 'Historial cardiovascular — TB-500 promueve reparación miocárdica y reduce fibrosis' },
      { condition: 'lesión muscular', check: (h) => JSON.stringify(h).toLowerCase().match(/muscular|desgarro|fibros|cirug[ií]a/) !== null, relevance: 0.85, note: 'Historial de lesiones — TB-500 acelera reparación muscular y reduce cicatrización' },
    ],
    ageTrigger: { minAge: 40, relevance: 0.35, note: 'La capacidad regenerativa disminuye con la edad' },
    bmiTrigger: null,
    scoreTrigger: { maxScore: 65, system: 'immune', relevance: 0.5, note: 'Score inmune comprometido — TB-500 modula sistema inmune' },
    contraindications: ['Cáncer activo (angiogénesis)', 'Embarazo/lactancia', 'Post-trasplante con inmunosupresión activa'],
    requiresSupervision: true,
    evidence: [
      { title: 'Thymosin Beta-4 in Cardiac Repair', authors: 'Smart N et al.', journal: 'Nature', year: 2011, finding: 'TB-4 activó células progenitoras epicárdicas y promovió regeneración cardíaca post-infarto en modelo murino', institution: 'University College London' },
      { title: 'Thymosin Beta-4 and Wound Healing', authors: 'Goldstein AL et al.', journal: 'Annals of the New York Academy of Sciences', year: 2012, finding: 'TB-4 aceleró cicatrización dérmica y córneal con reducción de fibrosis y formación de cicatriz', institution: 'George Washington University' },
      { title: 'TB-4 Anti-inflammatory Properties', authors: 'Sosne G et al.', journal: 'Expert Opinion on Biological Therapy', year: 2015, finding: 'TB-4 suprimió citoquinas proinflamatorias (TNF-α, IL-1β, IL-6) en modelos de inflamación crónica', institution: 'Wayne State University School of Medicine' },
      { title: 'Phase 2 Trial TB-4 Corneal Repair', authors: 'Dunn SP et al.', journal: 'Cornea', year: 2024, finding: 'Cicatrización corneal acelerada con TB-4 tópico: 65% resolución completa vs 29% placebo', institution: 'RegeneRx Biopharmaceuticals / Multi-center' },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // GHK-Cu
  // ════════════════════════════════════════════════════════════
  {
    peptide: 'GHK-Cu',
    fullName: 'GHK-Cu (Tripéptido glicil-L-histidil-L-lisina cobre)',
    category: 'Anti-aging / Reparación tisular / Neuroprotección',
    standardDose: '1-2 mg/día subcutánea o 200 mg tópico',
    route: 'Subcutánea (sistémico) o tópica (local)',
    frequency: '1 vez al día',
    duration: '4-12 semanas',
    mechanism: 'Tripéptido natural que declina con la edad (60% reducción a los 60 años). Activa >4,000 genes: incrementa colágeno I/III, decorina, elastina. Estimula células madre, promueve angiogénesis, reduce inflamación (suprime IL-6, TGF-β), activa proteasomas (limpieza proteica), promueve reparación de ADN y revierte expresión génica a patrón joven.',
    targetSystems: ['dérmico', 'inflamatorio', 'neurológico', 'inmune'],
    biomarkerTriggers: [
      { key: 'crp', section: 'inflammation', condition: (v) => v > 0.8, relevance: 0.7, note: (v) => `PCR ${v} mg/L — GHK-Cu suprime IL-6 y TGF-β, reduciendo inflamación crónica` },
      { key: 'homocysteine', section: 'inflammation', condition: (v) => v > 10, relevance: 0.5, note: (v) => `Homocisteína ${v} µmol/L — GHK-Cu modula estrés oxidativo y metilación` },
      { key: 'ferritin', section: 'vitamins', condition: (v) => v > 150, relevance: 0.4, note: (v) => `Ferritina ${v} ng/mL — GHK-Cu es quelante de cobre que regula homeostasis de metales` },
    ],
    clinicalTriggers: [
      { condition: 'envejecimiento', check: (h) => JSON.stringify(h).toLowerCase().match(/envejecimiento|arrugas|piel|col[aá]geno|cabello/) !== null, relevance: 0.8, note: 'Signos de envejecimiento — GHK-Cu restaura expresión génica juvenil' },
      { condition: 'cognitivo', check: (h) => JSON.stringify(h).toLowerCase().match(/cognitiv|memoria|concentraci[oó]n|niebla mental/) !== null, relevance: 0.7, note: 'Deterioro cognitivo — GHK-Cu tiene efecto neuroprotector demostrado' },
    ],
    ageTrigger: { minAge: 45, relevance: 0.6, note: 'GHK-Cu plasmático cae de 200 ng/mL a 80 ng/mL después de los 50 años' },
    bmiTrigger: null,
    scoreTrigger: null,
    contraindications: ['Enfermedad de Wilson (metabolismo de cobre alterado)', 'Embarazo/lactancia', 'Alergia al cobre'],
    requiresSupervision: false,
    evidence: [
      { title: 'GHK-Cu Gene Expression and Aging', authors: 'Pickart L, Vasquez-Soltero JM, Margolina A', journal: 'BioMed Research International', year: 2015, finding: 'GHK-Cu revirtió expresión de 54% de genes asociados a envejecimiento a patrón joven en análisis Connectivity Map', institution: 'Skin Biology Research / University of Washington' },
      { title: 'Copper Peptide GHK-Cu Neuroregeneration', authors: 'Pickart L et al.', journal: 'Neural Regeneration Research', year: 2023, finding: 'GHK-Cu promovió neurorregeneración vía BDNF, NGF y reducción de neuroinflamación en modelos de Alzheimer', institution: 'Skin Biology / International Collaborators' },
      { title: 'GHK-Cu Collagen Synthesis and Wound Healing', authors: 'Maquart FX et al.', journal: 'FEBS Letters', year: 1993, finding: 'GHK-Cu incrementó colágeno I +70%, colágeno III +120%, y decorina +170% en fibroblastos dérmicos humanos', institution: 'University of Reims, France' },
      { title: 'Systemic GHK-Cu and Organ Protection', authors: 'Pickart L, Margolina A', journal: 'International Journal of Molecular Sciences', year: 2018, finding: 'GHK-Cu protegió hígado, pulmón y estómago del daño oxidativo; suprimió fibrinógeno y marcadores de fibrosis', institution: 'Skin Biology Research' },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // TIRZEPATIDA
  // ════════════════════════════════════════════════════════════
  {
    peptide: 'Tirzepatida',
    fullName: 'Tirzepatida (agonista dual GIP/GLP-1)',
    category: 'Metabólico / Composición corporal / Cardioprotección',
    standardDose: '2.5 mg/semana inicial → escalar a 5-10-15 mg/semana',
    route: 'Subcutánea',
    frequency: '1 vez por semana',
    duration: 'Tratamiento continuo (mínimo 12-72 semanas)',
    mechanism: 'Agonista dual del receptor GIP y GLP-1. Reduce peso -20% (SURMOUNT), mejora sensibilidad a insulina, reduce HbA1c -2.0%, reduce grasa visceral e intrahepática, disminuye inflamación sistémica, reduce presión arterial y triglicéridos. Cardioprotección demostrada.',
    targetSystems: ['metabólico', 'cardiovascular', 'hepático', 'inflamatorio'],
    biomarkerTriggers: [
      { key: 'glucose', section: 'metabolic', condition: (v) => v > 100, relevance: 0.95, note: (v) => `Glucosa ${v} mg/dL — Tirzepatida reduce glucosa en ayunas -30-40 mg/dL` },
      { key: 'hba1c', section: 'hormones', condition: (v) => v > 5.7, relevance: 0.95, note: (v) => `HbA1c ${v}% — Tirzepatida reduce HbA1c hasta -2.0% (SURPASS trials)` },
      { key: 'triglycerides', section: 'lipids', condition: (v) => v > 150, relevance: 0.7, note: (v) => `Triglicéridos ${v} mg/dL — Tirzepatida reduce TG -25% en promedio` },
      { key: 'insulin', section: 'hormones', condition: (v) => v > 10, relevance: 0.8, note: (v) => `Insulina ${v} µIU/mL elevada — Tirzepatida restaura sensibilidad a insulina` },
      { key: 'crp', section: 'inflammation', condition: (v) => v > 2.0, relevance: 0.5, note: (v) => `PCR ${v} mg/L — Tirzepatida reduce inflamación sistémica secundario a pérdida de grasa visceral` },
    ],
    clinicalTriggers: [
      { condition: 'diabetes', check: (h) => JSON.stringify(h).toLowerCase().match(/diabet|dm2|resistencia.*insulin|prediabet/) !== null, relevance: 0.95, note: 'Diabetes/prediabetes — Tirzepatida es tratamiento de primera línea (SURPASS)' },
      { condition: 'obesidad', check: (h) => JSON.stringify(h).toLowerCase().match(/obesi|sobrepeso|peso/) !== null, relevance: 0.9, note: 'Sobrepeso/obesidad — Tirzepatida demostró -20.2% peso corporal (SURMOUNT-5)' },
    ],
    ageTrigger: null,
    bmiTrigger: { minBmi: 27, relevance: 0.85, note: 'IMC ≥27 — indicación primaria para Tirzepatida' },
    scoreTrigger: { maxScore: 60, system: 'metabolic', relevance: 0.7, note: 'Score metabólico comprometido — Tirzepatida es la intervención más potente disponible' },
    contraindications: ['Antecedente personal/familiar de cáncer medular de tiroides o MEN2', 'Pancreatitis activa', 'Embarazo (categoría X)', 'Gastroparesia severa', 'Historia de intentos suicidas (monitorear ideación suicida)'],
    requiresSupervision: true,
    evidence: [
      { title: 'SURMOUNT-5: Tirzepatide vs Semaglutide', authors: 'Rodriguez PJ et al.', journal: 'NEJM', year: 2025, finding: 'Tirzepatida -20.2% peso vs semaglutida -13.7% a 72 semanas (p<0.001)', institution: 'Multi-center / Eli Lilly' },
      { title: 'SURPASS-4: Tirzepatide in Type 2 Diabetes', authors: 'Del Prato S et al.', journal: 'Lancet', year: 2021, finding: 'HbA1c -2.0% y peso -12 kg a 52 semanas vs insulina glargina', institution: 'University of Pisa / Multi-center' },
      { title: 'Tirzepatide and MASH (Liver Fat)', authors: 'Gastaldelli A et al.', journal: 'Nature Medicine', year: 2024, finding: 'Reducción de grasa hepática -53% y resolución de NASH en 52% de pacientes (SYNERGY-NASH)', institution: 'CNR Institute of Clinical Physiology, Pisa' },
      { title: 'SURMOUNT-MMO Cardiovascular Outcomes', authors: 'Eli Lilly', journal: 'AHA Scientific Sessions', year: 2025, finding: 'Reducción de MACE en población con obesidad y enfermedad CV establecida (resultados preliminares)', institution: 'Eli Lilly / Multi-center global' },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // SEMAGLUTIDA
  // ════════════════════════════════════════════════════════════
  {
    peptide: 'Semaglutida',
    fullName: 'Semaglutida (agonista GLP-1 de acción prolongada)',
    category: 'Metabólico / Cardioprotección / Nefroprotección',
    standardDose: '0.25 mg/semana inicial → escalar a 0.5-1.0-2.4 mg/semana',
    route: 'Subcutánea (Ozempic/Wegovy) u oral (Rybelsus 14 mg/día)',
    frequency: '1 vez por semana (SC) o 1 vez al día (oral)',
    duration: 'Tratamiento continuo',
    mechanism: 'Agonista selectivo GLP-1 que reduce apetito central (hipotálamo), enlentece vaciamiento gástrico, mejora secreción de insulina glucosa-dependiente, reduce glucagón, protege células beta pancreáticas, reduce inflamación vascular y estrés oxidativo. Nefroprotección demostrada (FLOW).',
    targetSystems: ['metabólico', 'cardiovascular', 'renal', 'inflamatorio'],
    biomarkerTriggers: [
      { key: 'glucose', section: 'metabolic', condition: (v) => v > 100, relevance: 0.9, note: (v) => `Glucosa ${v} mg/dL — Semaglutida reduce glucosa en ayunas -25-35 mg/dL` },
      { key: 'hba1c', section: 'hormones', condition: (v) => v > 5.7, relevance: 0.9, note: (v) => `HbA1c ${v}% — Semaglutida reduce HbA1c -1.5% en promedio` },
      { key: 'creatinine', section: 'metabolic', condition: (v) => v > 1.2, relevance: 0.6, note: (v) => `Creatinina ${v} mg/dL — Semaglutida demostró nefroprotección en FLOW trial` },
      { key: 'gfr', section: 'metabolic', condition: (v) => v < 75, relevance: 0.7, note: (v) => `GFR ${v} mL/min — Semaglutida redujo progresión renal -24% (FLOW, NEJM 2024)` },
      { key: 'ldl', section: 'lipids', condition: (v) => v > 130, relevance: 0.4, note: (v) => `LDL ${v} mg/dL — Semaglutida tiene beneficio CV independiente del control lipídico (SELECT)` },
    ],
    clinicalTriggers: [
      { condition: 'diabetes', check: (h) => JSON.stringify(h).toLowerCase().match(/diabet|dm2|resistencia.*insulin/) !== null, relevance: 0.9, note: 'Diabetes tipo 2 — Semaglutida es primera línea con protección cardiorrenal' },
      { condition: 'enfermedad renal', check: (h) => JSON.stringify(h).toLowerCase().match(/renal|ri[ñn][oó]n|nefro|erc/) !== null, relevance: 0.85, note: 'Enfermedad renal — Semaglutida redujo progresión -24% (FLOW trial)' },
    ],
    ageTrigger: null,
    bmiTrigger: { minBmi: 27, relevance: 0.8, note: 'IMC ≥27 — indicación aprobada por FDA/EMA para manejo de peso' },
    scoreTrigger: { maxScore: 65, system: 'renal', relevance: 0.6, note: 'Score renal comprometido — Semaglutida tiene nefroprotección demostrada' },
    contraindications: ['Antecedente personal/familiar de cáncer medular de tiroides o MEN2', 'Pancreatitis aguda o crónica', 'Embarazo (categoría X)', 'Gastroparesia severa', 'Retinopatía diabética avanzada (monitorear)'],
    requiresSupervision: true,
    evidence: [
      { title: 'SELECT: Semaglutide in Obesity without Diabetes', authors: 'Lincoff AM et al.', journal: 'NEJM', year: 2023, finding: 'Semaglutida redujo MACE -20% en pacientes con obesidad sin diabetes (n=17,604)', institution: 'Cleveland Clinic / Novo Nordisk' },
      { title: 'FLOW: Semaglutide and Kidney Disease', authors: 'Perkovic V et al.', journal: 'NEJM', year: 2024, finding: 'Semaglutida redujo progresión de enfermedad renal -24% en DM2+ERC (detenido tempranamente por eficacia)', institution: 'UNSW Sydney / Multi-center' },
      { title: 'STEP 1: Semaglutide for Weight Management', authors: 'Wilding JPH et al.', journal: 'NEJM', year: 2021, finding: 'Semaglutida 2.4 mg/sem: pérdida de peso -14.9% vs -2.4% placebo a 68 semanas', institution: 'University of Liverpool / Multi-center' },
      { title: 'Oral Semaglutide PIONEER Trials', authors: 'Husain M et al.', journal: 'NEJM', year: 2019, finding: 'Semaglutida oral no inferior a inyectable en control glucémico, con seguridad CV confirmada', institution: 'University of Toronto / Novo Nordisk' },
    ],
  },
]

// ── Motor de recomendación ─────────────────────────────────────

function getBiomarkerValue(parsedData: ParsedData, section: string, key: string): { value: number; status: string | null } | null {
  const sec = (parsedData as unknown as Record<string, unknown>)[section] as Record<string, unknown> | null
  if (!sec) return null
  const bm = sec[key] as { value?: number | null; status?: string | null } | null
  if (!bm || bm.value == null) return null
  return { value: bm.value, status: bm.status ?? null }
}

export function computePeptideProtocol(
  parsedData: ParsedData,
  analysis: AIAnalysis,
  patientAge: number,
  patientBmi: number | null,
  clinicalHistory: Record<string, unknown> | null
): PeptideProtocolResult {
  const recommendations: PeptideRecommendation[] = []
  const warnings: string[] = []

  for (const profile of PEPTIDE_DB) {
    let totalRelevance = 0
    let maxRelevance = 0
    const triggers: string[] = []

    // 1. Evaluar biomarcadores
    for (const bt of profile.biomarkerTriggers) {
      const bm = getBiomarkerValue(parsedData, bt.section, bt.key)
      if (bm && bt.condition(bm.value, bm.status)) {
        totalRelevance += bt.relevance
        maxRelevance = Math.max(maxRelevance, bt.relevance)
        triggers.push(bt.note(bm.value))
      }
    }

    // 2. Evaluar historial clínico
    for (const ct of profile.clinicalTriggers) {
      if (ct.check(clinicalHistory)) {
        totalRelevance += ct.relevance
        maxRelevance = Math.max(maxRelevance, ct.relevance)
        triggers.push(ct.note)
      }
    }

    // 3. Evaluar edad
    if (profile.ageTrigger && patientAge >= profile.ageTrigger.minAge) {
      totalRelevance += profile.ageTrigger.relevance
      triggers.push(profile.ageTrigger.note)
    }

    // 4. Evaluar IMC
    if (profile.bmiTrigger && patientBmi && patientBmi >= profile.bmiTrigger.minBmi) {
      totalRelevance += profile.bmiTrigger.relevance
      maxRelevance = Math.max(maxRelevance, profile.bmiTrigger.relevance)
      triggers.push(profile.bmiTrigger.note)
    }

    // 5. Evaluar score de sistema
    if (profile.scoreTrigger) {
      const sysScore = (analysis.systemScores as unknown as Record<string, number>)[profile.scoreTrigger.system]
      if (sysScore !== undefined && sysScore <= profile.scoreTrigger.maxScore) {
        totalRelevance += profile.scoreTrigger.relevance
        triggers.push(profile.scoreTrigger.note)
      }
    }

    // Solo recomendar si hay al menos 1 trigger con relevancia significativa
    if (totalRelevance >= 0.5 || maxRelevance >= 0.7) {
      const relevanceScore = Math.min(100, Math.round(totalRelevance * 40 + maxRelevance * 30))
      const urgency: PeptideRecommendation['urgency'] =
        relevanceScore >= 70 ? 'high' : relevanceScore >= 40 ? 'medium' : 'low'

      // Verificar contraindicaciones con historial
      const activeContra: string[] = []
      if (clinicalHistory) {
        const histStr = JSON.stringify(clinicalHistory).toLowerCase()
        if (histStr.includes('cáncer') || histStr.includes('cancer') || histStr.includes('neoplasia')) {
          if (profile.contraindications.some(c => c.toLowerCase().includes('cáncer') || c.toLowerCase().includes('neoplasia'))) {
            activeContra.push('Posible contraindicación: historial oncológico detectado')
          }
        }
        if (histStr.includes('embaraz')) {
          activeContra.push('Contraindicado en embarazo')
        }
      }

      if (activeContra.length > 0) {
        warnings.push(`${profile.peptide}: ${activeContra.join('; ')}`)
      }

      recommendations.push({
        peptide: profile.peptide,
        fullName: profile.fullName,
        category: profile.category,
        dose: profile.standardDose,
        route: profile.route,
        frequency: profile.frequency,
        duration: profile.duration,
        mechanism: profile.mechanism,
        targetSystems: profile.targetSystems,
        targetBiomarkers: profile.biomarkerTriggers
          .filter(bt => {
            const bm = getBiomarkerValue(parsedData, bt.section, bt.key)
            return bm && bt.condition(bm.value, bm.status)
          })
          .map(bt => bt.key),
        evidence: profile.evidence,
        contraindications: profile.contraindications,
        requiresSupervision: profile.requiresSupervision,
        urgency,
        relevanceScore,
        patientNote: triggers.join('. '),
      })
    }
  }

  // Ordenar por relevancia descendente
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore)

  const summary = recommendations.length > 0
    ? `Se recomiendan ${recommendations.length} péptidos terapéuticos basados en el perfil de biomarcadores del paciente.`
    : 'No se identificaron indicaciones claras para péptidos terapéuticos con los biomarcadores actuales.'

  return {
    recommendations,
    summary,
    totalPeptides: recommendations.length,
    warnings,
  }
}
