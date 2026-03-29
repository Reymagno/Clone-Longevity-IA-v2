/**
 * Longevity IA — Generador de Reporte Médico PDF
 * Combina contenido programático (jsPDF) con datos estructurados de cada pestaña.
 * Produce un documento clínico completo, bien organizado y con código de colores.
 */

import type { Patient, ParsedData, AIAnalysis, BiomarkerValue } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const PW = 210       // A4 width mm
const PH = 297       // A4 height mm
const MG = 18        // margin
const CW = PW - MG * 2  // content width

type RGB = [number, number, number]

const C: Record<string, RGB> = {
  dark:    [6, 12, 26],
  bg:      [255, 255, 255],
  sheet:   [248, 250, 252],
  section: [236, 242, 250],
  text:    [15, 23, 42],
  muted:   [71, 85, 105],
  light:   [148, 163, 184],
  border:  [218, 226, 238],
  green:   [0, 175, 115],
  accent:  [4, 120, 87],
  optimal: [4, 120, 87],
  normal:  [3, 105, 161],
  warning: [180, 83, 9],
  danger:  [185, 28, 28],
  gray:    [100, 116, 139],
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PUROS
// ─────────────────────────────────────────────────────────────────────────────

const sc = (s: string | null): RGB =>
  s === 'optimal' ? C.optimal : s === 'normal' ? C.normal :
  s === 'warning' ? C.warning : s === 'danger'  ? C.danger : C.gray

const sbg = (s: string | null): RGB => {
  if (s === 'optimal') return [209, 245, 230]
  if (s === 'normal')  return [209, 234, 251]
  if (s === 'warning') return [252, 233, 207]
  if (s === 'danger')  return [252, 213, 213]
  return [233, 237, 243]
}

const sl = (s: string | null): string =>
  s === 'optimal' ? 'Óptimo' : s === 'normal' ? 'Normal' :
  s === 'warning' ? 'Atención' : s === 'danger' ? 'Crítico' : '—'

const scoreC = (n: number): RGB =>
  n >= 85 ? C.optimal : n >= 65 ? C.normal : n >= 40 ? C.warning : C.danger

const scoreBg = (n: number): RGB => {
  if (n >= 85) return [209, 245, 230]
  if (n >= 65) return [209, 234, 251]
  if (n >= 40) return [252, 233, 207]
  return [252, 213, 213]
}

const bv  = (bm: BiomarkerValue | null | undefined): string => bm?.value != null ? String(bm.value) : '—'
const bu  = (bm: BiomarkerValue | null | undefined): string => bm?.unit ?? ''
const bref = (bm: BiomarkerValue | null | undefined): string =>
  bm?.refMin != null && bm?.refMax != null ? `${bm.refMin}–${bm.refMax}` : '—'
const bopt = (bm: BiomarkerValue | null | undefined): string =>
  bm?.optMin != null && bm?.optMax != null ? `${bm.optMin}–${bm.optMax}` : '—'

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

function normalize(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) if (obj[k]) return String(obj[k])
  return ''
}

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITMO CÉLULAS MADRE (mismo que StemCellTab)
// ─────────────────────────────────────────────────────────────────────────────

interface StemResult {
  mscDose: number
  exosome: number
  sessions: number
  schedule: string
  route: string
  indication: string
  totalFactor: number
}

