import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getStatusColor(status: string | null): string {
  switch (status) {
    case 'optimal': return '#00e5a0'
    case 'normal': return '#38bdf8'
    case 'warning': return '#f5a623'
    case 'danger': return '#ff4d6d'
    default: return '#64748b'
  }
}

export function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'optimal': return 'Óptimo'
    case 'normal': return 'Normal'
    case 'warning': return 'Atención'
    case 'danger': return 'Crítico'
    default: return 'Sin datos'
  }
}

export function getScoreColor(score: number): string {
  if (score >= 85) return '#00e5a0'
  if (score >= 65) return '#38bdf8'
  if (score >= 40) return '#f5a623'
  return '#ff4d6d'
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Óptimo'
  if (score >= 65) return 'Normal'
  if (score >= 40) return 'Atención'
  return 'Crítico'
}

export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'immediate': return '#ff4d6d'
    case 'high': return '#f5a623'
    case 'medium': return '#38bdf8'
    case 'low': return '#00e5a0'
    default: return '#64748b'
  }
}

export function getUrgencyLabel(urgency: string): string {
  switch (urgency) {
    case 'immediate': return 'Inmediato'
    case 'high': return 'Alto'
    case 'medium': return 'Moderado'
    case 'low': return 'Bajo'
    default: return urgency
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
  })
}

export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(decimals)
}
