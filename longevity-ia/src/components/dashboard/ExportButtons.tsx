'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, Image, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { generateMedicalReport } from '@/lib/pdf-report'
import type { Patient, ParsedData, AIAnalysis } from '@/types'

interface ExportButtonsProps {
  patientName: string
  activeTab: number
  patient: Patient
  parsedData: ParsedData
  analysis: AIAnalysis
  resultDate: string
}

// CSS de tema claro — fallback para lo que no se parchea con getComputedStyle
const LIGHT_CSS = `
  #dashboard-export {
    background-color: #f8fafc !important;
    color: #0f172a !important;
  }
  #dashboard-export .bg-background  { background-color: #f8fafc !important; }
  #dashboard-export .bg-card        { background-color: #ffffff !important; }
  #dashboard-export .bg-muted       { background-color: #f1f5f9 !important; }

  #dashboard-export .text-foreground       { color: #0f172a !important; }
  #dashboard-export .text-card-foreground  { color: #0f172a !important; }
  #dashboard-export .text-muted-foreground { color: #475569 !important; }
  #dashboard-export .text-accent   { color: #047857 !important; }
  #dashboard-export .text-info     { color: #0369a1 !important; }
  #dashboard-export .text-warning  { color: #b45309 !important; }
  #dashboard-export .text-danger   { color: #b91c1c !important; }

  #dashboard-export .border, #dashboard-export .border-border { border-color: #e2e8f0 !important; }

  #dashboard-export .card-medical {
    background: #ffffff !important;
    border: 1px solid #e2e8f0 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
  }

  /* FIX: opacidad subida de 0.10 a 0.18 para que se vean sobre fondo blanco */
  #dashboard-export .badge-optimal { background: rgba(4,120,87,0.18) !important; color: #047857 !important; border-color: rgba(4,120,87,0.35) !important; }
  #dashboard-export .badge-normal  { background: rgba(3,105,161,0.18) !important; color: #0369a1 !important; border-color: rgba(3,105,161,0.35) !important; }
  #dashboard-export .badge-warning { background: rgba(180,83,9,0.18) !important; color: #b45309 !important; border-color: rgba(180,83,9,0.35) !important; }
  #dashboard-export .badge-danger  { background: rgba(185,28,28,0.18) !important; color: #b91c1c !important; border-color: rgba(185,28,28,0.35) !important; }

  #dashboard-export .recharts-text tspan,
  #dashboard-export .recharts-cartesian-axis-tick-value tspan,
  #dashboard-export .recharts-label tspan { fill: #334155 !important; }
  #dashboard-export .recharts-default-tooltip { background: #ffffff !important; border: 1px solid #e2e8f0 !important; }
`

// Mapa completo de fondos oscuros → claros (rgb format que devuelve getComputedStyle)
const BG_MAP: Record<string, string> = {
  'rgb(5, 14, 26)':   '#f8fafc',
  'rgb(10, 22, 40)':  '#ffffff',
  'rgb(13, 31, 60)':  '#f1f5f9',
  'rgb(15, 23, 42)':  '#f1f5f9',
  'rgb(17, 24, 39)':  '#f8fafc',
  'rgb(23, 37, 59)':  '#f1f5f9',
  'rgb(26, 45, 74)':  '#e2e8f0',
  'rgb(30, 58, 95)':  '#f1f5f9',
}

// Mapa completo de textos claros → oscuros
const TEXT_MAP: Record<string, string> = {
  'rgb(226, 232, 240)': '#0f172a',
  'rgb(241, 245, 249)': '#0f172a',
  'rgb(248, 250, 252)': '#0f172a',
  'rgb(203, 213, 225)': '#334155',
  'rgb(148, 163, 184)': '#475569',
  'rgb(100, 116, 139)': '#475569',
  'rgb(0, 229, 160)':   '#047857',
  'rgb(56, 189, 248)':  '#0369a1',
  'rgb(245, 166, 35)':  '#b45309',
  'rgb(255, 77, 109)':  '#b91c1c',
}

// Mapa para fills/strokes SVG (hex format de atributos y inline styles)
const SVG_FILL_MAP: Record<string, string> = {
  '#e2e8f0': '#334155',
  '#cbd5e1': '#475569',
  '#94a3b8': '#64748b',
  '#64748b': '#475569',
  '#00e5a0': '#047857',
  '#38bdf8': '#0369a1',
  '#f5a623': '#b45309',
  '#ff4d6d': '#b91c1c',
  // rgb format para inline styles de Recharts
  'rgb(226, 232, 240)': '#334155',
  'rgb(203, 213, 225)': '#475569',
  'rgb(148, 163, 184)': '#64748b',
  'rgb(100, 116, 139)': '#475569',
  'rgb(0, 229, 160)':   '#047857',
  'rgb(56, 189, 248)':  '#0369a1',
  'rgb(245, 166, 35)':  '#b45309',
  'rgb(255, 77, 109)':  '#b91c1c',
}

