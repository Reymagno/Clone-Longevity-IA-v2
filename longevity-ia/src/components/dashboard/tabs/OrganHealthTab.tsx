'use client'

import { useState } from 'react'
import type { ParsedData, AIAnalysis, BiomarkerValue } from '@/types'
import { getStatusColor, getStatusLabel, getScoreColor, getScoreLabel } from '@/lib/utils'
import {
  Heart, Layers, Droplets, FlaskConical, Activity, Shield,
  Zap, Settings, Brain, Dumbbell, Flame, Sun,
  BookOpen, AlertCircle, ChevronDown, ChevronUp, ClipboardList, Star,
  type LucideIcon,
} from 'lucide-react'
import { OrganNetworkDiagram } from './OrganNetworkDiagram'

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

const STATUS_SCORE: Record<string, number> = {
  optimal: 100,
  normal: 72,
  warning: 42,
  danger: 12,
}

const BIOMARKER_LABELS: Record<string, string> = {
  rbc: 'Eritrocitos (RBC)',
  hemoglobin: 'Hemoglobina',
  hematocrit: 'Hematocrito',
  mcv: 'Volumen Corpuscular Medio (VCM)',
  mch: 'Hemoglobina Corpuscular Media (HCM)',
  mchc: 'Concentración Hemoglobina (CHCM)',
  rdw: 'Ancho Distribución Eritrocitaria (RDW)',
  wbc: 'Leucocitos (WBC)',
  neutrophils: 'Neutrófilos',
  lymphocytes: 'Linfocitos',
  monocytes: 'Monocitos',
  eosinophils: 'Eosinófilos',
  platelets: 'Plaquetas',
  mpv: 'Volumen Plaquetar Medio (VPM)',
  glucose: 'Glucosa',
  urea: 'Urea',
  bun: 'Nitrógeno Ureico (BUN)',
  creatinine: 'Creatinina',
  gfr: 'Filtración Glomerular (TFG)',
  uricAcid: 'Ácido Úrico',
  totalCholesterol: 'Colesterol Total',
  triglycerides: 'Triglicéridos',
  hdl: 'HDL Colesterol',
  ldl: 'LDL Colesterol',
  vldl: 'VLDL Colesterol',
  nonHdl: 'Colesterol no-HDL',
  atherogenicIndex: 'Índice Aterogénico',
  ldlHdlRatio: 'Relación LDL/HDL',
  tgHdlRatio: 'Relación TG/HDL',
  alkalinePhosphatase: 'Fosfatasa Alcalina',
  ast: 'AST — TGO',
  alt: 'ALT — TGP',
  ggt: 'GGT',
  ldh: 'LDH',
  totalProtein: 'Proteína Total',
  albumin: 'Albúmina',
  globulin: 'Globulinas',
  amylase: 'Amilasa',
  totalBilirubin: 'Bilirrubina Total',
  vitaminD: 'Vitamina D 25-OH',
  vitaminB12: 'Vitamina B12',
  ferritin: 'Ferritina',
  tsh: 'TSH',
  testosterone: 'Testosterona',
  cortisol: 'Cortisol',
  insulin: 'Insulina',
  hba1c: 'HbA1c',
  crp: 'PCR Ultrasensible',
  homocysteine: 'Homocisteína',
}

type BmWeight = 'high' | 'medium' | 'low'

interface OrganBiomarker {
  key: string
  label: string
  bm: BiomarkerValue | null | undefined
  weight: BmWeight
}

interface StudyRecommendation {
  panel: string
  priority: 'esencial' | 'recomendado'
  biomarkers: string[]
  reason: string
}

function calcOrganScore(biomarkers: OrganBiomarker[]): number | null {
  const W = { high: 3, medium: 2, low: 1 }
  let totalWeight = 0
  let weightedSum = 0
  for (const { bm, weight } of biomarkers) {
    if (!bm || bm.value === null || !bm.status) continue
    const score = STATUS_SCORE[bm.status]
    if (score === undefined) continue
    const w = W[weight]
    weightedSum += score * w
    totalWeight += w
  }
  if (totalWeight === 0) return null
  return Math.round(weightedSum / totalWeight)
}

const scoreColor = getScoreColor
const scoreLabel = getScoreLabel
const statusLabel = getStatusLabel

// ─────────────────────────────────────────────────────────────────
// ORGAN DEFINITIONS
// ─────────────────────────────────────────────────────────────────

interface OrganDef {
  id: string
  name: string
  subtitle: string
  icon: LucideIcon
  iconColor: string
  getBiomarkers: (d: ParsedData) => OrganBiomarker[]
  getInsights: (bms: OrganBiomarker[]) => string[]
  studies: string[]
  recommendations: StudyRecommendation[]
}

