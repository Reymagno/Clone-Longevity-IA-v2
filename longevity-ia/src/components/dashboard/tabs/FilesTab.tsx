'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Download, ZoomIn, ZoomOut, X,
  ExternalLink, FileText, ImageIcon,
  RotateCcw, Maximize2, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSignedUrl, extractPathFromUrl } from '@/lib/storage'

interface FilesTabProps {
  fileUrls: string[]
  patientName: string
  resultDate: string
}

function isImage(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)
}

function getFileName(url: string): string {
  try {
    const decoded = decodeURIComponent(url.split('?')[0])
    const parts = decoded.split('/')
    // Remove the timestamp prefix (e.g. "1234567890-filename.jpg" → "filename.jpg")
    const raw = parts[parts.length - 1]
    return raw.replace(/^\d+-/, '')
  } catch {
    return 'Archivo'
  }
}

// ─── Lightbox modal ──────────────────────────────────────────────
interface LightboxProps {
  url: string
  onClose: () => void
}

function Lightbox({ url, onClose }: LightboxProps) {
  const [zoom, setZoom] = useState(1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      {/* Controls bar */}
      <div
        className="absolute top-4 right-4 flex items-center gap-2 z-10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          title="Alejar"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-white text-xs font-mono bg-white/10 px-2.5 py-1.5 rounded-full min-w-[52px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.min(5, z + 0.25))}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          title="Acercar"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          title="Restablecer zoom"
        >
          <RotateCcw size={15} />
        </button>
        <a
          href={url}
          download
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          title="Descargar imagen"
          onClick={e => e.stopPropagation()}
        >
          <Download size={15} />
        </a>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-rose-500/30 border border-rose-500/40 flex items-center justify-center text-white hover:bg-rose-500/50 transition-colors"
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Image */}
      <div
        className="flex items-center justify-center overflow-auto w-full h-full p-16"
        onClick={e => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Vista ampliada del estudio"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
            maxWidth: zoom <= 1 ? '100%' : 'none',
            maxHeight: zoom <= 1 ? '100%' : 'none',
            objectFit: 'contain',
            cursor: zoom < 5 ? 'zoom-in' : 'zoom-out',
          }}
          onClick={() => setZoom(z => z < 5 ? Math.min(5, z + 0.5) : 1)}
          draggable={false}
        />
      </div>

      {/* Bottom hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs font-mono">
        Clic en la imagen para acercar · Clic fuera para cerrar
      </p>
    </div>
  )
}

// ─── PDF Viewer ──────────────────────────────────────────────────
function PdfViewer({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-16 px-8 bg-muted/10">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <FileText size={30} className="text-sky-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">
            El navegador no puede mostrar el PDF en línea
          </p>
          <p className="text-xs text-muted-foreground">
            Usa los botones de abajo para abrirlo o descargarlo
          </p>
        </div>
        <div className="flex gap-3">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="md">
              <ExternalLink size={14} />
              Abrir en nueva pestaña
            </Button>
          </a>
          <a href={url} download={name}>
            <Button variant="primary" size="md">
              <Download size={14} />
              Descargar PDF
            </Button>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full" style={{ height: '75vh' }}>
      <iframe
        src={`${url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
        title={name}
        className="w-full h-full border-0"
        onError={() => setFailed(true)}
      />
      {/* Fallback: also try object tag if iframe fails */}
    </div>
  )
}

