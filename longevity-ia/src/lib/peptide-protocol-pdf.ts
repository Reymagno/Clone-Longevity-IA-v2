/**
 * LONGEVITY IA — Generador de Recomendación de Péptidos PDF
 *
 * Genera un documento PDF profesional con las recomendaciones
 * de péptidos terapéuticos personalizadas para el paciente.
 */

import type { Patient, ParsedData, AIAnalysis } from '@/types'
import { computePeptideProtocol } from '@/lib/peptide-protocol'

type RGB = [number, number, number]

const PW = 210
const PH = 297
const MG = 18
const CW = PW - MG * 2

const C: Record<string, RGB> = {
  navy:    [10, 25, 50],
  text:    [30, 30, 45],
  muted:   [100, 110, 130],
  border:  [200, 210, 225],
  bg:      [255, 255, 255],
  sheet:   [245, 248, 252],
  accent:  [4, 100, 78],
  green:   [16, 140, 90],
  orange:  [200, 120, 10],
  red:     [180, 30, 40],
  blue:    [30, 90, 160],
}

const URGENCY_COLORS: Record<string, RGB> = {
  high: [180, 30, 40],
  medium: [200, 120, 10],
  low: [30, 90, 160],
}

const URGENCY_LABELS: Record<string, string> = {
  high: 'Alta prioridad',
  medium: 'Prioridad media',
  low: 'Preventivo',
}

