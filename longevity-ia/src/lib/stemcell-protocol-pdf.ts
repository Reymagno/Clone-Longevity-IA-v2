/**
 * LONGEVITY IA — Generador de Protocolo de Células Madre, Exosomas y Péptidos PDF
 *
 * Genera un documento PDF profesional con:
 * - Protocolo de aplicación de células madre MSC
 * - Protocolo de exosomas / vesículas extracelulares
 * - Protocolo de péptidos terapéuticos
 * - Factores clínicos del algoritmo de dosificación
 * - Monitoreo post-protocolo
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

import type { Patient, ParsedData, AIAnalysis } from '@/types'
import { computePeptideProtocol, type PeptideRecommendation } from '@/lib/peptide-protocol'

// ── Types ──────────────────────────────────────────────────────

export interface StemCellData {
  mscDose: number
  exosomeDose: number
  route: string
  sessions: number
  schedule: string
  totalFactor: number
  indication: string
  factors: Array<{
    name: string
    value: string
    multiplier: number
    status: string
    justification: string
    source: string
  }>
  monitoring: string[]
  contraindications: string[]
  alerts: string[]
}

// ── Constants ──────────────────────────────────────────────────

const PW = 210
const PH = 297
const MG = 18
const CW = PW - MG * 2

type RGB = [number, number, number]

const C: Record<string, RGB> = {
  navy:    [10, 25, 50],
  text:    [30, 30, 45],
  muted:   [100, 110, 130],
  light:   [160, 170, 185],
  border:  [200, 210, 225],
  bg:      [255, 255, 255],
  sheet:   [245, 248, 252],
  accent:  [4, 100, 78],
  green:   [16, 140, 90],
  orange:  [200, 120, 10],
  red:     [180, 30, 40],
  blue:    [30, 90, 160],
  gold:    [160, 130, 50],
  optimal: [4, 120, 87],
  normal:  [3, 105, 161],
  warning: [180, 83, 9],
  danger:  [185, 28, 28],
}

function formatMillions(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)} x 10^9`
  return `${Math.round(n)} x 10^6`
}

// ── PDF Generator ──────────────────────────────────────────────

export async function generateStemCellProtocolPDF(
  patient: Patient,
  parsedData: ParsedData,
  analysis: AIAnalysis,
  stemCell: StemCellData,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = 0

  function setColor(c: RGB) { doc.setTextColor(c[0], c[1], c[2]) }
  function setDraw(c: RGB) { doc.setDrawColor(c[0], c[1], c[2]) }
  function setFill(c: RGB) { doc.setFillColor(c[0], c[1], c[2]) }

  function checkPage(need: number) {
    if (y + need > PH - 25) {
      doc.addPage()
      y = MG
      drawPageFooter()
    }
  }

  function drawPageFooter() {
    setColor(C.light)
    doc.setFontSize(7)
    doc.text('Protocolo generado por Longevity IA — Longevity Clinic SA de CV', PW / 2, PH - 10, { align: 'center' })
    doc.text('Este protocolo es una estimacion algoritmica basada en evidencia. No sustituye el criterio medico.', PW / 2, PH - 6, { align: 'center' })
  }

  function sectionTitle(title: string, color: RGB = C.accent) {
    checkPage(14)
    setFill([color[0], color[1], color[2]])
    doc.rect(MG, y, 3, 8, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    setColor(C.navy)
    doc.text(title, MG + 6, y + 6)
    y += 12
  }

  function labelValue(label: string, value: string, x: number, w: number) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    setColor(C.muted)
    doc.text(label, x, y)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    setColor(C.text)
    doc.text(value, x, y + 4.5)
  }

  // ═══ HEADER ═══════════════════════════════════════════════════

  // Top accent bar
  setFill(C.navy)
  doc.rect(0, 0, PW, 3, 'F')
  setFill(C.accent)
  doc.rect(0, 3, PW, 1, 'F')

  // Title
  y = 14
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text('PROTOCOLO DE MEDICINA REGENERATIVA', MG, y)

  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text('Celulas Madre MSC  |  Exosomas  |  Peptidos Terapeuticos', MG, y)

  // Right side branding
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setColor(C.accent)
  doc.text('LONGEVITY IA', PW - MG, 14, { align: 'right' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(today, PW - MG, 19, { align: 'right' })

  // Separator
  y = 28
  setDraw(C.border)
  doc.setLineWidth(0.3)
  doc.line(MG, y, PW - MG, y)

  // ═══ PATIENT INFO ═══════════════════════════════════════════

  y += 4
  setFill(C.sheet)
  doc.roundedRect(MG, y, CW, 16, 2, 2, 'F')
  y += 5

  const bmi = patient.weight && patient.height
    ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)
    : 'N/D'
  const gender = patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'
  const colW = CW / 5

  // Truncate long patient names to prevent overflow
  let displayName = patient.name
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  while (doc.getTextWidth(displayName) > 80 && displayName.length > 3) {
    displayName = displayName.slice(0, -2) + '...'
  }
  labelValue('Paciente', displayName, MG + 4, colW)
  labelValue('Edad', `${patient.age} anos`, MG + 4 + colW, colW)
  labelValue('Genero', gender, MG + 4 + colW * 2, colW)
  labelValue('Peso', patient.weight ? `${patient.weight} kg` : 'N/D', MG + 4 + colW * 3, colW)
  labelValue('IMC', `${bmi} kg/m2`, MG + 4 + colW * 4, colW)

  y += 14

  // Score row
  setFill(C.sheet)
  doc.roundedRect(MG, y, CW, 12, 2, 2, 'F')
  y += 4

  const scoreColW = CW / 4
  labelValue('Score Global', `${analysis.overallScore.toFixed(0)}/100`, MG + 4, scoreColW)
  labelValue('Edad Biologica', `${analysis.longevity_age} anos`, MG + 4 + scoreColW, scoreColW)
  labelValue('Score Inmune', `${((analysis.systemScores.immune + analysis.systemScores.hematologic) / 2).toFixed(0)}/100`, MG + 4 + scoreColW * 2, scoreColW)
  labelValue('Indicacion', stemCell.indication.replace('é', 'e'), MG + 4 + scoreColW * 3, scoreColW)

  y += 12

  // ═══ ALERTS ═══════════════════════════════════════════════════

  if (stemCell.contraindications.length > 0 || stemCell.alerts.length > 0) {
    checkPage(20)
    for (const c of stemCell.contraindications) {
      setFill([252, 213, 213])
      doc.roundedRect(MG, y, CW, 8, 1.5, 1.5, 'F')
      setColor(C.danger)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(`CONTRAINDICACION: ${c}`, MG + 4, y + 5.5)
      y += 10
    }
    for (const a of stemCell.alerts) {
      setFill([252, 233, 207])
      doc.roundedRect(MG, y, CW, 8, 1.5, 1.5, 'F')
      setColor(C.warning)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(`ALERTA: ${a}`, MG + 4, y + 5.5)
      y += 10
    }
    y += 2
  }

  // ═══ STEM CELLS MSC ════════════════════════════════════════════

  sectionTitle('CELULAS MADRE MESENQUIMALES (MSC)', C.accent)

  // Main dose card
  setFill([230, 248, 240])
  doc.roundedRect(MG, y, CW / 2 - 2, 30, 2, 2, 'F')
  setFill([225, 240, 252])
  doc.roundedRect(MG + CW / 2 + 2, y, CW / 2 - 2, 30, 2, 2, 'F')

  // MSC card
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setColor(C.accent)
  doc.text('Celulas Madre MSC (hucMSC)', MG + 4, y + 6)
  doc.setFontSize(16)
  doc.text(formatMillions(stemCell.mscDose), MG + 4, y + 15)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text('celulas mesenquimales', MG + 4, y + 20)
  doc.text(`Base: ${patient.weight ?? 70} kg x 1x10^6/kg`, MG + 4, y + 25)
  doc.text(`Ajuste clinico: ${((stemCell.totalFactor - 1) * 100).toFixed(1)}%`, MG + 4, y + 29)

  // Exosome card
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setColor(C.blue)
  const exoX = MG + CW / 2 + 6
  doc.text('Exosomas / Vesiculas Extracelulares', exoX, y + 6)
  doc.setFontSize(16)
  doc.text(`${stemCell.exosomeDose.toFixed(1)} x 10^10`, exoX, y + 15)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text('particulas IV', exoX, y + 20)
  doc.text('Marcadores: CD9 / CD63 / CD81', exoX, y + 25)
  doc.text('Tamano: 30-150 nm', exoX, y + 29)

  y += 34

  // Route / Sessions / Schedule
  checkPage(16)
  setFill(C.sheet)
  doc.roundedRect(MG, y, CW, 14, 2, 2, 'F')
  y += 4.5
  const infoColW = CW / 3
  labelValue('Via de administracion', stemCell.route, MG + 4, infoColW)
  labelValue('Sesiones', `${stemCell.sessions}`, MG + 4 + infoColW, infoColW)
  labelValue('Calendario', stemCell.schedule, MG + 4 + infoColW * 2, infoColW)
  y += 13

  // ═══ FACTORS TABLE ═══════════════════════════════════════════

  sectionTitle('FACTORES CLINICOS DEL ALGORITMO', C.gold)

  // Table header
  setFill(C.navy)
  doc.roundedRect(MG, y, CW, 7, 1.5, 1.5, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  setColor(C.bg)
  doc.text('Factor', MG + 3, y + 5)
  doc.text('Valor', MG + 50, y + 5)
  doc.text('Multiplicador', MG + 110, y + 5)
  doc.text('Estado', MG + 145, y + 5)
  y += 9

  // Table rows
  for (let i = 0; i < stemCell.factors.length; i++) {
    const f = stemCell.factors[i]

    // Calculate row height based on justification text wrapping
    doc.setFontSize(6.5)
    const justMaxWidth = CW - 10
    const justLines = f.justification
      ? doc.splitTextToSize(f.justification, justMaxWidth) as string[]
      : []
    const baseRowHeight = 7
    const justHeight = justLines.length > 0 ? justLines.length * 3 + 1 : 0
    const totalRowH = baseRowHeight + justHeight

    checkPage(totalRowH + 2)

    if (i % 2 === 0) {
      setFill(C.sheet)
      doc.rect(MG, y - 1, CW, totalRowH, 'F')
    }

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    setColor(C.text)
    doc.text(f.name, MG + 3, y + 4)

    doc.setFont('helvetica', 'normal')
    setColor(C.muted)
    const valueText = f.value.length > 30 ? f.value.substring(0, 28) + '...' : f.value
    doc.text(valueText, MG + 50, y + 4)

    // Multiplier with color
    const mColor: RGB = f.multiplier > 1.2 ? C.danger : f.multiplier > 1.0 ? C.warning : f.multiplier < 1.0 ? C.normal : C.optimal
    setColor(mColor)
    doc.setFont('helvetica', 'bold')
    doc.text(`x${f.multiplier.toFixed(2)}`, MG + 110, y + 4)

    // Status
    const sColor: RGB = f.status === 'optimal' ? C.optimal : f.status === 'normal' ? C.normal : f.status === 'warning' ? C.warning : f.status === 'danger' ? C.danger : C.light
    const sLabel = f.status === 'optimal' ? 'Optimo' : f.status === 'normal' ? 'Normal' : f.status === 'warning' ? 'Atencion' : f.status === 'danger' ? 'Critico' : 'Sin dato'
    setColor(sColor)
    doc.setFont('helvetica', 'normal')
    doc.text(sLabel, MG + 145, y + 4)

    y += baseRowHeight

    // Justification text (wrapped)
    if (justLines.length > 0) {
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'italic')
      setColor(C.light)
      doc.text(justLines, MG + 5, y + 1)
      y += justHeight
    }
  }

  // Total factor
  checkPage(10)
  setFill([230, 248, 240])
  doc.roundedRect(MG, y + 1, CW, 8, 1.5, 1.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text('Factor compuesto total:', MG + 3, y + 6.5)
  setColor(C.accent)
  doc.text(`x${stemCell.totalFactor.toFixed(4)}`, MG + 110, y + 6.5)
  y += 13

  // ═══ PEPTIDES ════════════════════════════════════════════════

  const bmi_num = patient.weight && patient.height
    ? patient.weight / Math.pow(patient.height / 100, 2)
    : null
  const peptideProtocol = computePeptideProtocol(
    parsedData,
    analysis,
    patient.age,
    bmi_num,
    patient.clinical_history as Record<string, unknown> | null
  )

  if (peptideProtocol.recommendations.length > 0) {
    sectionTitle('PROTOCOLO DE PEPTIDOS TERAPEUTICOS', C.blue)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    setColor(C.muted)
    const summaryLines = doc.splitTextToSize(peptideProtocol.summary, CW - 4)
    doc.text(summaryLines, MG + 2, y)
    y += summaryLines.length * 3.5 + 4

    // Warnings
    for (const w of peptideProtocol.warnings) {
      checkPage(10)
      setFill([252, 233, 207])
      doc.roundedRect(MG, y, CW, 7, 1.5, 1.5, 'F')
      setColor(C.warning)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      const wLines = doc.splitTextToSize(w, CW - 8)
      doc.text(wLines, MG + 4, y + 4.5)
      y += 9
    }

    // Peptide table header
    checkPage(12)
    setFill(C.navy)
    doc.roundedRect(MG, y, CW, 7, 1.5, 1.5, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    setColor(C.bg)
    doc.text('Peptido', MG + 3, y + 5)
    doc.text('Dosis', MG + 48, y + 5)
    doc.text('Via', MG + 85, y + 5)
    doc.text('Frecuencia', MG + 108, y + 5)
    doc.text('Duracion', MG + 142, y + 5)
    y += 9

    // Peptide rows
    for (let i = 0; i < peptideProtocol.recommendations.length; i++) {
      const p = peptideProtocol.recommendations[i]

      // Calculate actual row height based on content
      doc.setFontSize(6.5)
      const mechWidthCalc = CW - 10
      const mechLinesCalc = doc.splitTextToSize(
        p.mechanism.length > 100 ? p.mechanism.substring(0, 98) + '...' : p.mechanism,
        mechWidthCalc
      ) as string[]
      const noteLinesCalc = p.patientNote
        ? doc.splitTextToSize(`Nota: ${p.patientNote}`, mechWidthCalc) as string[]
        : []
      const hasContraindications = p.contraindications.length > 0
      const rowHeight = Math.max(18, 8 + mechLinesCalc.length * 3.5 + noteLinesCalc.length * 3.5 + (hasContraindications ? 5 : 0))
      checkPage(rowHeight)

      if (i % 2 === 0) {
        setFill(C.sheet)
        doc.rect(MG, y - 1, CW, 7, 'F')
      }

      // Urgency indicator
      const uColor: RGB = p.urgency === 'high' ? C.danger : p.urgency === 'medium' ? C.warning : C.normal
      setFill(uColor)
      doc.circle(MG + 1.5, y + 3, 1, 'F')

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      setColor(C.text)
      doc.text(p.peptide, MG + 5, y + 4)

      doc.setFont('helvetica', 'normal')
      setColor(C.muted)
      const doseText = p.dose.length > 20 ? p.dose.substring(0, 18) + '..' : p.dose
      doc.text(doseText, MG + 48, y + 4)
      doc.text(p.route, MG + 85, y + 4)
      const freqText = p.frequency.length > 18 ? p.frequency.substring(0, 16) + '..' : p.frequency
      doc.text(freqText, MG + 108, y + 4)
      doc.text(p.duration, MG + 142, y + 4)

      y += 7

      // Mechanism line (smaller, under the main row)
      doc.setFontSize(6.5)
      setColor(C.light)
      const mechText = p.mechanism.length > 100 ? p.mechanism.substring(0, 98) + '...' : p.mechanism
      const mechLines = doc.splitTextToSize(mechText, CW - 10)
      doc.text(mechLines, MG + 5, y + 1)
      y += mechLines.length * 3 + 2

      // Patient note
      if (p.patientNote) {
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'italic')
        setColor(C.accent)
        const noteLines = doc.splitTextToSize(`Nota: ${p.patientNote}`, CW - 10)
        doc.text(noteLines, MG + 5, y + 1)
        y += noteLines.length * 3 + 2
      }

      // Contraindications
      if (p.contraindications.length > 0) {
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'bold')
        setColor(C.danger)
        doc.text(`Contraindicaciones: ${p.contraindications.join(', ')}`, MG + 5, y + 1)
        y += 5
      }

      y += 1
    }
  }

  // ═══ MONITORING ═══════════════════════════════════════════════

  sectionTitle('MONITOREO POST-PROTOCOLO', C.green)

  for (const m of stemCell.monitoring) {
    checkPage(8)
    setFill(C.accent)
    doc.circle(MG + 3, y + 2, 1, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    setColor(C.text)
    const mLines = doc.splitTextToSize(m, CW - 10)
    doc.text(mLines, MG + 7, y + 3)
    y += mLines.length * 3.5 + 3
  }

  // ═══ CLINICAL NOTE ═══════════════════════════════════════════

  checkPage(25)
  y += 4
  setFill(C.sheet)
  doc.roundedRect(MG, y, CW, 22, 2, 2, 'F')
  setDraw(C.border)
  doc.roundedRect(MG, y, CW, 22, 2, 2, 'S')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text('Nota clinica', MG + 4, y + 6)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  const noteText = 'Este protocolo es una estimacion algoritmica basada en evidencia publicada (Cell Stem Cell 2026, Signal Transduction & Targeted Therapy 2024-2025, Frontiers in Medicine 2025, Blood Advances ASH 2020). No sustituye el criterio medico especializado. La dosis final debe ser validada por el medico tratante considerando el estado clinico actual del paciente, disponibilidad del producto celular y potencia por lote (batch potency).'
  const noteLines = doc.splitTextToSize(noteText, CW - 8)
  doc.text(noteLines, MG + 4, y + 11)

  y += 26

  // ═══ SIGNATURE AREA ═══════════════════════════════════════════

  checkPage(30)
  y += 6
  setDraw(C.border)
  doc.setLineWidth(0.3)
  const sigX = PW / 2 - 35
  doc.line(sigX, y, sigX + 70, y)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text('Firma del Medico Tratante', PW / 2, y + 5, { align: 'center' })
  doc.text('Nombre y Cedula Profesional', PW / 2, y + 9, { align: 'center' })

  // Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawPageFooter()
    // Page numbers
    doc.setFontSize(7)
    setColor(C.light)
    doc.text(`Pagina ${p} de ${totalPages}`, PW - MG, PH - 15, { align: 'right' })
  }

  // Save
  const safeName = patient.name.replace(/\s+/g, '_')
  doc.save(`Protocolo_Regenerativo_${safeName}.pdf`)
}
