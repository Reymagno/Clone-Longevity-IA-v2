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

// CSS de tema claro — texto negro, fondos con contraste, cards con sombra
const LIGHT_CSS = `
  #dashboard-export {
    background-color: #f1f5f9 !important;
    color: #000000 !important;
  }
  #dashboard-export .bg-background  { background-color: #f1f5f9 !important; }
  #dashboard-export .bg-card        { background-color: #ffffff !important; }
  #dashboard-export .bg-muted       { background-color: #e8ecf1 !important; }
  #dashboard-export [class*="bg-muted/"]  { background-color: #e8ecf1 !important; }

  #dashboard-export .text-foreground       { color: #000000 !important; }
  #dashboard-export .text-card-foreground  { color: #000000 !important; }
  #dashboard-export .text-muted-foreground { color: #1e293b !important; }
  #dashboard-export .text-accent   { color: #047857 !important; }
  #dashboard-export .text-info     { color: #0369a1 !important; }
  #dashboard-export .text-warning  { color: #92400e !important; }
  #dashboard-export .text-danger   { color: #991b1b !important; }

  #dashboard-export .border,
  #dashboard-export .border-border,
  #dashboard-export [class*="border-border/"] { border-color: #b0bec5 !important; }

  /* Cards con sombra y borde sólido */
  #dashboard-export .card-medical,
  #dashboard-export [class*="rounded-xl"],
  #dashboard-export [class*="rounded-2xl"] {
    background: #ffffff !important;
    border: 1px solid #b0bec5 !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.10) !important;
  }

  /* Badges con fondo sólido visible */
  #dashboard-export .badge-optimal { background: #d1fae5 !important; color: #047857 !important; border-color: #6ee7b7 !important; }
  #dashboard-export .badge-normal  { background: #dbeafe !important; color: #0369a1 !important; border-color: #93c5fd !important; }
  #dashboard-export .badge-warning { background: #fef3c7 !important; color: #92400e !important; border-color: #fcd34d !important; }
  #dashboard-export .badge-danger  { background: #fee2e2 !important; color: #991b1b !important; border-color: #fca5a5 !important; }

  /* Fondos con opacidad parcial → sólidos */
  #dashboard-export [class*="bg-accent/"]  { background-color: #d1fae5 !important; }
  #dashboard-export [class*="bg-info/"]    { background-color: #dbeafe !important; }
  #dashboard-export [class*="bg-warning/"] { background-color: #fef3c7 !important; }
  #dashboard-export [class*="bg-danger/"]  { background-color: #fee2e2 !important; }
  #dashboard-export [class*="bg-emerald"]  { background-color: #d1fae5 !important; }
  #dashboard-export [class*="bg-red-500/"] { background-color: #fee2e2 !important; }
  #dashboard-export [class*="bg-yellow-500/"] { background-color: #fef3c7 !important; }
  #dashboard-export [class*="bg-blue-500/"]   { background-color: #dbeafe !important; }

  /* Gráficas recharts */
  #dashboard-export .recharts-text tspan,
  #dashboard-export .recharts-cartesian-axis-tick-value tspan,
  #dashboard-export .recharts-label tspan { fill: #000000 !important; }
  #dashboard-export .recharts-default-tooltip { background: #ffffff !important; border: 1px solid #b0bec5 !important; }
  #dashboard-export .recharts-cartesian-grid line { stroke: #cbd5e1 !important; }

  /* Shimmer y animaciones desactivadas para captura */
  #dashboard-export .shimmer { background: #e2e8f0 !important; animation: none !important; }
  #dashboard-export * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    animation: none !important;
    transition: none !important;
  }
`

// Mapa completo de fondos oscuros → claros (rgb format que devuelve getComputedStyle)
const BG_MAP: Record<string, string> = {
  'rgb(5, 14, 26)':   '#f1f5f9',   // body background → gris claro
  'rgb(10, 22, 40)':  '#ffffff',   // card background → blanco
  'rgb(13, 31, 60)':  '#e8ecf1',   // muted → gris medio
  'rgb(15, 23, 42)':  '#e8ecf1',   // muted alt
  'rgb(17, 24, 39)':  '#f1f5f9',   // background alt
  'rgb(23, 37, 59)':  '#e2e8f0',   // elevated muted
  'rgb(26, 45, 74)':  '#dde3ea',   // border-like
  'rgb(30, 58, 95)':  '#e8ecf1',   // section bg
}

// Mapa completo de textos claros → negro
const TEXT_MAP: Record<string, string> = {
  'rgb(226, 232, 240)': '#000000',
  'rgb(241, 245, 249)': '#000000',
  'rgb(248, 250, 252)': '#000000',
  'rgb(203, 213, 225)': '#1e293b',
  'rgb(148, 163, 184)': '#1e293b',
  'rgb(100, 116, 139)': '#1e293b',
  'rgb(0, 229, 160)':   '#047857',
  'rgb(56, 189, 248)':  '#0369a1',
  'rgb(245, 166, 35)':  '#92400e',
  'rgb(255, 77, 109)':  '#991b1b',
}