export async function generatePeptideProtocolPDF(
  patient: Patient,
  parsedData: ParsedData,
  analysis: AIAnalysis,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const protocol = computePeptideProtocol(
    parsedData,
    analysis,
    patient.age,
    patient.weight && patient.height ? patient.weight / Math.pow(patient.height / 100, 2) : null,
    patient.clinical_history as Record<string, unknown> | null,
  )

  if (!protocol) return

  let y = 0

  function setColor(c: RGB) { doc.setTextColor(c[0], c[1], c[2]) }
  function setDraw(c: RGB) { doc.setDrawColor(c[0], c[1], c[2]) }
  function setFill(c: RGB) { doc.setFillColor(c[0], c[1], c[2]) }

  function checkPage(need: number) {
    if (y + need > PH - 25) {
      doc.addPage()
      y = MG
      drawFooter()
    }
  }

  function drawFooter() {
    setColor(C.muted)
    doc.setFontSize(7)
    doc.text('Longevity IA — Recomendación de Péptidos Terapéuticos', MG, PH - 8)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, PW - MG, PH - 8, { align: 'right' })
    doc.text(`Página ${doc.getNumberOfPages()}`, PW / 2, PH - 8, { align: 'center' })
  }

  // ── Header ──────────────────────────────────────────────
  setFill(C.navy)
  doc.rect(0, 0, PW, 38, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  setColor(C.bg)
  doc.text('RECOMENDACIÓN DE PÉPTIDOS TERAPÉUTICOS', MG, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Longevity IA — Medicina Regenerativa y Longevidad', MG, 24)

  doc.setFontSize(8)
  doc.text(`Paciente: ${patient.name} · ${patient.age} años · ${new Date().toLocaleDateString('es-MX')}`, MG, 31)

  y = 46

  // ── Summary ─────────────────────────────────────────────
  setColor(C.accent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('RESUMEN', MG, y)
  y += 6

  setColor(C.text)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const summaryLines = doc.splitTextToSize(protocol.summary, CW)
  doc.text(summaryLines, MG, y)
  y += summaryLines.length * 4.5 + 4

  // ── Warnings ────────────────────────────────────────────
  if (protocol.warnings.length > 0) {
    checkPage(20)
    setFill([255, 245, 245] as RGB)
    const warnH = 8 + protocol.warnings.length * 5
    doc.roundedRect(MG, y - 2, CW, warnH, 2, 2, 'F')
    setColor(C.red)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('ADVERTENCIAS', MG + 4, y + 3)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    for (const w of protocol.warnings) {
      const wLines = doc.splitTextToSize(`• ${w}`, CW - 8)
      doc.text(wLines, MG + 4, y)
      y += wLines.length * 4
    }
    y += 4
  }

  // ── Peptide recommendations ─────────────────────────────
  for (const rec of protocol.recommendations) {
    // Calculate actual content height before drawing
    doc.setFontSize(7.5)
    const mechLines = doc.splitTextToSize(rec.mechanism, CW - 8) as string[]
    const mechHeight = Math.min(mechLines.length, 3) * 4  // max 3 lines
    const cardHeight = 34 + mechHeight  // base layout (34mm) + mechanism
    checkPage(cardHeight + 8)

    // Card background with actual height
    setFill(C.sheet)
    setDraw(C.border)
    doc.roundedRect(MG, y - 2, CW, cardHeight, 2, 2, 'FD')

    // Peptide name + urgency
    setColor(C.navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(rec.peptide, MG + 4, y + 4)

    const urgCol = URGENCY_COLORS[rec.urgency] ?? C.muted
    setColor(urgCol)
    doc.setFontSize(7)
    doc.text(URGENCY_LABELS[rec.urgency] ?? rec.urgency, PW - MG - 4, y + 4, { align: 'right' })

    // Full name + category
    setColor(C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`${rec.fullName} · ${rec.category}`, MG + 4, y + 10)

    // Details grid
    const detailY = y + 16
    const col1 = MG + 4
    const col2 = MG + CW / 2

    setColor(C.muted)
    doc.setFontSize(7)
    doc.text('DOSIS', col1, detailY)
    doc.text('VÍA', col2, detailY)
    setColor(C.text)
    doc.setFontSize(8)
    doc.text(rec.dose, col1, detailY + 4)
    doc.text(rec.route, col2, detailY + 4)

    setColor(C.muted)
    doc.setFontSize(7)
    doc.text('FRECUENCIA', col1, detailY + 11)
    doc.text('DURACIÓN', col2, detailY + 11)
    setColor(C.text)
    doc.setFontSize(8)
    doc.text(rec.frequency, col1, detailY + 15)
    doc.text(rec.duration, col2, detailY + 15)

    // Mechanism
    setColor(C.muted)
    doc.setFontSize(7)
    doc.text('MECANISMO', col1, detailY + 22)
    setColor(C.text)
    doc.setFontSize(7.5)
    doc.text(mechLines.slice(0, 3), col1, detailY + 26)

    y += cardHeight + 4

    // Target systems + biomarkers
    if (rec.targetSystems.length > 0 || rec.targetBiomarkers.length > 0) {
      checkPage(12)
      setColor(C.accent)
      doc.setFontSize(7)
      if (rec.targetSystems.length > 0) {
        doc.text(`Sistemas: ${rec.targetSystems.join(', ')}`, MG + 4, y)
        y += 4
      }
      if (rec.targetBiomarkers.length > 0) {
        doc.text(`Biomarcadores objetivo: ${rec.targetBiomarkers.join(', ')}`, MG + 4, y)
        y += 4
      }
    }

    // Evidence
    if (rec.evidence.length > 0) {
      checkPage(10)
      setColor(C.blue)
      doc.setFontSize(7)
      for (const ev of rec.evidence.slice(0, 2)) {
        const evText = `${ev.authors} — ${ev.journal} (${ev.year}): ${ev.finding}`
        const evLines = doc.splitTextToSize(evText, CW - 8) as string[]
        doc.text(evLines.slice(0, 2), MG + 4, y)
        y += evLines.slice(0, 2).length * 4
      }
    }

    // Contraindications
    if (rec.contraindications.length > 0) {
      checkPage(8)
      setColor(C.red)
      doc.setFontSize(7)
      doc.text(`Contraindicaciones: ${rec.contraindications.join(', ')}`, MG + 4, y)
      y += 4
    }

    y += 6
  }

  // ── Footer on all pages ─────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter()
  }

  // ── Disclaimer ──────────────────────────────────────────
  doc.setPage(totalPages)
  checkPage(20)
  y += 4
  setDraw(C.border)
  doc.line(MG, y, PW - MG, y)
  y += 6
  setColor(C.muted)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  const disclaimer = 'Este documento es una recomendación generada por inteligencia artificial basada en los biomarcadores del paciente. No sustituye el criterio médico profesional. Toda prescripción de péptidos debe ser evaluada y supervisada por un médico especialista.'
  const discLines = doc.splitTextToSize(disclaimer, CW)
  doc.text(discLines, MG, y)

  // ── Save ────────────────────────────────────────────────
  const safeName = patient.name.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Peptidos_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
