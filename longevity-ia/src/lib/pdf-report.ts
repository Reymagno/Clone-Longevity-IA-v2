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
  dark:     [5, 14, 26],
  bg:       [255, 255, 255],
  sheet:    [250, 251, 253],
  section:  [245, 247, 250],
  text:     [15, 23, 42],
  muted:    [100, 116, 139],
  light:    [148, 163, 184],
  border:   [226, 232, 240],
  gold:     [201, 168, 76],
  goldDark: [160, 130, 50],
  accent:   [4, 120, 87],
  optimal:  [16, 185, 129],
  normal:   [59, 130, 246],
  warning:  [245, 158, 11],
  danger:   [239, 68, 68],
  gray:     [107, 114, 128],
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PUROS
// ─────────────────────────────────────────────────────────────────────────────

const sc = (s: string | null): RGB =>
  s === 'optimal' ? C.optimal : s === 'normal' ? C.normal :
  s === 'warning' ? C.warning : s === 'danger'  ? C.danger : C.gray

const sbg = (s: string | null): RGB => {
  if (s === 'optimal') return [220, 252, 239]
  if (s === 'normal')  return [219, 234, 254]
  if (s === 'warning') return [254, 243, 199]
  if (s === 'danger')  return [254, 226, 226]
  return [241, 245, 249]
}

const sl = (s: string | null): string =>
  s === 'optimal' ? 'Óptimo' : s === 'normal' ? 'Normal' :
  s === 'warning' ? 'Atención' : s === 'danger' ? 'Crítico' : '—'

const scoreC = (n: number): RGB =>
  n >= 85 ? C.optimal : n >= 65 ? C.normal : n >= 40 ? C.warning : C.danger