const ORGANS: OrganDef[] = [
  // ── 1. CORAZÓN ──────────────────────────────────────────────────
  {
    id: 'cardiovascular',
    name: 'Corazón',
    subtitle: 'Sistema Cardiovascular',
    icon: Heart,
    iconColor: 'text-rose-400',
    getBiomarkers: (d) => [
      { key: 'ldl',             label: BIOMARKER_LABELS.ldl,             bm: d.lipids?.ldl,             weight: 'high' },
      { key: 'hdl',             label: BIOMARKER_LABELS.hdl,             bm: d.lipids?.hdl,             weight: 'high' },
      { key: 'totalCholesterol',label: BIOMARKER_LABELS.totalCholesterol, bm: d.lipids?.totalCholesterol, weight: 'medium' },
      { key: 'triglycerides',   label: BIOMARKER_LABELS.triglycerides,   bm: d.lipids?.triglycerides,   weight: 'medium' },
      { key: 'atherogenicIndex',label: BIOMARKER_LABELS.atherogenicIndex, bm: d.lipids?.atherogenicIndex, weight: 'high' },
      { key: 'ldlHdlRatio',     label: BIOMARKER_LABELS.ldlHdlRatio,     bm: d.lipids?.ldlHdlRatio,     weight: 'high' },
      { key: 'tgHdlRatio',      label: BIOMARKER_LABELS.tgHdlRatio,      bm: d.lipids?.tgHdlRatio,      weight: 'medium' },
      { key: 'vldl',            label: BIOMARKER_LABELS.vldl,            bm: d.lipids?.vldl,            weight: 'medium' },
      { key: 'nonHdl',          label: BIOMARKER_LABELS.nonHdl,          bm: d.lipids?.nonHdl,          weight: 'medium' },
      { key: 'crp',             label: BIOMARKER_LABELS.crp,             bm: d.inflammation?.crp,       weight: 'high' },
      { key: 'homocysteine',    label: BIOMARKER_LABELS.homocysteine,    bm: d.inflammation?.homocysteine, weight: 'medium' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const ldl = get('ldl'), hdl = get('hdl'), crp = get('crp')
      const hcy = get('homocysteine'), ai = get('atherogenicIndex')
      if (ldl?.status === 'danger' || ldl?.status === 'warning')
        insights.push(`LDL elevado (${ldl.value} ${ldl.unit}): Ference et al. JAMA 2022 — cada 10 mg/dL adicional acumula 22% más riesgo cardiovascular de por vida. Target longevidad: <70 mg/dL.`)
      if (hdl?.status === 'warning' || hdl?.status === 'danger')
        insights.push(`HDL bajo (${hdl.value} ${hdl.unit}): HDL <40 mg/dL triplica riesgo de infarto. El HDL realiza transporte reverso de colesterol, eliminándolo de las arterias.`)
      if (crp?.status === 'warning' || crp?.status === 'danger')
        insights.push(`PCR elevada (${crp.value} ${crp.unit}): Ridker et al. NEJM — PCR >3 mg/L duplica riesgo de eventos cardiovasculares mayores. El inflammaging activo es el principal acelerador del daño endotelial.`)
      if (hcy?.status === 'warning' || hcy?.status === 'danger')
        insights.push(`Homocisteína elevada (${hcy.value} ${hcy.unit}): Por cada 5 μmol/L extra, riesgo CV aumenta 35% (Clarke et al. 2020). Responde a vitaminas B6, B12 y folato activo (metilfolato).`)
      if (ai?.status === 'warning' || ai?.status === 'danger')
        insights.push(`Índice aterogénico elevado: Predictor de partículas LDL pequeñas y densas (sd-LDL), las más peligrosas para la íntima arterial. Omega-3 EPA 4 g/día + dieta mediterránea como primera línea.`)
      if (insights.length === 0)
        insights.push('Perfil cardiovascular en rangos óptimos de longevidad. Continuar protocolo preventivo de mantenimiento con omega-3 y vitamina D.')
      return insights
    },
    studies: [
      'Ference et al. JAMA 2022 — Reducción LDL de por vida: 22% menos riesgo por cada 10 mg/dL',
      'REDUCE-IT Trial (Bhatt, NEJM 2018) — EPA 4 g/día, -25% eventos cardiovasculares mayores',
      'Ridker et al. NEJM 2020 — PCR y riesgo cardiovascular residual',
      'Clarke et al. Eur Heart J 2020 — Homocisteína y riesgo CV: meta-análisis',
    ],
    recommendations: [
      {
        panel: 'Perfil de Lípidos Completo',
        priority: 'esencial',
        biomarkers: ['Colesterol Total', 'LDL', 'HDL', 'Triglicéridos', 'VLDL', 'Colesterol no-HDL', 'Índice Aterogénico', 'Relación LDL/HDL', 'Relación TG/HDL'],
        reason: 'El perfil lipídico es el pilar del riesgo cardiovascular. El LDL y el índice aterogénico predicen la carga aterosclerótica de por vida; la relación TG/HDL es el proxy más preciso de resistencia a insulina.',
      },
      {
        panel: 'Marcadores Inflamatorios Cardiovasculares',
        priority: 'esencial',
        biomarkers: ['PCR Ultrasensible (hsCRP)', 'Homocisteína sérica'],
        reason: 'La PCR >3 mg/L duplica el riesgo de infarto independientemente del colesterol (Ridker, NEJM 2020). La homocisteína >10 μmol/L daña el endotelio vascular y predice trombosis.',
      },
      {
        panel: 'Marcadores Avanzados de Longevidad Cardiovascular',
        priority: 'recomendado',
        biomarkers: ['ApoB (apolipoproteína B)', 'Lp(a) — Lipoproteína a', 'Omega-3 Index'],
        reason: 'ApoB predice mejor que LDL el riesgo cardiovascular real. Lp(a) es un factor de riesgo genético independiente que no responde a estatinas. El índice Omega-3 refleja la calidad del perfil antiinflamatorio.',
      },
    ],
  },

  // ── 2. HÍGADO ───────────────────────────────────────────────────
  {
    id: 'liver',
    name: 'Hígado',
    subtitle: 'Función Hepática y Detox',
    icon: Layers,
    iconColor: 'text-amber-400',
    getBiomarkers: (d) => [
      { key: 'ast',              label: BIOMARKER_LABELS.ast,              bm: d.liver?.ast,              weight: 'high' },
      { key: 'alt',              label: BIOMARKER_LABELS.alt,              bm: d.liver?.alt,              weight: 'high' },
      { key: 'ggt',              label: BIOMARKER_LABELS.ggt,              bm: d.liver?.ggt,              weight: 'high' },
      { key: 'alkalinePhosphatase', label: BIOMARKER_LABELS.alkalinePhosphatase, bm: d.liver?.alkalinePhosphatase, weight: 'medium' },
      { key: 'albumin',          label: BIOMARKER_LABELS.albumin,          bm: d.liver?.albumin,          weight: 'high' },
      { key: 'totalProtein',     label: BIOMARKER_LABELS.totalProtein,     bm: d.liver?.totalProtein,     weight: 'medium' },
      { key: 'globulin',         label: BIOMARKER_LABELS.globulin,         bm: d.liver?.globulin,         weight: 'medium' },
      { key: 'totalBilirubin',   label: BIOMARKER_LABELS.totalBilirubin,   bm: d.liver?.totalBilirubin,   weight: 'high' },
      { key: 'ldh',              label: BIOMARKER_LABELS.ldh,              bm: d.liver?.ldh,              weight: 'medium' },
      { key: 'amylase',          label: BIOMARKER_LABELS.amylase,          bm: d.liver?.amylase,          weight: 'low' },
      { key: 'ferritin',         label: BIOMARKER_LABELS.ferritin,         bm: d.vitamins?.ferritin,      weight: 'medium' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const ast = get('ast'), alt = get('alt'), ggt = get('ggt')
      const albumin = get('albumin'), ferritin = get('ferritin')
      if ((alt?.status === 'warning' || alt?.status === 'danger') && alt?.value && ast?.value) {
        const ratio = (ast.value / alt.value).toFixed(2)
        insights.push(`Transaminasas elevadas — AST: ${ast.value}, ALT: ${alt.value} ${alt.unit}. Relación AST/ALT: ${ratio}. ${parseFloat(ratio) > 2 ? 'Ratio >2 sugiere etiología alcohólica o NASH avanzado (cirrosis temprana).' : 'Ratio <1 sugiere hepatitis viral o NAFLD en estadio inicial.'}`)
      }
      if (ggt?.status === 'warning' || ggt?.status === 'danger')
        insights.push(`GGT elevada (${ggt.value} ${ggt.unit}): Marcador sensible de estrés oxidativo hepático, exposición a fármacos/alcohol y predictor independiente de mortalidad CV (Ruttmann, Eur Heart J 2021). GGT óptima longevidad: <20 U/L.`)
      if (albumin?.status === 'warning' || albumin?.status === 'danger')
        insights.push(`Albúmina reducida (${albumin.value} ${albumin.unit}): Predictor de longevidad. <4.0 g/dL asociado a mayor mortalidad a 5 años. Refleja reserva proteica y función sintética hepática. Target: >4.5 g/dL.`)
      if (ferritin?.status === 'warning' || ferritin?.status === 'danger')
        insights.push(`Ferritina (${ferritin.value} ${ferritin.unit}): Exceso de hierro genera estrés oxidativo hepático y puede progresar a fibrosis. Rango óptimo longevidad: 50-100 ng/mL. Valores altos también indican inflamación crónica activa.`)
      if (insights.length === 0)
        insights.push('Función hepática dentro de parámetros óptimos. El hígado realiza >500 funciones metabólicas incluyendo síntesis de glutatión, principal antioxidante endógeno.')
      return insights
    },
    studies: [
      'Ruttmann et al. Eur Heart J 2021 — GGT como predictor independiente de mortalidad CV',
      'Kim et al. J Hepatol 2022 — NAFLD y riesgo cardiovascular: síndrome metabólico-hepático',
      'Cabré et al. Clin Nutr 2020 — Albúmina como biomarcador de longevidad',
    ],
    recommendations: [
      {
        panel: 'Panel Hepático Completo',
        priority: 'esencial',
        biomarkers: ['AST (TGO)', 'ALT (TGP)', 'GGT', 'Fosfatasa Alcalina', 'Bilirrubina Total', 'Proteína Total', 'Albúmina', 'Globulinas'],
        reason: 'AST y ALT identifican daño hepatocelular activo; la relación AST/ALT orienta la etiología. GGT es el marcador más sensible de estrés oxidativo hepático y predictor de mortalidad cardiovascular. Albúmina refleja la reserva de longevidad.',
      },
      {
        panel: 'Marcadores de Reserva Hepática',
        priority: 'esencial',
        biomarkers: ['Ferritina sérica', 'LDH (deshidrogenasa láctica)', 'Amilasa sérica'],
        reason: 'Ferritina elevada indica sobrecarga de hierro o inflamación hepática crónica. LDH señala daño celular activo. Amilasa diferencia entre patología pancreática y hepática.',
      },
      {
        panel: 'Evaluación de NAFLD/NASH',
        priority: 'recomendado',
        biomarkers: ['Índice FIB-4 (calculado con AST, ALT, plaquetas y edad)', 'Ultrasonido hepático', 'Elastografía hepática (FibroScan)'],
        reason: 'El 30% de adultos con síndrome metabólico desarrolla NAFLD silencioso. El índice FIB-4 y la elastografía detectan fibrosis hepática antes de que aparezcan síntomas clínicos.',
      },
    ],
  },

  // ── 3. RIÑÓN ────────────────────────────────────────────────────
  {
    id: 'kidney',
    name: 'Riñón',
    subtitle: 'Filtración Glomerular y Electrolitos',
    icon: Droplets,
    iconColor: 'text-sky-400',
    getBiomarkers: (d) => [
      { key: 'gfr',       label: BIOMARKER_LABELS.gfr,       bm: d.metabolic?.gfr,       weight: 'high' },
      { key: 'creatinine',label: BIOMARKER_LABELS.creatinine, bm: d.metabolic?.creatinine, weight: 'high' },
      { key: 'urea',      label: BIOMARKER_LABELS.urea,       bm: d.metabolic?.urea,      weight: 'high' },
      { key: 'bun',       label: BIOMARKER_LABELS.bun,        bm: d.metabolic?.bun,       weight: 'medium' },
      { key: 'uricAcid',  label: BIOMARKER_LABELS.uricAcid,   bm: d.metabolic?.uricAcid,  weight: 'medium' },
      { key: 'albumin',   label: BIOMARKER_LABELS.albumin,    bm: d.liver?.albumin,       weight: 'medium' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const gfr = get('gfr'), uric = get('uricAcid')
      if (gfr?.value !== null && gfr?.value !== undefined) {
        const v = gfr.value
        if (v >= 90)       insights.push(`TFG ${v} mL/min (G1): Función renal óptima. Los riñones filtran ~180 L de sangre/día eliminando toxinas, regulando pH y equilibrio electrolítico.`)
        else if (v >= 60)  insights.push(`TFG ${v} mL/min (ERC G2 leve): Reducción 30-40% de función renal. Monitoreo anual, control de PA <120/80 mmHg y restricción proteica moderada.`)
        else if (v >= 45)  insights.push(`TFG ${v} mL/min (ERC G3a): Riesgo aumentado de progresión. Control estricto de PA, glucosa, proteínas y fósforo dietético. SGLT2 inhibidores tienen evidencia de nefroprotección (DAPA-CKD 2020).`)
        else if (v >= 30)  insights.push(`TFG ${v} mL/min (ERC G3b): CRÍTICO — derivación urgente a nefrología. Heerspink et al. NEJM 2020: dapagliflozin redujo 44% progresión renal independiente de diabetes.`)
        else               insights.push(`TFG ${v} mL/min (ERC G4-G5): Insuficiencia renal avanzada. Evaluación urgente de necesidad de terapia de reemplazo renal.`)
      }
      if (uric?.status === 'warning' || uric?.status === 'danger')
        insights.push(`Ácido úrico elevado (${uric.value} ${uric.unit}): Hiperuricemia daña endotelio glomerular, reduce TFG y acelera aterosclerosis. Cristales de urato en túbulos renales. Johnson et al. Kidney Int 2021: UA >6 mg/dL en mujeres y >7 en hombres requiere intervención.`)
      if (insights.length === 0)
        insights.push('Función renal preservada. TFG >90 mL/min es el objetivo óptimo de longevidad renal para mantener eliminación efectiva de toxinas y productos de desecho metabólico.')
      return insights
    },
    studies: [
      'KDIGO 2022 Guidelines — Estadificación y manejo de ERC',
      'Heerspink et al. DAPA-CKD NEJM 2020 — SGLT2 y nefroprotección independiente de diabetes',
      'Johnson et al. Kidney Int 2021 — Hiperuricemia y daño renal progresivo',
    ],
    recommendations: [
      {
        panel: 'Función Renal Básica',
        priority: 'esencial',
        biomarkers: ['Creatinina sérica', 'TFG estimada (eGFR)', 'Urea sérica', 'BUN (nitrógeno ureico)'],
        reason: 'La TFG es el indicador más fiable de la capacidad de filtración renal. La creatinina sola subestima el daño; la TFG corregida por edad y sexo da el estadio real de la función renal según criterios KDIGO 2022.',
      },
      {
        panel: 'Marcadores de Daño Glomerular',
        priority: 'esencial',
        biomarkers: ['Ácido úrico sérico', 'Microalbuminuria en orina de 24h', 'Relación albúmina/creatinina en orina (ACR)'],
        reason: 'La microalbuminuria es el marcador más temprano de daño glomerular, años antes de que caiga la TFG. Ácido úrico >7 mg/dL causa daño tubular directo e inflamación endotelial renal.',
      },
      {
        panel: 'Electrolitos y Equilibrio Ácido-Base',
        priority: 'recomendado',
        biomarkers: ['Sodio', 'Potasio', 'Cloro', 'Bicarbonato', 'Fósforo', 'Calcio sérico'],
        reason: 'La disfunción renal altera la regulación de electrolitos. Hiperpotasemia e hiperfosfatemia son señales tempranas de deterioro de la capacidad excretora tubular.',
      },
    ],
  },

  // ── 4. PÁNCREAS ─────────────────────────────────────────────────
  {
    id: 'pancreas',
    name: 'Páncreas',
    subtitle: 'Metabolismo Glucídico',
    icon: FlaskConical,
    iconColor: 'text-violet-400',
    getBiomarkers: (d) => [
      { key: 'glucose',     label: BIOMARKER_LABELS.glucose,     bm: d.metabolic?.glucose,  weight: 'high' },
      { key: 'hba1c',       label: BIOMARKER_LABELS.hba1c,       bm: d.hormones?.hba1c,     weight: 'high' },
      { key: 'insulin',     label: BIOMARKER_LABELS.insulin,     bm: d.hormones?.insulin,   weight: 'high' },
      { key: 'amylase',     label: BIOMARKER_LABELS.amylase,     bm: d.liver?.amylase,      weight: 'medium' },
      { key: 'triglycerides',label: BIOMARKER_LABELS.triglycerides, bm: d.lipids?.triglycerides, weight: 'medium' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const gluc = get('glucose'), hba1c = get('hba1c'), ins = get('insulin'), amylase = get('amylase')
      if (hba1c?.value && gluc?.value) {
        const hv = hba1c.value, gv = gluc.value
        if (hv >= 6.5)      insights.push(`Diabetes tipo 2 confirmada — HbA1c ${hv}% con glucosa ${gv} mg/dL. Sobrecarga crónica de insulina con daño en células beta. TAME Trial (Barzilai): metformina como primera intervención anti-aging. Cada 1% reducción en HbA1c = 37% menos complicaciones.`)
        else if (hv >= 5.7 || gv >= 100) insights.push(`Prediabetes identificada (HbA1c ${hv}%, glucosa ${gv} mg/dL). Ventana crítica de oportunidad: DPP Trial (NEJM 2022) demostró 58% de reversión con intervención intensiva de estilo de vida. El páncreas aún tiene capacidad de recuperación.`)
        else if (hv >= 5.4) insights.push(`HbA1c ${hv}%: Fuera del rango óptimo de longevidad (<5.4%). Inicio de resistencia subclínica a insulina. Intervención dietética (dieta baja en índice glucémico) y ejercicio aeróbico preventivos como primera línea.`)
      }
      if (ins?.status === 'warning' || ins?.status === 'danger')
        insights.push(`Insulina en ayuno elevada (${ins.value} ${ins.unit}): Resistencia a insulina activa antes de que aparezcan alteraciones en glucosa. Síndrome metabólico temprano. HOMA-IR = (glucosa × insulina) / 405. Target: HOMA-IR <1.5.`)
      if (amylase?.status === 'danger')
        insights.push(`Amilasa elevada (${amylase.value} ${amylase.unit}): Posible inflamación pancreática exocrina aguda o crónica. Requiere lipasa sérica para confirmar pancreatitis. Correlacionar con síntomas clínicos.`)
      if (insights.length === 0)
        insights.push('Función pancreática endocrina óptima. Glucosa y HbA1c en rangos de longevidad. Células beta con respuesta insulínica adecuada.')
      return insights
    },
    studies: [
      'TAME Trial (Barzilai, Albert Einstein College) — Metformina y longevidad: primer ensayo anti-aging',
      'DPP Trial (Knowler, NEJM 2022) — Reversión prediabetes: 58% con intervención estilo de vida',
      'Bramante et al. Lancet ID 2023 — Metformina: -42% mortalidad en COVID-19',
    ],
    recommendations: [
      {
        panel: 'Perfil Glucémico Completo',
        priority: 'esencial',
        biomarkers: ['Glucosa en ayuno (≥8h)', 'HbA1c (hemoglobina glucosilada)', 'Insulina en ayuno'],
        reason: 'La glucosa sola no detecta resistencia a insulina temprana. La HbA1c refleja el promedio glucémico de los últimos 3 meses. La insulina en ayuno permite calcular el HOMA-IR, el índice más sensible de resistencia insulínica subclínica (target óptimo <1.5).',
      },
      {
        panel: 'Función Pancreática Exocrina',
        priority: 'recomendado',
        biomarkers: ['Amilasa sérica', 'Lipasa sérica'],
        reason: 'Lipasa elevada (>3× el límite superior) confirma pancreatitis aguda. La combinación amilasa + lipasa diferencia el origen pancreático del hepático o intestinal y descarta patología pancreática exocrina silenciosa.',
      },
      {
        panel: 'Marcadores Avanzados de Resistencia Insulínica',
        priority: 'recomendado',
        biomarkers: ['HOMA-IR (calculado con glucosa e insulina)', 'Péptido C en ayuno', 'Fructosamina'],
        reason: 'El péptido C mide la producción endógena real de insulina y diferencia la DM tipo 1 del tipo 2. La fructosamina refleja el control glucémico de las últimas 2-3 semanas, útil cuando la HbA1c no es confiable.',
      },
    ],
  },

  // ── 5. SISTEMA HEMATOLÓGICO ─────────────────────────────────────
  {
    id: 'hematology',
    name: 'Sistema Hematológico',
    subtitle: 'Sangre y Médula Ósea',
    icon: Activity,
    iconColor: 'text-red-400',
    getBiomarkers: (d) => [
      { key: 'hemoglobin', label: BIOMARKER_LABELS.hemoglobin, bm: d.hematology?.hemoglobin, weight: 'high' },
      { key: 'hematocrit', label: BIOMARKER_LABELS.hematocrit, bm: d.hematology?.hematocrit, weight: 'high' },
      { key: 'rbc',        label: BIOMARKER_LABELS.rbc,        bm: d.hematology?.rbc,        weight: 'high' },
      { key: 'mcv',        label: BIOMARKER_LABELS.mcv,        bm: d.hematology?.mcv,        weight: 'medium' },
      { key: 'mch',        label: BIOMARKER_LABELS.mch,        bm: d.hematology?.mch,        weight: 'medium' },
      { key: 'mchc',       label: BIOMARKER_LABELS.mchc,       bm: d.hematology?.mchc,       weight: 'medium' },
      { key: 'rdw',        label: BIOMARKER_LABELS.rdw,        bm: d.hematology?.rdw,        weight: 'medium' },
      { key: 'platelets',  label: BIOMARKER_LABELS.platelets,  bm: d.hematology?.platelets,  weight: 'high' },
      { key: 'mpv',        label: BIOMARKER_LABELS.mpv,        bm: d.hematology?.mpv,        weight: 'low' },
      { key: 'ferritin',   label: BIOMARKER_LABELS.ferritin,   bm: d.vitamins?.ferritin,     weight: 'high' },
      { key: 'ldh',        label: BIOMARKER_LABELS.ldh,        bm: d.liver?.ldh,             weight: 'medium' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const hb = get('hemoglobin'), mcv = get('mcv'), ferritin = get('ferritin')
      const rdw = get('rdw'), ldh = get('ldh'), platelets = get('platelets')
      if (hb?.status === 'warning' || hb?.status === 'danger') {
        const mv = mcv?.value
        if (mv && mv < 80)      insights.push(`Anemia microcítica (Hb: ${hb.value} ${hb.unit}, VCM: ${mv} fL): Compatible con déficit de hierro o talasemia. Ferritina <30 ng/mL confirma depleción de depósitos. Suplementar hierro bisglicenato (mejor tolerado que sulfato ferroso) + vitamina C.`)
        else if (mv && mv > 100) insights.push(`Anemia macrocítica (Hb: ${hb.value} ${hb.unit}, VCM: ${mv} fL): Compatible con déficit de B12 o folato. Smith et al. PNAS 2022: suplementación B12+B6+folato redujo 53% atrofia cerebral. Riesgo neurológico si no se corrige.`)
        else                     insights.push(`Anemia normocítica (Hb: ${hb.value} ${hb.unit}): Posible anemia de enfermedad crónica, insuficiencia renal o pérdida aguda. Requiere ferritina, B12 y evaluación clínica complementaria.`)
      }
      if (rdw?.status === 'warning' || rdw?.status === 'danger')
        insights.push(`RDW elevado (${rdw.value}${rdw.unit}): Predictor independiente de mortalidad cardiovascular y all-cause (Forhecz et al. 2021). Refleja heterogeneidad eritrocitaria, deficiencias nutricionales mixtas e inflamación crónica activa.`)
      if (ldh?.status === 'danger')
        insights.push(`LDH elevada (${ldh.value} ${ldh.unit}): Marcador de daño celular activo sistémico. Puede indicar hemólisis, daño hepático, muscular o proceso neoplásico. Requiere correlación clínica urgente con sintomatología.`)
      if (insights.length === 0)
        insights.push('Sistema hematológico en parámetros óptimos. Eritropoyesis activa, reservas de hierro adecuadas y coagulación dentro de rangos de longevidad.')
      return insights
    },
    studies: [
      'Forhecz et al. Eur J Heart Fail 2021 — RDW como predictor independiente de mortalidad',
      'WHO 2020 — Criterios diagnósticos de anemia: clasificación morfológica y etiológica',
      'Lopez et al. Blood 2022 — Hierro, ferritina y anemia por deficiencia: guías actualizadas',
    ],
    recommendations: [
      {
        panel: 'Biometría Hemática Completa (BHC)',
        priority: 'esencial',
        biomarkers: ['Hemoglobina', 'Hematocrito', 'Eritrocitos (RBC)', 'VCM', 'HCM', 'CHCM', 'RDW', 'Leucocitos (WBC)', 'Neutrófilos', 'Linfocitos', 'Monocitos', 'Eosinófilos', 'Plaquetas', 'VPM (MPV)'],
        reason: 'La BHC con diferencial es el análisis más informativo del estado hematológico. El RDW es predictor independiente de mortalidad cardiovascular. El VCM orienta la etiología de la anemia (microcítica vs. macrocítica). El diferencial leucocitario calcula el índice NLR.',
      },
      {
        panel: 'Metabolismo del Hierro',
        priority: 'esencial',
        biomarkers: ['Ferritina sérica', 'Hierro sérico', 'TIBC (capacidad de fijación de hierro)', 'Saturación de transferrina'],
        reason: 'La ferritina baja confirma depleción de depósitos; la ferritina alta puede indicar inflamación o hemocromatosis. TIBC y saturación de transferrina permiten distinguir la anemia ferropénica de la anemia de enfermedad crónica, guiando la suplementación.',
      },
      {
        panel: 'Marcadores de Hemólisis y Daño Celular',
        priority: 'recomendado',
        biomarkers: ['LDH (deshidrogenasa láctica)', 'Bilirrubina indirecta', 'Haptoglobina'],
        reason: 'LDH elevada + haptoglobina baja + bilirrubina indirecta alta es la tríada diagnóstica de hemólisis activa. Permite detectar procesos hemolíticos autoinmunes, mecánicos o infecciosos que no se evidencian solo con la BHC.',
      },
    ],
  },

  // ── 6. SISTEMA INMUNOLÓGICO ──────────────────────────────────────
  {
    id: 'immune',
    name: 'Sistema Inmunológico',
    subtitle: 'Defensa, Vigilancia y Autoinmunidad',
    icon: Shield,
    iconColor: 'text-emerald-400',
    getBiomarkers: (d) => [
      { key: 'wbc',        label: BIOMARKER_LABELS.wbc,        bm: d.hematology?.wbc,        weight: 'high' },
      { key: 'neutrophils',label: BIOMARKER_LABELS.neutrophils, bm: d.hematology?.neutrophils, weight: 'high' },
      { key: 'lymphocytes',label: BIOMARKER_LABELS.lymphocytes, bm: d.hematology?.lymphocytes, weight: 'high' },
      { key: 'monocytes',  label: BIOMARKER_LABELS.monocytes,  bm: d.hematology?.monocytes,  weight: 'medium' },
      { key: 'eosinophils',label: BIOMARKER_LABELS.eosinophils, bm: d.hematology?.eosinophils, weight: 'medium' },
      { key: 'crp',        label: BIOMARKER_LABELS.crp,        bm: d.inflammation?.crp,      weight: 'high' },
      { key: 'vitaminD',   label: BIOMARKER_LABELS.vitaminD,   bm: d.vitamins?.vitaminD,     weight: 'medium' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const neutro = get('neutrophils'), lympho = get('lymphocytes')
      const crp = get('crp'), eosin = get('eosinophils'), vitD = get('vitaminD')
      if (neutro?.value && lympho?.value) {
        const nlr = (neutro.value / lympho.value).toFixed(2)
        const n = parseFloat(nlr)
        if (n > 3.5)       insights.push(`Índice Neutrófilo/Linfocito (NLR): ${nlr}. NLR >3.5 es predictor independiente de mortalidad y estado inflamatorio crónico (Fest et al. Eur J Cancer 2021). Marcador pronóstico clave en COVID-19, cáncer y enfermedades inflamatorias sistémicas.`)
        else if (n > 2.5)  insights.push(`NLR: ${nlr} (límite). Valores 2.5-3.5 sugieren activación inmune subclínica. Monitoreo trimestral y optimización de vitamina D, omega-3 y zinc recomendados.`)
        else               insights.push(`NLR: ${nlr} — Relación Neutrófilo/Linfocito saludable. Balance entre inmunidad innata y adaptativa óptimo.`)
      }
      if (crp?.status === 'warning' || crp?.status === 'danger')
        insights.push(`PCR elevada (${crp.value} ${crp.unit}): Sistema inmune en activación crónica — inflammaging. Furman et al. Nature Med 2019: inflammaging es el predictor más potente de envejecimiento acelerado. Intervención prioritaria: omega-3, GlyNAC, reducir azúcares y ultraprocesados.`)
      if (eosin?.status === 'warning' || eosin?.status === 'danger')
        insights.push(`Eosinófilos elevados (${eosin.value} ${eosin.unit}): Respuesta alérgica activa, parasitosis o proceso autoinmune. En contexto de inflamación sistémica, sugiere activación de vía Th2.`)
      if (vitD?.status === 'warning' || vitD?.status === 'danger')
        insights.push(`Vitamina D baja (${vitD.value} ${vitD.unit}): La Vit D es inmunomoduladora fundamental. Deficiencia aumenta susceptibilidad a infecciones, autoinmunidad y cáncer. VITAL Trial (Manson 2022): D3 2000 UI/día redujo 25% mortalidad por cáncer.`)
      if (insights.length === 0)
        insights.push('Sistema inmunológico balanceado. NLR, leucocitos y marcadores inflamatorios dentro de rangos óptimos de longevidad.')
      return insights
    },
    studies: [
      'Fest et al. Eur J Cancer 2021 — NLR como predictor de mortalidad en múltiples condiciones',
      'Furman et al. Nature Med 2019 — Inflammaging: el reloj molecular del envejecimiento',
      'Manson et al. VITAL Trial NEJM 2022 — Vitamina D e inmunidad: cáncer y autoinmunidad',
    ],
    recommendations: [
      {
        panel: 'Diferencial de Leucocitos (BHC completa)',
        priority: 'esencial',
        biomarkers: ['Leucocitos totales (WBC)', 'Neutrófilos (absolutos y %)', 'Linfocitos (absolutos y %)', 'Monocitos', 'Eosinófilos', 'Basófilos'],
        reason: 'El índice NLR (neutrófilos/linfocitos) es el marcador más accesible de activación inmune crónica. NLR >3.5 predice mortalidad en cáncer, infecciones y enfermedades autoinmunes (Fest et al. 2021). Los eosinófilos elevados señalan alergias activas o parasitosis.',
      },
      {
        panel: 'Marcadores Inflamatorios e Inmunológicos',
        priority: 'esencial',
        biomarkers: ['PCR Ultrasensible (hsCRP)', 'Vitamina D 25-OH'],
        reason: 'PCR ultrasensible cuantifica la intensidad del inflammaging. Vitamina D <30 ng/mL suprime la función de linfocitos T reguladores y aumenta el riesgo de autoinmunidad, infecciones y cáncer (VITAL Trial, Manson 2022).',
      },
      {
        panel: 'Panel de Autoinmunidad (si hay síntomas)',
        priority: 'recomendado',
        biomarkers: ['ANA (anticuerpos antinucleares)', 'Factor Reumatoide (FR)', 'Anti-TPO (anticuerpos antitiroideos)', 'IgE total'],
        reason: 'Indicado si hay fatiga crónica, dolor articular, erupciones o síntomas sugestivos de autoinmunidad. Anti-TPO detecta tiroiditis de Hashimoto subclínica, causa frecuente de fatiga e hipotiroidismo no diagnosticado.',
      },
    ],
  },

  // ── 7. METABOLISMO ──────────────────────────────────────────────
  {
    id: 'metabolic',
    name: 'Metabolismo',
    subtitle: 'Síndrome Metabólico y Resistencia Insulínica',
    icon: Zap,
    iconColor: 'text-yellow-400',
    getBiomarkers: (d) => [
      { key: 'glucose',     label: BIOMARKER_LABELS.glucose,     bm: d.metabolic?.glucose,      weight: 'high' },
      { key: 'hba1c',       label: BIOMARKER_LABELS.hba1c,       bm: d.hormones?.hba1c,         weight: 'high' },
      { key: 'insulin',     label: BIOMARKER_LABELS.insulin,     bm: d.hormones?.insulin,       weight: 'high' },
      { key: 'triglycerides',label: BIOMARKER_LABELS.triglycerides, bm: d.lipids?.triglycerides, weight: 'high' },
      { key: 'hdl',         label: BIOMARKER_LABELS.hdl,         bm: d.lipids?.hdl,             weight: 'medium' },
      { key: 'uricAcid',    label: BIOMARKER_LABELS.uricAcid,    bm: d.metabolic?.uricAcid,     weight: 'medium' },
      { key: 'tgHdlRatio',  label: BIOMARKER_LABELS.tgHdlRatio,  bm: d.lipids?.tgHdlRatio,      weight: 'high' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const gluc = get('glucose'), tg = get('triglycerides')
      const hdl = get('hdl'), tgHdl = get('tgHdlRatio')
      let msCriteria = 0
      if (gluc?.value && gluc.value >= 100) msCriteria++
      if (tg?.value   && tg.value >= 150)   msCriteria++
      if (hdl?.value  && hdl.value < 40)    msCriteria++
      if (msCriteria >= 2)
        insights.push(`${msCriteria} criterios de Síndrome Metabólico presentes (ATP III 2020). El síndrome metabólico multiplica ×5 el riesgo de DM2 y ×3 el riesgo cardiovascular. Activa el eje insulina-mTOR-inflamación acelerando el envejecimiento biológico.`)
      if (tgHdl?.status === 'warning' || tgHdl?.status === 'danger')
        insights.push(`Relación TG/HDL elevada (${tgHdl.value}): Proxy validado de resistencia a insulina y presencia de partículas LDL pequeñas y densas (sd-LDL). Target óptimo de longevidad: <1.5. Este ratio predice riesgo metabólico con mayor precisión que LDL aislado (McLaughlin, JCEM 2021).`)
      if (insights.length === 0)
        insights.push('Perfil metabólico óptimo. Ausencia de criterios de síndrome metabólico. Sensibilidad a insulina preservada.')
      return insights
    },
    studies: [
      'Alberti et al. Circulation 2020 — Definición armonizada y criterios síndrome metabólico',
      'McLaughlin et al. JCEM 2021 — TG/HDL como proxy de resistencia a insulina',
      'Huang et al. Front Endocrinol 2022 — Eje mTOR-insulina y síndrome metabólico',
    ],
    recommendations: [
      {
        panel: 'Perfil Metabólico Completo',
        priority: 'esencial',
        biomarkers: ['Glucosa en ayuno', 'Insulina en ayuno', 'HbA1c', 'Triglicéridos', 'HDL', 'Ácido úrico'],
        reason: 'El síndrome metabólico se diagnostica con ≥3 de 5 criterios: glucosa ≥100, TG ≥150, HDL bajo, PA ≥130/85, circunferencia abdominal aumentada. La insulina en ayuno detecta resistencia subclínica años antes de que aparezca la hiperglucemia.',
      },
      {
        panel: 'Índices de Resistencia Insulínica',
        priority: 'esencial',
        biomarkers: ['HOMA-IR (glucosa × insulina / 405)', 'Relación TG/HDL', 'Relación TG/glucosa (TyG index)'],
        reason: 'HOMA-IR >1.5 indica resistencia insulínica subclínica; >2.5 es resistencia significativa. TG/HDL >3.5 predice partículas LDL pequeñas y densas con mayor poder aterogénico. El índice TyG es el proxy de RI más preciso sin necesidad de insulina.',
      },
      {
        panel: 'Composición Corporal y Antropometría',
        priority: 'recomendado',
        biomarkers: ['Circunferencia abdominal', 'Índice cintura-cadera', 'Bioimpedancia (% grasa visceral)', 'Presión arterial en reposo'],
        reason: 'La grasa visceral (medida con bioimpedancia o DEXA) es el tejido adiposo metabólicamente activo que secreta adipocinas proinflamatorias. La circunferencia abdominal >90 cm en hombres y >80 cm en mujeres es criterio de síndrome metabólico.',
      },
    ],
  },

  // ── 8. SISTEMA ENDOCRINO ─────────────────────────────────────────
  {
    id: 'endocrine',
    name: 'Sistema Endocrino',
    subtitle: 'Tiroides, Hormonas y Eje Cortisol',
    icon: Settings,
    iconColor: 'text-orange-400',
    getBiomarkers: (d) => [
      { key: 'tsh',         label: BIOMARKER_LABELS.tsh,         bm: d.hormones?.tsh,         weight: 'high' },
      { key: 'testosterone',label: BIOMARKER_LABELS.testosterone, bm: d.hormones?.testosterone, weight: 'high' },
      { key: 'cortisol',    label: BIOMARKER_LABELS.cortisol,    bm: d.hormones?.cortisol,    weight: 'high' },
      { key: 'insulin',     label: BIOMARKER_LABELS.insulin,     bm: d.hormones?.insulin,     weight: 'medium' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const tsh = get('tsh'), test = get('testosterone'), cortisol = get('cortisol')
      if (tsh?.status === 'warning' || tsh?.status === 'danger') {
        if (tsh.value && tsh.value > 4.0)
          insights.push(`TSH elevada (${tsh.value} mUI/L): Hipotiroidismo subclínico o clínico. Rodondi et al. JAMA 2021: cada 1 mUI/L adicional de TSH asociado a +2-3 kg de peso y 20% mayor riesgo cardiovascular. Target óptimo: 0.5-2.0 mUI/L.`)
        else if (tsh.value && tsh.value < 0.4)
          insights.push(`TSH suprimida (${tsh.value} mUI/L): Hipertiroidismo. Riesgo aumentado de fibrilación auricular, pérdida de masa ósea y mortalidad cardiovascular. Evaluación tiroidea urgente.`)
      }
      if (test?.status === 'warning' || test?.status === 'danger')
        insights.push(`Testosterona subóptima (${test.value} ${test.unit}): Hormona anabólica clave para masa muscular, densidad ósea, función cognitiva y salud cardiovascular. Déficit acelera sarcopenia y síndrome metabólico. Muraleedharan, Eur J Endocrinol 2021: déficit asociado a 88% mayor mortalidad a 8 años.`)
      if (cortisol?.status === 'warning' || cortisol?.status === 'danger')
        insights.push(`Cortisol anormal (${cortisol.value} ${cortisol.unit}): Cortisol crónico elevado acelera envejecimiento biológico via inflamación, resistencia a insulina, pérdida muscular y supresión inmune (McEwen, Nat Rev Neurosci 2022). Técnicas de reducción de carga alostática: meditación, sueño 7-9h, adaptógenos.`)
      if (insights.length === 0)
        insights.push('Eje endocrino en equilibrio óptimo. TSH, testosterona y cortisol dentro de rangos de longevidad. Sistema hormonal con buen balance anabólico-catabólico.')
      return insights
    },
    studies: [
      'Rodondi et al. JAMA 2021 — Hipotiroidismo subclínico y riesgo cardiovascular',
      'Muraleedharan et al. Eur J Endocrinol 2021 — Testosterona y mortalidad a 8 años',
      'McEwen et al. Nat Rev Neurosci 2022 — Cortisol crónico y envejecimiento acelerado',
    ],
    recommendations: [
      {
        panel: 'Panel Tiroideo Completo',
        priority: 'esencial',
        biomarkers: ['TSH (hormona estimulante del tiroides)', 'T4 libre (FT4)', 'T3 libre (FT3)', 'Anti-TPO (anticuerpos antitiroideos)'],
        reason: 'La TSH sola no es suficiente. T4 y T3 libres miden la disponibilidad real de hormona tiroidea activa. Anti-TPO detecta tiroiditis autoinmune de Hashimoto subclínica, causa #1 de hipotiroidismo no diagnosticado. Target óptimo de longevidad: TSH 0.5-2.0 mUI/L.',
      },
      {
        panel: 'Hormonas Sexuales y Eje Adrenal',
        priority: 'esencial',
        biomarkers: ['Testosterona total', 'Testosterona libre (calculada)', 'Cortisol matutino (8:00-9:00 am)', 'DHEA-S (sulfato de dehidroepiandrosterona)'],
        reason: 'La testosterona libre es la fracción biológicamente activa; puede estar baja aunque la total sea normal. Cortisol matutino evalúa la reserva suprarrenal. DHEA-S es la hormona de longevidad más abundante y disminuye progresivamente con la edad.',
      },
      {
        panel: 'Eje Insulínico y Hormona de Crecimiento',
        priority: 'recomendado',
        biomarkers: ['Insulina en ayuno', 'IGF-1 (factor de crecimiento similar a insulina)', 'Prolactina'],
        reason: 'IGF-1 tiene una curva en U con la longevidad: niveles muy bajos o muy altos se asocian a mayor mortalidad. Rango óptimo en adulto: 120-180 ng/mL. La prolactina elevada puede inhibir testosterona y causar disfunción sexual e ósea.',
      },
    ],
  },

  // ── 9. SISTEMA NERVIOSO ──────────────────────────────────────────
  {
    id: 'nervous',
    name: 'Sistema Nervioso',
    subtitle: 'Salud Cerebral y Neurológica',
    icon: Brain,
    iconColor: 'text-purple-400',
    getBiomarkers: (d) => [
      { key: 'vitaminB12',  label: BIOMARKER_LABELS.vitaminB12,  bm: d.vitamins?.vitaminB12,  weight: 'high' },
      { key: 'homocysteine',label: BIOMARKER_LABELS.homocysteine, bm: d.inflammation?.homocysteine, weight: 'high' },
      { key: 'cortisol',    label: BIOMARKER_LABELS.cortisol,    bm: d.hormones?.cortisol,    weight: 'medium' },
      { key: 'glucose',     label: BIOMARKER_LABELS.glucose,     bm: d.metabolic?.glucose,    weight: 'medium' },
      { key: 'vitaminD',    label: BIOMARKER_LABELS.vitaminD,    bm: d.vitamins?.vitaminD,    weight: 'medium' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const b12 = get('vitaminB12'), hcy = get('homocysteine'), vitD = get('vitaminD')
      if (b12?.status === 'warning' || b12?.status === 'danger')
        insights.push(`B12 deficiente (${b12.value} ${b12.unit}): Déficit subclínico (300-500 pg/mL) causa deterioro cognitivo sutil y desmielinización progresiva. Smith et al. PNAS 2022 (Oxford): B12+B6+folato redujo 53% atrofia del hipocampo en 2 años. Usar metilcobalamina 1000-2000 mcg/día (forma activa).`)
      if (hcy?.status === 'warning' || hcy?.status === 'danger')
        insights.push(`Homocisteína elevada (${hcy.value} ${hcy.unit}): Factor de riesgo independiente para Alzheimer y demencia vascular. Seshadri et al. NEJM: cada 5 μmol/L extra aumenta 35% riesgo de demencia. Intervención: B6, B12, folato, betaína (TMG). Responde en 6-8 semanas.`)
      if (vitD?.status === 'warning' || vitD?.status === 'danger')
        insights.push(`Vitamina D baja (${vitD.value} ${vitD.unit}): El cerebro expresa receptores VDR en hipocampo y corteza prefrontal. Deficiencia asociada a depresión, deterioro cognitivo y Parkinson. Littlejohns et al. Neurology 2021: <25 nmol/L duplica riesgo de demencia.`)
      if (insights.length === 0)
        insights.push('Biomarcadores de salud neurológica dentro de parámetros óptimos. B12 y homocisteína en rango protector para función cognitiva a largo plazo.')
      return insights
    },
    studies: [
      'Smith et al. PNAS 2022 (Oxford) — B12+B6+folato: -53% atrofia hipocampo en 2 años',
      'Seshadri et al. NEJM 2002 — Homocisteína y riesgo de demencia: estudio clásico de Framingham',
      'Littlejohns et al. Neurology 2021 — Vitamina D y deterioro cognitivo: cohorte prospectiva',
    ],
    recommendations: [
      {
        panel: 'Biomarcadores de Salud Neurológica',
        priority: 'esencial',
        biomarkers: ['Vitamina B12 sérica', 'Homocisteína plasmática', 'Vitamina D 25-OH', 'Ácido fólico (folato sérico)'],
        reason: 'Este es el panel más costo-efectivo para prevenir deterioro cognitivo. Homocisteína >10 μmol/L daña neuronas y vasos cerebrales; responde en 6-8 semanas con B6+B12+folato. La deficiencia de B12 causa desmielinización silenciosa detectable solo con análisis.',
      },
      {
        panel: 'Eje Cortisol-Estrés y Neuroprotección',
        priority: 'esencial',
        biomarkers: ['Cortisol matutino (8 am)', 'Glucosa en ayuno', 'TSH y T3 libre'],
        reason: 'El cortisol crónico elevado atrofia el hipocampo (zona con más receptores de glucocorticoides), deteriorando memoria y aprendizaje. La hipoglucemia y el hipotiroidismo causan "niebla mental" y son causas reversibles frecuentes de deterioro cognitivo.',
      },
      {
        panel: 'Biomarcadores Avanzados de Neurodegeneración',
        priority: 'recomendado',
        biomarkers: ['ApoE genotipo (riesgo Alzheimer)', 'PCR Ultrasensible', 'Omega-3 Index', 'Magnesio eritrocitario'],
        reason: 'ApoE ε4 multiplica ×3-×12 el riesgo de Alzheimer y orienta la estrategia preventiva personalizada. Magnesio eritrocitario (no sérico) refleja el magnesio intracelular, cofactor de >600 reacciones enzimáticas cerebrales. Omega-3 Index <8% se asocia a mayor atrofia cerebral.',
      },
    ],
  },

  // ── 10. SISTEMA MÚSCULO-ESQUELÉTICO ─────────────────────────────
  {
    id: 'musculoskeletal',
    name: 'Músculos y Huesos',
    subtitle: 'Densidad Ósea y Sarcopenia',
    icon: Dumbbell,
    iconColor: 'text-teal-400',
    getBiomarkers: (d) => [
      { key: 'vitaminD',         label: BIOMARKER_LABELS.vitaminD,         bm: d.vitamins?.vitaminD,         weight: 'high' },
      { key: 'alkalinePhosphatase',label: BIOMARKER_LABELS.alkalinePhosphatase, bm: d.liver?.alkalinePhosphatase, weight: 'high' },
      { key: 'uricAcid',         label: BIOMARKER_LABELS.uricAcid,         bm: d.metabolic?.uricAcid,        weight: 'medium' },
      { key: 'albumin',          label: BIOMARKER_LABELS.albumin,          bm: d.liver?.albumin,             weight: 'medium' },
      { key: 'testosterone',     label: BIOMARKER_LABELS.testosterone,     bm: d.hormones?.testosterone,     weight: 'medium' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const vitD = get('vitaminD'), alkP = get('alkalinePhosphatase'), uric = get('uricAcid'), test = get('testosterone')
      if (vitD?.status === 'warning' || vitD?.status === 'danger')
        insights.push(`Vitamina D baja (${vitD.value} ${vitD.unit}): Deficiencia activa osteoclastos > osteoblastos → pérdida de densidad mineral ósea. Target longevidad: 60-80 ng/mL. Sinergia crítica con K2 MK-7 180 mcg/día: dirige calcio absorbido hacia el hueso, impidiendo calcificación arterial (Geleijnse, Thromb Haemost 2021).`)
      if (alkP?.status === 'warning' || alkP?.status === 'danger')
        insights.push(`Fosfatasa alcalina ${alkP.value} ${alkP.unit}: Elevación puede indicar remodelado óseo acelerado (Paget, osteomalacia, fracturas recientes) o colestasis hepática. Valor bajo puede indicar déficit de zinc o magnesio con inhibición enzimática.`)
      if (uric?.status === 'danger' || uric?.status === 'warning')
        insights.push(`Ácido úrico elevado (${uric.value} ${uric.unit}): Riesgo de gota articular por cristales de urato sódico en articulaciones y bursas. Daño crónico de cartílago. Intervención: hidratación >2L/día, restricción de purinas (carnes rojas, fructosa), alopurinol si >8 mg/dL.`)
      if (test?.status === 'warning' || test?.status === 'danger')
        insights.push(`Testosterona subóptima: Principal hormona anabólica para síntesis de proteínas musculares y remodelado óseo. Déficit acelera sarcopenia (pérdida 3-5% masa muscular/década) y osteoporosis. Cruz-Jentoft 2021: sarcopenia multiplica ×3 mortalidad en adultos mayores.`)
      if (insights.length === 0)
        insights.push('Sistema músculo-esquelético con biomarcadores en rango óptimo. Vitamina D suficiente para mineralización ósea y absorción de calcio adecuadas.')
      return insights
    },
    studies: [
      'Rosen et al. NEJM 2020 — Vitamina D y salud ósea: revisión actualizada con meta-análisis',
      'Geleijnse et al. Thromb Haemost 2021 — K2 MK-7 y calcificación arterial vs ósea',
      'Cruz-Jentoft et al. Age Ageing 2021 — Sarcopenia: criterios EWGSOP2 y manejo clínico',
    ],
    recommendations: [
      {
        panel: 'Metabolismo Óseo y Mineral',
        priority: 'esencial',
        biomarkers: ['Vitamina D 25-OH', 'Fosfatasa Alcalina (FA)', 'Calcio sérico total', 'Fósforo sérico', 'Magnesio sérico'],
        reason: 'Vitamina D <30 ng/mL impide la absorción intestinal de calcio, activando la resorción ósea compensatoria. FA elevada indica remodelado óseo acelerado. El magnesio es cofactor indispensable para la conversión de vitamina D a su forma activa.',
      },
      {
        panel: 'Hormonas Anabólicas para Músculo y Hueso',
        priority: 'esencial',
        biomarkers: ['Testosterona total y libre', 'IGF-1', 'PTH (hormona paratiroidea)'],
        reason: 'Testosterona e IGF-1 son las principales hormonas anabólicas para síntesis de proteínas musculares y mineralización ósea. PTH elevada (hiperparatiroidismo secundario) es la consecuencia directa de la deficiencia crónica de vitamina D y calcio.',
      },
      {
        panel: 'Evaluación Funcional de Sarcopenia',
        priority: 'recomendado',
        biomarkers: ['Ácido úrico (riesgo de gota)', 'Albúmina (estado nutricional)', 'Creatinina (proxy de masa muscular)', 'DEXA scan (densitometría ósea)'],
        reason: 'La DEXA es el estándar de oro para densidad mineral ósea y composición corporal. Albúmina <4 g/dL indica desnutrición proteica que acelera sarcopenia. Creatinina baja puede reflejar pérdida de masa muscular en adultos mayores.',
      },
    ],
  },

  // ── 11. INFLAMACIÓN SISTÉMICA ────────────────────────────────────
  {
    id: 'inflammation',
    name: 'Inflamación Sistémica',
    subtitle: 'Inflammaging y Estrés Oxidativo',
    icon: Flame,
    iconColor: 'text-orange-500',
    getBiomarkers: (d) => [
      { key: 'crp',         label: BIOMARKER_LABELS.crp,         bm: d.inflammation?.crp,           weight: 'high' },
      { key: 'homocysteine',label: BIOMARKER_LABELS.homocysteine, bm: d.inflammation?.homocysteine,  weight: 'high' },
      { key: 'ggt',         label: BIOMARKER_LABELS.ggt,         bm: d.liver?.ggt,                  weight: 'high' },
      { key: 'rdw',         label: BIOMARKER_LABELS.rdw,         bm: d.hematology?.rdw,             weight: 'medium' },
      { key: 'wbc',         label: BIOMARKER_LABELS.wbc,         bm: d.hematology?.wbc,             weight: 'medium' },
      { key: 'ferritin',    label: BIOMARKER_LABELS.ferritin,    bm: d.vitamins?.ferritin,          weight: 'medium' },
      { key: 'uricAcid',    label: BIOMARKER_LABELS.uricAcid,    bm: d.metabolic?.uricAcid,         weight: 'low' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const crp = get('crp'), hcy = get('homocysteine'), ggt = get('ggt')
      const ferritin = get('ferritin'), rdw = get('rdw')
      let inflameCount = 0
      if (crp?.status === 'warning'     || crp?.status === 'danger')      inflameCount++
      if (hcy?.status === 'warning'     || hcy?.status === 'danger')      inflameCount++
      if (ggt?.status === 'warning'     || ggt?.status === 'danger')      inflameCount++
      if (ferritin?.status === 'warning'|| ferritin?.status === 'danger') inflameCount++
      if (rdw?.status === 'warning'     || rdw?.status === 'danger')      inflameCount++
      if (inflameCount >= 3)
        insights.push(`${inflameCount} marcadores de inflammaging alterados: Estado inflamatorio crónico sistémico activo. Furman et al. Nature Med 2019: inflammaging es el predictor más potente de envejecimiento acelerado, mortalidad prematura y todas las enfermedades crónicas. Intervención urgente requerida: GlyNAC, omega-3, dieta mediterránea, reducir ultraprocesados.`)
      else if (inflameCount >= 2)
        insights.push(`${inflameCount} marcadores inflamatorios fuera de rango óptimo. Activación inmune crónica subclínica. Kumar et al. Baylor 2022 (J Gerontology): GlyNAC (glicina + N-acetilcisteína) revirtió 8 de 9 marcadores de envejecimiento incluyendo estrés oxidativo e inflamación en adultos mayores.`)
      if (crp?.value && crp.value > 3)
        insights.push(`PCR >3 mg/L: Umbral de alto riesgo cardiovascular (AHA/ACC). JUPITER Trial (Ridker): estatinas redujeron 44% eventos CV en pacientes con PCR >2 mg/L y LDL normal. La inflamación es tan peligrosa como el colesterol.`)
      if (insights.length === 0)
        insights.push('Sin evidencia de inflammaging activo. Marcadores inflamatorios en rangos óptimos de longevidad. Sistema inmune calibrado, no hiperactivado.')
      return insights
    },
    studies: [
      'Furman et al. Nature Med 2019 — Inflammaging: el reloj molecular del envejecimiento biológico',
      'Kumar et al. J Gerontology 2022 (Baylor) — GlyNAC revirtió 8/9 marcadores de envejecimiento',
      'Ridker et al. JUPITER Trial NEJM 2008 — PCR >2 mg/L y estatinas en prevención primaria',
    ],
    recommendations: [
      {
        panel: 'Panel de Inflammaging Básico',
        priority: 'esencial',
        biomarkers: ['PCR Ultrasensible (hsCRP)', 'Homocisteína plasmática', 'GGT', 'Ferritina sérica'],
        reason: 'PCR es el marcador de referencia del inflammaging. Homocisteína activa el estrés oxidativo y daña el ADN. GGT refleja el estrés oxidativo hepático. Ferritina elevada indica inflamación crónica o sobrecarga de hierro (ambas pro-envejecimiento).',
      },
      {
        panel: 'Marcadores de Estrés Oxidativo Sistémico',
        priority: 'esencial',
        biomarkers: ['RDW (ancho de distribución eritrocitaria)', 'Leucocitos totales con diferencial', 'Ácido úrico', 'Bilirrubina (antioxidante endógeno)'],
        reason: 'RDW elevado refleja heterogeneidad celular causada por estrés oxidativo crónico y es predictor de mortalidad independiente. Ácido úrico elevado genera inflamación endotelial y radicales libres. La bilirrubina moderada (0.6-1.0 mg/dL) actúa como antioxidante endógeno protector.',
      },
      {
        panel: 'Biomarcadores Avanzados de Inflammaging',
        priority: 'recomendado',
        biomarkers: ['IL-6 (interleucina-6)', 'TNF-α (factor de necrosis tumoral)', 'Fibrinógeno', 'Dímero-D'],
        reason: 'IL-6 y TNF-α son las citocinas inflamatorias del SASP (secretoma de senescencia). Fibrinógeno elevado señala un estado protrombótico e inflamatorio. Estos marcadores están disponibles en laboratorios especializados y permiten cuantificar el inflammaging con mayor precisión.',
      },
    ],
  },

  // ── 12. VITAMINAS Y MICRONUTRIENTES ─────────────────────────────
  {
    id: 'vitamins',
    name: 'Vitaminas y Micronutrientes',
    subtitle: 'Deficiencias y Optimización de Longevidad',
    icon: Sun,
    iconColor: 'text-yellow-300',
    getBiomarkers: (d) => [
      { key: 'vitaminD',  label: BIOMARKER_LABELS.vitaminD,  bm: d.vitamins?.vitaminD,  weight: 'high' },
      { key: 'vitaminB12',label: BIOMARKER_LABELS.vitaminB12, bm: d.vitamins?.vitaminB12, weight: 'high' },
      { key: 'ferritin',  label: BIOMARKER_LABELS.ferritin,  bm: d.vitamins?.ferritin,  weight: 'high' },
    ],
    getInsights: (bms) => {
      const insights: string[] = []
      const get = (k: string) => bms.find(b => b.key === k)?.bm
      const vitD = get('vitaminD'), b12 = get('vitaminB12'), ferritin = get('ferritin')
      if (vitD?.value !== undefined && vitD?.value !== null) {
        const v = vitD.value
        if (v < 20)      insights.push(`Vitamina D severamente deficiente (${v} ng/mL). VITAL Trial 2022: D3 2000 UI/día redujo 25% mortalidad por cáncer. 41% de adultos mexicanos tienen <20 ng/mL (ENSANUT 2021). Protocolo de corrección: D3 10,000 UI/día × 8 semanas, luego 5,000 UI/día de mantenimiento + K2 MK-7 180 mcg.`)
        else if (v < 40) insights.push(`Vitamina D insuficiente (${v} ng/mL). El laboratorio acepta como normal, pero longevidad exige 60-80 ng/mL. A estos niveles: absorción subóptima de calcio, inmunidad reducida y mayor riesgo de depresión y cáncer. Aumentar a D3 5,000 UI/día.`)
        else if (v < 60) insights.push(`Vitamina D suficiente pero sub-óptima (${v} ng/mL). Rango de longevidad: 60-80 ng/mL. Incrementar a 3,000-5,000 UI/día con K2 MK-7 180 mcg para maximizar efecto en hueso y sistema inmune sin riesgo de calcificación.`)
        else             insights.push(`Vitamina D óptima (${v} ng/mL). En el rango protector de longevidad (60-80 ng/mL). Mantener con suplementación + exposición solar moderada 15-20 min/día.`)
      }
      if (b12?.status === 'warning' || b12?.status === 'danger')
        insights.push(`B12 subóptima (${b12.value} ${b12.unit}): Rango funcional neuroprotector: 600-1200 pg/mL. Suplementar metilcobalamina 1,000-2,000 mcg/día (sublingual, mejor absorción). Vegetarianos, veganos y >60 años con riesgo elevado por menor absorción intestinal.`)
      if (ferritin?.status === 'warning' || ferritin?.status === 'danger')
        insights.push(`Ferritina (${ferritin.value} ${ferritin.unit}) — Rango óptimo: 50-100 ng/mL. ${ferritin.value && ferritin.value < 50 ? 'Baja: depleción de depósitos de hierro, riesgo de anemia ferropénica. Suplementar hierro bisglicinatoo.' : 'Alta: inflamación crónica o hemocromatosis. Exceso de hierro libre genera radicales hidroxilo (reacción de Fenton), daño celular y envejecimiento acelerado.'}`)
      if (insights.length === 0)
        insights.push('Micronutrientes dentro de rangos óptimos de longevidad. Vitamina D, B12 y ferritina en niveles protectores.')
      return insights
    },
    studies: [
      'Manson et al. VITAL Trial NEJM 2022 — D3 2000 UI/día: -25% mortalidad por cáncer',
      'ENSANUT 2021 México — Prevalencia de deficiencia de vitamina D: 41% de adultos',
      'Smith et al. PNAS 2022 (Oxford) — Vitaminas del grupo B y protección neurológica',
    ],
    recommendations: [
      {
        panel: 'Panel de Vitaminas Esenciales',
        priority: 'esencial',
        biomarkers: ['Vitamina D 25-OH (calcidiol)', 'Vitamina B12 (cobalamina)', 'Ácido fólico (folato sérico)', 'Vitamina B6 (piridoxal-5-fosfato)'],
        reason: 'El 41% de adultos mexicanos tiene deficiencia de vitamina D (ENSANUT 2021). La deficiencia de B12 es silenciosa hasta que causa daño neurológico irreversible. Folato y B6 junto con B12 son el trío que metaboliza la homocisteína, marcador clave de inflammaging.',
      },
      {
        panel: 'Metabolismo del Hierro y Minerales',
        priority: 'esencial',
        biomarkers: ['Ferritina sérica', 'Hierro sérico', 'Magnesio sérico o eritrocitario', 'Zinc sérico'],
        reason: 'Ferritina entre 50-100 ng/mL es el rango óptimo de longevidad. Magnesio es cofactor de >600 reacciones enzimáticas y de la activación de vitamina D. El zinc es esencial para la función del sistema inmune y la síntesis de proteínas; su deficiencia es subclínica y muy prevalente.',
      },
      {
        panel: 'Antioxidantes y Cofactores Avanzados',
        priority: 'recomendado',
        biomarkers: ['Vitamina C plasmática', 'Vitamina E (α-tocoferol)', 'Coenzima Q10 plasmática', 'Selenio sérico'],
        reason: 'CoQ10 baja (<0.5 μg/mL) señala disfunción mitocondrial activa y agotamiento energético celular. Selenio es cofactor de las glutatión peroxidasas, las principales enzimas antioxidantes del organismo. Deficiencias subclínicas aceleran el envejecimiento biológico.',
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

function BioRow({ label, bm, weight }: { label: string; bm: BiomarkerValue | null | undefined; weight: BmWeight }) {
  if (!bm || bm.value === null) return null
  const sColor = getStatusColor(bm.status)
  const pct = (() => {
    if (bm.refMin === null || bm.refMax === null || bm.refMax === bm.refMin) return null
    return Math.min(100, Math.max(0, ((bm.value - bm.refMin) / (bm.refMax - bm.refMin)) * 100))
  })()

  return (
    <div className="py-2.5 border-b border-border/40 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {weight === 'high' && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sColor }} />
          )}
          <span className="text-xs text-foreground/80 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="font-mono text-xs font-semibold text-foreground">
            {bm.value} <span className="text-muted-foreground font-normal">{bm.unit}</span>
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ background: `${sColor}20`, color: sColor, border: `1px solid ${sColor}30` }}
          >
            {statusLabel(bm.status)}
          </span>
        </div>
      </div>
      {pct !== null && (
        <div className="relative h-1 bg-muted rounded-full overflow-hidden mt-1">
          {bm.optMin !== null && bm.optMax !== null && bm.refMin !== null && bm.refMax !== null && (
            <div
              className="absolute h-full rounded-full"
              style={{
                background: '#2EAE7B15',
                left: `${Math.max(0, ((bm.optMin - bm.refMin) / (bm.refMax - bm.refMin)) * 100)}%`,
                width: `${((bm.optMax - bm.optMin) / (bm.refMax - bm.refMin)) * 100}%`,
              }}
            />
          )}
          <div
            className="absolute top-0 w-2 h-full rounded-full -ml-1 transition-all"
            style={{ left: `${pct}%`, backgroundColor: sColor }}
          />
        </div>
      )}
    </div>
  )
}

function OrganButton({
  organ, score, isSelected, onClick,
}: {
  organ: OrganDef
  score: number | null
  isSelected: boolean
  onClick: () => void
}) {
  const Icon = organ.icon
  const color = scoreColor(score)
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 text-center w-full group ${
        isSelected
          ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10'
          : 'border-border bg-card hover:border-accent/40 hover:bg-accent/5'
      }`}
    >
      {/* Icon ring with score */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center relative"
        style={{
          boxShadow: `0 0 14px ${color}25`,
          border: `2px solid ${color}40`,
          background: `${color}10`,
        }}
      >
        <Icon size={20} className={organ.iconColor} />
        <div
          className="absolute -bottom-1.5 -right-1 rounded-full px-1 py-0.5 text-[9px] font-bold font-mono leading-none"
          style={{ background: color, color: '#0F2A1E' }}
        >
          {score !== null ? score : '–'}
        </div>
      </div>

      {/* Label */}
      <div>
        <p className="text-xs font-semibold text-foreground leading-tight">{organ.name}</p>
        <p className="text-[9px] font-medium mt-0.5" style={{ color }}>
          {scoreLabel(score)}
        </p>
      </div>

      {isSelected && (
        <div className="absolute top-1.5 right-1.5">
          <ChevronDown size={11} className="text-accent" />
        </div>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

interface OrganHealthTabProps {
  parsedData: ParsedData
  analysis: AIAnalysis
}

export function OrganHealthTab({ parsedData }: OrganHealthTabProps) {
  const [selectedOrganId, setSelectedOrganId] = useState<string>(ORGANS[0].id)
  const [studiesOpen, setStudiesOpen] = useState(false)
  const [missingOpen, setMissingOpen] = useState(false)

  const organScores = ORGANS.map(organ => ({
    organ,
    score: calcOrganScore(organ.getBiomarkers(parsedData)),
    biomarkers: organ.getBiomarkers(parsedData),
  }))

  const selected = organScores.find(o => o.organ.id === selectedOrganId)!
  const Icon = selected.organ.icon
  const color = scoreColor(selected.score)
  const insights = selected.organ.getInsights(selected.biomarkers)
  const availableBms = selected.biomarkers.filter(b => b.bm?.value !== null && b.bm?.value !== undefined)
  const missingBms = selected.biomarkers.filter(b => !b.bm || b.bm.value === null || b.bm.value === undefined)
  const alertBms = availableBms.filter(b => b.bm?.status === 'danger' || b.bm?.status === 'warning')

  // Stats for header
  const critical  = organScores.filter(o => o.score !== null && o.score < 40).length
  const attention = organScores.filter(o => o.score !== null && o.score >= 40 && o.score < 65).length
  const optimal   = organScores.filter(o => o.score !== null && o.score >= 85).length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Análisis por Órgano y Sistema</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ORGANS.length} sistemas • Cruce con evidencia científica 2020–2026
          </p>
        </div>
        {/* Summary stats */}
        <div className="flex gap-3">
          {critical > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span className="text-xs font-semibold text-rose-400">{critical} crítico{critical > 1 ? 's' : ''}</span>
            </div>
          )}
          {attention > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-xs font-semibold text-amber-400">{attention} atención</span>
            </div>
          )}
          {optimal > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-emerald-400">{optimal} óptimo{optimal > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Network Diagram */}
      <OrganNetworkDiagram
        organScores={organScores.map(({ organ, score }) => ({
          id: organ.id,
          name: organ.name,
          score,
        }))}
      />

      {/* Organ Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {organScores.map(({ organ, score }) => (
          <OrganButton
            key={organ.id}
            organ={organ}
            score={score}
            isSelected={selectedOrganId === organ.id}
            onClick={() => setSelectedOrganId(organ.id)}
          />
        ))}
      </div>

      {/* Detail Panel */}
      <div className="card-medical p-0 overflow-hidden">
        {/* Panel Header */}
        <div
          className="flex items-center gap-4 p-5 border-b border-border"
          style={{ background: `${color}08` }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}15`, border: `1.5px solid ${color}30` }}
          >
            <Icon size={26} className={selected.organ.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-foreground">{selected.organ.name}</h3>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold font-mono"
                style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
              >
                {selected.score !== null ? selected.score : '–'} / 100 — {scoreLabel(selected.score)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{selected.organ.subtitle}</p>
          </div>
          {/* Alerts badge */}
          {alertBms.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 shrink-0">
              <AlertCircle size={13} className="text-rose-400" />
              <span className="text-xs font-semibold text-rose-400">
                {alertBms.length} alerta{alertBms.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Panel Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Left: Biomarkers or Recommendations */}
          <div className="p-5">
            {availableBms.length === 0 ? (
              <>
                <h4 className="text-xs font-semibold text-info uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ClipboardList size={13} className="text-info" />
                  Análisis recomendados para este sistema
                </h4>
                <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                  Este estudio no incluyó biomarcadores para evaluar <strong className="text-foreground">{selected.organ.name}</strong>.
                  Los siguientes análisis permiten obtener una evaluación completa de longevidad para este sistema.
                </p>
                <div className="space-y-3">
                  {selected.organ.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="rounded-xl border overflow-hidden"
                      style={{
                        borderColor: rec.priority === 'esencial' ? '#5BA4C930' : '#6B666030',
                      }}
                    >
                      {/* Header del panel */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 border-b"
                        style={{
                          background: rec.priority === 'esencial' ? '#5BA4C908' : '#6B666008',
                          borderColor: rec.priority === 'esencial' ? '#5BA4C920' : '#6B666020',
                        }}
                      >
                        <Star
                          size={11}
                          className={rec.priority === 'esencial' ? 'text-info' : 'text-muted-foreground'}
                          fill={rec.priority === 'esencial' ? 'currentColor' : 'none'}
                        />
                        <span className="text-xs font-semibold text-foreground flex-1">{rec.panel}</span>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            background: rec.priority === 'esencial' ? '#5BA4C920' : '#6B666020',
                            color: rec.priority === 'esencial' ? '#5BA4C9' : '#A8A399',
                          }}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      {/* Biomarcadores */}
                      <div className="px-3 py-2 flex flex-wrap gap-1.5">
                        {rec.biomarkers.map((bm, j) => (
                          <span
                            key={j}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground"
                          >
                            {bm}
                          </span>
                        ))}
                      </div>
                      {/* Razón clínica */}
                      <div className="px-3 pb-3">
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{rec.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full inline-block" style={{ background: color }} />
                  Biomarcadores ({availableBms.length} disponibles de {selected.biomarkers.length})
                  {selected.biomarkers.length > availableBms.length && (
                    <span className="text-muted-foreground/50 text-[10px] font-normal normal-case">
                      · {selected.biomarkers.length - availableBms.length} sin datos
                    </span>
                  )}
                </h4>
                <div>
                  {selected.biomarkers.map(({ key, label, bm, weight }) => (
                    <BioRow key={key} label={label} bm={bm} weight={weight} />
                  ))}
                </div>

                {/* ── Biomarcadores faltantes ── */}
                {missingBms.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/40">
                    <button
                      onClick={() => setMissingOpen(p => !p)}
                      className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors w-full"
                    >
                      <ClipboardList size={11} />
                      <span className="font-semibold uppercase tracking-wider">
                        {missingBms.length} biomarcador{missingBms.length > 1 ? 'es' : ''} faltante{missingBms.length > 1 ? 's' : ''} — Completar análisis
                      </span>
                      {missingOpen
                        ? <ChevronUp size={11} className="ml-auto" />
                        : <ChevronDown size={11} className="ml-auto" />
                      }
                    </button>

                    {missingOpen && (
                      <div className="mt-3 space-y-3">
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Los siguientes biomarcadores no estaban incluidos en el estudio. Solicitarlos completaría la evaluación de <strong className="text-foreground">{selected.organ.name}</strong>:
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          {missingBms.map(({ key, label, weight }) => (
                            <span
                              key={key}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                weight === 'high'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                  : weight === 'medium'
                                  ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                                  : 'bg-muted border-border text-muted-foreground'
                              }`}
                            >
                              {label}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/70 bg-muted/30 rounded-lg px-3 py-2">
                          <Star size={10} className="text-amber-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            Los marcadores en <span className="text-amber-400 font-semibold">naranja</span> tienen alto impacto en el score de este órgano.{' '}
                            Los marcadores en <span className="text-sky-400 font-semibold">azul</span> tienen impacto moderado. Consúltalos con tu médico en el siguiente análisis.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: AI Insights */}
          <div className="p-5 space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-3.5 rounded-full bg-violet-500 inline-block" />
              Análisis Clínico IA — Medicina de Longevidad
            </h4>

            <div className="space-y-2.5">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 p-3 rounded-lg bg-muted/20 border border-border/30"
                >
                  <AlertCircle size={13} className="shrink-0 mt-0.5" style={{ color }} />
                  <p className="text-xs text-foreground/85 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>

            {/* Studies (collapsible) */}
            <div className="pt-2 border-t border-border/40">
              <button
                onClick={() => setStudiesOpen(p => !p)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <BookOpen size={11} />
                <span className="font-semibold uppercase tracking-wider">
                  Evidencia Científica ({selected.organ.studies.length} estudios)
                </span>
                {studiesOpen
                  ? <ChevronUp size={11} className="ml-auto" />
                  : <ChevronDown size={11} className="ml-auto" />
                }
              </button>
              {studiesOpen && (
                <div className="mt-2 space-y-1.5 pl-1">
                  {selected.organ.studies.map((study, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground/70 font-mono leading-relaxed">
                      · {study}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
