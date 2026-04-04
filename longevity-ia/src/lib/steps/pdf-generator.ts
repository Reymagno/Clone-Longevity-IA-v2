/**
 * Steps de generación de PDFs para reportes del agente.
 * Genera documentos PDF en servidor con jsPDF y retorna el buffer.
 *
 * Nota: jsPDF es una dependencia existente del proyecto (usada en pdf-report.ts).
 */

// ── Types ───────────────────────────────────────────────────────────

export interface PDFReportData {
  title: string
  subtitle?: string
  generatedAt: string
  sections: PDFSection[]
}

export interface PDFSection {
  heading: string
  type: 'table' | 'list' | 'text'
  content: string[][] | string[] | string
}

// ── Generate report PDF buffer ──────────────────────────────────────

export async function generateReportPDF(data: PDFReportData): Promise<Buffer> {
  // Dynamic import — jsPDF is heavy, only load when needed
  const { default: jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210
  const MG = 18
  const CW = PW - MG * 2
  let y = MG

  // ── Header ──────────────────────────────────────────────────────
  doc.setFillColor(10, 23, 41)
  doc.rect(0, 0, PW, 32, 'F')

  doc.setTextColor(226, 222, 214)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(data.title, MG, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 160, 160)
  const subtitle = data.subtitle ?? `Generado: ${data.generatedAt}`
  doc.text(subtitle, MG, 24)

  y = 40

  // ── Sections ────────────────────────────────────────────────────
  for (const section of data.sections) {
    // Check page break
    if (y > 260) {
      doc.addPage()
      y = MG
    }

    // Section heading
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(46, 174, 123)
    doc.text(section.heading, MG, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 45)

    if (section.type === 'text') {
      const lines = doc.splitTextToSize(section.content as string, CW)
      for (const line of lines) {
        if (y > 280) { doc.addPage(); y = MG }
        doc.text(line, MG, y)
        y += 4.5
      }
      y += 4
    }

    if (section.type === 'list') {
      for (const item of section.content as string[]) {
        if (y > 280) { doc.addPage(); y = MG }
        const lines = doc.splitTextToSize(`- ${item}`, CW - 4)
        for (const line of lines) {
          doc.text(line, MG + 2, y)
          y += 4.5
        }
      }
      y += 4
    }

    if (section.type === 'table') {
      const rows = section.content as string[][]
      if (rows.length === 0) continue

      const colCount = rows[0].length
      const colWidth = CW / colCount

      // Header row
      if (y > 270) { doc.addPage(); y = MG }
      doc.setFillColor(245, 247, 250)
      doc.rect(MG, y - 3.5, CW, 6, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      for (let c = 0; c < colCount; c++) {
        doc.text(rows[0][c] ?? '', MG + c * colWidth + 2, y)
      }
      y += 5

      // Data rows
      doc.setFont('helvetica', 'normal')
      for (let r = 1; r < rows.length; r++) {
        if (y > 280) { doc.addPage(); y = MG }
        for (let c = 0; c < colCount; c++) {
          const text = doc.splitTextToSize(rows[r][c] ?? '', colWidth - 4)
          doc.text(text[0] ?? '', MG + c * colWidth + 2, y)
        }
        y += 5
      }
      y += 4
    }
  }

  // ── Footer ──────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(`Longevity IA — ${data.title}`, MG, 290)
    doc.text(`Página ${i} de ${pageCount}`, PW - MG - 25, 290)
  }

  return Buffer.from(doc.output('arraybuffer'))
}

// ── Build report data from query results ────────────────────────────

export function buildCriticalPatientsReport(
  patients: { patient_name: string; age: number; overall_score: number; danger_biomarkers: { name: string; value: number | null; unit: string }[] }[],
): PDFReportData {
  return {
    title: 'Reporte de Pacientes Criticos',
    generatedAt: new Date().toLocaleDateString('es-MX'),
    sections: [
      {
        heading: `${patients.length} pacientes con biomarcadores criticos`,
        type: 'table',
        content: [
          ['Paciente', 'Edad', 'Score', 'Biomarcadores en peligro'],
          ...patients.map(p => [
            p.patient_name,
            String(p.age),
            `${p.overall_score}/100`,
            p.danger_biomarkers.map(b => `${b.name}: ${b.value ?? '?'} ${b.unit}`).join(', ') || 'N/A',
          ]),
        ],
      },
    ],
  }
}

export function buildActivityReport(
  metrics: Record<string, number>,
  period: string,
  byMedico?: Record<string, Record<string, number> & { full_name: string }>,
): PDFReportData {
  const sections: PDFSection[] = [
    {
      heading: `Metricas del periodo: ${period}`,
      type: 'table',
      content: [
        ['Metrica', 'Total'],
        ...Object.entries(metrics).map(([k, v]) => [k.replace(/_/g, ' '), String(v)]),
      ],
    },
  ]

  if (byMedico) {
    const medicoRows = Object.entries(byMedico).map(([, m]) => [
      m.full_name,
      ...Object.entries(m).filter(([k]) => k !== 'full_name').map(([, v]) => String(v)),
    ])

    if (medicoRows.length > 0) {
      const headers = Object.keys(Object.values(byMedico)[0]).filter(k => k !== 'full_name').map(k => k.replace(/_/g, ' '))
      sections.push({
        heading: 'Desglose por medico',
        type: 'table',
        content: [['Medico', ...headers], ...medicoRows],
      })
    }
  }

  return { title: 'Reporte de Actividad Clinica', generatedAt: new Date().toLocaleDateString('es-MX'), sections }
}