// FIX PRINCIPAL: usa getComputedStyle en TODOS los elementos para garantizar
// que incluso elementos con solo clases Tailwind se conviertan correctamente.
function patchAllComputedStyles(root: HTMLElement) {
  const restored: Array<() => void> = []

  root.querySelectorAll<HTMLElement>('*').forEach(el => {
    const computed = window.getComputedStyle(el)
    const s = el.style

    // — color (texto) —
    const color = computed.color
    if (color && TEXT_MAP[color]) {
      const orig = s.color
      s.color = TEXT_MAP[color]
      restored.push(() => { s.color = orig })
    }

    // — backgroundColor —
    const bg = computed.backgroundColor
    // Ignorar transparente (rgba(0,0,0,0)) para no blanquear capas intencionales
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && BG_MAP[bg]) {
      const orig = s.backgroundColor
      s.backgroundColor = BG_MAP[bg]
      restored.push(() => { s.backgroundColor = orig })
    }

    // — borderColor —
    const border = computed.borderTopColor
    if (border && BG_MAP[border]) {
      const orig = s.borderColor
      s.borderColor = BG_MAP[border]
      restored.push(() => { s.borderColor = orig })
    }

    // — background shorthand (gradientes y colores hex en inline styles) —
    const bgShorthand = s.background
    if (bgShorthand) {
      const patched = bgShorthand
        .replace(/#050e1a/gi, '#f8fafc').replace(/#0a1628/gi, '#ffffff').replace(/#1a2d4a/gi, '#e2e8f0')
        .replace(/rgba?\(5,\s*14,\s*26[^)]*\)/g, '#f8fafc')
        .replace(/rgba?\(10,\s*22,\s*40[^)]*\)/g, '#ffffff')
        .replace(/rgba?\(0,\s*229,\s*160,\s*([\d.]+)\)/g, (_m, a) => `rgba(4,120,87,${a})`)
        .replace(/rgba?\(56,\s*189,\s*248,\s*([\d.]+)\)/g, (_m, a) => `rgba(3,105,161,${a})`)
        .replace(/rgba?\(245,\s*166,\s*35,\s*([\d.]+)\)/g, (_m, a) => `rgba(180,83,9,${a})`)
        .replace(/rgba?\(255,\s*77,\s*109,\s*([\d.]+)\)/g, (_m, a) => `rgba(185,28,28,${a})`)
      if (patched !== bgShorthand) {
        s.background = patched
        restored.push(() => { s.background = bgShorthand })
      }
    }

    // — fill SVG en inline style (Recharts escribe fill como CSS, no como atributo) —
    const inlineFill = s.fill
    if (inlineFill) {
      const norm = inlineFill.toLowerCase().trim()
      if (SVG_FILL_MAP[norm]) {
        s.fill = SVG_FILL_MAP[norm]
        restored.push(() => { s.fill = inlineFill })
      }
    }

    // — stroke SVG en inline style —
    const inlineStroke = s.stroke
    if (inlineStroke) {
      const norm = inlineStroke.toLowerCase().trim()
      if (SVG_FILL_MAP[norm]) {
        s.stroke = SVG_FILL_MAP[norm]
        restored.push(() => { s.stroke = inlineStroke })
      }
    }
  })

  // — fill/stroke como atributos SVG (no inline style) —
  root.querySelectorAll<Element>('[fill]').forEach(el => {
    const v = (el.getAttribute('fill') ?? '').toLowerCase()
    if (SVG_FILL_MAP[v]) {
      el.setAttribute('fill', SVG_FILL_MAP[v])
      restored.push(() => el.setAttribute('fill', v))
    }
  })
  root.querySelectorAll<Element>('[stroke]').forEach(el => {
    const v = (el.getAttribute('stroke') ?? '').toLowerCase()
    if (SVG_FILL_MAP[v]) {
      el.setAttribute('stroke', SVG_FILL_MAP[v])
      restored.push(() => el.setAttribute('stroke', v))
    }
  })

  return () => restored.forEach(fn => fn())
}

async function captureLight(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas')

  // 1. Inyectar CSS de tema claro (fallback para lo que no cubre getComputedStyle)
  const styleEl = document.createElement('style')
  styleEl.id = '__longevity-export-style__'
  styleEl.innerHTML = LIGHT_CSS
  document.head.appendChild(styleEl)

  // 2. Parchear TODOS los elementos usando getComputedStyle
  const restoreAll = patchAllComputedStyles(element)

  try {
    return await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
    })
  } finally {
    // 3. Restaurar todo al tema original
    styleEl.remove()
    restoreAll()
  }
}

export function ExportButtons({ patientName, activeTab, patient, parsedData, analysis, resultDate }: ExportButtonsProps) {
  const [exporting, setExporting] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  async function exportFullReport() {
    setGeneratingReport(true)
    try {
      await generateMedicalReport(patient, parsedData, analysis, resultDate)
      toast.success('Reporte médico completo generado')
    } catch (err) {
      toast.error('Error al generar el reporte')
      console.error(err)
    } finally {
      setGeneratingReport(false)
    }
  }

  async function exportPDF() {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const element = document.getElementById('dashboard-export')
      if (!element) { toast.error('No se encontró el contenido para exportar'); return }

      const canvas = await captureLight(element)

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`Longevity-IA_${patientName.replace(/\s+/g, '_')}.pdf`)
      toast.success('PDF exportado correctamente')
    } catch (err) {
      toast.error('Error al exportar PDF')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  async function exportPNG() {
    setExporting(true)
    try {
      const element = document.getElementById('dashboard-export')
      if (!element) { toast.error('No se encontró el contenido para exportar'); return }

      const canvas = await captureLight(element)

      const link = document.createElement('a')
      link.download = `Longevity-IA_Tab${activeTab + 1}_${patientName.replace(/\s+/g, '_')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Imagen exportada correctamente')
    } catch (err) {
      toast.error('Error al exportar imagen')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  function print() {
    window.print()
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={exportFullReport} loading={generatingReport} className="border-accent/40 text-accent hover:bg-accent/10">
        <FileText size={14} />
        Reporte Completo
      </Button>
      <Button variant="outline" size="sm" onClick={exportPDF} loading={exporting}>
        <Download size={14} />
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={exportPNG} loading={exporting}>
        <Image size={14} />
        PNG
      </Button>
      <Button variant="ghost" size="sm" onClick={print}>
        <Printer size={14} />
        Imprimir
      </Button>
    </div>
  )
}
