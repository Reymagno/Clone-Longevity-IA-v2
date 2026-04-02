'use client'
import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  patientId: string
  patientName: string
}

export function PatientQRCode({ patientId, patientName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const url = `${window.location.origin}/patients/${patientId}/dashboard`
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#050e1a', light: '#ffffff' },
      })
    }
  }, [patientId])

  function handleDownload() {
    if (!canvasRef.current) return
    // Create a new canvas with patient name label
    const exportCanvas = document.createElement('canvas')
    const size = 280
    exportCanvas.width = size
    exportCanvas.height = size + 40
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    // Draw QR centered
    const qrSize = 200
    const offset = (size - qrSize) / 2
    ctx.drawImage(canvasRef.current, offset, 20, qrSize, qrSize)
    // Draw patient name below
    ctx.fillStyle = '#050e1a'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(patientName, size / 2, size + 10)
    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText('Longevity IA', size / 2, size + 28)
    // Download
    const link = document.createElement('a')
    link.download = `QR_${patientName.replace(/\s+/g, '_')}.png`
    link.href = exportCanvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <canvas ref={canvasRef} className="rounded-lg" />
      <p className="text-sm font-medium text-foreground">{patientName}</p>
      <Button variant="outline" size="sm" onClick={handleDownload} className="rounded-xl">
        <Download size={14} />
        Descargar QR
      </Button>
    </div>
  )
}
