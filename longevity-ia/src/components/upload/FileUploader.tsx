'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Image, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  onFilesChange: (files: File[]) => void
  selectedFiles: File[]
  disabled?: boolean
}

export function FileUploader({ onFilesChange, selectedFiles, disabled }: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesChange([...selectedFiles, ...acceptedFiles])
    },
    [onFilesChange, selectedFiles]
  )

  const removeFile = (index: number) => {
    onFilesChange(selectedFiles.filter((_, i) => i !== index))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    disabled,
  })

  return (
    <div className="space-y-3">
      {/* Zona de drop */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-accent bg-accent/10 scale-[1.01]'
            : 'border-border hover:border-accent/50 hover:bg-accent/5',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Upload size={24} className={cn('transition-colors', isDragActive ? 'text-accent' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="text-base font-medium text-foreground mb-1">
              {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra tus estudios aquí'}
            </p>
            <p className="text-sm text-muted-foreground">
              o <span className="text-accent">haz clic para seleccionar</span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><FileText size={12} /> PDF</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Image size={12} /> JPG, PNG, WEBP</span>
            <span>·</span>
            <span className="text-accent/70">Múltiples archivos</span>
          </div>
        </div>
      </div>

      {/* Lista de archivos seleccionados */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''} seleccionado{selectedFiles.length > 1 ? 's' : ''}
          </p>
          {selectedFiles.map((file, i) => {
            const isImage = file.type.startsWith('image/')
            const sizeKB = (file.size / 1024).toFixed(1)
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border border-accent/20 bg-accent/5"
              >
                <div className="w-8 h-8 rounded-md bg-accent/20 flex items-center justify-center shrink-0">
                  {isImage ? <Image size={16} className="text-accent" /> : <FileText size={16} className="text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {isImage ? 'Imagen' : 'PDF'} · {sizeKB} KB
                  </p>
                </div>
                {!disabled && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                    className="text-muted-foreground hover:text-danger transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