const scoreBg = (n: number): RGB => {
  if (n >= 85) return [220, 252, 239]
  if (n >= 65) return [219, 234, 254]
  if (n >= 40) return [254, 243, 199]
  return [254, 226, 226]
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

  const immuneAvg = ((analysis.systemScores?.immune ?? 50) + (analysis.systemScores?.hematologic ?? 50)) / 2
  const immuneFactor =
    immuneAvg >= 85 ? 0.95 : immuneAvg >= 65 ? 1.0 : immuneAvg >= 40 ? 1.15 : 1.3

  const overall = analysis.overallScore ?? 50
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
  /** Dibuja texto truncado para que no exceda maxW mm */
  function tSafe(str: string, tx: number, ty: number, maxW: number, align: 'left' | 'center' | 'right' = 'left') {
    if (!str) return
    let s = str
    while (pdf.getTextWidth(s) > maxW && s.length > 3) {
      s = s.slice(0, -2) + '…'
    }
    pdf.text(s, tx, ty, { align })
  }
  function guard(needed: number) { if (y + needed > PH - 20) nextPage() }
  function skip(delta = 4) { y += delta }

  // ── Estructura de página ──────────────────────────────────────
  function drawHeader() {
    box(0, 0, PW, 10, C.dark)
    ink(C.gold); sz(7); b()
    t('LONGEVITY IA', MG, 6.5)
    // Gold dot separator
    pdf.setFillColor(C.gold[0], C.gold[1], C.gold[2])
    pdf.circle(MG + 28, 5.5, 0.6, 'F')
    ink(C.light); sz(6.5); n()
    tSafe(patient.name, MG + 31, 6.5, 90)
    ink(C.light); sz(6.5); n()
    t(`Pág. ${pageNum}`, PW - MG, 6.5, 'right')
    // Thin gold accent line at bottom of header
    dr(C.gold); pdf.setLineWidth(0.4); pdf.line(0, 10, PW, 10)
    y = 17
  }

  function drawFooter() {
    // Thin gold line across top of footer area
    dr(C.gold); pdf.setLineWidth(0.3); pdf.line(MG, PH - 12, PW - MG, PH - 12)
    // Footer content
    ink(C.gold); sz(6.5); b()
    t('Longevity IA', MG, PH - 7)
    ink(C.muted); sz(6); n()
    t('Reporte confidencial · Solo para uso médico', MG + 24, PH - 7)
    t(new Date().toLocaleDateString('es-MX'), PW - MG, PH - 7, 'right')
  }

  function nextPage() {
    drawFooter(); pdf.addPage(); pageNum++; drawHeader()
  }

  // ── Sección con acento izquierdo gold ─────────────────────────
  function section(title: string, sub = '') {
    guard(16)
    // Subtle gold tint background
    box(MG, y, CW, 10, [255, 252, 240] as RGB)
    // Gold left accent bar
    box(MG, y, 3, 10, C.gold)
    ink(C.text); sz(10); b()
    const titleMaxW = sub ? CW * 0.55 : CW - 10
    tSafe(title, MG + 7, y + 7, titleMaxW)
    if (sub) { ink(C.muted); sz(7); n(); tSafe(sub, MG + CW - 2, y + 7, CW * 0.4, 'right') }
    // Thin gold line below
    dr(C.gold); pdf.setLineWidth(0.3); pdf.line(MG, y + 10, MG + CW, y + 10)
    skip(14)
  }

  // ── Tabla de biomarcadores ─────────────────────────────────────
  // Columnas redistribuidas para evitar superposición
  const BC = { name: MG + 2, val: MG + 46, unit: MG + 68, ref: MG + 88, opt: MG + 114, badge: MG + 144 }

  function bmHead() {
    guard(10)
    box(MG, y, CW, 7, C.dark)
    ink(C.gold); sz(6); b()
    const labels = ['BIOMARCADOR', 'VALOR', 'UNIDAD', 'REF.', 'ÓPTIMO', 'ESTADO']
    const xs = [BC.name, BC.val, BC.unit, BC.ref, BC.opt, BC.badge]
    labels.forEach((lbl, idx) => t(lbl, xs[idx], y + 5))
    skip(7)
  }

  function bmRow(label: string, bm: BiomarkerValue | null | undefined, even: boolean) {
    const RH = 7
    guard(RH + 1)
    box(MG, y, CW, RH, even ? C.bg : [246, 248, 251] as RGB)
    // Truncar nombre si es muy largo
    const maxNameW = BC.val - BC.name - 2
    const truncLabel = pdf.getTextWidth(label) > maxNameW ? label.substring(0, 22) + '…' : label
    ink(C.text); sz(7.5); n(); t(truncLabel, BC.name, y + 5)
    if (bm && bm.value != null) {
      ink(C.text); sz(8); b(); tSafe(bv(bm), BC.val, y + 5, BC.unit - BC.val - 1)
      ink(C.muted); sz(7); n()
      tSafe(bu(bm), BC.unit, y + 5, BC.ref - BC.unit - 1)
      tSafe(bref(bm), BC.ref, y + 5, BC.opt - BC.ref - 1)
      tSafe(bopt(bm), BC.opt, y + 5, BC.badge - BC.opt - 1)
      // Pill-shaped badge (rect + circles at ends)
      const badgeW = 26
      const badgeH = 4.5
      const badgeX = MG + CW - badgeW - 2
      const badgeY = y + 1.2
      const pillR = badgeH / 2
      const bgColor = sbg(bm.status)
      fl(bgColor)
      pdf.circle(badgeX + pillR, badgeY + pillR, pillR, 'F')
      pdf.circle(badgeX + badgeW - pillR, badgeY + pillR, pillR, 'F')
      pdf.rect(badgeX + pillR, badgeY, badgeW - badgeH, badgeH, 'F')
      ink(sc(bm.status)); sz(6); b()
      t(sl(bm.status), badgeX + badgeW / 2, y + 4.8, 'center')
    } else {
      ink(C.light); sz(7); n(); t('Sin dato', BC.val, y + 5)
    }
    hline(y + RH)
    skip(RH)
  }

  // ── Barra de score con extremos redondeados ────────────────────
  function scoreBar(label: string, score: number, even: boolean) {
    const RH = 9
    guard(RH + 1)
    box(MG, y, CW, RH, even ? C.bg : [246, 248, 251] as RGB)
    ink(C.text); sz(8); n(); t(label, MG + 3, y + 6)
    // Rounded progress bar
    const BAR_X = MG + 42, BAR_W = 70, BAR_H = 3.5, R = BAR_H / 2
    const barY = y + 3
    // Background bar with rounded ends
    const bgBar: RGB = [235, 238, 242]
    fl(bgBar)
    pdf.circle(BAR_X + R, barY + R, R, 'F')
    pdf.circle(BAR_X + BAR_W - R, barY + R, R, 'F')
    pdf.rect(BAR_X + R, barY, BAR_W - BAR_H, BAR_H, 'F')
    // Filled portion with rounded ends
    const fillW = Math.max(BAR_H, (score / 100) * BAR_W)
    const sColor = scoreC(score)
    fl(sColor)
    pdf.circle(BAR_X + R, barY + R, R, 'F')
    pdf.circle(BAR_X + fillW - R, barY + R, R, 'F')
    pdf.rect(BAR_X + R, barY, fillW - BAR_H, BAR_H, 'F')
    // Score number: inside bar if wide enough, otherwise to the right
    const scoreStr = `${Math.round(score)}`
    if (fillW > 14) {
      ink(C.bg); sz(7); b()
      t(scoreStr, BAR_X + fillW - 3, y + 6, 'right')
    } else {
      ink(sColor); sz(8); b()
      t(scoreStr, BAR_X + fillW + 2, y + 6)
    }
    // Pill-shaped badge at end
    const badgeW = 22
    const badgeH = 5
    const badgeX = MG + CW - badgeW - 1
    const badgeY = y + 2
    const pillR = badgeH / 2
    const bgC = scoreBg(score)
    fl(bgC)
    pdf.circle(badgeX + pillR, badgeY + pillR, pillR, 'F')
    pdf.circle(badgeX + badgeW - pillR, badgeY + pillR, pillR, 'F')
    pdf.rect(badgeX + pillR, badgeY, badgeW - badgeH, badgeH, 'F')
    ink(sColor); sz(6); b()
    const scoreLabel = score >= 85 ? 'Óptimo' : score >= 65 ? 'Normal' : score >= 40 ? 'Atención' : 'Crítico'
    t(scoreLabel, badgeX + badgeW / 2, y + 5.8, 'center')
    hline(y + RH)
    skip(RH)
  }

  // ── Par label/valor en línea ────────────────────────────────────
  function infoLine(label: string, value: string, cx = MG + 2, valueColor = C.text) {
    ink(C.muted); sz(7.5); n(); t(label + ':', cx, y)
    ink(valueColor); sz(8.5); b(); t(value, cx + 35, y)
    n()
  }

  // ── Alerta de texto con borde gold ─────────────────────────────
  function alertBox(text: string, level: 'warning' | 'danger' = 'warning') {
    const color = level === 'danger' ? C.danger : C.warning
    const bgTint: RGB = level === 'danger' ? [255, 245, 245] : [255, 251, 235]
    const lines = pdf.splitTextToSize(text, CW - 16) as string[]
    const H = lines.length * 4.5 + 6
    guard(H + 2)
    boxStroke(MG, y, CW, H, bgTint, C.gold, 0.3)
    box(MG, y, 3, H, color)
    ink(color); sz(7); n()
    pdf.text(lines, MG + 8, y + 5)
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
  // PORTADA — Premium Medical Longevity Clinic
  // ═══════════════════════════════════════════════════════════════

  const ov = analysis.overallScore ?? 50
  const ovC = scoreC(ov)
  const ageDiff = patient.age - (analysis.longevity_age ?? patient.age)

  // ── Dark background covering top 60% ─────────────────────────
  const COVER_DARK_H = 178  // ~60% of 297
  box(0, 0, PW, COVER_DARK_H, C.dark)

  // Gold accent line at bottom of dark area (3mm thick)
  box(0, COVER_DARK_H, PW, 3, C.gold)

  // ── Branding ──────────────────────────────────────────────────
  ink(C.gold); sz(12); b()
  // Wide tracking simulation via character spacing
  t('L O N G E V I T Y   I A', MG, 28)
  ink(C.bg); sz(22); b()
  t('REPORTE MÉDICO INTEGRAL', MG, 52)
  ink(C.light); sz(8); n()
  t('Análisis de Biomarcadores · Protocolo Personalizado', MG, 62)

  // ── Score circle on the right side of dark area ───────────────
  const CIRCLE_X = PW - MG - 25   // center X
  const CIRCLE_Y = 110             // center Y
  const CIRCLE_R = 20              // radius
  // Filled circle with score color
  fl(ovC)
  pdf.circle(CIRCLE_X, CIRCLE_Y, CIRCLE_R, 'F')
  // Score number in white, bold, centered
  ink(C.bg); sz(28); b()
  t(String(Math.round(ov)), CIRCLE_X, CIRCLE_Y + 3, 'center')
  // "LONGEVITY SCORE" below in small text
  ink(C.bg); sz(6); n()
  t('LONGEVITY SCORE', CIRCLE_X, CIRCLE_Y + 11, 'center')
  t('/100', CIRCLE_X, CIRCLE_Y + 15, 'center')

  // ── Age comparison below score circle ─────────────────────────
  const bioAge = analysis.longevity_age ?? patient.age
  ink(C.light); sz(7); n()
  t('Edad biológica:', CIRCLE_X - 18, CIRCLE_Y + 24)
  ink(ovC); sz(9); b()
  t(`${bioAge} años`, CIRCLE_X - 18, CIRCLE_Y + 30)
  ink(C.light); sz(6.5); n()
  const diffTxt = ageDiff > 0 ? `${ageDiff} años más joven` :
    ageDiff < 0 ? `${Math.abs(ageDiff)} años mayor` : 'Igual a cronológica'
  t(diffTxt, CIRCLE_X - 18, CIRCLE_Y + 35)

  // ── Patient info card below dark area ─────────────────────────
  const bmi = patient.weight && patient.height
    ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1) + ' kg/m²'
    : 'No disponible'

  const CARD_Y = COVER_DARK_H + 7
  const CARD_H = 58
  // White card with very light stroke
  boxStroke(MG, CARD_Y, CW, CARD_H, C.bg, [230, 232, 238] as RGB, 0.2)
  // Gold left accent bar (3mm)
  box(MG, CARD_Y, 3, CARD_H, C.gold)

  // Card title
  ink(C.goldDark); sz(7); b()
  t('DATOS DEL PACIENTE', MG + 8, CARD_Y + 8)
  dr(C.border); pdf.setLineWidth(0.15); pdf.line(MG + 8, CARD_Y + 10, MG + CW - 4, CARD_Y + 10)

  // Two columns: Left (Name, Code, Date, Age) — Right (Gender, Weight, Height, BMI)
  const pInfoLeft = [
    ['Nombre', patient.name],
    ['Código', patient.code],
    ['Fecha del estudio', fmtDate(resultDate)],
    ['Edad cronológica', `${patient.age} años`],
  ]
  const pInfoRight = [
    ['Género', patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'],
    ['Peso', patient.weight ? `${patient.weight} kg` : 'No registrado'],
    ['Estatura', patient.height ? `${patient.height} cm` : 'No registrada'],
    ['IMC', bmi],
  ]
  const colW = CW / 2 - 12
  pInfoLeft.forEach(([lbl, val], i) => {
    ink(C.muted); sz(6.5); n(); t(lbl, MG + 8, CARD_Y + 18 + i * 10)
    ink(C.text); sz(8.5); b(); tSafe(val, MG + 8, CARD_Y + 23 + i * 10, colW)
  })
  pInfoRight.forEach(([lbl, val], i) => {
    ink(C.muted); sz(6.5); n(); t(lbl, MG + CW / 2 + 4, CARD_Y + 18 + i * 10)
    ink(C.text); sz(8.5); b(); tSafe(val, MG + CW / 2 + 4, CARD_Y + 23 + i * 10, colW)
  })

  // ── Legal disclaimer ───────────────────────────────────────────
  const LEGAL_Y = CARD_Y + CARD_H + 6
  ink(C.muted); sz(6.5); n()
  const legalLines = pdf.splitTextToSize(
    'Este reporte es generado por Longevity IA con base en los estudios de laboratorio proporcionados. ' +
    'Los datos y recomendaciones deben ser interpretados por un médico certificado. No sustituye el diagnóstico clínico profesional.',
    CW - 10
  ) as string[]
  const legalH = legalLines.length * 3.8 + 6
  boxStroke(MG, LEGAL_Y, CW, legalH, [250, 251, 253] as RGB, C.border, 0.15)
  pdf.text(legalLines, MG + 5, LEGAL_Y + 4)

  // ── Footer portada ─────────────────────────────────────────────
  ink(C.muted); sz(6.5); n()
  t('Pág. 1', PW - MG, PH - 8, 'right')

  // ═══════════════════════════════════════════════════════════════
  // RESUMEN EJECUTIVO
  // ═══════════════════════════════════════════════════════════════
  nextPage()  // La portada siempre ocupa una página completa

  section('RESUMEN EJECUTIVO', '— Síntesis clínica general')

  ink(C.text); sz(8.5); n()
  const LH_SUM = 4.8
  const sumTextW = CW - 14  // margen izq (7) + margen der (7)
  const sumLines = pdf.splitTextToSize(analysis.clinicalSummary ?? '', sumTextW) as string[]
  guard(sumLines.length * LH_SUM + 10)
  const sumBoxH = sumLines.length * LH_SUM + 8
  boxStroke(MG, y - 2, CW, sumBoxH, [252, 252, 250] as RGB, C.border, 0.15)
  box(MG, y - 2, 3, sumBoxH, C.gold)
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
      const alertBgTint: RGB = level === 'danger' ? [255, 245, 245] : [255, 251, 235]
      // Construir texto de alerta con salto de línea para valores largos
      let fullText = title
      if (desc) fullText += ': ' + desc
      if (val) fullText += '\nActual: ' + val + (target ? '  →  Objetivo: ' + target : '')
      const alertMaxW = CW - 16
      const aLines = pdf.splitTextToSize(fullText, alertMaxW) as string[]
      const AH = aLines.length * 4.5 + 6
      guard(AH + 3)
      boxStroke(MG, y, CW, AH, alertBgTint, C.gold, 0.3)
      box(MG, y, 3, AH, alertColor)
      ink(alertColor); sz(7); n()
      pdf.text(aLines, MG + 8, y + 5)
      skip(AH + 3)
    })
    skip(2)
  }

  // Scores por sistema
  section('SCORES POR SISTEMA ORGÁNICO', '— Evaluación de 8 sistemas')

  // Tabla header
  box(MG, y, CW, 7, C.dark)
  ink(C.gold); sz(7); b()
  t('SISTEMA', MG + 3, y + 5)
  t('EVALUACIÓN', MG + CW - 90, y + 5)
  t('SCORE', MG + CW - 18, y + 5, 'right')
  skip(7)

  const ss = analysis.systemScores ?? {} as Record<string, number>
  const systems: [string, number][] = [
    ['Cardiovascular',  ss.cardiovascular ?? 0],
    ['Metabólico',      ss.metabolic ?? 0],
    ['Hepático',        ss.hepatic ?? 0],
    ['Renal',           ss.renal ?? 0],
    ['Inmunológico',    ss.immune ?? 0],
    ['Hematológico',    ss.hematologic ?? 0],
    ['Inflamatorio',    ss.inflammatory ?? 0],
    ['Vitaminas',       ss.vitamins ?? 0],
  ]
  systems.forEach(([lbl, score], i) => scoreBar(lbl, score, i % 2 === 0))
  skip(4)


  // ═══════════════════════════════════════════════════════════════
  // FODA MÉDICA
  // ═══════════════════════════════════════════════════════════════
  skip(4)
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
    tSafe(title, MG + 7, y + 6.5, CW * 0.45)
    ink(C.muted); sz(7); n()
    tSafe(sub, MG + CW - 2, y + 6.5, CW * 0.5, 'right')
    skip(12)

    if (arrItems.length === 0) {
      ink(C.light); sz(7.5); n(); t('Sin datos disponibles', MG + 4, y + 5); skip(8)
    } else {
      arrItems.slice(0, 5).forEach((item, i) => {
        const it = item as Record<string, unknown>
        const lbl = normalize(it, ['label', 'title', 'name', 'factor'])
        const det = normalize(it, ['detail', 'description', 'desc'])
        const evi = normalize(it, ['evidence'])
        const impact = normalize(it, ['expectedImpact', 'impact'])
        const prob = normalize(it, ['probability'])

        const detMaxW = CW - (impact || prob ? 58 : 14)
        const detLines = pdf.splitTextToSize(det, detMaxW) as string[]
        const eviLines = evi ? pdf.splitTextToSize(evi, CW - 14) as string[] : []
        const DLH = 4.5  // line height para detalle
        const ELH = 3.8  // line height para evidencia
        const RH = Math.max(14, 8 + detLines.length * DLH + (eviLines.length > 0 ? eviLines.length * ELH + 3 : 0) + 4)
        guard(RH + 1)
        box(MG, y, CW, RH, i % 2 === 0 ? C.bg : C.sheet)
        box(MG, y, 2, RH, color)
        ink(C.text); sz(8); b()
        tSafe(lbl, MG + 5, y + 5.5, CW - (impact || prob ? 55 : 10))
        ink(C.muted); sz(7); n()
        pdf.text(detLines, MG + 5, y + 11)
        if (eviLines.length > 0) {
          const eviY = y + 11 + detLines.length * DLH + 1
          ink(C.light); sz(6.5); n()
          pdf.text(eviLines, MG + 5, eviY)
        }
        if (impact) {
          ink(color); sz(6.5); b()
          tSafe(impact, MG + CW - 2, y + 5.5, 48, 'right')
        } else if (prob) {
          ink(color); sz(6.5); b()
          tSafe(prob, MG + CW - 2, y + 5.5, 48, 'right')
        }
        hline(y + RH)
        skip(RH)
      })
    }
    skip(4)
  })

  // ═══════════════════════════════════════════════════════════════
  // LÍPIDOS
  // ═══════════════════════════════════════════════════════════════
  if (parsedData.lipids) {
    skip(4)
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
  // HEMATOLOGÍA
  // ═══════════════════════════════════════════════════════════════
  if (parsedData.hematology) {
    skip(4)
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
  // PANEL METABÓLICO
  // ═══════════════════════════════════════════════════════════════
  if (parsedData.metabolic) {
    skip(4)
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
  // HORMONAS, VITAMINAS E INFLAMACIÓN
  // ═══════════════════════════════════════════════════════════════
  skip(4)

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
  // PROYECCIÓN Y RIESGOS
  // ═══════════════════════════════════════════════════════════════
  skip(4)
  section('RIESGOS DE ENFERMEDAD', '— Probabilidad a largo plazo sin intervención')

  box(MG, y, CW, 7, C.dark)
  ink(C.gold); sz(7); b()
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

    // Disease name — truncar para no solapar con barra de probabilidad
    ink(C.text); sz(8.5); b()
    tSafe(disease, MG + 6, y + 5.5, CW - 70)

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

      const leftColW = CW / 2 - 14
      const rightColW = CW / 2 - 7
      const withoutLines = pdf.splitTextToSize(`Sin protocolo: ${withoutP}`, leftColW) as string[]
      const withLines = pdf.splitTextToSize(`Con protocolo: ${withP}`, rightColW) as string[]
      const justLines = justification ? pdf.splitTextToSize(justification, CW - 16) as string[] : []

      // Actual y Óptimo en líneas separadas si son muy largos
      const currentLines = pdf.splitTextToSize(`Actual: ${current}`, leftColW) as string[]
      const optimalLines = pdf.splitTextToSize(`Óptimo: ${optimal}`, rightColW) as string[]
      const valuesH = Math.max(currentLines.length, optimalLines.length) * 4.2

      const RH = 10 + valuesH + 4 + Math.max(withoutLines.length, withLines.length) * 4 + (justLines.length > 0 ? justLines.length * 3.5 + 2 : 0) + 4

      guard(RH + 2)
      box(MG, y, CW, RH, i % 2 === 0 ? C.bg : C.sheet)
      box(MG, y, 3, RH, C.gold)

      // Factor name
      ink(C.text); sz(8.5); b()
      tSafe(factor, MG + 7, y + 5.5, CW - 14)

      // Current + optimal values — cada uno en su mitad con word wrap
      const valY = y + 11
      ink(C.muted); sz(7); n()
      pdf.text(currentLines, MG + 7, valY)
      ink(C.optimal); sz(7); n()
      pdf.text(optimalLines, MG + CW / 2, valY)

      // Without / with protocol side by side
      const projY = y + 10 + valuesH + 3
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
  // PROTOCOLO MÉDICO
  // ═══════════════════════════════════════════════════════════════
  skip(4)
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

    // Layout vertical: header → molécula/dosis → mecanismo → evidencia → resultado
    // Texto inicia en MG+7, margen derecho 7mm → ancho útil = CW - 14 - 4 (extra seguridad)
    const contentW = CW - 18

    const moleculeLines = pdf.splitTextToSize(item.molecule ?? '', contentW) as string[]
    const doseLines = pdf.splitTextToSize(item.dose ?? '', contentW) as string[]
    const mechLines = item.mechanism ? pdf.splitTextToSize(`Mecanismo: ${item.mechanism}`, contentW) as string[] : []
    const evidLines = item.evidence ? pdf.splitTextToSize(`Evidencia: ${item.evidence}`, contentW) as string[] : []
    const resultLines = item.expectedResult ? pdf.splitTextToSize(`Resultado esperado: ${item.expectedResult}`, contentW) as string[] : []
    const actionLines = item.action ? pdf.splitTextToSize(item.action, contentW) as string[] : []

    const LH = 4  // line height
    const headerH = 12  // más espacio entre header y molécula
    const moleculeH = moleculeLines.length * 5
    const doseH = doseLines.length * LH
    const mechH = mechLines.length > 0 ? mechLines.length * LH + 2 : 0
    const evidH = evidLines.length > 0 ? evidLines.length * LH + 2 : 0
    const resultH = resultLines.length > 0 ? resultLines.length * LH + 2 : 0
    const actionH = actionLines.length > 0 ? actionLines.length * LH + 2 : 0
    const RH = headerH + moleculeH + doseH + mechH + evidH + resultH + actionH + 6

    guard(RH + 2)
    box(MG, y, CW, RH, i % 2 === 0 ? C.bg : C.sheet)
    box(MG, y, 3, RH, urgColor)

    // Header: gold numbered circle + urgency pill badge + category
    const numStr = `${item.number ?? i + 1}`
    const circleR = 3.5
    const circleCX = MG + 7 + circleR
    const circleCY = y + 5
    fl(C.gold)
    pdf.circle(circleCX, circleCY, circleR, 'F')
    ink(C.bg); sz(7); b()
    t(numStr, circleCX, circleCY + 1.2, 'center')
    // Urgency pill badge
    const pillX = MG + 16
    const pillW = 22
    const pillH = 5
    const pR = pillH / 2
    const urgBg = sbg(item.urgency ?? 'low')
    fl(urgBg)
    pdf.circle(pillX + pR, y + 2 + pR, pR, 'F')
    pdf.circle(pillX + pillW - pR, y + 2 + pR, pR, 'F')
    pdf.rect(pillX + pR, y + 2, pillW - pillH, pillH, 'F')
    ink(urgColor); sz(6); b()
    t(urgLabel, pillX + pillW / 2, y + 5.8, 'center')
    ink(C.light); sz(6); n()
    tSafe(item.category ?? '', MG + 40, y + 6, CW - 44)

    let cy = y + headerH

    // Molécula
    ink(C.text); sz(8.5); b()
    pdf.text(moleculeLines, MG + 7, cy)
    cy += moleculeH

    // Dosis
    ink(C.muted); sz(7.5); n()
    pdf.text(doseLines, MG + 7, cy)
    cy += doseH + 1

    // Mecanismo
    if (mechLines.length > 0) {
      ink(C.muted); sz(7); n()
      pdf.text(mechLines, MG + 7, cy)
      cy += mechH
    }

    // Evidencia
    if (evidLines.length > 0) {
      ink(C.light); sz(6.5); n()
      pdf.text(evidLines, MG + 7, cy)
      cy += evidH
    }

    // Resultado esperado
    if (resultLines.length > 0) {
      ink(C.accent); sz(7); n()
      pdf.text(resultLines, MG + 7, cy)
      cy += resultH
    }

    // Acción
    if (actionLines.length > 0) {
      ink(urgColor); sz(6.5); b()
      pdf.text(actionLines, MG + 7, cy)
    }

    hline(y + RH)
    skip(RH)
  })

  // ═══════════════════════════════════════════════════════════════
  // PROTOCOLO CÉLULAS MADRE Y EXOSOMAS
  // ═══════════════════════════════════════════════════════════════
  skip(4)
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
  tSafe(`INDICACIÓN: ${stem.indication.toUpperCase()}`, MG + 8, y + 7, CW * 0.55)
  ink(C.muted); sz(7.5); n()
  tSafe(`Factor: ${tfSign}${tfPct}% (×${stem.totalFactor.toFixed(3)})`, MG + CW - 2, y + 7, CW * 0.4, 'right')
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
  ink(C.text); sz(7); n()
  tSafe(`Base: ${patient.weight ?? 70}kg × 1×10⁶/kg | Ajuste: ${tfSign}${tfPct}%`, MG + 8, y + 32, colHalf - 14)

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
  ink(C.text); sz(7); n()
  tSafe('Marcadores: CD9/CD63/CD81 | 30–150 nm', EX + 8, y + 32, colHalf - 14)
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
    const cellW = thirdW - 10
    ink(C.muted); sz(6.5); n(); tSafe(sub, bx + 4, y + 5, cellW)
    ink(C.text); sz(7); b(); tSafe(title, bx + 4, y + 9.5, cellW)
    ink(C.accent); sz(7); n(); tSafe(val, bx + 4, y + 14, cellW)
  })
  skip(20)

  // Factores del algoritmo
  section('FACTORES DEL ALGORITMO DE DOSIFICACIÓN', '— 8 variables clínicas evaluadas')
  box(MG, y, CW, 7, C.dark)
  ink(C.gold); sz(6.8); b()
  t('FACTOR CLÍNICO', MG + 3, y + 5)
  t('VALOR', MG + 56, y + 5)
  t('ESTADO', MG + 100, y + 5)
  t('MULT.', MG + 130, y + 5)
  t('JUSTIFICACIÓN', MG + 148, y + 5)
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
    ['Score Inmunológico', `${(((ss.immune ?? 0) + (ss.hematologic ?? 0)) / 2).toFixed(0)}/100`,
      (ss.immune ?? 0) >= 85 ? 'optimal' : (ss.immune ?? 0) >= 65 ? 'normal' : (ss.immune ?? 0) >= 40 ? 'warning' : 'danger',
      (ss.immune ?? 0) >= 85 ? 0.95 : (ss.immune ?? 0) >= 65 ? 1.0 : (ss.immune ?? 0) >= 40 ? 1.15 : 1.3],
    ['Score Global de Salud', `${ov.toFixed(0)}/100`,
      ov >= 85 ? 'optimal' : ov >= 65 ? 'normal' : ov >= 40 ? 'warning' : 'danger',
      ov >= 85 ? 0.9 : ov >= 65 ? 1.0 : ov >= 40 ? 1.2 : 1.4],
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
    ink(C.text); sz(7.5); b(); tSafe(factor, MG + 3, y + 6, 50)

    // Value
    ink(C.muted); sz(7); n()
    tSafe(value, MG + 56, y + 6, 40)

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
    tSafe(justMap[status] ?? '—', MG + 148, y + 6, CW - 150)

    hline(y + RH)
    skip(RH)
  })

  // Total row
  guard(10)
  box(MG, y, CW, 9, C.section)
  box(MG, y, 3, 9, C.gold)
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
    ink(C.muted); sz(6.5); n()
    tSafe(`[${i + 1}]  ${ref}`, MG + 3, y + 4.5, CW - 6)
    skip(6)
  })
  skip(4)

  // Nota clínica final
  const noteText =
    'Este protocolo es una estimación algorítmica basada en evidencia clínica publicada. No sustituye el criterio del médico tratante. ' +
    'La dosis final debe ser validada considerando el estado clínico actual, disponibilidad del producto celular y potencia por lote (batch potency).'
  const noteLines = pdf.splitTextToSize(noteText, CW - 18) as string[]
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