// Mapa para fills/strokes SVG (hex format de atributos y inline styles)
const SVG_FILL_MAP: Record<string, string> = {
  '#e2e8f0': '#1e293b',
  '#cbd5e1': '#1e293b',
  '#94a3b8': '#1e293b',
  '#64748b': '#1e293b',
  '#00e5a0': '#047857',
  '#38bdf8': '#0369a1',
  '#f5a623': '#92400e',
  '#ff4d6d': '#991b1b',
  // rgb format para inline styles de Recharts
  'rgb(226, 232, 240)': '#1e293b',
  'rgb(203, 213, 225)': '#1e293b',
  'rgb(148, 163, 184)': '#1e293b',
  'rgb(100, 116, 139)': '#1e293b',
  'rgb(0, 229, 160)':   '#047857',
  'rgb(56, 189, 248)':  '#0369a1',
  'rgb(245, 166, 35)':  '#92400e',
  'rgb(255, 77, 109)':  '#991b1b',
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
    if (bg && bg !== 'rgba(0, 0, 0, 0)') {
      const orig = s.backgroundColor
      if (BG_MAP[bg]) {
        // Fondo oscuro sólido → claro sólido
        s.backgroundColor = BG_MAP[bg]
        restored.push(() => { s.backgroundColor = orig })
      } else {
        // Fondos rgba con baja opacidad → aumentar opacidad para fondo blanco
        const rgbaMatch = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/)
        if (rgbaMatch) {
          const [, r, g, b, a] = rgbaMatch
          const alpha = parseFloat(a ?? '1')
          if (alpha > 0 && alpha < 0.3) {
            // Baja opacidad: mezclar con blanco para color sólido visible
            const ri = Math.round(255 + (parseInt(r) - 255) * Math.max(alpha * 3, 0.25))
            const gi = Math.round(255 + (parseInt(g) - 255) * Math.max(alpha * 3, 0.25))
            const bi = Math.round(255 + (parseInt(b) - 255) * Math.max(alpha * 3, 0.25))
            s.backgroundColor = `rgb(${ri},${gi},${bi})`
            restored.push(() => { s.backgroundColor = orig })
          }
        }
      }
    }

    // — borderColor —
    const border = computed.borderTopColor
    if (border) {
      const orig = s.borderColor
      if (BG_MAP[border]) {
        s.borderColor = BG_MAP[border]
        restored.push(() => { s.borderColor = orig })
      } else {
        // Bordes con baja opacidad → hacerlos más visibles
        const rgbaMatch = border.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/)
        if (rgbaMatch) {
          const [, r, g, b, a] = rgbaMatch
          const alpha = parseFloat(a ?? '1')
          if (alpha > 0 && alpha < 0.4) {
            const ri = Math.round(200 + (parseInt(r) - 200) * Math.max(alpha * 3, 0.35))
            const gi = Math.round(200 + (parseInt(g) - 200) * Math.max(alpha * 3, 0.35))
            const bi = Math.round(200 + (parseInt(b) - 200) * Math.max(alpha * 3, 0.35))
            s.borderColor = `rgb(${ri},${gi},${bi})`
            restored.push(() => { s.borderColor = orig })
          }
        }
      }
    }

    // — background shorthand (gradientes y colores hex en inline styles) —
    const bgShorthand = s.background
    if (bgShorthand) {
      const patched = bgShorthand
        .replace(/#050e1a/gi, '#f1f5f9').replace(/#0a1628/gi, '#ffffff').replace(/#1a2d4a/gi, '#e2e8f0')
        .replace(/rgba?\(5,\s*14,\s*26[^)]*\)/g, '#f1f5f9')
        .replace(/rgba?\(10,\s*22,\s*40[^)]*\)/g, '#ffffff')
        // Colores semánticos: triplicar opacidad (mín 0.25) para visibilidad en fondo claro
        .replace(/rgba?\(0,\s*229,\s*160,\s*([\d.]+)\)/g, (_m, a) => `rgba(4,120,87,${Math.min(1, Math.max(0.25, parseFloat(a) * 3))})`)
        .replace(/rgba?\(56,\s*189,\s*248,\s*([\d.]+)\)/g, (_m, a) => `rgba(3,105,161,${Math.min(1, Math.max(0.25, parseFloat(a) * 3))})`)
        .replace(/rgba?\(245,\s*166,\s*35,\s*([\d.]+)\)/g, (_m, a) => `rgba(180,83,9,${Math.min(1, Math.max(0.25, parseFloat(a) * 3))})`)
        .replace(/rgba?\(255,\s*77,\s*109,\s*([\d.]+)\)/g, (_m, a) => `rgba(185,28,28,${Math.min(1, Math.max(0.25, parseFloat(a) * 3))})`)
      if (patched !== bgShorthand) {
        s.background = patched
        restored.push(() => { s.background = bgShorthand })
      }
    }

    // — boxShadow: agregar sombra a cards/contenedores para separación visual —
    if (el.matches('[class*="rounded-xl"], [class*="rounded-2xl"], [class*="card-medical"], [class*="rounded-lg"]')) {
      const origShadow = s.boxShadow
      if (!origShadow || origShadow === 'none') {
        s.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
        restored.push(() => { s.boxShadow = origShadow })
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
    } finally {
      setGeneratingReport(false)
    }
  }

  async function exportPDF() {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')

      const element = document.getElementById('dashboard-export')
      if (!element) { toast.error('No se encontró el contenido para exportar'); return }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = 210
      const pageH = 297
      const margin = 6
      const usableW = pageW - margin * 2
      const usableH = pageH - margin * 2

      // Obtener los hijos directos del contenedor como bloques
      const children = Array.from(element.children) as HTMLElement[]
      if (children.length === 0) {
        // Fallback: capturar todo como una sola imagen
        const canvas = await captureLight(element)
        const imgData = canvas.toDataURL('image/png')
        const imgH = (canvas.height * pageW) / canvas.width
        pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH)
        pdf.save(`Longevity-IA_${patientName.replace(/\s+/g, '_')}.pdf`)
        return
      }

      // Inyectar CSS de tema claro
      const styleEl = document.createElement('style')
      styleEl.id = '__longevity-export-pdf-style__'
      styleEl.innerHTML = LIGHT_CSS
      document.head.appendChild(styleEl)
      const restoreAll = patchAllComputedStyles(element)

      let currentY = margin
      let isFirstPage = true

      try {
        for (const child of children) {
          // Capturar cada bloque hijo como imagen
          const canvas = await html2canvas(child, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: false,
            logging: false,
          })

          const imgData = canvas.toDataURL('image/png')
          const blockH = (canvas.height * usableW) / canvas.width

          // Si el bloque cabe en la página actual
          if (currentY + blockH <= pageH - margin) {
            pdf.addImage(imgData, 'PNG', margin, currentY, usableW, blockH)
            currentY += blockH + 2
          } else if (blockH <= usableH) {
            // El bloque cabe en una página completa pero no en el espacio restante → nueva página
            if (!isFirstPage || currentY > margin + 10) {
              pdf.addPage()
            }
            currentY = margin
            pdf.addImage(imgData, 'PNG', margin, currentY, usableW, blockH)
            currentY += blockH + 2
          } else {
            // El bloque es más grande que una página → dividirlo con cortes limpios
            if (currentY > margin + 10) {
              pdf.addPage()
              currentY = margin
            }

            const totalImgH = canvas.height
            const pxPerMm = canvas.width / usableW
            let srcY = 0

            while (srcY < totalImgH) {
              const remainMm = pageH - margin - currentY
              const sliceHpx = Math.min(remainMm * pxPerMm, totalImgH - srcY)
              const sliceHmm = sliceHpx / pxPerMm

              // Crear canvas recortado para esta porción
              const sliceCanvas = document.createElement('canvas')
              sliceCanvas.width = canvas.width
              sliceCanvas.height = Math.ceil(sliceHpx)
              const ctx = sliceCanvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx)
                const sliceData = sliceCanvas.toDataURL('image/png')
                pdf.addImage(sliceData, 'PNG', margin, currentY, usableW, sliceHmm)
              }

              srcY += sliceHpx
              currentY += sliceHmm

              if (srcY < totalImgH) {
                pdf.addPage()
                currentY = margin
              }
            }
            currentY += 2
          }
          isFirstPage = false
        }
      } finally {
        styleEl.remove()
        restoreAll()
      }

      pdf.save(`Longevity-IA_${patientName.replace(/\s+/g, '_')}.pdf`)
      toast.success('PDF exportado correctamente')
    } catch (err) {
      toast.error('Error al exportar PDF')
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
    } finally {
      setExporting(false)
    }
  }

  function print() {
    window.print()
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={exportFullReport} loading={generatingReport} className="border-accent/30 text-accent hover:bg-accent/10 rounded-xl">
        <FileText size={13} />
        <span className="hidden md:inline">Reporte</span>
      </Button>
      <Button variant="outline" size="sm" onClick={exportPDF} loading={exporting} className="rounded-xl">
        <Download size={13} />
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={exportPNG} loading={exporting} className="rounded-xl">
        <Image size={13} />
        PNG
      </Button>
      <Button variant="ghost" size="sm" onClick={print} className="rounded-xl">
        <Printer size={13} />
      </Button>
    </div>
  )
}
