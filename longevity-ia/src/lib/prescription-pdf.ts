/**
 * LONGEVITY IA — Generador de Prescripción Digital PDF
 *
 * Genera un documento PDF de prescripción médica con:
 * - Membrete del médico (nombre, especialidad, cédula)
 * - Intervenciones aprobadas/modificadas clasificadas (OTC, Rx, Procedimiento)
 * - Firma digital del médico
 * - Formato legal para prescripción médica
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

import type { Patient } from '@/types'

// ── Types ──────────────────────────────────────────────────────

export interface PrescriptionItem {
  molecule: string
  dose: string
  category: string
  classification: 'otc' | 'rx' | 'procedure'
  requiresSupervision: boolean
  status: 'approved' | 'modified'
  originalDose?: string
  instructions?: string
  mechanism?: string
  evidence?: string
}

export interface CustomItem {
  molecule: string
  dose: string
  classification: 'otc' | 'rx' | 'procedure'
  requiresSupervision: boolean
  instructions: string
}

export interface MedicoInfo {
  fullName: string
  specialty: string
  licenseNumber: string
  email: string
}

export interface PrescriptionData {
  patient: Patient
  medico: MedicoInfo
  items: PrescriptionItem[]
  customItems: CustomItem[]
  notes: string
  date: string
}

// ── Constants ──────────────────────────────────────────────────

const PW = 210
const PH = 297
const MG = 20
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
}

// ── PDF Generator ──────────────────────────────────────────────

export async function generatePrescriptionPDF(data: PrescriptionData): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = 0

  function setColor(c: RGB) { doc.setTextColor(c[0], c[1], c[2]) }
  function setDraw(c: RGB) { doc.setDrawColor(c[0], c[1], c[2]) }
  function setFill(c: RGB) { doc.setFillColor(c[0], c[1], c[2]) }

  function checkPage(need: number) {
    if (y + need > PH - 30) {
      drawPageFooter()
      doc.addPage()
      y = MG
    }
  }

  function drawPageFooter() {
    setColor(C.light)
    doc.setFontSize(7)
    doc.text('Prescripcion generada por Longevity IA — Longevity Clinic SA de CV', PW / 2, PH - 10, { align: 'center' })
    doc.text('Este documento es una prescripcion medica digital. No tiene validez sin la firma del medico.', PW / 2, PH - 6, { align: 'center' })
  }

  // ═══ HEADER / LETTERHEAD ═══════════════════════════════════════

  // Top accent bar
  setFill(C.navy)
  doc.rect(0, 0, PW, 3, 'F')

  // Medico info - left side
  y = 14
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text(`Dr. ${data.medico.fullName}`, MG, y)

  y += 5.5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text(data.medico.specialty, MG, y)

  y += 4.5
  doc.setFontSize(8)
  doc.text(`Cedula Profesional: ${data.medico.licenseNumber}`, MG, y)

  y += 4
  doc.text(data.medico.email, MG, y)

  // Right side - Longevity IA branding
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setColor(C.accent)
  doc.text('LONGEVITY IA', PW - MG, 14, { align: 'right' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text('Prescripcion Digital', PW - MG, 19, { align: 'right' })

  // Separator
  y = 32
  setDraw(C.border)
  doc.setLineWidth(0.3)
  doc.line(MG, y, PW - MG, y)

  // ═══ PRESCRIPTION TITLE ═══════════════════════════════════════

  y += 8
  setFill(C.sheet)
  doc.roundedRect(MG, y - 4, CW, 14, 2, 2, 'F')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text('PRESCRIPCION MEDICA', PW / 2, y + 2, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text(`Fecha: ${data.date}`, PW / 2, y + 7, { align: 'center' })

  // ═══ PATIENT DATA ═════════════════════════════════════════════

  y += 16
  setFill(C.sheet)
  doc.roundedRect(MG, y, CW, 18, 2, 2, 'F')
  setDraw(C.border)
  doc.roundedRect(MG, y, CW, 18, 2, 2, 'S')

  const patY = y + 5.5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text('Paciente:', MG + 4, patY)
  doc.setFont('helvetica', 'normal')
  setColor(C.text)
  doc.text(data.patient.name, MG + 24, patY)

  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text('Edad:', MG + 90, patY)
  doc.setFont('helvetica', 'normal')
  setColor(C.text)
  doc.text(`${data.patient.age} anos`, MG + 102, patY)

  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text('Genero:', MG + 130, patY)
  doc.setFont('helvetica', 'normal')
  setColor(C.text)
  const genderLabel = data.patient.gender === 'male' ? 'Masculino' : data.patient.gender === 'female' ? 'Femenino' : 'Otro'
  doc.text(genderLabel, MG + 148, patY)

  const patY2 = y + 12.5
  if (data.patient.weight) {
    doc.setFont('helvetica', 'bold')
    setColor(C.navy)
    doc.text('Peso:', MG + 4, patY2)
    doc.setFont('helvetica', 'normal')
    setColor(C.text)
    doc.text(`${data.patient.weight} kg`, MG + 16, patY2)
  }
  if (data.patient.height) {
    doc.setFont('helvetica', 'bold')
    setColor(C.navy)
    doc.text('Estatura:', MG + 40, patY2)
    doc.setFont('helvetica', 'normal')
    setColor(C.text)
    doc.text(`${data.patient.height} cm`, MG + 58, patY2)
  }

  // ═══ PRESCRIPTION ITEMS ═══════════════════════════════════════

  y += 26

  const allItems: (PrescriptionItem | (CustomItem & { status: 'custom' }))[] = [
    ...data.items,
    ...data.customItems.map(ci => ({ ...ci, status: 'custom' as const })),
  ]

  // Group by classification
  const otcItems = allItems.filter(i => i.classification === 'otc')
  const rxItems = allItems.filter(i => i.classification === 'rx')
  const procItems = allItems.filter(i => i.classification === 'procedure')

  function renderSection(title: string, items: typeof allItems, color: RGB, sectionIcon: string) {
    if (items.length === 0) return

    checkPage(14)

    // Section header
    setFill(color)
    doc.roundedRect(MG, y, CW, 8, 1.5, 1.5, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    setColor(C.bg)
    doc.text(`${sectionIcon}  ${title}`, MG + 4, y + 5.5)
    doc.text(`${items.length}`, PW - MG - 4, y + 5.5, { align: 'right' })
    y += 11

    // Table header
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    setColor(C.muted)
    doc.text('#', MG + 2, y)
    doc.text('MOLECULA / INTERVENCION', MG + 10, y)
    doc.text('DOSIS / POSOLOGIA', MG + 85, y)
    doc.text('ESTADO', MG + 148, y)

    y += 2
    setDraw(C.border)
    doc.line(MG, y, PW - MG, y)
    y += 3

    items.forEach((item, idx) => {
      const isModified = 'status' in item && item.status === 'modified'
      const isCustom = 'status' in item && item.status === 'custom'
      const hasSupervision = item.requiresSupervision

      // Calculate dose text and wrap it
      const doseText = item.dose ?? ''
      doc.setFontSize(7.5)
      const doseLines = doc.splitTextToSize(doseText, 55) // 55mm column width
      const modifiedLine = (isModified && 'originalDose' in item && item.originalDose) ? 1 : 0
      const instrText = ('instructions' in item && item.instructions) ? item.instructions : ''
      const instrLines = instrText ? doc.splitTextToSize(instrText, CW - 14) : []

      // Calculate row height dynamically — account for wrapped instructions
      const doseHeight = Math.max(doseLines.length, 1) * 4
      const instrHeight = instrLines.length > 0 ? instrLines.length * 4 : 0
      const extraHeight = modifiedLine * 3.5 + (instrHeight > 0 ? instrHeight + 2 : 0)
      const rowHeight = Math.max(14, 8 + doseHeight + extraHeight + (hasSupervision ? 5 : 0))

      checkPage(rowHeight + 2)

      // Row background (alternating)
      if (idx % 2 === 0) {
        setFill(C.sheet)
        doc.rect(MG, y - 2, CW, rowHeight, 'F')
      }

      // Number
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      setColor(C.navy)
      doc.text(String(idx + 1).padStart(2, '0'), MG + 2, y + 2)

      // Molecule name — truncate based on actual text width
      doc.setFont('helvetica', 'bold')
      setColor(C.text)
      let moleculeName = item.molecule
      while (doc.getTextWidth(moleculeName) > 42 && moleculeName.length > 3) {
        moleculeName = moleculeName.slice(0, -2) + '...'
      }
      doc.text(moleculeName, MG + 10, y + 2)

      // Category
      if ('category' in item && item.category) {
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        setColor(C.muted)
        doc.text(item.category, MG + 10, y + 6)
      }

      // Dose — full text with word wrap
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      setColor(C.text)
      doc.text(doseLines, MG + 85, y + 2)

      // Modified original dose
      let doseEndY = y + 2 + doseLines.length * 3.5
      if (isModified && 'originalDose' in item && item.originalDose) {
        doc.setFontSize(6)
        setColor(C.orange)
        doc.text(`(antes: ${item.originalDose})`, MG + 85, doseEndY)
        doseEndY += 3.5
      }

      // Status badge
      if (isCustom) {
        setFill(C.blue)
        doc.roundedRect(MG + 148, y - 0.5, 20, 5, 1, 1, 'F')
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        setColor(C.bg)
        doc.text('AGREGADA', MG + 150, y + 3)
      } else if (isModified) {
        setFill(C.orange)
        doc.roundedRect(MG + 148, y - 0.5, 22, 5, 1, 1, 'F')
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        setColor(C.bg)
        doc.text('MODIFICADA', MG + 150, y + 3)
      } else {
        setFill(C.green)
        doc.roundedRect(MG + 148, y - 0.5, 20, 5, 1, 1, 'F')
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        setColor(C.bg)
        doc.text('APROBADA', MG + 150, y + 3)
      }

      // Supervision badge
      if (hasSupervision) {
        setFill(C.red)
        doc.roundedRect(MG + 148, y + 5, 22, 4.5, 1, 1, 'F')
        doc.setFontSize(5.5)
        setColor(C.bg)
        doc.text('SUPERVISION', MG + 149.5, y + 8.2)
      }

      // Instructions — full width below molecule and dose
      if (instrLines.length > 0) {
        const instrY = Math.max(doseEndY, y + 8) + 1
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'italic')
        setColor(C.muted)
        doc.text(instrLines, MG + 10, instrY)
      }

      y += rowHeight
    })
  }

  // Render each section
  renderSection('MEDICAMENTOS CON RECETA (Rx)', rxItems, C.red, 'Rx')
  renderSection('SUPLEMENTOS Y OTC (Venta libre)', otcItems, C.green, 'OTC')
  renderSection('PROCEDIMIENTOS CLINICOS', procItems, C.blue, 'Proc')

  // ═══ CLINICAL NOTES ═══════════════════════════════════════════

  if (data.notes.trim()) {
    checkPage(20)
    y += 4
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    setColor(C.navy)
    doc.text('NOTAS Y OBSERVACIONES DEL MEDICO', MG, y)
    y += 5

    setDraw(C.border)
    doc.roundedRect(MG, y, CW, 1, 0, 0, 'S')
    y += 4

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    setColor(C.text)
    const noteLines = doc.splitTextToSize(data.notes, CW - 8)
    doc.text(noteLines, MG + 4, y)
    y += noteLines.length * 4 + 4
  }

  // ═══ SIGNATURE SECTION ════════════════════════════════════════

  checkPage(45)
  y += 10

  // Separator line
  setDraw(C.border)
  doc.line(MG, y, PW - MG, y)
  y += 15

  // Signature line
  doc.setLineWidth(0.4)
  setDraw(C.navy)
  doc.line(PW / 2 - 35, y, PW / 2 + 35, y)
  y += 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text(`Dr. ${data.medico.fullName}`, PW / 2, y, { align: 'center' })

  y += 4.5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text(data.medico.specialty, PW / 2, y, { align: 'center' })

  y += 4
  doc.text(`Cedula Profesional: ${data.medico.licenseNumber}`, PW / 2, y, { align: 'center' })

  y += 8
  doc.setFontSize(7)
  setColor(C.light)
  doc.text('Firma digital — Prescripcion generada a traves de Longevity IA', PW / 2, y, { align: 'center' })

  // Page footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawPageFooter()
  }

  // ═══ SAVE ═════════════════════════════════════════════════════

  const fileName = `Prescripcion_${data.patient.name.replace(/\s+/g, '_')}_${data.date.replace(/\//g, '-')}.pdf`
  doc.save(fileName)
}
