import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formateo de fechas ──────────────────────────────────────────

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

export function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ── Colores y etiquetas por status de biomarcador ───────────────

export function getStatusColor(status: string | null): string {
  switch (status) {
    case 'optimal': return '#2EAE7B'
    case 'normal': return '#5BA4C9'
    case 'warning': return '#D4A03A'
    case 'danger': return '#D4536A'
    default: return '#6B6660'
  }
}

export function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'optimal': return 'Óptimo'
    case 'normal': return 'Normal'
    case 'warning': return 'Atención'
    case 'danger': return 'Crítico'
    default: return 'N/D'
  }
}

// ── Colores y etiquetas por score numérico (0-100) ──────────────

export function getScoreColor(score: number | null): string {
  if (score === null) return '#6B6660'
  if (score >= 85) return '#2EAE7B'
  if (score >= 65) return '#5BA4C9'
  if (score >= 40) return '#D4A03A'
  return '#D4536A'
}

export function getScoreLabel(score: number | null): string {
  if (score === null) return 'Sin datos'
  if (score >= 85) return 'Óptimo'
  if (score >= 65) return 'Normal'
  if (score >= 40) return 'Atención'
  return 'Crítico'
}

// ── Colores y etiquetas por urgencia ────────────────────────────

export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'immediate': return '#D4536A'
    case 'high': return '#D4A03A'
    case 'medium': return '#5BA4C9'
    case 'low': return '#2EAE7B'
    default: return '#6B6660'
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

// ── Utilidades generales ────────────────────────────────────────

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

export function generatePatientCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `LNG-${timestamp}-${random}`
}
