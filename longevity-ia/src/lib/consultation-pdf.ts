/**
 * LONGEVITY IA — Generador de PDF de Consulta Médica
 *
 * Genera un documento PDF profesional con:
 * - Datos del paciente y médico
 * - Nota SOAP estructurada
 * - Transcripción completa con identificación de speakers
 * - Tags y duración
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

import type { Patient, Consultation, ConsultationSOAP } from '@/types'

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
  blue:    [30, 90, 160],
  orange:  [200, 120, 10],
  red:     [180, 30, 40],
}

export async function generateConsultationPDF(
  patient: Patient,
  consultation: Consultation,
  medicoName?: string,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = 0

  function setColor(c: RGB) { doc.setTextColor(c[0], c[1], c[2]) }
  function setDraw(c: RGB) { doc.setDrawColor(c[0], c[1], c[2]) }
  function setFill(c: RGB) { doc.setFillColor(c[0], c[1], c[2]) }

  function drawPageFooter() {
    doc.setFontSize(7)
    doc.setTextColor(100, 110, 130)
    doc.text('Longevity IA — Consulta Medica', MG, PH - 8)
    doc.text(new Date().toLocaleDateString('es-MX'), PW - MG, PH - 8, { align: 'right' })
  }

  function checkPage(need: number) {
    if (y + need > PH - 25) {
      drawPageFooter()
      doc.addPage()
      y = MG
    }
  }

  function sectionTitle(title: string, color: RGB = C.accent) {
    checkPage(14)
    setFill(color)
    doc.rect(MG, y, 3, 8, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    setColor(C.navy)
    doc.text(title, MG + 6, y + 6)
    y += 12
  }

  function writeText(text: string, fontSize: number = 8, font: 'normal' | 'bold' | 'italic' = 'normal', color: RGB = C.text) {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', font)
    setColor(color)
    const lines = doc.splitTextToSize(text, CW - 4)
    checkPage(lines.length * 3.5 + 2)
    doc.text(lines, MG + 2, y)
    y += lines.length * 3.5 + 2
  }

  // ═══ HEADER ═══════════════════════════════════════════════════

  setFill(C.navy)
  doc.rect(0, 0, PW, 3, 'F')
  setFill(C.accent)
  doc.rect(0, 3, PW, 1, 'F')

  y = 14
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  setColor(C.navy)
  doc.text('CONSULTA MEDICA', MG, y)

  y += 5.5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  const consultDate = new Date(consultation.created_at).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  doc.text(consultDate, MG, y)

  if (consultation.duration_seconds) {
    const mins = Math.floor(consultation.duration_seconds / 60)
    const secs = consultation.duration_seconds % 60
    doc.text(`Duracion: ${mins}:${secs.toString().padStart(2, '0')}`, MG + 80, y)
  }

  // Branding
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setColor(C.accent)
  doc.text('LONGEVITY IA', PW - MG, 14, { align: 'right' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text('Consulta Medica Digital', PW - MG, 19, { align: 'right' })

  y = 28
  setDraw(C.border)
  doc.setLineWidth(0.3)
  doc.line(MG, y, PW - MG, y)

  // ═══ PATIENT INFO ═══════════════════════════════════════════

  y += 4
  setFill(C.sheet)
  doc.roundedRect(MG, y, CW, 12, 2, 2, 'F')
  y += 4

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text('Paciente', MG + 4, y)
  doc.text('Edad', MG + 65, y)
  doc.text('Medico', MG + 95, y)
  y += 4.5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  setColor(C.text)
  doc.text(patient.name, MG + 4, y)
  doc.text(`${patient.age} anos`, MG + 65, y)
  doc.text(medicoName || 'N/D', MG + 95, y)

  y += 7

  // Tags
  if (consultation.tags.length > 0) {
    y += 2
    let tagX = MG
    for (const tag of consultation.tags) {
      const tagW = doc.getTextWidth(tag) + 6
      if (tagX + tagW > PW - MG) { tagX = MG; y += 6 }
      setFill([230, 248, 240])
      doc.roundedRect(tagX, y - 3, tagW, 5, 1.5, 1.5, 'F')
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      setColor(C.accent)
      doc.text(tag, tagX + 3, y + 0.5)
      tagX += tagW + 2
    }
    y += 6
  }

  // ═══ RESUMEN ═══════════════════════════════════════════════

  if (consultation.ai_summary) {
    sectionTitle('RESUMEN EJECUTIVO', C.accent)
    setFill([230, 248, 240])
    const summaryLines = doc.splitTextToSize(consultation.ai_summary, CW - 12)
    const boxH = summaryLines.length * 3.5 + 6
    checkPage(boxH)
    doc.roundedRect(MG, y - 2, CW, boxH, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    setColor(C.text)
    doc.text(summaryLines, MG + 6, y + 2)
    y += boxH + 2
  }

  // ═══ SOAP ═══════════════════════════════════════════════════

  const soap = consultation.ai_soap as ConsultationSOAP | null
  if (soap) {
    sectionTitle('NOTA SOAP', C.blue)

    const sections: Array<{ label: string; content: string; color: RGB }> = [
      { label: 'S — Subjetivo', content: soap.subjective || 'Sin datos', color: C.blue },
      { label: 'O — Objetivo', content: soap.objective || 'Sin datos', color: C.green },
      { label: 'A — Evaluacion', content: soap.assessment || 'Sin datos', color: C.orange },
      { label: 'P — Plan', content: soap.plan || 'Sin datos', color: C.accent },
    ]

    for (const s of sections) {
      checkPage(16)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      setColor(s.color)
      doc.text(s.label, MG + 2, y)
      y += 4
      writeText(s.content, 7.5, 'normal', C.text)
      y += 2
    }

    if (soap.diagnoses && soap.diagnoses.length > 0) {
      checkPage(10)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      setColor(C.red)
      doc.text('Diagnosticos:', MG + 2, y)
      y += 4
      writeText(soap.diagnoses.join(', '), 7.5, 'normal', C.text)
    }

    if (soap.follow_up) {
      checkPage(10)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      setColor(C.accent)
      doc.text('Seguimiento:', MG + 2, y)
      y += 4
      writeText(soap.follow_up, 7.5, 'normal', C.text)
    }
  }

  // ═══ HALLAZGOS, MEDICAMENTOS, ESTUDIOS, ALERTAS ═══════════════

  const soapExt = (consultation.ai_soap || {}) as Record<string, unknown>

  // Alerts
  const alerts = soapExt.alerts as string[] | undefined
  if (alerts && alerts.length > 0) {
    sectionTitle('ALERTAS CLINICAS', C.red)
    for (const a of alerts) {
      checkPage(8)
      setFill([252, 225, 225])
      const aLines = doc.splitTextToSize(a, CW - 12)
      const aH = aLines.length * 3.5 + 4
      doc.roundedRect(MG, y - 2, CW, aH, 1.5, 1.5, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      setColor(C.red)
      doc.text(aLines, MG + 5, y + 1)
      y += aH + 2
    }
  }

  // Key Findings
  const keyFindings = soapExt.key_findings as string[] | undefined
  if (keyFindings && keyFindings.length > 0) {
    sectionTitle('HALLAZGOS CLAVE', C.blue)
    for (const f of keyFindings) {
      checkPage(8)
      setFill(C.blue)
      doc.circle(MG + 3, y + 1.5, 1, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      setColor(C.text)
      const fLines = doc.splitTextToSize(f, CW - 10)
      doc.text(fLines, MG + 7, y + 2)
      y += fLines.length * 3.5 + 2
    }
    y += 2
  }

  // Medications
  const medications = soapExt.medications as Array<{ name: string; dose?: string; instructions?: string }> | undefined
  if (medications && medications.length > 0) {
    sectionTitle('MEDICAMENTOS INDICADOS', C.accent)

    // Table header
    setFill([230, 248, 240])
    doc.roundedRect(MG, y - 1, CW, 6, 1, 1, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    setColor(C.accent)
    doc.text('Medicamento', MG + 4, y + 3)
    doc.text('Dosis', MG + 65, y + 3)
    doc.text('Indicaciones', MG + 105, y + 3)
    y += 8

    for (const m of medications) {
      checkPage(8)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      setColor(C.text)
      doc.text(m.name, MG + 4, y + 2)
      doc.setFont('helvetica', 'normal')
      setColor(C.muted)
      if (m.dose) {
        const doseLines = doc.splitTextToSize(m.dose, 35)
        doc.text(doseLines, MG + 65, y + 2)
      }
      if (m.instructions) {
        const instrLines = doc.splitTextToSize(m.instructions, 60)
        doc.text(instrLines, MG + 105, y + 2)
      }
      y += 6
    }
    y += 2
  }

  // Pending Studies
  const pendingStudies = soapExt.pending_studies as string[] | undefined
  if (pendingStudies && pendingStudies.length > 0) {
    sectionTitle('ESTUDIOS PENDIENTES', C.orange)
    for (const s of pendingStudies) {
      checkPage(8)
      setFill(C.orange)
      doc.circle(MG + 3, y + 1.5, 1, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      setColor(C.text)
      const sLines = doc.splitTextToSize(s, CW - 10)
      doc.text(sLines, MG + 7, y + 2)
      y += sLines.length * 3.5 + 2
    }
    y += 2
  }

  // ═══ INSIGHTS CLINICOS ═══════════════════════════════════════

  if (consultation.transcript) {
    sectionTitle('INSIGHTS CLINICOS', C.navy)

    const speakerMap = (consultation.speakers || {}) as Record<string, string>

    // Split transcript into paragraphs
    const paragraphs = consultation.transcript.split('\n').filter(p => p.trim())

    for (const para of paragraphs) {
      // Check if paragraph has speaker label
      const speakerMatch = para.match(/^(Speaker \d+|Doctor|Paciente|Dr\.?\s*\w+):?\s*/i)
      if (speakerMatch) {
        const rawLabel = speakerMatch[1]
        const label = speakerMap[rawLabel] || rawLabel
        const content = para.slice(speakerMatch[0].length)

        // Estimate full block height: label + content lines
        doc.setFontSize(7.5)
        const contentLines = doc.splitTextToSize(content, CW - 4)
        const blockHeight = 3.5 + contentLines.length * 3.5 + 4
        checkPage(blockHeight)

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        const isDoctor = label.toLowerCase().includes('doctor') || label.toLowerCase().includes('dr')
        setColor(isDoctor ? C.blue : C.accent)
        doc.text(`${label}:`, MG + 2, y)
        y += 3.5
        writeText(content, 7.5, 'normal', C.text)
      } else {
        writeText(para, 7.5, 'normal', C.text)
      }
    }
  }

  // ═══ FOOTER ═══════════════════════════════════════════════════

  checkPage(25)
  y += 6
  setDraw(C.border)
  doc.setLineWidth(0.3)
  const sigX = PW / 2 - 35
  doc.line(sigX, y, sigX + 70, y)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setColor(C.muted)
  doc.text('Firma del Medico Tratante', PW / 2, y + 5, { align: 'center' })

  // Page footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawPageFooter()
    setColor(C.light)
    doc.setFontSize(7)
    doc.text('Consulta generada por Longevity IA — Longevity Clinic SA de CV', PW / 2, PH - 10, { align: 'center' })
    doc.text(`Pagina ${p} de ${totalPages}`, PW - MG, PH - 10, { align: 'right' })
  }

  const safeName = patient.name.replace(/\s+/g, '_')
  const dateStr = new Date(consultation.created_at).toISOString().split('T')[0]
  doc.save(`Consulta_${safeName}_${dateStr}.pdf`)
}
