'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, Image } from 'lucide-react'
import { toast } from 'sonner'

interface ExportButtonsProps {
  patientName: string
  activeTab: number
}

// CSS de tema claro que se inyecta temporalmente antes de capturar
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

  #dashboard-export .badge-optimal { background: rgba(4,120,87,0.10) !important; color: #047857 !important; border-color: rgba(4,120,87,0.25) !important; }
  #dashboard-export .badge-normal  { background: rgba(3,105,161,0.10) !important; color: #0369a1 !important; border-color: rgba(3,105,161,0.25) !important; }
  #dashboard-export .badge-warning { background: rgba(180,83,9,0.10) !important; color: #b45309 !important; border-color: rgba(180,83,9,0.25) !important; }
  #dashboard-export .badge-danger  { background: rgba(185,28,28,0.10) !important; color: #b91c1c !important; border-color: rgba(185,28,28,0.25) !important; }

  #dashboard-export .recharts-text tspan,
  #dashboard-export .recharts-cartesian-axis-tick-value tspan,
  #dashboard-export .recharts-label tspan { fill: #334155 !important; }
  #dashboard-export .recharts-default-tooltip { background: #ffffff !important; border: 1px solid #e2e8f0 !important; }
`

// Mapeo de colores inline del tema oscuro → claro
const BG_MAP: Record<string, string> = {
  'rgb(5, 14, 26)':   '#f8fafc',
  'rgb(10, 22, 40)':  '#ffffff',
  'rgb(30, 58, 95)':  '#f1f5f9',
  'rgb(26, 45, 74)':  '#e2e8f0',
  'rgb(13, 31, 60)':  '#f1f5f9',
  'rgb(15, 23, 42)':  '#f1f5f9',
}
const TEXT_MAP: Record<string, string> = {
  'rgb(226, 232, 240)': '#0f172a',
  'rgb(248, 250, 252)': '#0f172a',
  'rgb(100, 116, 139)': '#475569',
  'rgb(148, 163, 184)': '#475569',
  'rgb(0, 229, 160)':   '#047857',
  'rgb(56, 189, 248)':  '#0369a1',
  'rgb(245, 166, 35)':  '#b45309',
  'rgb(255, 77, 109)':  '#b91c1c',
}
const SVG_MAP: Record<string, string> = {
  '#e2e8f0': '#334155', '#64748b': '#475569', '#94a3b8': '#64748b',
  '#00e5a0': '#047857', '#38bdf8': '#0369a1', '#f5a623': '#b45309', '#ff4d6d': '#b91c1c',
}

// Aplica overrides de inline styles en el elemento (no usa getComputedStyle)
function patchInlineStyles(root: HTMLElement) {
  const restored: Array<() => void> = []

  root.querySelectorAll<HTMLElement>('[style]').forEach(el => {
    const s = el.style
    const orig = { color: s.color, bg: s.backgroundColor, border: s.borderColor, background: s.background }

    if (orig.color && TEXT_MAP[orig.color]) {
      s.color = TEXT_MAP[orig.color]
      restored.push(() => { s.color = orig.color })
    }
    if (orig.bg && BG_MAP[orig.bg]) {
      s.backgroundColor = BG_MAP[orig.bg]
      restored.push(() => { s.backgroundColor = orig.bg })
    }
    if (orig.border && BG_MAP[orig.border]) {
      s.borderColor = BG_MAP[orig.border]
      restored.push(() => { s.borderColor = orig.border })
    }
    if (orig.background) {
      const newBg = orig.background
        .replace(/#050e1a/gi, '#f8fafc').replace(/#0a1628/gi, '#ffffff').replace(/#1a2d4a/gi, '#e2e8f0')
        .replace(/rgba?\(5,\s*14,\s*26[^)]*\)/g, '#f8fafc')
        .replace(/rgba?\(10,\s*22,\s*40[^)]*\)/g, '#ffffff')
        .replace(/rgba?\(0,\s*229,\s*160,\s*([\d.]+)\)/g, (_m, a) => `rgba(4,120,87,${a})`)
        .replace(/rgba?\(56,\s*189,\s*248,\s*([\d.]+)\)/g, (_m, a) => `rgba(3,105,161,${a})`)
        .replace(/rgba?\(245,\s*166,\s*35,\s*([\d.]+)\)/g, (_m, a) => `rgba(180,83,9,${a})`)
        .replace(/rgba?\(255,\s*77,\s*109,\s*([\d.]+)\)/g, (_m, a) => `rgba(185,28,28,${a})`)
        .replace(/#00e5a0([0-9a-fA-F]{2})/g, (_m, a) => `rgba(4,120,87,${(parseInt(a, 16) / 255).toFixed(2)})`)
        .replace(/#38bdf8([0-9a-fA-F]{2})/g, (_m, a) => `rgba(3,105,161,${(parseInt(a, 16) / 255).toFixed(2)})`)
        .replace(/#f5a623([0-9a-fA-F]{2})/g, (_m, a) => `rgba(180,83,9,${(parseInt(a, 16) / 255).toFixed(2)})`)
        .replace(/#ff4d6d([0-9a-fA-F]{2})/g, (_m, a) => `rgba(185,28,28,${(parseInt(a, 16) / 255).toFixed(2)})`)
      if (newBg !== orig.background) {
        s.background = newBg
        restored.push(() => { s.background = orig.background })
      }
    }
  })

  // SVG fills y strokes
  root.querySelectorAll<Element>('[fill]').forEach(el => {
    const v = (el.getAttribute('fill') ?? '').toLowerCase()
    if (SVG_MAP[v]) { el.setAttribute('fill', SVG_MAP[v]); restored.push(() => el.setAttribute('fill', v)) }
  })
  root.querySelectorAll<Element>('[stroke]').forEach(el => {
    const v = (el.getAttribute('stroke') ?? '').toLowerCase()
    if (SVG_MAP[v]) { el.setAttribute('stroke', SVG_MAP[v]); restored.push(() => el.setAttribute('stroke', v)) }
  })

  return () => restored.forEach(fn => fn())
}

// Captura el elemento con tema claro inyectado en el documento real
async function captureLight(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas')

  // 1. Inyectar CSS de tema claro
  const styleEl = document.createElement('style')
  styleEl.id = '__longevity-export-style__'
  styleEl.innerHTML = LIGHT_CSS
  document.head.appendChild(styleEl)

  // 2. Parchear inline styles
  const restoreInline = patchInlineStyles(element)

  try {
    return await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
    })
  } finally {
    // 3. Restaurar todo
    styleEl.remove()
    restoreInline()
  }
}

export function ExportButtons({ patientName, activeTab }: ExportButtonsProps) {
  const [exporting, setExporting] = useState(false)

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