// ─── Single File Card ────────────────────────────────────────────
function FileCard({
  url, index, patientName, resultDate,
}: {
  url: string
  index: number
  patientName: string
  resultDate: string
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const image = isImage(url)
  const name = getFileName(url)
  const fileLabel = image ? 'Imagen' : 'PDF'
  const dateLabel = new Date(resultDate).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <>
      <div className="card-medical p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${image ? 'bg-accent/10 border border-accent/20' : 'bg-sky-500/10 border border-sky-500/20'}`}>
              {image
                ? <ImageIcon size={16} className="text-accent" />
                : <FileText size={16} className="text-sky-400" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">{name}</p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {fileLabel} · Estudio {index + 1} · {dateLabel}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            {image && (
              <button
                onClick={() => setLightboxOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-accent border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors"
              >
                <Maximize2 size={12} />
                Ampliar
              </button>
            )}
            <a href={url} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:bg-muted/40 hover:text-foreground transition-colors">
                <ExternalLink size={12} />
                Abrir
              </button>
            </a>
            <a
              href={url}
              download={`${patientName.replace(/\s+/g, '_')}_estudio_${index + 1}.${image ? 'jpg' : 'pdf'}`}
            >
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground border border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                <Download size={12} />
                Descargar
              </button>
            </a>
          </div>
        </div>

        {/* Preview area */}
        {image ? (
          <div
            className="p-5 flex items-center justify-center bg-muted/5 cursor-zoom-in group"
            onClick={() => setLightboxOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Estudio de laboratorio ${index + 1}`}
              className="max-h-[480px] w-auto rounded-lg object-contain shadow-xl group-hover:shadow-accent/10 transition-shadow"
              style={{ maxWidth: '100%' }}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-black/50 rounded-full p-3">
                <Maximize2 size={22} className="text-white" />
              </div>
            </div>
          </div>
        ) : (
          <PdfViewer url={url} name={name} />
        )}
      </div>

      {lightboxOpen && <Lightbox url={url} onClose={() => setLightboxOpen(false)} />}
    </>
  )
}

// ─── Main component ──────────────────────────────────────────────
export function FilesTab({ fileUrls, patientName, resultDate }: FilesTabProps) {
  // Resolve signed URLs for private storage paths
  const [resolvedUrls, setResolvedUrls] = useState<(string | null)[]>([])
  const [resolving, setResolving] = useState(true)

  const resolveUrls = useCallback(async () => {
    if (!fileUrls || fileUrls.length === 0) {
      setResolving(false)
      return
    }
    setResolving(true)
    const urls = await Promise.all(
      fileUrls.map(async (urlOrPath) => {
        // If it is already a full http URL (legacy data), use it directly
        if (urlOrPath.startsWith('http')) return urlOrPath
        // Otherwise it is a bare storage path — get a signed URL
        const path = extractPathFromUrl(urlOrPath, 'lab-files')
        return getSignedUrl('lab-files', path)
      })
    )
    setResolvedUrls(urls)
    setResolving(false)
  }, [fileUrls])

  useEffect(() => { resolveUrls() }, [resolveUrls])

  if (!fileUrls || fileUrls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center">
          <FileText size={28} className="text-muted-foreground" />
        </div>
        <p className="text-foreground font-semibold">Sin archivos adjuntos</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Este resultado no tiene imagenes ni PDFs asociados.
        </p>
      </div>
    )
  }

  if (resolving) {
    return (
      <div className="flex items-center justify-center gap-3 py-24">
        <Loader2 size={20} className="animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Cargando archivos...</p>
      </div>
    )
  }

  // Filter out any that failed to resolve
  const validUrls = resolvedUrls.filter(Boolean) as string[]
  const images = validUrls.filter(isImage)
  const pdfs   = validUrls.filter(u => !isImage(u))

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Estudio Original</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {validUrls.length} archivo{validUrls.length > 1 ? 's' : ''} adjunto{validUrls.length > 1 ? 's' : ''}
            {images.length > 0 && ` · ${images.length} imagen${images.length > 1 ? 'es' : ''}`}
            {pdfs.length > 0   && ` · ${pdfs.length} PDF${pdfs.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Download all */}
        {validUrls.length > 1 && (
          <div className="flex gap-2">
            {validUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                download={`${patientName.replace(/\s+/g, '_')}_estudio_${i + 1}.${isImage(url) ? 'jpg' : 'pdf'}`}
              >
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:bg-muted/40 hover:text-foreground transition-colors">
                  <Download size={12} />
                  Archivo {i + 1}
                </button>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* File cards */}
      <div className="space-y-4">
        {validUrls.map((url, i) => (
          <FileCard
            key={`${url}-${i}`}
            url={url}
            index={i}
            patientName={patientName}
            resultDate={resultDate}
          />
        ))}
      </div>
    </div>
  )
}