function computeStemCell(patient: Patient, parsedData: ParsedData, analysis: AIAnalysis): StemResult {
  const weight = patient.weight ?? 70
  const height = patient.height
  const bmi = height ? weight / Math.pow(height / 100, 2) : null
  const age = patient.age

  const ageFactor =
    age < 40 ? 0.85 : age <= 55 ? 1.0 : age <= 70 ? 1.2 : 1.5

  let bmiFactor = 1.0
  if (bmi !== null) {
    if (bmi < 18.5) bmiFactor = 0.9
    else if (bmi <= 24.9) bmiFactor = 1.0
    else if (bmi <= 29.9) bmiFactor = 1.05
    else if (bmi <= 34.9) bmiFactor = 1.1
    else bmiFactor = 1.15
  }

  const crpSt  = parsedData.inflammation?.crp?.status
  const hcySt  = parsedData.inflammation?.homocysteine?.status
  const inflamOrder = ['unavailable', null, 'optimal', 'normal', 'warning', 'danger']
  const worstInflam = [crpSt, hcySt].reduce((a, b) =>
    (inflamOrder.indexOf(b ?? 'unavailable') > inflamOrder.indexOf(a ?? 'unavailable') ? b : a), 'optimal' as string | null | undefined)
  const inflamFactor =
    worstInflam === 'danger' ? 1.5 : worstInflam === 'warning' ? 1.3 :
    worstInflam === 'normal' ? 1.1 : 1.0

  const gfrSt  = parsedData.metabolic?.gfr?.status
  const creatSt = parsedData.metabolic?.creatinine?.status
  const worstRenal = [gfrSt, creatSt].reduce((a, b) =>
    (inflamOrder.indexOf(b ?? 'unavailable') > inflamOrder.indexOf(a ?? 'unavailable') ? b : a), 'optimal' as string | null | undefined)
  const renalFactor =
    worstRenal === 'danger' ? 0.85 : worstRenal === 'warning' ? 0.95 : 1.0

  const altSt = parsedData.liver?.alt?.status
  const astSt = parsedData.liver?.ast?.status
  const ggtSt = parsedData.liver?.ggt?.status
  const worstHep = [altSt, astSt, ggtSt].reduce((a, b) =>
    (inflamOrder.indexOf(b ?? 'unavailable') > inflamOrder.indexOf(a ?? 'unavailable') ? b : a), 'optimal' as string | null | undefined)
  const hepaticFactor =
    worstHep === 'danger' ? 1.3 : worstHep === 'warning' ? 1.1 : 1.0

  const glcSt = parsedData.metabolic?.glucose?.status
  const hbaSt = parsedData.hormones?.hba1c?.status
  const worstMetab = [glcSt, hbaSt].reduce((a, b) =>
    (inflamOrder.indexOf(b ?? 'unavailable') > inflamOrder.indexOf(a ?? 'unavailable') ? b : a), 'optimal' as string | null | undefined)
  const metabFactor =
    worstMetab === 'danger' ? 1.2 : worstMetab === 'warning' ? 1.1 : 1.0

  const immuneAvg = (analysis.systemScores.immune + analysis.systemScores.hematologic) / 2
  const immuneFactor =
    immuneAvg >= 85 ? 0.95 : immuneAvg >= 65 ? 1.0 : immuneAvg >= 40 ? 1.15 : 1.3

  const overall = analysis.overallScore
  const globalFactor =
    overall >= 85 ? 0.9 : overall >= 65 ? 1.0 : overall >= 40 ? 1.2 : 1.4

  const totalFactor = ageFactor * bmiFactor * inflamFactor * renalFactor * hepaticFactor * metabFactor * immuneFactor * globalFactor

  let mscDose = (weight * 1_000_000 * totalFactor) / 1_000_000
  mscDose = Math.round(Math.min(300, Math.max(25, mscDose)) / 5) * 5

  let exosome = 2.0 * Math.sqrt(totalFactor)
  exosome = Math.round(Math.min(10, Math.max(1, exosome)) * 2) / 2

  const indication =
    totalFactor <= 1.05 ? 'Preventivo / Optimización' :
    totalFactor <= 1.3  ? 'Terapéutico Moderado' : 'Terapéutico Intensivo'

  const sessions = totalFactor <= 1.05 ? 1 : totalFactor <= 1.3 ? 2 : 3
  const schedule = sessions === 1 ? 'Sesión única' : sessions === 2 ? 'Mes 0 y mes 3' : 'Mes 0, mes 1 y mes 3'

  let route = 'Intravenosa (IV)'
  if (worstHep === 'danger' || worstHep === 'warning')
    route = 'IV — protocolo hepático complementario'
  if (bmi !== null && bmi > 35)
    route = 'IV fraccionada (reducir atrapamiento pulmonar)'

  return { mscDose, exosome, sessions, schedule, route, indication, totalFactor }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMedicalReport(
  patient: Patient,
  parsedData: ParsedData,
  analysis: AIAnalysis,
  resultDate: string
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = 0
  let pageNum = 1

  // ── Primitivas de dibujo ──────────────────────────────────────
  const fl = (rgb: RGB) => pdf.setFillColor(rgb[0], rgb[1], rgb[2])
  const dr = (rgb: RGB) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2])
  const ink = (rgb: RGB) => pdf.setTextColor(rgb[0], rgb[1], rgb[2])
  const sz  = (n: number) => pdf.setFontSize(n)
  const b   = () => pdf.setFont('helvetica', 'bold')
  const n   = () => pdf.setFont('helvetica', 'normal')

  function box(x: number, by: number, w: number, h: number, fillRgb: RGB) {
    fl(fillRgb); pdf.rect(x, by, w, h, 'F')
  }
  function boxStroke(x: number, by: number, w: number, h: number, fillRgb: RGB, strokeRgb: RGB, lw = 0.2) {
    fl(fillRgb); dr(strokeRgb); pdf.setLineWidth(lw); pdf.rect(x, by, w, h, 'FD')
  }
  function hline(hy: number, color = C.border, lw = 0.15) {
    dr(color); pdf.setLineWidth(lw); pdf.line(MG, hy, PW - MG, hy)
  }
  function t(str: string, tx: number, ty: number, align: 'left' | 'center' | 'right' = 'left') {
    pdf.text(str, tx, ty, { align })
  }
  function guard(needed: number) { if (y + needed > PH - 14) nextPage() }
  function skip(delta = 4) { y += delta }

  // ── Estructura de página ──────────────────────────────────────
  function drawHeader() {
    box(0, 0, PW, 9, C.dark)
    ink(C.green); sz(6.5); b()
    t('LONGEVITY IA', MG, 6)
    ink(C.light); n()
    t('REPORTE MÉDICO COMPLETO', MG + 30, 6)
    t(`${patient.name}  ·  Pág. ${pageNum}`, PW - MG, 6, 'right')
    y = 16
  }

  function drawFooter() {
    box(0, PH - 10, PW, 10, C.dark)
    ink(C.light); sz(6); n()
    t('Longevity IA · Reporte confidencial · Solo para uso médico', MG, PH - 4)
    t(new Date().toLocaleDateString('es-MX'), PW - MG, PH - 4, 'right')
  }

  function nextPage() {
    drawFooter(); pdf.addPage(); pageNum++; drawHeader()
  }

  // ── Sección con acento izquierdo ──────────────────────────────
  function section(title: string, sub = '') {
    guard(16)
    box(MG, y, CW, 9, C.section)
    box(MG, y, 3, 9, C.green)
    ink(C.text); sz(9.5); b()
    t(title, MG + 7, y + 6.5)
    if (sub) { ink(C.muted); sz(7.5); n(); t(sub, MG + 7 + pdf.getTextWidth(title) + 3, y + 6.5) }
    skip(13)
  }

  // ── Tabla de biomarcadores ─────────────────────────────────────
  // Columnas: nombre|valor|unidad|ref|óptimo|estado
  const BC = { name: MG + 2, val: MG + 52, unit: MG + 76, ref: MG + 98, opt: MG + 126, badge: MG + 154 }

  function bmHead() {
    guard(10)
    box(MG, y, CW, 7, C.dark)
    ink(C.bg); sz(6.8); b()
    const labels = ['BIOMARCADOR', 'VALOR', 'UNIDAD', 'REF. NORMAL', 'RANGO ÓPTIMO', 'ESTADO']
    const xs = [BC.name, BC.val, BC.unit, BC.ref, BC.opt, BC.badge]
    labels.forEach((lbl, i) => t(lbl, xs[i], y + 5))
    skip(7)
  }

  function bmRow(label: string, bm: BiomarkerValue | null | undefined, even: boolean) {
    const RH = 6.5
    guard(RH + 1)
    box(MG, y, CW, RH, even ? C.bg : C.sheet)
    ink(C.text); sz(8); n(); t(label, BC.name, y + 4.5)
    if (bm && bm.value != null) {
      ink(C.text); sz(8.5); b(); t(bv(bm), BC.val, y + 4.5)
      ink(C.muted); sz(7.5); n()
      t(bu(bm), BC.unit, y + 4.5)
      t(bref(bm), BC.ref, y + 4.5)
      t(bopt(bm), BC.opt, y + 4.5)
      // Badge
      const badgeW = 22
      box(BC.badge, y + 1, badgeW, 4.5, sbg(bm.status))
      ink(sc(bm.status)); sz(6.5); b()
      t(sl(bm.status), BC.badge + badgeW / 2, y + 4.5, 'center')
    } else {
      ink(C.light); sz(7.5); n(); t('Sin dato en estudio', BC.val, y + 4.5)
    }
    hline(y + RH)
    skip(RH)
  }

  // ── Barra de score ─────────────────────────────────────────────
  function scoreBar(label: string, score: number, even: boolean) {
    const RH = 8
    guard(RH + 1)
    box(MG, y, CW, RH, even ? C.bg : C.sheet)
    ink(C.text); sz(8.5); n(); t(label, MG + 3, y + 5.5)
    const BAR_W = 75, BAR_H = 3.5, BAR_X = MG + CW - BAR_W - 22
    box(BAR_X, y + 2.5, BAR_W, BAR_H, C.border)
    box(BAR_X, y + 2.5, (score / 100) * BAR_W, BAR_H, scoreC(score))
    ink(scoreC(score)); sz(8.5); b()
    t(`${Math.round(score)}/100`, BAR_X + BAR_W + 3, y + 5.5)
    // Mini badge
    const badgeW = 18
    box(MG + CW - badgeW, y + 1.5, badgeW, 5, scoreBg(score))
    ink(scoreC(score)); sz(6.5); b()
    const scoreLabel = score >= 85 ? 'Óptimo' : score >= 65 ? 'Normal' : score >= 40 ? 'Atención' : 'Crítico'
    t(scoreLabel, MG + CW - badgeW / 2, y + 5.5, 'center')
    hline(y + RH)
    skip(RH)
  }

  // ── Par label/valor en línea ────────────────────────────────────
  function infoLine(label: string, value: string, cx = MG + 2, valueColor = C.text) {
    ink(C.muted); sz(7.5); n(); t(label + ':', cx, y)
    ink(valueColor); sz(8.5); b(); t(value, cx + 35, y)
    n()
  }

  // ── Alerta de texto ────────────────────────────────────────────
  function alertBox(text: string, level: 'warning' | 'danger' = 'warning') {
    const color = level === 'danger' ? C.danger : C.warning
    const bg = level === 'danger' ? ([252, 213, 213] as RGB) : ([252, 233, 207] as RGB)
    const lines = pdf.splitTextToSize(text, CW - 10) as string[]
    const H = lines.length * 4.5 + 6
    guard(H + 2)
    box(MG, y, CW, H, bg)
    box(MG, y, 3, H, color)
    ink(color); sz(7.5); n()
    pdf.text(lines, MG + 6, y + 5)
    skip(H + 3)
  }

  // ── Texto párrafo ─────────────────────────────────────────────
  function para(text: string, maxW = CW - 2, color = C.muted, size = 8, lineH = 5): number {
    const lines = pdf.splitTextToSize(text, maxW) as string[]
    guard(lines.length * lineH + 4)
    ink(color); sz(size); n()
    pdf.text(lines, MG + 1, y)
    skip(lines.length * lineH + 3)
    return lines.length
  }

  // ═══════════════════════════════════════════════════════════════
  // PORTADA
  // ═══════════════════════════════════════════════════════════════
  // Header oscuro grande
  box(0, 0, PW, 52, C.dark)

  // Branding
  ink(C.green); sz(8); b()
  t('LONGEVITY IA', MG, 14)
  ink(C.light); sz(7); n()
  t('Medicina de Precisión · Longevidad · Bienestar', MG, 20)

  // Título
  ink(C.bg); sz(20); b()
  t('REPORTE MÉDICO', MG, 33)
  t('COMPLETO', MG, 43)
  ink(C.light); sz(7.5); n()
  t('Análisis de biomarcadores · Protocolo personalizado · Proyección de longevidad', MG, 49)

  y = 62

  // Datos del paciente
  const bmi = patient.weight && patient.height
    ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1) + ' kg/m²'
    : 'No disponible'
  const pInfo = [
    ['Nombre', patient.name],
    ['Código', patient.code],
    ['Fecha del estudio', fmtDate(resultDate)],
    ['Edad cronológica', `${patient.age} años`],
    ['Género', patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'],
    ['Peso', patient.weight ? `${patient.weight} kg` : 'No registrado'],
    ['Estatura', patient.height ? `${patient.height} cm` : 'No registrada'],
    ['IMC', bmi],
  ]

  const blockH = 54
  boxStroke(MG, y, CW, blockH, C.sheet, C.border)
  box(MG, y, 3, blockH, C.green)

  ink(C.accent); sz(7); b()
  t('DATOS DEL PACIENTE', MG + 7, y + 7)
  hline(y + 10, C.border, 0.2)

  const col1 = pInfo.slice(0, 4), col2 = pInfo.slice(4)
  col1.forEach(([lbl, val], i) => {
    ink(C.muted); sz(7); n(); t(lbl + ':', MG + 7, y + 18 + i * 10)
    ink(C.text); sz(9); b(); t(val, MG + 7, y + 23 + i * 10)
  })
  col2.forEach(([lbl, val], i) => {
    ink(C.muted); sz(7); n(); t(lbl + ':', MG + 7 + CW / 2, y + 18 + i * 10)
    ink(C.text); sz(9); b(); t(val, MG + 7 + CW / 2, y + 23 + i * 10)
  })
  skip(blockH + 6)

  // Score global
  const ov = analysis.overallScore
  const ovC = scoreC(ov)
  const ageDiff = patient.age - analysis.longevity_age

  boxStroke(MG, y, CW, 48, C.bg, C.border)
  box(MG, y, 3, 48, ovC)

  // Score box
  const SBOX_X = MG + CW - 48
  box(SBOX_X, y + 4, 46, 40, ovC)
  ink(C.bg); sz(24); b()
  t(String(Math.round(ov)), SBOX_X + 23, y + 22, 'center')
  sz(7.5); n()
  t('SCORE DE', SBOX_X + 23, y + 30, 'center')
  t('LONGEVIDAD', SBOX_X + 23, y + 35, 'center')
  t('/100', SBOX_X + 23, y + 40, 'center')

  ink(ovC); sz(10); b()
  t('Resultado del Análisis', MG + 8, y + 12)
  ink(C.text); sz(8.5); n()
  t('Edad biológica:', MG + 8, y + 22)
  ink(ovC); b()
  t(`${analysis.longevity_age} años`, MG + 8 + 28, y + 22)
  ink(C.muted); sz(7.5); n()
  const diffTxt = ageDiff > 0 ? `${ageDiff} años más joven que su edad cronológica` :
    ageDiff < 0 ? `${Math.abs(ageDiff)} años mayor que su edad cronológica` : 'Igual a su edad cronológica'
  t(diffTxt, MG + 8, y + 28)
  ink(C.text); sz(8); n()
  t('Score global de longevidad', MG + 8, y + 38)
  ink(ovC); sz(8.5); b()
  const ovLabel = ov >= 85 ? 'Excelente' : ov >= 70 ? 'Bueno' : ov >= 55 ? 'Regular' : 'Requiere intervención'
  t(ovLabel, MG + 8 + 40, y + 38)
  skip(54)

  // Nota legal
  guard(20)
  ink(C.muted); sz(7); n()
  const legalLines = pdf.splitTextToSize(
    'Este reporte es generado por Longevity IA con base en los estudios de laboratorio proporcionados. ' +
    'Los datos y recomendaciones deben ser interpretados por un médico certificado. No sustituye el diagnóstico clínico profesional.',
    CW - 4
  ) as string[]
  const legalH = legalLines.length * 4 + 6
  boxStroke(MG, y, CW, legalH, C.sheet, C.border, 0.15)
  pdf.text(legalLines, MG + 2, y + 4)
  skip(legalH)

  // Footer portada
  box(0, PH - 10, PW, 10, C.dark)
  ink(C.green); sz(7); b(); t('LONGEVITY IA', MG, PH - 4)
  ink(C.light); sz(7); n()
  t('Medicina de Precisión · Longevidad · Bienestar', MG + 28, PH - 4)
  t('Pág. 1', PW - MG, PH - 4, 'right')

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 2 — RESUMEN EJECUTIVO
  // ═══════════════════════════════════════════════════════════════
  pdf.addPage(); pageNum++; drawHeader()

  section('RESUMEN EJECUTIVO', '— Síntesis clínica general')

  ink(C.text); sz(8.5); n()
  const LH_SUM = 4.8
  const sumLines = pdf.splitTextToSize(analysis.clinicalSummary ?? '', CW - 2) as string[]
  guard(sumLines.length * LH_SUM + 6)
  // Wrapped summary in a subtle box
  const sumBoxH = sumLines.length * LH_SUM + 8
  boxStroke(MG, y - 2, CW, sumBoxH, C.sheet, C.border, 0.15)
  box(MG, y - 2, 3, sumBoxH, C.green)
  pdf.text(sumLines, MG + 7, y + 2)
  skip(sumBoxH + 4)

  // Alertas clínicas
  const alerts = analysis.keyAlerts ?? []
  if (alerts.length > 0) {
    section('ALERTAS CLÍNICAS', `— ${alerts.length} hallazgo${alerts.length > 1 ? 's' : ''} relevante${alerts.length > 1 ? 's' : ''}`)
    alerts.forEach((alert) => {
      const a = alert as unknown as Record<string, unknown>
      const title = String(a.title ?? a.label ?? '')
      const desc = String(a.description ?? a.detail ?? '')
      const level = String(a.level ?? 'warning')
      const val = a.value != null ? String(a.value) : ''
      const target = a.target != null ? String(a.target) : ''

      const alertColor = level === 'danger' ? C.danger : C.warning
      const alertBg = level === 'danger' ? [252, 213, 213] as RGB : [252, 233, 207] as RGB
      const fullText = `${title}${desc ? ': ' + desc : ''}${val ? '  (Actual: ' + val + (target ? ' → Objetivo: ' + target : '') + ')' : ''}`
      const aLines = pdf.splitTextToSize(fullText, CW - 12) as string[]
      const AH = aLines.length * 4.5 + 5
      guard(AH + 2)
      box(MG, y, CW, AH, alertBg)
      box(MG, y, 3, AH, alertColor)
      ink(alertColor); sz(7.5); n()
      pdf.text(aLines, MG + 7, y + 4.5)
      skip(AH + 2)
    })
    skip(2)
  }

  // Scores por sistema
  section('SCORES POR SISTEMA ORGÁNICO', '— Evaluación de 8 sistemas')

  // Tabla header
  box(MG, y, CW, 7, C.dark)
  ink(C.bg); sz(7); b()
  t('SISTEMA', MG + 3, y + 5)
  t('EVALUACIÓN', MG + CW - 90, y + 5)
  t('SCORE', MG + CW - 18, y + 5, 'right')
  skip(7)

  const systems: [string, number][] = [
    ['Cardiovascular',  analysis.systemScores.cardiovascular],
    ['Metabólico',      analysis.systemScores.metabolic],
    ['Hepático',        analysis.systemScores.hepatic],
    ['Renal',           analysis.systemScores.renal],
    ['Inmunológico',    analysis.systemScores.immune],
    ['Hematológico',    analysis.systemScores.hematologic],
    ['Inflamatorio',    analysis.systemScores.inflammatory],
    ['Vitaminas',       analysis.systemScores.vitamins],
  ]
  systems.forEach(([lbl, score], i) => scoreBar(lbl, score, i % 2 === 0))
  skip(4)


  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 3 — FODA MÉDICA
  // ═══════════════════════════════════════════════════════════════
  nextPage()
  section('ANÁLISIS FODA MÉDICO', '— Fortalezas, Oportunidades, Debilidades y Amenazas')

  const swot = analysis.swot
  const swotSections: [string, unknown[], RGB, string][] = [
    ['FORTALEZAS', swot?.strengths ?? [], C.optimal, 'Factores favorables actuales'],
    ['OPORTUNIDADES', swot?.opportunities ?? [], C.normal, 'Áreas de mejora con alta probabilidad'],
    ['DEBILIDADES', swot?.weaknesses ?? [], C.warning, 'Factores que requieren atención'],
    ['AMENAZAS', swot?.threats ?? [], C.danger, 'Riesgos potenciales a largo plazo'],
  ]

  swotSections.forEach(([title, items, color, sub]) => {
    guard(16)
    const arrItems = Array.isArray(items) ? items : []
    const totalH = Math.max(16, 16 + arrItems.slice(0, 5).length * 14)
    guard(totalH)
    box(MG, y, CW, 9, [...color.map(v => Math.min(255, v + 190))] as RGB)
    box(MG, y, 3, 9, color)
    ink(color); sz(8.5); b()
    t(title, MG + 7, y + 6.5)
    ink(C.muted); sz(7.5); n()
    t(sub, MG + CW - 2, y + 6.5, 'right')
    skip(12)

    if (arrItems.length === 0) {
      ink(C.light); sz(7.5); n(); t('Sin datos disponibles', MG + 4, y + 5); skip(8)
    } else {
      arrItems.slice(0, 5).forEach((item, i) => {
        const it = item as Record<string, unknown>
        const lbl = normalize(it, ['label', 'title', 'name', 'factor'])
        const det = normalize(it, ['detail', 'description', 'desc'])
        const impact = normalize(it, ['expectedImpact', 'impact'])
        const prob = normalize(it, ['probability'])

        const detMaxW = CW - (impact ? 55 : 8)
        const detLines = pdf.splitTextToSize(det, detMaxW) as string[]
        const RH = Math.max(14, 7 + detLines.length * 4.2 + 3)
        guard(RH + 1)
        box(MG, y, CW, RH, i % 2 === 0 ? C.bg : C.sheet)
        box(MG, y, 2, RH, color)
        ink(C.text); sz(8.5); b()
        t(lbl, MG + 5, y + 5)
        ink(C.muted); sz(7.5); n()
        pdf.text(detLines, MG + 5, y + 10)
        if (impact) {
          ink(color); sz(6.5); b()
          t(impact, MG + CW - 2, y + 5, 'right')
        } else if (prob) {
          ink(color); sz(6.5); b()
          t(prob, MG + CW - 2, y + 5, 'right')
        }
        hline(y + RH)
        skip(RH)
      })
    }
    skip(4)
  })

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 4 — LÍPIDOS
  // ═══════════════════════════════════════════════════════════════
  if (parsedData.lipids) {
    nextPage()
    section('PERFIL LIPÍDICO', '— Riesgo cardiovascular y metabolismo de grasas')
    bmHead()
    const lipRows: [string, BiomarkerValue | null | undefined][] = [
      ['Colesterol Total',    parsedData.lipids.totalCholesterol],
      ['Triglicéridos',       parsedData.lipids.triglycerides],
      ['HDL (Colesterol bueno)', parsedData.lipids.hdl],
      ['LDL (Colesterol malo)',  parsedData.lipids.ldl],
      ['VLDL',                parsedData.lipids.vldl],
      ['No-HDL',              parsedData.lipids.nonHdl],
      ['Índice Aterogénico',  parsedData.lipids.atherogenicIndex],
      ['Ratio LDL/HDL',       parsedData.lipids.ldlHdlRatio],
      ['Ratio TG/HDL',        parsedData.lipids.tgHdlRatio],
    ]
    lipRows.forEach(([lbl, bm], i) => { if (bm) bmRow(lbl, bm, i % 2 === 0) })
  }

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 5 — HEMATOLOGÍA
  // ═══════════════════════════════════════════════════════════════
  if (parsedData.hematology) {
    nextPage()
    section('HEMATOLOGÍA', '— Análisis de células sanguíneas y función hematológica')
    bmHead()
    const hRows: [string, BiomarkerValue | null | undefined][] = [
      ['Eritrocitos (RBC)',    parsedData.hematology.rbc],
      ['Hemoglobina',         parsedData.hematology.hemoglobin],
      ['Hematocrito',         parsedData.hematology.hematocrit],
      ['MCV',                 parsedData.hematology.mcv],
      ['MCH',                 parsedData.hematology.mch],
      ['MCHC',                parsedData.hematology.mchc],
      ['RDW',                 parsedData.hematology.rdw],
      ['Leucocitos (WBC)',    parsedData.hematology.wbc],
      ['Neutrófilos',         parsedData.hematology.neutrophils],
      ['Linfocitos',          parsedData.hematology.lymphocytes],
      ['Monocitos',           parsedData.hematology.monocytes],
      ['Eosinófilos',         parsedData.hematology.eosinophils],
      ['Plaquetas',           parsedData.hematology.platelets],
      ['MPV',                 parsedData.hematology.mpv],
    ]
    hRows.forEach(([lbl, bm], i) => { if (bm) bmRow(lbl, bm, i % 2 === 0) })
  }

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 6 — PANEL METABÓLICO
  // ═══════════════════════════════════════════════════════════════
  if (parsedData.metabolic) {
    nextPage()
    section('PANEL METABÓLICO', '— Función renal y metabolismo glucídico')
    bmHead()
    const mRows: [string, BiomarkerValue | null | undefined][] = [
      ['Glucosa',                parsedData.metabolic.glucose],
      ['Urea',                   parsedData.metabolic.urea],
      ['BUN (Nitrógeno Ureico)', parsedData.metabolic.bun],
      ['Creatinina',             parsedData.metabolic.creatinine],
      ['TFG (Filtrado Glom.)',   parsedData.metabolic.gfr],
      ['Ácido Úrico',            parsedData.metabolic.uricAcid],
    ]
    mRows.forEach(([lbl, bm], i) => { if (bm) bmRow(lbl, bm, i % 2 === 0) })
  }

  // Función hepática en misma página o siguiente
  if (parsedData.liver) {
    skip(6)
    section('FUNCIÓN HEPÁTICA', '— Enzimas y marcadores de daño hepático')
    bmHead()
    const lRows: [string, BiomarkerValue | null | undefined][] = [
      ['Fosfatasa Alcalina (FA)',  parsedData.liver.alkalinePhosphatase],
      ['AST (TGO)',                parsedData.liver.ast],
      ['ALT (TGP)',                parsedData.liver.alt],
      ['GGT (Gamma-GT)',           parsedData.liver.ggt],
      ['LDH',                     parsedData.liver.ldh],
      ['Proteínas Totales',        parsedData.liver.totalProtein],
      ['Albúmina',                 parsedData.liver.albumin],
      ['Globulina',                parsedData.liver.globulin],
      ['Amilasa',                  parsedData.liver.amylase],
      ['Bilirrubina Total',        parsedData.liver.totalBilirubin],
    ]
    lRows.forEach(([lbl, bm], i) => { if (bm) bmRow(lbl, bm, i % 2 === 0) })
  }

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 7 — HORMONAS, VITAMINAS E INFLAMACIÓN
  // ═══════════════════════════════════════════════════════════════
  nextPage()

  if (parsedData.hormones) {
    section('PANEL HORMONAL', '— Regulación endocrina y metabolismo')
    bmHead()
    const horRows: [string, BiomarkerValue | null | undefined][] = [
      ['TSH (Tiroides)',            parsedData.hormones.tsh],
      ['Testosterona',              parsedData.hormones.testosterone],
      ['Cortisol',                  parsedData.hormones.cortisol],
      ['Insulina',                  parsedData.hormones.insulin],
      ['HbA1c (Hemoglobina Glic.)', parsedData.hormones.hba1c],
    ]
    horRows.forEach(([lbl, bm], i) => { if (bm) bmRow(lbl, bm, i % 2 === 0) })
    skip(6)
  }

  if (parsedData.vitamins) {
    section('VITAMINAS Y MINERALES', '— Estado nutricional y micronutrientes')
    bmHead()
    const vitRows: [string, BiomarkerValue | null | undefined][] = [
      ['Vitamina D (25-OH)',  parsedData.vitamins.vitaminD],
      ['Vitamina B12',        parsedData.vitamins.vitaminB12],
      ['Ferritina',           parsedData.vitamins.ferritin],
    ]
    vitRows.forEach(([lbl, bm], i) => { if (bm) bmRow(lbl, bm, i % 2 === 0) })
    skip(6)
  }

  if (parsedData.inflammation) {
    section('MARCADORES INFLAMATORIOS', '— Inflamación sistémica crónica (Inflammaging)')
    bmHead()
    const infRows: [string, BiomarkerValue | null | undefined][] = [
      ['PCR (Proteína C Reactiva)', parsedData.inflammation.crp],
      ['Homocisteína',              parsedData.inflammation.homocysteine],
    ]
    infRows.forEach(([lbl, bm], i) => { if (bm) bmRow(lbl, bm, i % 2 === 0) })
  }

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 8 — PROYECCIÓN Y RIESGOS
  // ═══════════════════════════════════════════════════════════════
  nextPage()
  section('RIESGOS DE ENFERMEDAD', '— Probabilidad a largo plazo sin intervención')

  box(MG, y, CW, 7, C.dark)
  ink(C.bg); sz(7); b()
  t('ENFERMEDAD / DRIVERS', MG + 3, y + 5)
  t('PROBABILIDAD', MG + CW - 60, y + 5)
  t('HORIZONTE', MG + CW - 2, y + 5, 'right')
  skip(7)

  ;(analysis.risks ?? []).slice(0, 12).forEach((risk, i) => {
    const disease = risk.disease ?? ''
    const prob = typeof risk.probability === 'number' ? Math.min(100, Math.max(0, risk.probability)) : 0
    const horizon = risk.horizon ?? ''
    const drivers = Array.isArray(risk.drivers) ? risk.drivers : []
    const rColor = prob >= 70 ? C.danger : prob >= 40 ? C.warning : prob >= 20 ? C.normal : C.optimal

    const driverText = drivers.slice(0, 3).join(' · ')
    const dLines = pdf.splitTextToSize(driverText, 80) as string[]
    const RH = Math.max(14, dLines.length * 4.5 + 10)
    guard(RH + 1)
    box(MG, y, CW, RH, i % 2 === 0 ? C.bg : C.sheet)
    box(MG, y, 3, RH, rColor)

    // Disease name
    ink(C.text); sz(8.5); b()
    t(disease, MG + 6, y + 5.5)

    // Drivers — below disease name
    ink(C.muted); sz(7); n()
    pdf.text(dLines, MG + 6, y + 10)

    // Probability bar — right side
    const BBAR = 36
    const BX = MG + CW - BBAR - 26
    box(BX, y + 2, BBAR, 3.5, C.border)
    box(BX, y + 2, (prob / 100) * BBAR, 3.5, rColor)
    ink(rColor); sz(9); b()
    t(`${Math.round(prob)}%`, BX + BBAR + 3, y + 5.5)

    // Horizon — bottom right
    ink(C.muted); sz(7); n()
    t(horizon, MG + CW - 2, y + RH - 2, 'right')
    hline(y + RH)
    skip(RH)
  })

  // Factores de proyección
  if ((analysis.projectionFactors ?? []).length > 0) {
    skip(6)
    section('FACTORES DE PROYECCIÓN', '— Comparativa sin y con intervención')

    // Layout: each factor as a card block instead of cramped table
    analysis.projectionFactors.slice(0, 8).forEach((pf, i) => {
      const factor = pf.factor ?? ''
      const current = pf.currentValue ?? '—'
      const optimal = pf.optimalValue ?? '—'
      const withoutP = pf.withoutProtocol ?? '—'
      const withP = pf.withProtocol ?? '—'
      const justification = pf.medicalJustification ?? ''

      const withoutLines = pdf.splitTextToSize(`Sin protocolo: ${withoutP}`, CW / 2 - 6) as string[]
      const withLines = pdf.splitTextToSize(`Con protocolo: ${withP}`, CW / 2 - 6) as string[]
      const justLines = justification ? pdf.splitTextToSize(justification, CW - 10) as string[] : []
      const RH = 18 + Math.max(withoutLines.length, withLines.length) * 4 + (justLines.length > 0 ? justLines.length * 3.5 + 2 : 0)

      guard(RH + 2)
      box(MG, y, CW, RH, i % 2 === 0 ? C.bg : C.sheet)
      box(MG, y, 3, RH, C.green)

      // Factor name
      ink(C.text); sz(8.5); b()
      t(factor, MG + 7, y + 5.5)

      // Current + optimal values on same line
      ink(C.muted); sz(7.5); n()
      t(`Actual: `, MG + 7, y + 11)
      ink(C.text); b(); t(current, MG + 22, y + 11)
      ink(C.muted); n(); t(`Óptimo: `, MG + CW / 2, y + 11)
      ink(C.optimal); b(); t(optimal, MG + CW / 2 + 17, y + 11)

      // Without / with protocol side by side
      const projY = y + 16
      ink(C.danger); sz(7); n()
      pdf.text(withoutLines, MG + 7, projY)
      ink(C.optimal)
      pdf.text(withLines, MG + CW / 2, projY)

      // Medical justification
      if (justLines.length > 0) {
        const jY = projY + Math.max(withoutLines.length, withLines.length) * 4 + 1
        ink(C.light); sz(6.5); n()
        pdf.text(justLines, MG + 7, jY)
      }

      hline(y + RH)
      skip(RH)
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 9 — PROTOCOLO MÉDICO
  // ═══════════════════════════════════════════════════════════════
  nextPage()
  section('PROTOCOLO MÉDICO PERSONALIZADO', `— ${(analysis.protocol ?? []).length} intervenciones recomendadas`)

  const urgencyOrder = { immediate: 0, high: 1, medium: 2, low: 3 }
  const sortedProtocol = [...(analysis.protocol ?? [])].sort((a, b) =>
    (urgencyOrder[a.urgency ?? 'low'] ?? 3) - (urgencyOrder[b.urgency ?? 'low'] ?? 3)
  )

  sortedProtocol.forEach((item, i) => {
    const urgColor =
      item.urgency === 'immediate' ? C.danger :
      item.urgency === 'high'      ? C.warning :
      item.urgency === 'medium'    ? C.normal : C.optimal

    const urgLabel =
      item.urgency === 'immediate' ? 'INMEDIATO' :
      item.urgency === 'high'      ? 'ALTO' :
      item.urgency === 'medium'    ? 'MEDIO' : 'BAJO'

    // Layout: top row = number + urgency badge + category
    // Left column (half width): molecule, dose
    // Right column (half width): mechanism, expected result, evidence
    const leftW = CW * 0.42
    const rightW = CW - leftW - 8

    const mechText = item.mechanism ?? ''
    const evidText = item.evidence ?? ''
    const resultText = item.expectedResult ? `→ ${item.expectedResult}` : ''
    const rightContent = [mechText, evidText, resultText].filter(Boolean).join('\n')
    const rightLines = pdf.splitTextToSize(rightContent, rightW) as string[]

    const moleculeLines = pdf.splitTextToSize(item.molecule ?? '', leftW - 4) as string[]
    const doseLines = pdf.splitTextToSize(item.dose ?? '', leftW - 4) as string[]
    const leftHeight = 8 + moleculeLines.length * 4.5 + doseLines.length * 4 + 2
    const rightHeight = 8 + rightLines.length * 4 + 2
    const RH = Math.max(20, Math.max(leftHeight, rightHeight) + 2)

    guard(RH + 2)
    box(MG, y, CW, RH, i % 2 === 0 ? C.bg : C.sheet)
    box(MG, y, 3, RH, urgColor)

    // Number + urgency badge
    ink(urgColor); sz(7.5); b()
    t(`${item.number ?? i + 1}`, MG + 7, y + 5.5)
    box(MG + 13, y + 1.5, 22, 5, sbg(item.urgency ?? 'low'))
    ink(urgColor); sz(6.5); b()
    t(urgLabel, MG + 24, y + 5.5, 'center')

    // Category
    ink(C.light); sz(6.5); n()
    t(item.category ?? '', MG + 38, y + 5.5)

    // Left column: molecule + dose
    ink(C.text); sz(9); b()
    pdf.text(moleculeLines, MG + 7, y + 11)
    const doseY = y + 11 + moleculeLines.length * 4.5
    ink(C.muted); sz(7.5); n()
    pdf.text(doseLines, MG + 7, doseY)

    // Action badge — below dose
    if (item.action) {
      const actionLines = pdf.splitTextToSize(item.action, leftW - 10) as string[]
      const actionY = doseY + doseLines.length * 4 + 2
      ink(urgColor); sz(6.5); b()
      pdf.text(actionLines, MG + 7, actionY)
    }

    // Right column: mechanism + evidence + expected result
    const rightX = MG + leftW + 6
    ink(C.muted); sz(7.5); n()
    pdf.text(rightLines, rightX, y + 5.5)

    hline(y + RH)
    skip(RH)
  })

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 10 — PROTOCOLO CÉLULAS MADRE Y EXOSOMAS
  // ═══════════════════════════════════════════════════════════════
  nextPage()
  section('PROTOCOLO DE CÉLULAS MADRE Y EXOSOMAS', '— Medicina regenerativa personalizada')

  const stem = computeStemCell(patient, parsedData, analysis)
  const tfPct = ((stem.totalFactor - 1) * 100).toFixed(0)
  const tfSign = stem.totalFactor >= 1 ? '+' : ''

  // Indicación
  const indColor = stem.indication === 'Preventivo / Optimización' ? C.optimal :
    stem.indication === 'Terapéutico Moderado' ? C.normal : C.warning
  guard(12)
  box(MG, y, CW, 10, sbg(stem.indication === 'Preventivo / Optimización' ? 'optimal' : stem.indication === 'Terapéutico Moderado' ? 'normal' : 'warning'))
  box(MG, y, 3, 10, indColor)
  ink(indColor); sz(8.5); b()
  t(`INDICACIÓN: ${stem.indication.toUpperCase()}`, MG + 8, y + 7)
  ink(C.muted); sz(7.5); n()
  t(`Factor compuesto total: ${tfSign}${tfPct}%  (×${stem.totalFactor.toFixed(3)})`, MG + CW - 2, y + 7, 'right')
  skip(14)

  // Dosis principales — 2 columnas
  guard(38)
  const colHalf = (CW - 4) / 2

  // MSC
  box(MG, y, colHalf, 36, sbg('optimal'))
  box(MG, y, 3, 36, C.optimal)
  ink(C.optimal); sz(9); b()
  t('CÉLULAS MADRE MSC', MG + 8, y + 8)
  sz(20); b()
  t(`${stem.mscDose}`, MG + 8, y + 20)
  ink(C.muted); sz(8); n()
  t('× 10⁶ células mesenquimales', MG + 8, y + 26)
  ink(C.text); sz(7.5); n()
  t(`Base: ${patient.weight ?? 70} kg × 1×10⁶/kg  |  Ajuste clínico: ${tfSign}${tfPct}%`, MG + 8, y + 32)

  // Exosomas
  const EX = MG + colHalf + 4
  box(EX, y, colHalf, 36, [209, 234, 251] as RGB)
  box(EX, y, 3, 36, C.normal)
  ink(C.normal); sz(9); b()
  t('EXOSOMAS / VEs', EX + 8, y + 8)
  sz(20); b()
  t(`${stem.exosome.toFixed(1)}`, EX + 8, y + 20)
  ink(C.muted); sz(8); n()
  t('× 10¹⁰ partículas IV', EX + 8, y + 26)
  ink(C.text); sz(7.5); n()
  t('Marcadores: CD9 / CD63 / CD81  |  30–150 nm', EX + 8, y + 32)
  skip(40)

  // Ruta + Sesiones + Calendario
  guard(16)
  const thirdW = CW / 3
  const adminBoxes: [string, string, string][] = [
    ['Vía de Administración', 'Ruta', stem.route],
    ['Número de Sesiones', 'Sesiones', `${stem.sessions} sesión${stem.sessions > 1 ? 'es' : ''}`],
    ['Calendario', 'Programa', stem.schedule],
  ]
  adminBoxes.forEach(([title, sub, val], i) => {
    const bx = MG + i * thirdW
    boxStroke(bx, y, thirdW - 2, 16, C.sheet, C.border)
    ink(C.muted); sz(6.5); n(); t(sub, bx + 4, y + 5)
    ink(C.text); sz(7.5); b(); t(title, bx + 4, y + 9.5)
    ink(C.accent); sz(8); n(); t(val, bx + 4, y + 14)
  })
  skip(20)

  // Factores del algoritmo
  section('FACTORES DEL ALGORITMO DE DOSIFICACIÓN', '— 8 variables clínicas evaluadas')
  box(MG, y, CW, 7, C.dark)
  ink(C.bg); sz(6.8); b()
  t('FACTOR CLÍNICO', MG + 3, y + 5)
  t('VALOR', MG + 60, y + 5)
  t('ESTADO', MG + 100, y + 5)
  t('MULTIPLICADOR', MG + 130, y + 5)
  t('JUSTIFICACIÓN', MG + 162, y + 5)
  skip(7)

  const stemFactors: [string, string, string, number][] = [
    ['Edad', `${patient.age} años`,
      patient.age < 40 ? 'optimal' : patient.age <= 55 ? 'normal' : patient.age <= 70 ? 'warning' : 'danger',
      patient.age < 40 ? 0.85 : patient.age <= 55 ? 1.0 : patient.age <= 70 ? 1.2 : 1.5],
    ['Inflamación (PCR/Hcy)',
      [parsedData.inflammation?.crp?.value, parsedData.inflammation?.homocysteine?.value].filter(v => v != null).map(v => `${v}`).join(' | ') || 'Sin dato',
      parsedData.inflammation?.crp?.status ?? 'unavailable',
      stem.totalFactor > 1.1 ? 1.3 : 1.0],
    ['Función Renal (TFG)',
      parsedData.metabolic?.gfr?.value != null ? `${parsedData.metabolic.gfr.value} ${parsedData.metabolic.gfr.unit}` : 'Sin dato',
      parsedData.metabolic?.gfr?.status ?? 'unavailable',
      parsedData.metabolic?.gfr?.status === 'danger' ? 0.85 : parsedData.metabolic?.gfr?.status === 'warning' ? 0.95 : 1.0],
    ['Función Hepática (ALT/AST)',
      [parsedData.liver?.alt?.value, parsedData.liver?.ast?.value].filter(v => v != null).map(v => `${v}`).join(' | ') || 'Sin dato',
      parsedData.liver?.alt?.status ?? 'unavailable',
      parsedData.liver?.alt?.status === 'danger' ? 1.3 : parsedData.liver?.alt?.status === 'warning' ? 1.1 : 1.0],
    ['Estado Metabólico (Glc/HbA1c)',
      [parsedData.metabolic?.glucose?.value, parsedData.hormones?.hba1c?.value].filter(v => v != null).map(v => `${v}`).join(' | ') || 'Sin dato',
      parsedData.metabolic?.glucose?.status ?? 'unavailable',
      parsedData.metabolic?.glucose?.status === 'danger' ? 1.2 : parsedData.metabolic?.glucose?.status === 'warning' ? 1.1 : 1.0],
    ['Score Inmunológico', `${((analysis.systemScores.immune + analysis.systemScores.hematologic) / 2).toFixed(0)}/100`,
      analysis.systemScores.immune >= 85 ? 'optimal' : analysis.systemScores.immune >= 65 ? 'normal' : analysis.systemScores.immune >= 40 ? 'warning' : 'danger',
      analysis.systemScores.immune >= 85 ? 0.95 : analysis.systemScores.immune >= 65 ? 1.0 : analysis.systemScores.immune >= 40 ? 1.15 : 1.3],
    ['Score Global de Salud', `${analysis.overallScore.toFixed(0)}/100`,
      analysis.overallScore >= 85 ? 'optimal' : analysis.overallScore >= 65 ? 'normal' : analysis.overallScore >= 40 ? 'warning' : 'danger',
      analysis.overallScore >= 85 ? 0.9 : analysis.overallScore >= 65 ? 1.0 : analysis.overallScore >= 40 ? 1.2 : 1.4],
    ['IMC', bmi, patient.weight && patient.height && (patient.weight / Math.pow((patient.height)/100,2)) <= 24.9 ? 'optimal' : 'normal',
      patient.weight && patient.height && (patient.weight / Math.pow((patient.height)/100,2)) > 35 ? 1.15 : 1.0],
  ]

  const justMap: Record<string, string> = {
    'optimal': 'Sin ajuste',
    'normal': 'Ajuste mínimo',
    'warning': 'Ajuste moderado por compromiso',
    'danger': 'Ajuste significativo',
    'unavailable': 'Dato no disponible',
  }

  stemFactors.forEach(([factor, value, status, mult], i) => {
    const RH = 9
    guard(RH + 1)
    box(MG, y, CW, RH, i % 2 === 0 ? C.bg : C.sheet)

    // Factor name (wider column)
    ink(C.text); sz(7.5); b(); t(factor, MG + 3, y + 6)

    // Value
    ink(C.muted); sz(7); n()
    const valText = value.length > 26 ? value.slice(0, 24) + '…' : value
    t(valText, MG + 56, y + 6)

    // Status badge
    box(MG + 100, y + 2, 24, 5, sbg(status))
    ink(sc(status)); sz(6); b()
    t(sl(status), MG + 112, y + 6, 'center')

    // Multiplier
    const mColor = mult > 1.1 ? C.danger : mult > 1.0 ? C.warning : mult < 1.0 ? C.normal : C.optimal
    ink(mColor); sz(8); b()
    t(`×${mult.toFixed(2)}`, MG + 130, y + 6)

    // Justification
    ink(C.muted); sz(6.5); n()
    t(justMap[status] ?? '—', MG + 152, y + 6)

    hline(y + RH)
    skip(RH)
  })

  // Total row
  guard(10)
  box(MG, y, CW, 9, C.section)
  box(MG, y, 3, 9, C.green)
  ink(C.text); sz(8.5); b()
  t('FACTOR COMPUESTO TOTAL', MG + 7, y + 6.5)
  const totalColor = stem.totalFactor > 1.3 ? C.danger : stem.totalFactor > 1.1 ? C.warning : stem.totalFactor < 0.95 ? C.normal : C.optimal
  ink(totalColor); sz(9); b()
  t(`×${stem.totalFactor.toFixed(3)}  (${tfSign}${tfPct}%)`, MG + CW - 2, y + 6.5, 'right')
  skip(13)

  // Monitoreo
  section('MONITOREO POST-PROTOCOLO')
  const monitoring = [
    'PCR, VSG e IL-6 a las 72h, 4 semanas y 3 meses post-infusión',
    'Hemograma completo a las 24h y 2 semanas',
    'Panel metabólico (glucosa, creatinina, transaminasas) a las 48h',
    'Evaluación clínica funcional (escala de fatiga, calidad de vida) a 1 y 3 meses',
  ]
  if ((parsedData.liver?.alt?.status === 'warning' || parsedData.liver?.alt?.status === 'danger'))
    monitoring.push('ALT, AST, GGT y albúmina semanal durante primer mes')
  if ((parsedData.metabolic?.gfr?.status === 'warning' || parsedData.metabolic?.gfr?.status === 'danger'))
    monitoring.push('TFG y creatinina a las 48–72h y a las 2 semanas')
  if (patient.age > 65)
    monitoring.push('Evaluación física funcional (6MWT o equivalente) a los 3 meses')

  monitoring.forEach((m, i) => {
    guard(8)
    box(MG, y, CW, 7, i % 2 === 0 ? C.bg : C.sheet)
    box(MG, y, 2, 7, C.optimal)
    ink(C.text); sz(7.5); n(); t(`✓  ${m}`, MG + 6, y + 5)
    hline(y + 7)
    skip(7)
  })
  skip(5)

  // Fuentes científicas
  section('FUENTES DE EVIDENCIA CIENTÍFICA', '— Base del algoritmo de dosificación')
  const refs = [
    'Longeveron Phase 2b — Cell Stem Cell 2026 (frailty protocol)',
    'Signal Transduction & Targeted Therapy 2024–2025 (Nature) — MSC pharmacokinetics & liver cirrhosis',
    'Frontiers in Medicine 2025 — Trends in MSC-derived EV clinical trials 2014–2024',
    'Blood Advances 2020 (ASH) — MSC therapeutic potency: viability, route, immune match',
    'Journal of Clinical Oncology 2024–2025 — Sequential MSC infusion for GVHD prevention',
    'Frontiers Immunology 2026 — Potency assay matrix for clinical MSC manufacture',
    'PMC12049250 2025 — Immunological safety of hucMSC-derived exosomes',
  ]
  refs.forEach((ref, i) => {
    guard(7)
    box(MG, y, CW, 6, i % 2 === 0 ? C.bg : C.sheet)
    ink(C.muted); sz(7); n()
    t(`[${i + 1}]  ${ref}`, MG + 3, y + 4.5)
    skip(6)
  })
  skip(4)

  // Nota clínica final
  const noteText =
    'Este protocolo es una estimación algorítmica basada en evidencia clínica publicada. No sustituye el criterio del médico tratante. ' +
    'La dosis final debe ser validada considerando el estado clínico actual, disponibilidad del producto celular y potencia por lote (batch potency).'
  const noteLines = pdf.splitTextToSize(noteText, CW - 14) as string[]
  const noteH = noteLines.length * 4.2 + 12
  guard(noteH + 2)
  box(MG, y, CW, noteH, [232, 244, 253] as RGB)
  box(MG, y, 3, noteH, C.normal)
  ink(C.normal); sz(7.5); b()
  t('NOTA CLÍNICA IMPORTANTE', MG + 7, y + 6)
  ink(C.text); sz(7.5); n()
  pdf.text(noteLines, MG + 7, y + 11)
  skip(noteH + 4)

  // ─── Pie de página final ─────────────────────────────────────
  drawFooter()

  // ─── Guardar PDF ──────────────────────────────────────────────
  const cleanName = patient.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
  const dateStr = new Date(resultDate).toISOString().slice(0, 10)
  pdf.save(`Longevity-IA_Reporte_${cleanName}_${dateStr}.pdf`)
}
